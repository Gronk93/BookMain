import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import {
  getBookById,
  getBookNotes,
  getGlobalNotes,
  createNote,
  updateNote,
  deleteNote,
  restoreNote,
} from "../lib/repository";

const router: IRouter = Router();

router.use(requireAuth);

// GET /notes (Global notes across all books)
router.get("/notes", async (req, res) => {
  try {
    const userId = req.user!.id;
    const bookId = req.query.bookId as string | undefined;
    const search = req.query.search as string | undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    const result = await getGlobalNotes(userId, { bookId, search, page, limit });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message || "Failed to fetch global notes" },
    });
  }
});

// GET /books/:bookId/notes (Notes for a specific book)
router.get("/books/:bookId/notes", async (req, res) => {
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

    const pageNumber = req.query.pageNumber
      ? parseInt(req.query.pageNumber as string, 10)
      : undefined;

    const notes = await getBookNotes(bookId, userId, pageNumber);
    res.json(
      notes.map((n) => ({
        id: n.id,
        userId: n.userId,
        bookId: n.bookId,
        pageNumber: n.pageNumber,
        highlightId: n.highlightId,
        selectedText: n.selectedText,
        anchorData: n.anchorData,
        content: n.content,
        highlightText: n.highlightText,
        color: n.color,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      })),
    );
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message || "Failed to fetch notes" },
    });
  }
});

// POST /books/:bookId/notes
router.post("/books/:bookId/notes", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId } = req.params;
    const {
      pageNumber,
      content,
      highlightId,
      highlightText,
      selectedText,
      anchorData,
      color,
    } = req.body || {};

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
      highlightId,
      highlightText,
      selectedText,
      anchorData,
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
      userId: note.userId,
      bookId: note.bookId,
      pageNumber: note.pageNumber,
      highlightId: note.highlightId,
      selectedText: note.selectedText,
      anchorData: note.anchorData,
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

// PUT & PATCH /books/:bookId/notes/:noteId
const handleUpdateNote = async (req: any, res: any) => {
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
      userId: note.userId,
      bookId: note.bookId,
      pageNumber: note.pageNumber,
      highlightId: note.highlightId,
      selectedText: note.selectedText,
      anchorData: note.anchorData,
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
};

router.put("/books/:bookId/notes/:noteId", handleUpdateNote);
router.patch("/books/:bookId/notes/:noteId", handleUpdateNote);

// DELETE /books/:bookId/notes/:noteId
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

// POST /books/:bookId/notes/:noteId/restore
router.post("/books/:bookId/notes/:noteId/restore", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId, noteId } = req.params;

    const restored = await restoreNote(noteId, bookId, userId);
    if (!restored) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Note not found or access denied" },
      });
      return;
    }

    res.json({
      id: restored.id,
      userId: restored.userId,
      bookId: restored.bookId,
      pageNumber: restored.pageNumber,
      highlightId: restored.highlightId,
      selectedText: restored.selectedText,
      anchorData: restored.anchorData,
      content: restored.content,
      highlightText: restored.highlightText,
      color: restored.color,
      createdAt: restored.createdAt.toISOString(),
      updatedAt: restored.updatedAt.toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message || "Failed to restore note" },
    });
  }
});

export default router;
