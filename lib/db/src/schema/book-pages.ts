import {
  pgTable,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  real,
  jsonb,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { booksTable } from "./books";

export interface TextBlockItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  source?: "native" | "ocr";
}

export const bookPagesTable = pgTable(
  "book_pages",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    bookId: varchar("book_id", { length: 36 })
      .notNull()
      .references(() => booksTable.id, { onDelete: "cascade" }),
    pageNumber: integer("page_number").notNull(),
    pageType: varchar("page_type", { length: 30 }).notNull().default("digital"), // digital | scanned | hybrid | blank | unknown
    rawText: text("raw_text").notNull().default(""),
    normalizedText: text("normalized_text").notNull().default(""),
    textContent: text("text_content").notNull().default(""), // backward-compatible alias
    textSource: varchar("text_source", { length: 30 }).notNull().default("native"), // native | ocr | native_plus_ocr | none
    characterCount: integer("character_count").notNull().default(0),
    wordCount: integer("word_count").notNull().default(0),
    ocrRequired: boolean("ocr_required").notNull().default(false),
    ocrStatus: varchar("ocr_status", { length: 30 }).notNull().default("not_required"), // not_required | pending | running | completed | low_confidence | failed
    ocrConfidence: real("ocr_confidence"),
    qualityScore: real("quality_score").notNull().default(100),
    width: real("width"),
    height: real("height"),
    rotation: integer("rotation").notNull().default(0),
    previewPath: text("preview_path"),
    textBlocks: jsonb("text_blocks").$type<TextBlockItem[]>().default([]),
    parserVersion: varchar("parser_version", { length: 50 }),
    ocrVersion: varchar("ocr_version", { length: 50 }),
    isBlank: boolean("is_blank").notNull().default(false),
    contentHash: varchar("content_hash", { length: 64 }),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("book_pages_book_id_page_number_unique").on(table.bookId, table.pageNumber),
    index("book_pages_book_id_idx").on(table.bookId),
    index("book_pages_page_type_idx").on(table.pageType),
  ],
);

export const insertBookPageSchema = createInsertSchema(bookPagesTable);
export const selectBookPageSchema = createSelectSchema(bookPagesTable);

export type BookPage = typeof bookPagesTable.$inferSelect;
export type InsertBookPage = typeof bookPagesTable.$inferInsert;
