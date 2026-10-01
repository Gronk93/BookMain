import { pgTable, varchar, integer, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { usersTable } from "./users";
import { booksTable } from "./books";

export const separatorsTable = pgTable(
  "separators",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    bookId: varchar("book_id", { length: 36 })
      .notNull()
      .references(() => booksTable.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    startPage: integer("start_page").notNull(),
    endPage: integer("end_page").notNull(),
    color: varchar("color", { length: 32 }).notNull().default("indigo"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("separators_user_book_idx").on(table.userId, table.bookId),
  ],
);

export const insertSeparatorSchema = createInsertSchema(separatorsTable);
export const selectSeparatorSchema = createSelectSchema(separatorsTable);

export type Separator = typeof separatorsTable.$inferSelect;
export type InsertSeparator = typeof separatorsTable.$inferInsert;
