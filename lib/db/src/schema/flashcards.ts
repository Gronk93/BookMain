import { pgTable, varchar, text, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { usersTable } from "./users";
import { booksTable } from "./books";
import { flashcardDecksTable } from "./flashcard-decks";

export const flashcardsTable = pgTable(
  "flashcards",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    deckId: varchar("deck_id", { length: 36 })
      .notNull()
      .references(() => flashcardDecksTable.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    bookId: varchar("book_id", { length: 36 })
      .notNull()
      .references(() => booksTable.id, { onDelete: "cascade" }),
    cardType: varchar("card_type", { length: 32 }).notNull(), // 'concept' | 'question' | 'cloze'
    origin: varchar("origin", { length: 32 }).notNull().default("manual"), // 'ai' | 'manual'
    front: text("front").notNull(),
    back: text("back").notNull(),
    explanation: text("explanation"),
    sourcePage: integer("source_page"),
    sourceAnchorData: jsonb("source_anchor_data"),
    contentHash: varchar("content_hash", { length: 64 }).notNull(),
    sourceHash: varchar("source_hash", { length: 64 }),
    difficulty: varchar("difficulty", { length: 32 }).notNull().default("medium"),
    status: varchar("status", { length: 32 }).notNull().default("ready"), // 'ready' | 'outdated'
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("flashcards_deck_idx").on(table.deckId),
    index("flashcards_user_book_idx").on(table.userId, table.bookId),
  ],
);

export const insertFlashcardSchema = createInsertSchema(flashcardsTable);
export const selectFlashcardSchema = createSelectSchema(flashcardsTable);

export type Flashcard = typeof flashcardsTable.$inferSelect;
export type InsertFlashcard = typeof flashcardsTable.$inferInsert;
