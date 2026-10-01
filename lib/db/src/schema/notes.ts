import { pgTable, varchar, text, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { usersTable } from "./users";
import { booksTable } from "./books";
import { highlightsTable } from "./highlights";

export const notesTable = pgTable(
  "notes",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    bookId: varchar("book_id", { length: 36 })
      .notNull()
      .references(() => booksTable.id, { onDelete: "cascade" }),
    pageNumber: integer("page_number").notNull(),
    highlightId: varchar("highlight_id", { length: 36 }).references(() => highlightsTable.id, { onDelete: "set null" }),
    highlightText: text("highlight_text"),
    selectedText: text("selected_text"),
    anchorData: jsonb("anchor_data"),
    content: text("content").notNull(),
    color: varchar("color", { length: 30 }).notNull().default("amber"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("notes_user_book_idx").on(table.userId, table.bookId),
    index("notes_book_page_idx").on(table.bookId, table.pageNumber),
  ],
);

export const insertNoteSchema = createInsertSchema(notesTable);
export const selectNoteSchema = createSelectSchema(notesTable);

export type Note = typeof notesTable.$inferSelect;
export type InsertNote = typeof notesTable.$inferInsert;
