import { pgTable, varchar, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { usersTable } from "./users";
import { booksTable } from "./books";

export const flashcardDecksTable = pgTable(
  "flashcard_decks",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    bookId: varchar("book_id", { length: 36 })
      .notNull()
      .references(() => booksTable.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    scopeType: varchar("scope_type", { length: 32 }).notNull(),
    scopeData: jsonb("scope_data").notNull(),
    generationVersion: integer("generation_version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("flashcard_decks_user_book_idx").on(table.userId, table.bookId),
    index("flashcard_decks_book_idx").on(table.bookId),
  ],
);

export const insertFlashcardDeckSchema = createInsertSchema(flashcardDecksTable);
export const selectFlashcardDeckSchema = createSelectSchema(flashcardDecksTable);

export type FlashcardDeck = typeof flashcardDecksTable.$inferSelect;
export type InsertFlashcardDeck = typeof flashcardDecksTable.$inferInsert;
