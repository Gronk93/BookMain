import { pgTable, varchar, text, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { usersTable } from "./users";
import { booksTable } from "./books";

export interface BoundingBoxItem {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const highlightsTable = pgTable(
  "highlights",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    bookId: varchar("book_id", { length: 36 })
      .notNull()
      .references(() => booksTable.id, { onDelete: "cascade" }),
    pageNumber: integer("page_number").notNull(),
    anchorVersion: integer("anchor_version").notNull().default(1),
    startBlockId: varchar("start_block_id", { length: 64 }).notNull(),
    startOffset: integer("start_offset").notNull(),
    endBlockId: varchar("end_block_id", { length: 64 }).notNull(),
    endOffset: integer("end_offset").notNull(),
    exactText: text("exact_text").notNull(),
    prefixText: text("prefix_text"),
    suffixText: text("suffix_text"),
    textHash: varchar("text_hash", { length: 64 }).notNull(),
    color: varchar("color", { length: 32 }).notNull().default("yellow"),
    category: varchar("category", { length: 64 }),
    anchorStatus: varchar("anchor_status", { length: 32 }).notNull().default("resolved"),
    boundingBoxes: jsonb("bounding_boxes").$type<BoundingBoxItem[]>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("highlights_user_book_idx").on(table.userId, table.bookId),
    index("highlights_book_page_idx").on(table.bookId, table.pageNumber),
  ],
);

export const insertHighlightSchema = createInsertSchema(highlightsTable);
export const selectHighlightSchema = createSelectSchema(highlightsTable);

export type Highlight = typeof highlightsTable.$inferSelect;
export type InsertHighlight = typeof highlightsTable.$inferInsert;
