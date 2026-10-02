import { pgTable, varchar, text, integer, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { booksTable } from "./books";
import { studySummariesTable } from "./study-summaries";

export const studySummarySourcesTable = pgTable(
  "study_summary_sources",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    summaryId: varchar("summary_id", { length: 36 })
      .notNull()
      .references(() => studySummariesTable.id, { onDelete: "cascade" }),
    chunkId: varchar("chunk_id", { length: 36 }),
    bookId: varchar("book_id", { length: 36 })
      .notNull()
      .references(() => booksTable.id, { onDelete: "cascade" }),
    pageNumber: integer("page_number").notNull(),
    quote: text("quote").notNull(),
    startBlockId: varchar("start_block_id", { length: 64 }),
    startOffset: integer("start_offset"),
    endBlockId: varchar("end_block_id", { length: 64 }),
    endOffset: integer("end_offset"),
    rank: integer("rank").notNull().default(0),
  },
  (table) => [
    index("study_summary_sources_summary_idx").on(table.summaryId),
  ],
);

export const insertStudySummarySourceSchema = createInsertSchema(studySummarySourcesTable);
export const selectStudySummarySourceSchema = createSelectSchema(studySummarySourcesTable);

export type StudySummarySource = typeof studySummarySourcesTable.$inferSelect;
export type InsertStudySummarySource = typeof studySummarySourcesTable.$inferInsert;
