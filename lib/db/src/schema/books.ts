import { pgTable, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { usersTable } from "./users";

export const booksTable = pgTable("books", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  author: varchar("author", { length: 255 }),
  totalPages: integer("total_pages").notNull().default(0),
  currentPage: integer("current_page").notNull().default(1),
  coverUrl: text("cover_url"),
  sourceType: varchar("source_type", { length: 30 }).notNull().default("sample"), // sample | pdf
  processingStatus: varchar("processing_status", { length: 30 }).notNull().default("ready"), // uploading | validating | analyzing | ready_for_processing | processing | ready | failed
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBookSchema = createInsertSchema(booksTable);
export const selectBookSchema = createSelectSchema(booksTable);

export type Book = typeof booksTable.$inferSelect;
export type InsertBook = typeof booksTable.$inferInsert;
