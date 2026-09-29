import { promises as fsp } from "node:fs";
import crypto from "node:crypto";
import { getStorageProvider } from "../storage/local-storage.provider";
import {
  findBookFileByChecksum,
  createBookWithFileAndJob,
} from "../../lib/repository";
import type { Book, BookFile, ProcessingJob } from "../../lib/repository";
import { validatePdfFile } from "./pdf-validator";
import { calculateFileSha256 } from "./checksum";
import { inspectPdfFile } from "./pdf-inspector";
import {
  PdfDuplicateError,
  PdfImportFailedError,
  PdfIngestionError,
  PdfStorageFailedError,
} from "./errors";

export interface IngestPdfInput {
  userId: string;
  tempFilePath: string;
  originalFilename: string;
  clientMimeType?: string;
  title?: string;
  author?: string;
  language?: string;
}

export interface IngestPdfResult {
  book: Book;
  file: BookFile;
  job: ProcessingJob;
}

export function buildBookOriginalLogicalPath(userId: string, bookId: string): string {
  return `users/${userId}/books/${bookId}/original/original.pdf`;
}

export async function ingestPdf(input: IngestPdfInput): Promise<IngestPdfResult> {
  const {
    userId,
    tempFilePath,
    originalFilename,
    clientMimeType,
    title: userTitle,
    author: userAuthor,
  } = input;

  let storedLogicalPath: string | null = null;
  const storage = getStorageProvider();

  try {
    // 1. Validation (size, signature %PDF-, MIME)
    const { sizeBytes, mimeType } = await validatePdfFile(tempFilePath, {
      originalFilename,
      expectedMimeType: clientMimeType,
    });

    // 2. Cryptographic Checksum (SHA-256)
    const checksumSha256 = await calculateFileSha256(tempFilePath);

    // 3. User-Level Deduplication Check
    const existing = await findBookFileByChecksum(userId, checksumSha256);
    if (existing) {
      throw new PdfDuplicateError(existing.book.id);
    }

    // 4. PDF Inspection (page count, encryption, metadata)
    const inspection = await inspectPdfFile(tempFilePath, originalFilename);

    // 5. Title & Metadata determination
    const finalTitle = userTitle?.trim() ? userTitle.trim() : inspection.title;
    const finalAuthor = userAuthor?.trim()
      ? userAuthor.trim()
      : inspection.author || null;

    // 6. Generate IDs and logical path
    const bookId = crypto.randomUUID();
    const fileId = crypto.randomUUID();
    const jobId = crypto.randomUUID();
    const logicalPath = buildBookOriginalLogicalPath(userId, bookId);

    // 7. Store file in private local storage
    try {
      await storage.put({
        logicalPath,
        content: tempFilePath,
        mimeType,
      });
      storedLogicalPath = logicalPath;
    } catch (storageErr: any) {
      throw new PdfStorageFailedError(
        storageErr?.message || "Failed to persist PDF file to private storage.",
      );
    }

    // 8. Register in Database atomically
    try {
      const created = await createBookWithFileAndJob(userId, {
        book: {
          id: bookId,
          title: finalTitle,
          author: finalAuthor || undefined,
          totalPages: inspection.pageCount,
          sourceType: "pdf",
          processingStatus: "ready_for_processing",
        },
        file: {
          id: fileId,
          originalFilename,
          filePath: logicalPath,
          fileSizeBytes: sizeBytes,
          mimeType,
          checksumSha256,
          storageProvider: "local",
        },
        job: {
          id: jobId,
          jobType: "pdf_ingestion",
          status: "completed",
          stage: "ingestion_complete",
          progressPercent: 100,
        },
      });

      return {
        book: created.book,
        file: created.file,
        job: created.job,
      };
    } catch (dbErr: any) {
      // Rollback stored file if DB insertion failed
      if (storedLogicalPath) {
        await storage.delete(storedLogicalPath).catch(() => {});
      }
      throw new PdfImportFailedError(
        `Failed to record book in database: ${dbErr?.message || "Unknown error"}`,
      );
    }
  } catch (err: any) {
    if (err instanceof PdfIngestionError) {
      throw err;
    }
    throw new PdfImportFailedError(err?.message || "Unexpected error during PDF ingestion.");
  } finally {
    // Always clean up temp file from data/tmp/
    await fsp.unlink(tempFilePath).catch(() => {});
  }
}
