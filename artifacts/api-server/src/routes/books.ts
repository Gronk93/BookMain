import { Router, type IRouter } from "express";
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
} from "../lib/repository";

const router: IRouter = Router();

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
