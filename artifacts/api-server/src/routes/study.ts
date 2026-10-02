import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/auth";
import {
  getBookById,
  findStudySummaryById,
  listStudySummariesByBook,
  deleteStudySummary,
  listStudyConceptsByBook,
  createFlashcardDeck,
  findFlashcardDeckById,
  listFlashcardDecksByBook,
  updateFlashcardDeck,
  deleteFlashcardDeck,
  listFlashcardsByDeck,
  findFlashcardById,
  updateFlashcard,
  deleteFlashcard,
  listDueFlashcards,
} from "../lib/repository";
import {
  globalStudySummaryService,
  globalStudyConceptService,
  globalFlashcardService,
  globalFlashcardReviewService,
} from "../services/study/study-service";
import type { ReviewRating } from "../services/study/spaced-repetition.engine";

const router: IRouter = Router();
router.use(requireAuth);

// Helper: verify book ownership and active status
async function verifyBookAccess(bookId: string, userId: string) {
  const book = await getBookById(bookId);
  if (!book || book.userId !== userId || book.deletedAt) {
    return null;
  }
  return book;
}


// ==========================================
// 1. STUDY OVERVIEW
// ==========================================

// GET /study/overview
router.get("/study/overview", async (req, res) => {
  try {
    const userId = req.user!.id;
    const overview = await globalFlashcardReviewService.getOverview(userId);
    res.json(overview);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message },
    });
  }
});

// ==========================================
// 2. SUMMARIES ENDPOINTS
// ==========================================

// GET /books/:bookId/study/summaries
router.get("/books/:bookId/study/summaries", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId } = req.params;

    const book = await verifyBookAccess(bookId, userId);
    if (!book) {
      res.status(404).json({
        success: false,
        error: { code: "BOOK_NOT_FOUND", message: "Book not found or access denied" },
      });
      return;
    }

    const summaries = await listStudySummariesByBook(bookId, userId);
    res.json({ items: summaries });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message },
    });
  }
});

// POST /books/:bookId/study/summaries
router.post("/books/:bookId/study/summaries", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId } = req.params;

    if (process.env.FEATURE_AI_STUDY === "false") {
      res.status(503).json({
        success: false,
        error: { code: "AI_STUDY_DISABLED", message: "AI Study features are currently disabled" },
      });
      return;
    }

    const book = await verifyBookAccess(bookId, userId);
    if (!book) {
      res.status(404).json({
        success: false,
        error: { code: "BOOK_NOT_FOUND", message: "Book not found or access denied" },
      });
      return;
    }

    const {
      scope,
      summaryType = "standard",
      includeHighlights = false,
      includeNotes = false,
      language = "es-MX",
    } = req.body || {};

    if (!scope || !scope.type) {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_REQUEST", message: "Scope is required" },
      });
      return;
    }

    const result = await globalStudySummaryService.generateSummary({
      bookId,
      userId,
      scope,
      summaryType,
      includeHighlights,
      includeNotes,
      language,
    });

    res.status(201).json(result);
  } catch (err: any) {
    const message = err.message || "";
    if (
      message === "INVALID_PAGE_RANGE" ||
      message === "INVALID_PAGE_NUMBER" ||
      message === "NO_HIGHLIGHTS_FOUND" ||
      message === "NO_EVIDENCE_FOUND"
    ) {
      res.status(400).json({
        success: false,
        error: { code: message, message: "Invalid scope or insufficient evidence" },
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message },
    });
  }
});

// GET /books/:bookId/study/summaries/:summaryId
router.get("/books/:bookId/study/summaries/:summaryId", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId, summaryId } = req.params;

    const book = await verifyBookAccess(bookId, userId);
    if (!book) {
      res.status(404).json({
        success: false,
        error: { code: "BOOK_NOT_FOUND", message: "Book not found or access denied" },
      });
      return;
    }

    const detail = await findStudySummaryById(summaryId, userId);
    if (!detail || detail.summary.bookId !== bookId) {
      res.status(404).json({
        success: false,
        error: { code: "SUMMARY_NOT_FOUND", message: "Summary not found" },
      });
      return;
    }

    res.json(detail);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message },
    });
  }
});

// DELETE /books/:bookId/study/summaries/:summaryId
router.delete("/books/:bookId/study/summaries/:summaryId", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId, summaryId } = req.params;

    const detail = await findStudySummaryById(summaryId, userId);
    if (!detail || detail.summary.bookId !== bookId) {
      res.status(404).json({
        success: false,
        error: { code: "SUMMARY_NOT_FOUND", message: "Summary not found" },
      });
      return;
    }

    await deleteStudySummary(summaryId, userId);
    res.json({ success: true, message: "Summary deleted" });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message },
    });
  }
});

// ==========================================
// 3. CONCEPTS ENDPOINTS
// ==========================================

// GET /books/:bookId/study/concepts
router.get("/books/:bookId/study/concepts", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId } = req.params;

    const book = await verifyBookAccess(bookId, userId);
    if (!book) {
      res.status(404).json({
        success: false,
        error: { code: "BOOK_NOT_FOUND", message: "Book not found or access denied" },
      });
      return;
    }

    const concepts = await listStudyConceptsByBook(bookId, userId);
    res.json({ items: concepts });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message },
    });
  }
});

// POST /books/:bookId/study/concepts/generate
router.post("/books/:bookId/study/concepts/generate", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId } = req.params;

    if (process.env.FEATURE_AI_STUDY === "false") {
      res.status(503).json({
        success: false,
        error: { code: "AI_STUDY_DISABLED", message: "AI Study features are currently disabled" },
      });
      return;
    }

    const book = await verifyBookAccess(bookId, userId);
    if (!book) {
      res.status(404).json({
        success: false,
        error: { code: "BOOK_NOT_FOUND", message: "Book not found or access denied" },
      });
      return;
    }

    const { scope, count = 10 } = req.body || {};
    if (!scope || !scope.type) {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_REQUEST", message: "Scope is required" },
      });
      return;
    }

    const created = await globalStudyConceptService.generateConcepts({
      bookId,
      userId,
      scope,
      count,
    });

    res.status(201).json({ items: created });
  } catch (err: any) {
    const message = err.message || "";
    if (
      message === "INVALID_PAGE_RANGE" ||
      message === "INVALID_PAGE_NUMBER" ||
      message === "NO_EVIDENCE_FOUND"
    ) {
      res.status(400).json({
        success: false,
        error: { code: message, message: "Invalid scope or insufficient evidence" },
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message },
    });
  }
});

// ==========================================
// 4. FLASHCARD DECKS ENDPOINTS
// ==========================================

// GET /books/:bookId/study/decks
router.get("/books/:bookId/study/decks", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId } = req.params;

    const book = await verifyBookAccess(bookId, userId);
    if (!book) {
      res.status(404).json({
        success: false,
        error: { code: "BOOK_NOT_FOUND", message: "Book not found or access denied" },
      });
      return;
    }

    const decks = await listFlashcardDecksByBook(bookId, userId);
    const enriched = [];
    for (const d of decks) {
      const cards = await listFlashcardsByDeck(d.id, userId);
      const queue = await listDueFlashcards(bookId, userId, { deckId: d.id });
      enriched.push({
        ...d,
        cardsCount: cards.length,
        dueCount: queue.dueCount,
      });
    }

    res.json({ items: enriched });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message },
    });
  }
});

// POST /books/:bookId/study/decks
router.post("/books/:bookId/study/decks", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId } = req.params;

    const book = await verifyBookAccess(bookId, userId);
    if (!book) {
      res.status(404).json({
        success: false,
        error: { code: "BOOK_NOT_FOUND", message: "Book not found or access denied" },
      });
      return;
    }

    const { title, scope } = req.body || {};
    if (!title || !title.trim() || !scope || !scope.type) {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_REQUEST", message: "Title and scope are required" },
      });
      return;
    }

    const deck = await createFlashcardDeck({
      userId,
      bookId,
      title: title.trim(),
      scopeType: scope.type,
      scopeData: scope,
      generationVersion: 1,
    });

    res.status(201).json(deck);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message },
    });
  }
});

// GET /books/:bookId/study/decks/:deckId
router.get("/books/:bookId/study/decks/:deckId", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId, deckId } = req.params;

    const deck = await findFlashcardDeckById(deckId, userId);
    if (!deck || deck.bookId !== bookId) {
      res.status(404).json({
        success: false,
        error: { code: "DECK_NOT_FOUND", message: "Deck not found" },
      });
      return;
    }

    const cards = await listFlashcardsByDeck(deckId, userId);
    const queue = await listDueFlashcards(bookId, userId, { deckId });

    res.json({
      deck,
      cardsCount: cards.length,
      dueCount: queue.dueCount,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message },
    });
  }
});

// PATCH /books/:bookId/study/decks/:deckId
router.patch("/books/:bookId/study/decks/:deckId", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId, deckId } = req.params;

    const deck = await findFlashcardDeckById(deckId, userId);
    if (!deck || deck.bookId !== bookId) {
      res.status(404).json({
        success: false,
        error: { code: "DECK_NOT_FOUND", message: "Deck not found" },
      });
      return;
    }

    const { title } = req.body || {};
    const updated = await updateFlashcardDeck(deckId, userId, { title });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message },
    });
  }
});

// DELETE /books/:bookId/study/decks/:deckId
router.delete("/books/:bookId/study/decks/:deckId", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId, deckId } = req.params;

    const deck = await findFlashcardDeckById(deckId, userId);
    if (!deck || deck.bookId !== bookId) {
      res.status(404).json({
        success: false,
        error: { code: "DECK_NOT_FOUND", message: "Deck not found" },
      });
      return;
    }

    await deleteFlashcardDeck(deckId, userId);
    res.json({ success: true, message: "Deck deleted" });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message },
    });
  }
});

// ==========================================
// 5. FLASHCARDS GENERATION & CRUD
// ==========================================

// POST /books/:bookId/study/decks/:deckId/generate
router.post("/books/:bookId/study/decks/:deckId/generate", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId, deckId } = req.params;

    if (process.env.FEATURE_AI_STUDY === "false") {
      res.status(503).json({
        success: false,
        error: { code: "AI_STUDY_DISABLED", message: "AI Study features are currently disabled" },
      });
      return;
    }

    const deck = await findFlashcardDeckById(deckId, userId);
    if (!deck || deck.bookId !== bookId) {
      res.status(404).json({
        success: false,
        error: { code: "DECK_NOT_FOUND", message: "Deck not found" },
      });
      return;
    }

    const { count = 10, cardTypes } = req.body || {};

    const cards = await globalFlashcardService.generateFlashcardsForDeck({
      deckId,
      bookId,
      userId,
      count,
      cardTypes,
    });

    res.status(201).json({ items: cards });
  } catch (err: any) {
    const message = err.message || "";
    if (message === "DECK_NOT_FOUND" || message === "BOOK_NOT_FOUND") {
      res.status(404).json({
        success: false,
        error: { code: message, message },
      });
      return;
    }
    if (message === "NO_EVIDENCE_FOUND" || message === "INVALID_PAGE_RANGE") {
      res.status(400).json({
        success: false,
        error: { code: message, message },
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message },
    });
  }
});

// GET /books/:bookId/study/decks/:deckId/cards
router.get("/books/:bookId/study/decks/:deckId/cards", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId, deckId } = req.params;

    const deck = await findFlashcardDeckById(deckId, userId);
    if (!deck || deck.bookId !== bookId) {
      res.status(404).json({
        success: false,
        error: { code: "DECK_NOT_FOUND", message: "Deck not found" },
      });
      return;
    }

    const cards = await listFlashcardsByDeck(deckId, userId);
    res.json({ items: cards });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message },
    });
  }
});

// POST /books/:bookId/study/decks/:deckId/cards (Manual card creation)
router.post("/books/:bookId/study/decks/:deckId/cards", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId, deckId } = req.params;

    const deck = await findFlashcardDeckById(deckId, userId);
    if (!deck || deck.bookId !== bookId) {
      res.status(404).json({
        success: false,
        error: { code: "DECK_NOT_FOUND", message: "Deck not found" },
      });
      return;
    }

    const { cardType = "question", front, back, explanation, sourcePage } = req.body || {};
    if (!front || !front.trim() || !back || !back.trim()) {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_REQUEST", message: "Front and back are required" },
      });
      return;
    }

    const card = await globalFlashcardService.createManualCard(deckId, bookId, userId, {
      cardType,
      front: front.trim(),
      back: back.trim(),
      explanation,
      sourcePage,
    });

    res.status(201).json(card);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message },
    });
  }
});

// PATCH /books/:bookId/study/cards/:cardId
router.patch("/books/:bookId/study/cards/:cardId", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId, cardId } = req.params;

    const card = await findFlashcardById(cardId, userId);
    if (!card || card.bookId !== bookId) {
      res.status(404).json({
        success: false,
        error: { code: "CARD_NOT_FOUND", message: "Card not found" },
      });
      return;
    }

    const { front, back, explanation, difficulty } = req.body || {};
    const updated = await updateFlashcard(cardId, userId, {
      front,
      back,
      explanation,
      difficulty,
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message },
    });
  }
});

// DELETE /books/:bookId/study/cards/:cardId
router.delete("/books/:bookId/study/cards/:cardId", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId, cardId } = req.params;

    const card = await findFlashcardById(cardId, userId);
    if (!card || card.bookId !== bookId) {
      res.status(404).json({
        success: false,
        error: { code: "CARD_NOT_FOUND", message: "Card not found" },
      });
      return;
    }

    await deleteFlashcard(cardId, userId);
    res.json({ success: true, message: "Flashcard deleted" });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message },
    });
  }
});

// ==========================================
// 6. REVIEW & REPETITION ENDPOINTS
// ==========================================

// GET /books/:bookId/study/review
router.get("/books/:bookId/study/review", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId } = req.params;

    const book = await verifyBookAccess(bookId, userId);
    if (!book) {
      res.status(404).json({
        success: false,
        error: { code: "BOOK_NOT_FOUND", message: "Book not found or access denied" },
      });
      return;
    }

    const deckId = typeof req.query.deckId === "string" ? req.query.deckId : undefined;
    const all = req.query.all === "true" || (req.query as any).all === true;

    const queue = await globalFlashcardReviewService.getReviewQueue(bookId, userId, {
      deckId,
      all,
    });

    res.json(queue);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message },
    });
  }
});

// POST /books/:bookId/study/cards/:cardId/review
router.post("/books/:bookId/study/cards/:cardId/review", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId, cardId } = req.params;

    const card = await findFlashcardById(cardId, userId);
    if (!card || card.bookId !== bookId) {
      res.status(404).json({
        success: false,
        error: { code: "CARD_NOT_FOUND", message: "Card not found" },
      });
      return;
    }

    const { rating } = req.body || {};
    if (!rating || !["again", "hard", "good", "easy"].includes(rating)) {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_RATING", message: "Rating must be one of again, hard, good, easy" },
      });
      return;
    }

    const result = await globalFlashcardReviewService.submitReview(
      cardId,
      userId,
      rating as ReviewRating,
    );

    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message },
    });
  }
});

// ==========================================
// 7. STUDY SESSIONS ENDPOINTS
// ==========================================

// POST /books/:bookId/study/sessions
router.post("/books/:bookId/study/sessions", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId } = req.params;

    const book = await verifyBookAccess(bookId, userId);
    if (!book) {
      res.status(404).json({
        success: false,
        error: { code: "BOOK_NOT_FOUND", message: "Book not found or access denied" },
      });
      return;
    }

    const { deckId } = req.body || {};
    const session = await globalFlashcardReviewService.startSession(bookId, userId, deckId);
    res.status(201).json(session);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message },
    });
  }
});

// PATCH /books/:bookId/study/sessions/:sessionId/complete
router.patch("/books/:bookId/study/sessions/:sessionId/complete", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { sessionId } = req.params;

    const {
      cardsSeen = 0,
      cardsAgain = 0,
      cardsHard = 0,
      cardsGood = 0,
      cardsEasy = 0,
    } = req.body || {};

    const session = await globalFlashcardReviewService.completeSession(sessionId, userId, {
      cardsSeen,
      cardsAgain,
      cardsHard,
      cardsGood,
      cardsEasy,
    });

    res.json(session);
  } catch (err: any) {
    if (err.message === "SESSION_NOT_FOUND") {
      res.status(404).json({
        success: false,
        error: { code: "SESSION_NOT_FOUND", message: "Session not found" },
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message },
    });
  }
});

export default router;
