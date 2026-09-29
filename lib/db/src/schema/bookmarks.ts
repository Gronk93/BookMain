import { pgTable, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { usersTable } from "./users";
import { booksTable } from "./books";

export const bookmarksTable = pgTable("bookmarks", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  bookId: varchar("book_id", { length: 36 })
    .notNull()
    .references(() => booksTable.id, { onDelete: "cascade" }),
  pageNumber: integer("page_number").notNull(),
  title: varchar("title", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBookmarkSchema = createInsertSchema(bookmarksTable);
export const selectBookmarkSchema = createSelectSchema(bookmarksTable);

export type Bookmark = typeof bookmarksTable.$inferSelect;
export type InsertBookmark = typeof bookmarksTable.$inferInsert;
