import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import {
  getBookById,
  getBookHighlights,
  createHighlight,
  updateHighlight,
  deleteHighlight,
  restoreHighlight,
} from "../lib/repository";

const router: IRouter = Router();

router.use(requireAuth);

// GET /books/:bookId/highlights
router.get("/books/:bookId/highlights", async (req, res) => {
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

    const highlights = await getBookHighlights(bookId, userId, pageNumber);
    res.json(
      highlights.map((h) => ({
        id: h.id,
        userId: h.userId,
        bookId: h.bookId,
        pageNumber: h.pageNumber,
        anchorVersion: h.anchorVersion,
        startBlockId: h.startBlockId,
        startOffset: h.startOffset,
        endBlockId: h.endBlockId,
        endOffset: h.endOffset,
        exactText: h.exactText,
        prefixText: h.prefixText,
        suffixText: h.suffixText,
        textHash: h.textHash,
        color: h.color,
        category: h.category,
        anchorStatus: h.anchorStatus,
        boundingBoxes: h.boundingBoxes,
        noteCount: h.noteCount,
        createdAt: h.createdAt.toISOString(),
        updatedAt: h.updatedAt.toISOString(),
      })),
    );
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message || "Failed to fetch highlights" },
    });
  }
});

// POST /books/:bookId/highlights
router.post("/books/:bookId/highlights", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId } = req.params;
    const {
      pageNumber,
      startBlockId,
      startOffset,
      endBlockId,
      endOffset,
      exactText,
      prefixText,
      suffixText,
      color,
      category,
      boundingBoxes,
    } = req.body || {};

    if (
      typeof pageNumber !== "number" ||
      pageNumber < 1 ||
      !startBlockId ||
      typeof startOffset !== "number" ||
      !endBlockId ||
      typeof endOffset !== "number" ||
      !exactText
    ) {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message:
            "pageNumber, startBlockId, startOffset, endBlockId, endOffset, and exactText are required",
        },
      });
      return;
    }

    if (exactText.length > 10000) {
      res.status(400).json({
        success: false,
        error: {
          code: "SELECTION_TOO_LARGE",
          message: "Selected text cannot exceed 10,000 characters",
        },
      });
      return;
    }

    const highlight = await createHighlight(bookId, userId, {
      pageNumber,
      startBlockId,
      startOffset,
      endBlockId,
      endOffset,
      exactText,
      prefixText,
      suffixText,
      color,
      category,
      boundingBoxes,
    });

    if (!highlight) {
      res.status(404).json({
        success: false,
        error: { code: "BOOK_NOT_FOUND", message: "Book not found or access denied" },
      });
      return;
    }

    res.status(201).json({
      id: highlight.id,
      userId: highlight.userId,
      bookId: highlight.bookId,
      pageNumber: highlight.pageNumber,
      anchorVersion: highlight.anchorVersion,
      startBlockId: highlight.startBlockId,
      startOffset: highlight.startOffset,
      endBlockId: highlight.endBlockId,
      endOffset: highlight.endOffset,
      exactText: highlight.exactText,
      prefixText: highlight.prefixText,
      suffixText: highlight.suffixText,
      textHash: highlight.textHash,
      color: highlight.color,
      category: highlight.category,
      anchorStatus: highlight.anchorStatus,
      boundingBoxes: highlight.boundingBoxes,
      noteCount: 0,
      createdAt: highlight.createdAt.toISOString(),
      updatedAt: highlight.updatedAt.toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message || "Failed to create highlight" },
    });
  }
});

// PATCH /books/:bookId/highlights/:highlightId
router.patch("/books/:bookId/highlights/:highlightId", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId, highlightId } = req.params;
    const { color, category } = req.body || {};

    const updated = await updateHighlight(highlightId, bookId, userId, { color, category });
    if (!updated) {
      res.status(404).json({
        success: false,
        error: { code: "HIGHLIGHT_NOT_FOUND", message: "Highlight not found or access denied" },
      });
      return;
    }

    res.json({
      id: updated.id,
      userId: updated.userId,
      bookId: updated.bookId,
      pageNumber: updated.pageNumber,
      anchorVersion: updated.anchorVersion,
      startBlockId: updated.startBlockId,
      startOffset: updated.startOffset,
      endBlockId: updated.endBlockId,
      endOffset: updated.endOffset,
      exactText: updated.exactText,
      prefixText: updated.prefixText,
      suffixText: updated.suffixText,
      textHash: updated.textHash,
      color: updated.color,
      category: updated.category,
      anchorStatus: updated.anchorStatus,
      boundingBoxes: updated.boundingBoxes,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message || "Failed to update highlight" },
    });
  }
});

// DELETE /books/:bookId/highlights/:highlightId
router.delete("/books/:bookId/highlights/:highlightId", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId, highlightId } = req.params;

    const ok = await deleteHighlight(highlightId, bookId, userId);
    if (!ok) {
      res.status(404).json({
        success: false,
        error: { code: "HIGHLIGHT_NOT_FOUND", message: "Highlight not found or access denied" },
      });
      return;
    }

    res.json({ success: true, message: "Highlight deleted" });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message || "Failed to delete highlight" },
    });
  }
});

// POST /books/:bookId/highlights/:highlightId/restore
router.post("/books/:bookId/highlights/:highlightId/restore", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId, highlightId } = req.params;

    const restored = await restoreHighlight(highlightId, bookId, userId);
    if (!restored) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Highlight not found or access denied" },
      });
      return;
    }

    res.json({
      id: restored.id,
      userId: restored.userId,
      bookId: restored.bookId,
      pageNumber: restored.pageNumber,
      anchorVersion: restored.anchorVersion,
      startBlockId: restored.startBlockId,
      startOffset: restored.startOffset,
      endBlockId: restored.endBlockId,
      endOffset: restored.endOffset,
      exactText: restored.exactText,
      prefixText: restored.prefixText,
      suffixText: restored.suffixText,
      textHash: restored.textHash,
      color: restored.color,
      category: restored.category,
      anchorStatus: restored.anchorStatus,
      boundingBoxes: restored.boundingBoxes,
      createdAt: restored.createdAt.toISOString(),
      updatedAt: restored.updatedAt.toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message || "Failed to restore highlight" },
    });
  }
});

export default router;
