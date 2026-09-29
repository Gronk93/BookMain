import { pgTable, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { usersTable } from "./users";
import { booksTable } from "./books";

export const notesTable = pgTable("notes", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  bookId: varchar("book_id", { length: 36 })
    .notNull()
    .references(() => booksTable.id, { onDelete: "cascade" }),
  pageNumber: integer("page_number").notNull(),
  highlightText: text("highlight_text"),
  content: text("content").notNull(),
  color: varchar("color", { length: 30 }).notNull().default("amber"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertNoteSchema = createInsertSchema(notesTable);
export const selectNoteSchema = createSelectSchema(notesTable);

export type Note = typeof notesTable.$inferSelect;
export type InsertNote = typeof notesTable.$inferInsert;
