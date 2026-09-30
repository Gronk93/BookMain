import crypto from "node:crypto";
import { promises as fsp } from "node:fs";
import { getStorageProvider } from "../storage/local-storage.provider";
import {
  getBookById,
  getBookFileByBookId,
  createProcessingJob,
  updateProcessingJob,
  getLatestProcessingJob,
  saveBookPagesBatch,
  updateBookStatus,
} from "../../lib/repository";
import type { InsertBookPage } from "../../lib/repository";
import { calculateFileSha256 } from "../pdf-ingestion/checksum";
import { PdfTextExtractor } from "./pdf-text-extractor";
import { PageClassifier } from "./page-classifier";
import { TextNormalizer } from "./text-normalizer";
import { PageRenderer, buildPagePreviewLogicalPath } from "./page-renderer";
import { QualityEvaluator } from "./quality-evaluator";
import { getOcrProvider } from "../ocr/local-ocr.provider";
import type { OcrProvider } from "../ocr/ocr-provider";

export interface ProcessBookOptions {
  forceOcr?: boolean;
  mockOcrLowConfidence?: boolean;
  priority?: "low" | "normal" | "high";
}

export interface ProcessingSummary {
  totalPages: number;
  digitalPages: number;
  scannedPages: number;
  hybridPages: number;
  blankPages: number;
  ocrPages: number;
  lowConfidencePages: number;
  averageQualityScore: number;
}

export class ProcessingOrchestrator {
  private readonly textExtractor = new PdfTextExtractor();
  private readonly pageClassifier = new PageClassifier();
  private readonly textNormalizer = new TextNormalizer();
  private readonly pageRenderer = new PageRenderer();
  private readonly qualityEvaluator = new QualityEvaluator();

  private activeJobs = new Map<string, { cancelled: boolean }>();
  private queue: Array<() => Promise<void>> = [];
  private runningCount = 0;
  private readonly maxConcurrency = parseInt(process.env.PDF_PROCESSING_CONCURRENCY || "1", 10);

  /**
   * Enqueue a book for PDF processing
   */
  async enqueueProcessing(
    userId: string,
    bookId: string,
    options: ProcessBookOptions = {},
  ): Promise<string> {
    const jobId = crypto.randomUUID();

    // Register job in database
    await createProcessingJob({
      id: jobId,
      bookId,
      jobType: "pdf_processing",
      status: "pending",
      stage: "queued",
      progressPercent: 0,
      processedPages: 0,
      attempt: 1,
    });

    await updateBookStatus(bookId, "processing");

    // Add to execution queue
    this.queueTask(async () => {
      await this.executeProcessing(jobId, userId, bookId, options);
    });

    return jobId;
  }

  /**
   * Trigger reprocessing of a book (idempotent, atomic replacement)
   */
  async reprocessBook(
    userId: string,
    bookId: string,
    options: ProcessBookOptions = {},
  ): Promise<string> {
    const existingJob = await getLatestProcessingJob(bookId);
    const nextAttempt = (existingJob?.attempt || 1) + 1;
    const jobId = crypto.randomUUID();

    await createProcessingJob({
      id: jobId,
      bookId,
      jobType: "pdf_processing",
      status: "pending",
      stage: "queued_for_reprocess",
      progressPercent: 0,
      processedPages: 0,
      attempt: nextAttempt,
    });

    await updateBookStatus(bookId, "processing");

    this.queueTask(async () => {
      await this.executeProcessing(jobId, userId, bookId, options);
    });

    return jobId;
  }

  /**
   * Cancel an in-progress or queued job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const active = this.activeJobs.get(jobId);
    if (active) {
      active.cancelled = true;
    }
    await updateProcessingJob(jobId, {
      status: "cancelled",
      stage: "cancelled_by_user",
    });
    return true;
  }

  /**
   * Internal queue runner
   */
  private queueTask(task: () => Promise<void>): void {
    this.queue.push(task);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.runningCount >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift();
    if (!task) return;

    this.runningCount++;
    try {
      await task();
    } catch {
      // Caught inside executeProcessing
    } finally {
      this.runningCount--;
      this.processQueue();
    }
  }

  /**
   * Main execution pipeline for a book's PDF
   */
  private async executeProcessing(
    jobId: string,
    userId: string,
    bookId: string,
    options: ProcessBookOptions = {},
  ): Promise<void> {
    const activeState = { cancelled: false };
    this.activeJobs.set(jobId, activeState);
    const storage = getStorageProvider();
    const ocrProvider: OcrProvider = getOcrProvider();

    try {
      // 1. Fetch book and file metadata
      const book = await getBookById(bookId);
      if (!book) {
        throw new Error(`Book not found: ${bookId}`);
      }

      const bookFile = await getBookFileByBookId(bookId);
      if (!bookFile) {
        throw new Error(`Original PDF file not found for book: ${bookId}`);
      }

      const physicalPath = storage.getPhysicalPath(bookFile.filePath);

      // CTQ-01 Invariant: Verify original SHA-256 before processing
      const originalShaBefore = await calculateFileSha256(physicalPath);
      if (originalShaBefore !== bookFile.checksumSha256) {
        throw new Error("Integrity check failed: Original file checksum mismatch before processing.");
      }

      // 2. Load PDF with pdfjs-dist
      const doc = await this.textExtractor.loadDocument(physicalPath);
      const totalPages = doc.numPages;

      await updateProcessingJob(jobId, {
        status: "running",
        stage: "extracting_pages",
        totalPages,
        processedPages: 0,
        progressPercent: 0,
      });

      const pagesToInsert: InsertBookPage[] = [];
      let digitalCount = 0;
      let scannedCount = 0;
      let hybridCount = 0;
      let blankCount = 0;
      let ocrCount = 0;
      let lowConfidenceCount = 0;
      let totalQualityScore = 0;

      // 3. Process each page sequentially (1-based!)
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        // Check cancellation
        if (activeState.cancelled) {
          if (typeof doc.cleanup === "function") await doc.cleanup();
          await updateProcessingJob(jobId, {
            status: "cancelled",
            stage: "cancelled",
          });
          await updateBookStatus(bookId, "ready_for_processing");
          return;
        }

        // A. Native text extraction & bounding boxes
        const extracted = await this.textExtractor.extractPage(doc, pageNum);

        // B. Classification
        const classification = this.pageClassifier.classify({
          characterCount: extracted.characterCount,
          wordCount: extracted.wordCount,
          hasImages: extracted.hasImages,
          imageCount: extracted.imageCount,
          width: extracted.width,
          height: extracted.height,
          rawText: extracted.rawText,
        });

        // Tally page types
        if (classification.pageType === "digital") digitalCount++;
        else if (classification.pageType === "scanned") scannedCount++;
        else if (classification.pageType === "hybrid") hybridCount++;
        else if (classification.pageType === "blank") blankCount++;

        // C. Render preview image
        const rendered = await this.pageRenderer.renderPage(doc, pageNum);
        const previewLogicalPath = buildPagePreviewLogicalPath(userId, bookId, pageNum, "png");

        await storage.put({
          logicalPath: previewLogicalPath,
          content: rendered.imageBuffer,
          mimeType: "image/png",
        });

        // D. Text extraction / OCR handling
        let finalRawText = extracted.rawText;
        let textSource: "native" | "ocr" | "none" = "native";
        let textBlocks = extracted.textBlocks;
        let ocrConfidence: number | null = null;
        let ocrRequired = classification.ocrRequired || !!options.forceOcr;

        if (classification.pageType === "blank") {
          textSource = "none";
          ocrRequired = false;
        } else if (ocrRequired) {
          textSource = "ocr";
          ocrCount++;

          const ocrResult = await ocrProvider.recognize({
            imageBuffer: rendered.imageBuffer,
            pageNumber: pageNum,
            options: {
              mockLowConfidence: options.mockOcrLowConfidence,
            },
          });

          finalRawText = ocrResult.text;
          ocrConfidence = ocrResult.confidence;
          if (ocrResult.blocks && ocrResult.blocks.length > 0) {
            textBlocks = ocrResult.blocks.map((b) => ({
              text: b.text,
              x: b.bbox?.x ?? 0,
              y: b.bbox?.y ?? 0,
              width: b.bbox?.width ?? 0,
              height: b.bbox?.height ?? 0,
              confidence: b.confidence,
            }));
          }
        }

        // E. Text normalization
        const normalized = this.textNormalizer.normalize(finalRawText);

        // F. Quality evaluation
        const quality = this.qualityEvaluator.evaluate({
          pageType: classification.pageType,
          normalizedText: normalized.normalizedText,
          ocrRequired,
          ocrConfidence: ocrConfidence ?? undefined,
        });

        totalQualityScore += quality.qualityScore;
        if (quality.ocrStatus === "low_confidence") {
          lowConfidenceCount++;
        }

        // G. Build page record
        pagesToInsert.push({
          id: crypto.randomUUID(),
          bookId,
          pageNumber: pageNum, // 1-based (CTQ-03)
          pageType: classification.pageType,
          rawText: finalRawText,
          normalizedText: normalized.normalizedText,
          textContent: normalized.normalizedText,
          textSource,
          characterCount: normalized.characterCount,
          wordCount: normalized.wordCount,
          ocrRequired,
          ocrStatus: quality.ocrStatus,
          ocrConfidence,
          qualityScore: quality.qualityScore,
          width: extracted.width,
          height: extracted.height,
          rotation: extracted.rotation,
          previewPath: previewLogicalPath,
          textBlocks,
          parserVersion: "pdfjs-6.3.289",
          ocrVersion: "1.0.0",
          processedAt: new Date(),
        });

        // Update progress in job
        const progressPercent = Math.round((pageNum / totalPages) * 100);
        await updateProcessingJob(jobId, {
          processedPages: pageNum,
          progressPercent,
        });
      }

      // Clean up PDF document resources
      if (typeof doc.cleanup === "function") {
        await doc.cleanup();
      }

      // 4. Save all pages atomically in repository (upsert on book_id, page_number)
      await saveBookPagesBatch(bookId, pagesToInsert);

      // CTQ-01 Invariant: Verify original SHA-256 after processing (El original nunca se destruye)
      const originalShaAfter = await calculateFileSha256(physicalPath);
      if (originalShaAfter !== originalShaBefore) {
        throw new Error("CRITICAL INVARIANT VIOLATION: Original file was modified during processing!");
      }

      // 5. Complete job and update book status
      const averageQualityScore =
        totalPages > 0 ? Math.round((totalQualityScore / totalPages) * 10) / 10 : 100;

      const summary: ProcessingSummary = {
        totalPages,
        digitalPages: digitalCount,
        scannedPages: scannedCount,
        hybridPages: hybridCount,
        blankPages: blankCount,
        ocrPages: ocrCount,
        lowConfidencePages: lowConfidenceCount,
        averageQualityScore,
      };

      await updateProcessingJob(jobId, {
        status: "completed",
        stage: "completed",
        progressPercent: 100,
        processedPages: totalPages,
        summary,
      });

      await updateBookStatus(bookId, "completed");
    } catch (err: any) {
      await updateProcessingJob(jobId, {
        status: "failed",
        stage: "failed",
        errorCode: "PDF_PROCESSING_ERROR",
        errorMessageSafe: err?.message || "An error occurred during PDF processing.",
      });

      await updateBookStatus(bookId, "failed");
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  /**
   * Crash recovery: Recover incomplete jobs upon server boot
   */
  async recoverStaleJobs(): Promise<number> {
    // In live or memory repository, mark any stale 'running' jobs as failed or re-enqueue
    return 0;
  }
}

let orchestratorInstance: ProcessingOrchestrator | null = null;

export function getProcessingOrchestrator(): ProcessingOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new ProcessingOrchestrator();
  }
  return orchestratorInstance;
}
