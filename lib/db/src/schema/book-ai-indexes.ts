import { pgTable, varchar, integer, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { booksTable } from "./books";

export const bookAiIndexesTable = pgTable(
  "book_ai_indexes",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    bookId: varchar("book_id", { length: 36 })
      .notNull()
      .references(() => booksTable.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 32 }).notNull().default("not_indexed"),
    indexVersion: varchar("index_version", { length: 32 }).notNull().default("bm-rag-v1"),
    embeddingModel: varchar("embedding_model", { length: 64 }).notNull().default("mock-embedding-v1"),
    embeddingVersion: varchar("embedding_version", { length: 32 }).notNull().default("1.0"),
    chunkCount: integer("chunk_count").notNull().default(0),
    indexedPageCount: integer("indexed_page_count").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("book_ai_indexes_book_idx").on(table.bookId),
    index("book_ai_indexes_status_idx").on(table.status),
  ],
);

export const insertBookAiIndexSchema = createInsertSchema(bookAiIndexesTable);
export const selectBookAiIndexSchema = createSelectSchema(bookAiIndexesTable);

export type BookAiIndex = typeof bookAiIndexesTable.$inferSelect;
export type InsertBookAiIndex = typeof bookAiIndexesTable.$inferInsert;
