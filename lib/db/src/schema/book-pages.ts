import { pgTable, varchar, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { booksTable } from "./books";

export const bookPagesTable = pgTable("book_pages", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  bookId: varchar("book_id", { length: 36 })
    .notNull()
    .references(() => booksTable.id, { onDelete: "cascade" }),
  pageNumber: integer("page_number").notNull(),
  textContent: text("text_content").notNull().default(""),
  ocrConfidence: integer("ocr_confidence"),
  isBlank: boolean("is_blank").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBookPageSchema = createInsertSchema(bookPagesTable);
export const selectBookPageSchema = createSelectSchema(bookPagesTable);

export type BookPage = typeof bookPagesTable.$inferSelect;
export type InsertBookPage = typeof bookPagesTable.$inferInsert;
