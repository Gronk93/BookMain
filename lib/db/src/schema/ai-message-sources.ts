import { pgTable, varchar, text, integer, real, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { aiMessagesTable } from "./ai-messages";

export const aiMessageSourcesTable = pgTable(
  "ai_message_sources",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    messageId: varchar("message_id", { length: 36 })
      .notNull()
      .references(() => aiMessagesTable.id, { onDelete: "cascade" }),
    chunkId: varchar("chunk_id", { length: 36 }),
    bookId: varchar("book_id", { length: 36 }).notNull(),
    pageNumber: integer("page_number").notNull(),
    quote: text("quote").notNull(),
    startBlockId: varchar("start_block_id", { length: 64 }),
    startOffset: integer("start_offset"),
    endBlockId: varchar("end_block_id", { length: 64 }),
    endOffset: integer("end_offset"),
    retrievalScore: real("retrieval_score"),
    rank: integer("rank").notNull().default(1),
  },
  (table) => [
    index("ai_message_sources_message_idx").on(table.messageId),
    index("ai_message_sources_book_page_idx").on(table.bookId, table.pageNumber),
  ],
);

export const insertAiMessageSourceSchema = createInsertSchema(aiMessageSourcesTable);
export const selectAiMessageSourceSchema = createSelectSchema(aiMessageSourcesTable);

export type AiMessageSource = typeof aiMessageSourcesTable.$inferSelect;
export type InsertAiMessageSource = typeof aiMessageSourcesTable.$inferInsert;
