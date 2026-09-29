import { pgTable, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { usersTable } from "./users";
import { booksTable } from "./books";

export const readingProgressTable = pgTable("reading_progress", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  bookId: varchar("book_id", { length: 36 })
    .notNull()
    .references(() => booksTable.id, { onDelete: "cascade" }),
  currentPage: integer("current_page").notNull().default(1),
  progressPercent: integer("progress_percent").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  lastReadAt: timestamp("last_read_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReadingProgressSchema = createInsertSchema(readingProgressTable);
export const selectReadingProgressSchema = createSelectSchema(readingProgressTable);

export type ReadingProgress = typeof readingProgressTable.$inferSelect;
export type InsertReadingProgress = typeof readingProgressTable.$inferInsert;
