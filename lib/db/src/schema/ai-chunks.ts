import { pgTable, varchar, text, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { booksTable } from "./books";

export const aiChunksTable = pgTable(
  "ai_chunks",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    bookId: varchar("book_id", { length: 36 })
      .notNull()
      .references(() => booksTable.id, { onDelete: "cascade" }),
    pageNumber: integer("page_number").notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    text: text("text").notNull(),
    textHash: varchar("text_hash", { length: 64 }).notNull(),
    startBlockId: varchar("start_block_id", { length: 64 }).notNull(),
    startOffset: integer("start_offset").notNull(),
    endBlockId: varchar("end_block_id", { length: 64 }).notNull(),
    endOffset: integer("end_offset").notNull(),
    tokenCount: integer("token_count").notNull().default(0),
    qualityScore: integer("quality_score"),
    textSource: varchar("text_source", { length: 32 }).notNull().default("extracted"),
    embedding: jsonb("embedding").$type<number[]>(),
    embeddingModel: varchar("embedding_model", { length: 64 }).notNull().default("mock-embedding-v1"),
    embeddingVersion: varchar("embedding_version", { length: 32 }).notNull().default("1.0"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ai_chunks_book_page_idx").on(table.bookId, table.pageNumber),
    index("ai_chunks_book_idx").on(table.bookId),
  ],
);

export const insertAiChunkSchema = createInsertSchema(aiChunksTable);
export const selectAiChunkSchema = createSelectSchema(aiChunksTable);

export type AiChunk = typeof aiChunksTable.$inferSelect;
export type InsertAiChunk = typeof aiChunksTable.$inferInsert;
