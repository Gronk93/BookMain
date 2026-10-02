import { defaultRepetitionEngine, type ReviewRating } from "./spaced-repetition.engine";
import {
  findFlashcardById,
  createFlashcardReview,
  getLatestReviewForCard,
  listDueFlashcards,
  createStudySession,
  findStudySessionById,
  completeStudySession,
  getStudyOverview,
} from "../../lib/repository";

export class FlashcardReviewService {
  async getReviewQueue(
    bookId: string,
    userId: string,
    options?: { deckId?: string; all?: boolean },
  ) {
    return await listDueFlashcards(bookId, userId, options);
  }

  async submitReview(
    cardId: string,
    userId: string,
    rating: ReviewRating,
  ) {
    const card = await findFlashcardById(cardId, userId);
    if (!card) {
      throw new Error("CARD_NOT_FOUND");
    }

    const latestReview = await getLatestReviewForCard(cardId, userId);
    const prevInterval = latestReview ? latestReview.nextIntervalDays : 0;

    const schedule = defaultRepetitionEngine.calculateNextReview(rating, prevInterval);

    const review = await createFlashcardReview({
      userId,
      flashcardId: cardId,
      rating,
      previousIntervalDays: schedule.previousIntervalDays,
      nextIntervalDays: schedule.nextIntervalDays,
      dueAt: schedule.dueAt,
    });

    return {
      review,
      nextDueAt: schedule.dueAt.toISOString(),
      nextIntervalDays: schedule.nextIntervalDays,
    };
  }

  async startSession(bookId: string, userId: string, deckId?: string | null) {
    return await createStudySession({
      userId,
      bookId,
      deckId: deckId || null,
      sessionType: "flashcard_review",
    });
  }

  async completeSession(
    sessionId: string,
    userId: string,
    counters: {
      cardsSeen: number;
      cardsAgain: number;
      cardsHard: number;
      cardsGood: number;
      cardsEasy: number;
    },
  ) {
    const session = await findStudySessionById(sessionId, userId);
    if (!session) {
      throw new Error("SESSION_NOT_FOUND");
    }

    return await completeStudySession(sessionId, userId, counters);
  }

  async getOverview(userId: string) {
    return await getStudyOverview(userId);
  }
}

export const defaultReviewService = new FlashcardReviewService();
