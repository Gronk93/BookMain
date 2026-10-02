import { pgTable, varchar, integer, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { usersTable } from "./users";
import { flashcardsTable } from "./flashcards";

export const flashcardReviewsTable = pgTable(
  "flashcard_reviews",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    flashcardId: varchar("flashcard_id", { length: 36 })
      .notNull()
      .references(() => flashcardsTable.id, { onDelete: "cascade" }),
    rating: varchar("rating", { length: 16 }).notNull(), // 'again' | 'hard' | 'good' | 'easy'
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull().defaultNow(),
    previousIntervalDays: integer("previous_interval_days").notNull().default(0),
    nextIntervalDays: integer("next_interval_days").notNull().default(1),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("flashcard_reviews_user_card_idx").on(table.userId, table.flashcardId),
    index("flashcard_reviews_due_idx").on(table.dueAt),
  ],
);

export const insertFlashcardReviewSchema = createInsertSchema(flashcardReviewsTable);
export const selectFlashcardReviewSchema = createSelectSchema(flashcardReviewsTable);

export type FlashcardReview = typeof flashcardReviewsTable.$inferSelect;
export type InsertFlashcardReview = typeof flashcardReviewsTable.$inferInsert;
