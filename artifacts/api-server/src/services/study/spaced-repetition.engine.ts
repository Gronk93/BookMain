export type ReviewRating = "again" | "hard" | "good" | "easy";

export interface RepetitionSchedule {
  previousIntervalDays: number;
  nextIntervalDays: number;
  dueAt: Date;
}

export interface ISpacedRepetitionEngine {
  calculateNextReview(
    rating: ReviewRating,
    previousIntervalDays?: number,
    baseDate?: Date,
  ): RepetitionSchedule;
}

export class SpacedRepetitionEngine implements ISpacedRepetitionEngine {
  calculateNextReview(
    rating: ReviewRating,
    previousIntervalDays: number = 0,
    baseDate: Date = new Date(),
  ): RepetitionSchedule {
    let nextIntervalDays: number;

    switch (rating) {
      case "again":
        // Due immediately/today (0 days)
        nextIntervalDays = 0;
        break;
      case "hard":
        // At least 1 day, moderate increase
        nextIntervalDays = previousIntervalDays <= 0 ? 1 : Math.max(1, Math.round(previousIntervalDays * 1.2));
        break;
      case "good":
        // At least 3 days, standard increase
        nextIntervalDays = previousIntervalDays <= 0 ? 3 : Math.max(3, Math.round(previousIntervalDays * 2.0));
        break;
      case "easy":
        // At least 7 days, accelerated increase
        nextIntervalDays = previousIntervalDays <= 0 ? 7 : Math.max(7, Math.round(previousIntervalDays * 3.0));
        break;
      default:
        nextIntervalDays = 1;
    }

    // Invariant check: ensure again < hard < good < easy
    if (rating === "hard" && nextIntervalDays <= 0) {
      nextIntervalDays = 1;
    }
    if (rating === "good" && nextIntervalDays <= 1) {
      nextIntervalDays = 3;
    }
    if (rating === "easy" && nextIntervalDays <= 3) {
      nextIntervalDays = 7;
    }

    const dueAt = new Date(baseDate.getTime() + nextIntervalDays * 24 * 60 * 60 * 1000);

    return {
      previousIntervalDays,
      nextIntervalDays,
      dueAt,
    };
  }
}

export const defaultRepetitionEngine = new SpacedRepetitionEngine();
