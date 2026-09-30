import { Router, type IRouter } from "express";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { requireAuth } from "../middlewares/auth";
import {
  getUserBooks,
  getBookDetails,
  updateReadingProgress,
  createBookmark,
  deleteBookmark,
  createNote,
  updateNote,
  deleteNote,
  getBookFile,
  getBookProcessingStatus,
  deleteBook,
  getBookById,
  getBookPages,
  getBookPage,
  getLatestProcessingJob,
} from "../lib/repository";
import { ingestPdf } from "../services/pdf-ingestion/pdf-ingestion.service";
import { PdfIngestionError } from "../services/pdf-ingestion/errors";
import { getMaxPdfSizeMb } from "../services/pdf-ingestion/pdf-validator";
import { getStorageProvider } from "../services/storage/local-storage.provider";
import { getProcessingOrchestrator } from "../services/pdf-processing/processing-orchestrator";
import { buildPagePreviewLogicalPath } from "../services/pdf-processing/page-renderer";

const router: IRouter = Router();

// Configure multer temp directory
const tmpDir = path.resolve(process.cwd(), process.env.BOOKMIND_TMP_DIR || "./data/tmp");
try {
  fs.mkdirSync(tmpDir, { recursive: true });
} catch {}

const upload = multer({
  dest: tmpDir,
  limits: {
    fileSize: getMaxPdfSizeMb() * 1024 * 1024,
  },
});

const handlePdfUpload = (req: any, res: any, next: any) => {
  upload.single("file")(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({
            success: false,
            error: {
              code: "PDF_TOO_LARGE",
              message: `The file exceeds the maximum allowed size of ${getMaxPdfSizeMb()} MB.`,
            },
          });
        }
        return res.status(400).json({
          success: false,
          error: {
            code: "PDF_INVALID_TYPE",
            message: err.message,
          },
        });
      }
      return res.status(400).json({
        success: false,
        error: {
          code: "PDF_INVALID_TYPE",
          message: err.message || "File upload failed",
        },
      });
    }
    next();
  });
};

// All books routes require authentication
router.use(requireAuth);

router.get("/books", async (req, res) => {
  try {
    const userId = req.user!.id;
    const books = await getUserBooks(userId);
    res.json(books);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message || "Failed to list books" },
    });
  }
});

// BM-PRD-03: PDF Import Endpoint
router.post("/books/import", handlePdfUpload, async (req, res) => {
  if (!req.file) {
    res.status(400).json({
      success: false,
      error: { code: "PDF_EMPTY", message: "No PDF file provided in the upload request." },
    });
    return;
  }

  const userId = req.user!.id;
  const { title, author, language } = req.body || {};

  try {
    const result = await ingestPdf({
      userId,
      tempFilePath: req.file.path,
      originalFilename: req.file.originalname,
      clientMimeType: req.file.mimetype,
      title,
      author,
      language,
    });

    // BM-PRD-04: Automatically enqueue PDF processing pipeline
    getProcessingOrchestrator()
      .enqueueProcessing(userId, result.book.id)
      .catch((err) => {
        console.error("Failed to enqueue PDF processing:", err);
      });

    res.status(201).json({
      book: {
        id: result.book.id,
        title: result.book.title,
        author: result.book.author,
        totalPages: result.book.totalPages,
        currentPage: result.book.currentPage,
        progressPercent: 0,
        coverUrl: result.book.coverUrl,
        sourceType: result.book.sourceType,
        processingStatus: result.book.processingStatus,
      },
      file: {
        id: result.file.id,
        bookId: result.file.bookId,
        originalFilename: result.file.originalFilename,
        filePath: result.file.filePath,
        fileSizeBytes: result.file.fileSizeBytes,
        mimeType: result.file.mimeType,
        checksumSha256: result.file.checksumSha256,
        storageProvider: result.file.storageProvider,
        uploadStatus: result.file.uploadStatus,
        createdAt: result.file.createdAt.toISOString(),
      },
      job: {
        status: result.job.status,
        stage: result.job.stage || "ingestion_complete",
        progress: result.job.progressPercent,
      },
    });
  } catch (err: any) {
    if (err instanceof PdfIngestionError) {
      res.status(err.statusCode).json({
        success: false,
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
        },
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: "PDF_IMPORT_FAILED",
        message: err.message || "Failed to import PDF",
      },
    });
  }
});

router.get("/books/:bookId", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId } = req.params;

    const details = await getBookDetails(bookId, userId);
    if (!details) {
      res.status(404).json({
        success: false,
        error: { code: "BOOK_NOT_FOUND", message: "Book not found or access denied" },
      });
      return;
    }

    res.json({
      book: details.book,
      pages: details.pages.map((p) => ({
        id: p.id,
        bookId: p.bookId,
        pageNumber: p.pageNumber,
        textContent: p.textContent,
        ocrConfidence: p.ocrConfidence,
        isBlank: p.isBlank,
      })),
      progress: {
        id: details.progress.id,
        bookId: details.progress.bookId,
        currentPage: details.progress.currentPage,
        progressPercent: details.progress.progressPercent,
        completed: details.progress.completed,
        lastReadAt: details.progress.lastReadAt.toISOString(),
      },
      bookmarks: details.bookmarks.map((bm) => ({
        id: bm.id,
        bookId: bm.bookId,
        pageNumber: bm.pageNumber,
        title: bm.title,
        createdAt: bm.createdAt.toISOString(),
      })),
      notes: details.notes.map((n) => ({
        id: n.id,
        bookId: n.bookId,
        pageNumber: n.pageNumber,
        highlightText: n.highlightText,
        content: n.content,
        color: n.color,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      })),
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message || "Failed to fetch book details" },
    });
  }
});

// BM-PRD-03: Delete Book and its storage file
router.delete("/books/:bookId", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId } = req.params;

    const result = await deleteBook(bookId, userId);
    if (!result.success) {
      res.status(404).json({
        success: false,
        error: { code: "BOOK_NOT_FOUND", message: "Book not found or access denied" },
      });
      return;
    }

    if (result.filePath) {
      const storage = getStorageProvider();
      await storage.delete(result.filePath).catch(() => {});
    }

    res.json({ success: true, message: "Book and file deleted" });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message || "Failed to delete book" },
    });
  }
});

// BM-PRD-03 & BM-PRD-04: Book Processing Status
router.get("/books/:bookId/processing", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId } = req.params;

    const status = await getBookProcessingStatus(bookId, userId);
    if (!status) {
      res.status(404).json({
        success: false,
        error: { code: "BOOK_NOT_FOUND", message: "Book not found or access denied" },
      });
      return;
    }

    res.json(status);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message || "Failed to get processing status" },
    });
  }
});

// BM-PRD-04.1: Specific Job Processing Status
router.get("/books/:bookId/processing/:jobId", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId, jobId } = req.params;

    const status = await getBookProcessingStatus(bookId, userId, jobId);
    if (!status) {
      res.status(404).json({
        success: false,
        error: { code: "JOB_NOT_FOUND", message: "Processing job or book not found" },
      });
      return;
    }

    res.json(status);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message || "Failed to get processing job status" },
    });
  }
});

// BM-PRD-03: Book Original File Metadata
router.get("/books/:bookId/file", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId } = req.params;

    const file = await getBookFile(bookId, userId);
    if (!file) {
      res.status(404).json({
        success: false,
        error: { code: "FILE_NOT_FOUND", message: "Book file not found or access denied" },
      });
      return;
    }

    res.json({
      id: file.id,
      bookId: file.bookId,
      originalFilename: file.originalFilename,
      filePath: file.filePath,
      fileSizeBytes: file.fileSizeBytes,
      mimeType: file.mimeType,
      checksumSha256: file.checksumSha256,
      storageProvider: file.storageProvider,
      uploadStatus: file.uploadStatus,
      createdAt: file.createdAt.toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message || "Failed to get file metadata" },
    });
  }
});

// BM-PRD-03: Stream Original PDF with HTTP Range Support
router.get("/books/:bookId/original", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId } = req.params;

    const file = await getBookFile(bookId, userId);
    if (!file) {
      res.status(404).json({
        success: false,
        error: { code: "FILE_NOT_FOUND", message: "Original PDF file not found or access denied" },
      });
      return;
    }

    const storage = getStorageProvider();
    const exists = await storage.exists(file.filePath);
    if (!exists) {
      res.status(404).json({
        success: false,
        error: { code: "FILE_NOT_FOUND", message: "Original file missing from storage" },
      });
      return;
    }

    const fileSize = file.fileSizeBytes;
    const rangeHeader = req.headers.range;

    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (isNaN(start) || start >= fileSize || (parts[1] && end < start)) {
        res.status(416).set("Content-Range", `bytes */${fileSize}`).end();
        return;
      }

      const safeEnd = Math.min(end, fileSize - 1);
      const chunkSize = safeEnd - start + 1;

      res.status(206);
      res.set({
        "Content-Range": `bytes ${start}-${safeEnd}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize.toString(),
        "Content-Type": file.mimeType || "application/pdf",
      });

      const stream = await storage.get(file.filePath, { start, end: safeEnd });
      stream.pipe(res);
    } else {
      res.status(200);
      res.set({
        "Content-Length": fileSize.toString(),
        "Content-Type": file.mimeType || "application/pdf",
        "Accept-Ranges": "bytes",
      });

      const stream = await storage.get(file.filePath);
      stream.pipe(res);
    }
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message || "Failed to stream PDF file" },
    });
  }
});

// BM-PRD-04: List processed pages for a book
router.get("/books/:bookId/pages", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId } = req.params;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 1000;

    const result = await getBookPages(bookId, userId, { page, limit });
    if (!result) {
      res.status(404).json({
        success: false,
        error: { code: "BOOK_NOT_FOUND", message: "Book not found or access denied" },
      });
      return;
    }

    res.json({
      bookId,
      totalPages: result.total,
      pages: result.pages,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message || "Failed to get book pages" },
    });
  }
});

// BM-PRD-04: Get single page details and coordinates
router.get("/books/:bookId/pages/:pageNumber", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId, pageNumber: pageNumberStr } = req.params;
    const pageNumber = parseInt(pageNumberStr, 10);

    if (isNaN(pageNumber) || pageNumber < 1) {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_PAGE", message: "Invalid page number" },
      });
      return;
    }

    const page = await getBookPage(bookId, pageNumber, userId);
    if (!page) {
      res.status(404).json({
        success: false,
        error: { code: "PAGE_NOT_FOUND", message: "Page not found or access denied" },
      });
      return;
    }

    res.json(page);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message || "Failed to get book page" },
    });
  }
});

// BM-PRD-04: Stream rendered preview image for a page
router.get("/books/:bookId/pages/:pageNumber/preview", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId, pageNumber: pageNumberStr } = req.params;
    const pageNumber = parseInt(pageNumberStr, 10);

    if (isNaN(pageNumber) || pageNumber < 1) {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_PAGE", message: "Invalid page number" },
      });
      return;
    }

    // CTQ-07: Verify user isolation - only book owner can access preview
    const page = await getBookPage(bookId, pageNumber, userId);
    if (!page) {
      res.status(404).json({
        success: false,
        error: { code: "PAGE_NOT_FOUND", message: "Page preview not found or access denied" },
      });
      return;
    }

    const previewLogicalPath = page.previewPath || buildPagePreviewLogicalPath(userId, bookId, pageNumber, "png");
    const storage = getStorageProvider();
    const exists = await storage.exists(previewLogicalPath);

    if (!exists) {
      res.status(404).json({
        success: false,
        error: { code: "PREVIEW_NOT_FOUND", message: "Page preview image not found" },
      });
      return;
    }

    res.setHeader("Content-Type", "image/png");
    const stream = await storage.get(previewLogicalPath);
    stream.pipe(res);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message || "Failed to stream page preview" },
    });
  }
});

// BM-PRD-04: Reprocess book pages idempotently
router.post("/books/:bookId/reprocess", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId } = req.params;
    const options = req.body || {};

    const book = await getBookById(bookId);
    if (!book || book.userId !== userId || book.deletedAt) {
      res.status(404).json({
        success: false,
        error: { code: "BOOK_NOT_FOUND", message: "Book not found or access denied" },
      });
      return;
    }

    const jobId = await getProcessingOrchestrator().reprocessBook(userId, bookId, options);
    const status = await getBookProcessingStatus(bookId, userId, jobId);

    res.status(202).json({
      id: jobId,
      ...status,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message || "Failed to trigger reprocess" },
    });
  }
});

// BM-PRD-04: Cancel active processing job
router.post("/books/:bookId/processing/cancel", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId } = req.params;

    const book = await getBookById(bookId);
    if (!book || book.userId !== userId || book.deletedAt) {
      res.status(404).json({
        success: false,
        error: { code: "BOOK_NOT_FOUND", message: "Book not found or access denied" },
      });
      return;
    }

    const latestJob = await getLatestProcessingJob(bookId, "pdf_processing");
    if (!latestJob) {
      res.status(404).json({
        success: false,
        error: { code: "JOB_NOT_FOUND", message: "No active processing job found for book" },
      });
      return;
    }

    await getProcessingOrchestrator().cancelJob(latestJob.id);
    res.json({ success: true, message: "Processing job cancelled" });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message || "Failed to cancel processing job" },
    });
  }
});

router.put("/books/:bookId/progress", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId } = req.params;
    const { currentPage, progressPercent, completed } = req.body || {};

    if (typeof currentPage !== "number" || currentPage < 1) {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_PAGE", message: "currentPage must be a positive integer" },
      });
      return;
    }

    const updated = await updateReadingProgress(bookId, userId, {
      currentPage,
      progressPercent,
      completed,
    });

    if (!updated) {
      res.status(404).json({
        success: false,
        error: { code: "BOOK_NOT_FOUND", message: "Book not found or access denied" },
      });
      return;
    }

    res.json({
      id: updated.id,
      bookId: updated.bookId,
      currentPage: updated.currentPage,
      progressPercent: updated.progressPercent,
      completed: updated.completed,
      lastReadAt: updated.lastReadAt.toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message || "Failed to update reading progress" },
    });
  }
});

router.post("/books/:bookId/bookmarks", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId } = req.params;
    const { pageNumber, title } = req.body || {};

    if (typeof pageNumber !== "number" || pageNumber < 1) {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_PAGE", message: "pageNumber must be a positive integer" },
      });
      return;
    }

    const bookmark = await createBookmark(bookId, userId, { pageNumber, title });
    if (!bookmark) {
      res.status(404).json({
        success: false,
        error: { code: "BOOK_NOT_FOUND", message: "Book not found or access denied" },
      });
      return;
    }

    res.status(201).json({
      id: bookmark.id,
      bookId: bookmark.bookId,
      pageNumber: bookmark.pageNumber,
      title: bookmark.title,
      createdAt: bookmark.createdAt.toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message || "Failed to create bookmark" },
    });
  }
});

router.delete("/books/:bookId/bookmarks/:bookmarkId", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId, bookmarkId } = req.params;

    const ok = await deleteBookmark(bookmarkId, bookId, userId);
    if (!ok) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Bookmark not found or access denied" },
      });
      return;
    }

    res.json({ success: true, message: "Bookmark deleted" });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message || "Failed to delete bookmark" },
    });
  }
});

router.post("/books/:bookId/notes", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId } = req.params;
    const { pageNumber, content, highlightText, color } = req.body || {};

    if (typeof pageNumber !== "number" || pageNumber < 1 || !content) {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_INPUT", message: "pageNumber and content are required" },
      });
      return;
    }

    const note = await createNote(bookId, userId, {
      pageNumber,
      content,
      highlightText,
      color,
    });

    if (!note) {
      res.status(404).json({
        success: false,
        error: { code: "BOOK_NOT_FOUND", message: "Book not found or access denied" },
      });
      return;
    }

    res.status(201).json({
      id: note.id,
      bookId: note.bookId,
      pageNumber: note.pageNumber,
      content: note.content,
      highlightText: note.highlightText,
      color: note.color,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message || "Failed to create note" },
    });
  }
});

router.put("/books/:bookId/notes/:noteId", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId, noteId } = req.params;
    const { content, color } = req.body || {};

    if (!content) {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_INPUT", message: "content is required" },
      });
      return;
    }

    const note = await updateNote(noteId, bookId, userId, { content, color });
    if (!note) {
      res.status(404).json({
        success: false,
        error: { code: "NOTE_NOT_FOUND", message: "Note not found or access denied" },
      });
      return;
    }

    res.json({
      id: note.id,
      bookId: note.bookId,
      pageNumber: note.pageNumber,
      content: note.content,
      highlightText: note.highlightText,
      color: note.color,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message || "Failed to update note" },
    });
  }
});

router.delete("/books/:bookId/notes/:noteId", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId, noteId } = req.params;

    const ok = await deleteNote(noteId, bookId, userId);
    if (!ok) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Note not found or access denied" },
      });
      return;
    }

    res.json({ success: true, message: "Note deleted" });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message || "Failed to delete note" },
    });
  }
});

export default router;
