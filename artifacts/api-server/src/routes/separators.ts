import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import {
  getBookById,
  getBookSeparators,
  createSeparator,
  updateSeparator,
  deleteSeparator,
} from "../lib/repository";

const router: IRouter = Router();

router.use(requireAuth);

// GET /books/:bookId/separators
router.get("/books/:bookId/separators", async (req, res) => {
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

    const separators = await getBookSeparators(bookId, userId);
    res.json(
      separators.map((s) => ({
        id: s.id,
        userId: s.userId,
        bookId: s.bookId,
        title: s.title,
        startPage: s.startPage,
        endPage: s.endPage,
        color: s.color,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
    );
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message || "Failed to fetch separators" },
    });
  }
});

// POST /books/:bookId/separators
router.post("/books/:bookId/separators", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId } = req.params;
    const { title, startPage, endPage, color } = req.body || {};

    if (!title || typeof startPage !== "number" || typeof endPage !== "number") {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "title, startPage, and endPage are required",
        },
      });
      return;
    }

    const separator = await createSeparator(bookId, userId, {
      title,
      startPage,
      endPage,
      color,
    });

    if (!separator) {
      res.status(404).json({
        success: false,
        error: { code: "BOOK_NOT_FOUND", message: "Book not found or access denied" },
      });
      return;
    }

    res.status(201).json({
      id: separator.id,
      userId: separator.userId,
      bookId: separator.bookId,
      title: separator.title,
      startPage: separator.startPage,
      endPage: separator.endPage,
      color: separator.color,
      createdAt: separator.createdAt.toISOString(),
      updatedAt: separator.updatedAt.toISOString(),
    });
  } catch (err: any) {
    if (err.message && err.message.includes("Invalid separator page range")) {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_RANGE", message: err.message },
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message || "Failed to create separator" },
    });
  }
});

// PATCH /books/:bookId/separators/:id
router.patch("/books/:bookId/separators/:id", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId, id } = req.params;
    const { title, startPage, endPage, color } = req.body || {};

    const updated = await updateSeparator(id, bookId, userId, {
      title,
      startPage,
      endPage,
      color,
    });

    if (!updated) {
      res.status(404).json({
        success: false,
        error: { code: "SEPARATOR_NOT_FOUND", message: "Separator not found or access denied" },
      });
      return;
    }

    res.json({
      id: updated.id,
      userId: updated.userId,
      bookId: updated.bookId,
      title: updated.title,
      startPage: updated.startPage,
      endPage: updated.endPage,
      color: updated.color,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err: any) {
    if (err.message && err.message.includes("Invalid separator page range")) {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_RANGE", message: err.message },
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message || "Failed to update separator" },
    });
  }
});

// DELETE /books/:bookId/separators/:id
router.delete("/books/:bookId/separators/:id", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId, id } = req.params;

    const ok = await deleteSeparator(id, bookId, userId);
    if (!ok) {
      res.status(404).json({
        success: false,
        error: { code: "SEPARATOR_NOT_FOUND", message: "Separator not found or access denied" },
      });
      return;
    }

    res.json({ success: true, message: "Separator deleted" });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message || "Failed to delete separator" },
    });
  }
});

export default router;
