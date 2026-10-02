import { pgTable, varchar, integer, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { usersTable } from "./users";
import { booksTable } from "./books";
import { flashcardDecksTable } from "./flashcard-decks";

export const studySessionsTable = pgTable(
  "study_sessions",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    bookId: varchar("book_id", { length: 36 })
      .notNull()
      .references(() => booksTable.id, { onDelete: "cascade" }),
    deckId: varchar("deck_id", { length: 36 })
      .references(() => flashcardDecksTable.id, { onDelete: "set null" }),
    sessionType: varchar("session_type", { length: 32 }).notNull().default("flashcard_review"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cardsSeen: integer("cards_seen").notNull().default(0),
    cardsAgain: integer("cards_again").notNull().default(0),
    cardsHard: integer("cards_hard").notNull().default(0),
    cardsGood: integer("cards_good").notNull().default(0),
    cardsEasy: integer("cards_easy").notNull().default(0),
  },
  (table) => [
    index("study_sessions_user_book_idx").on(table.userId, table.bookId),
  ],
);

export const insertStudySessionSchema = createInsertSchema(studySessionsTable);
export const selectStudySessionSchema = createSelectSchema(studySessionsTable);

export type StudySession = typeof studySessionsTable.$inferSelect;
export type InsertStudySession = typeof studySessionsTable.$inferInsert;
