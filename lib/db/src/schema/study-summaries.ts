import { pgTable, varchar, text, integer, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { usersTable } from "./users";
import { booksTable } from "./books";

export const studySummariesTable = pgTable(
  "study_summaries",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    bookId: varchar("book_id", { length: 36 })
      .notNull()
      .references(() => booksTable.id, { onDelete: "cascade" }),
    scopeType: varchar("scope_type", { length: 32 }).notNull(),
    scopeData: jsonb("scope_data").notNull(),
    summaryType: varchar("summary_type", { length: 32 }).notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    language: varchar("language", { length: 16 }).notNull().default("es-MX"),
    isPersonal: boolean("is_personal").notNull().default(false),
    includeHighlights: boolean("include_highlights").notNull().default(false),
    includeNotes: boolean("include_notes").notNull().default(false),
    generationVersion: integer("generation_version").notNull().default(1),
    promptVersion: varchar("prompt_version", { length: 32 }).notNull().default("1.0"),
    sourceHash: varchar("source_hash", { length: 64 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("ready"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("study_summaries_user_book_idx").on(table.userId, table.bookId),
    index("study_summaries_book_idx").on(table.bookId),
  ],
);

export const insertStudySummarySchema = createInsertSchema(studySummariesTable);
export const selectStudySummarySchema = createSelectSchema(studySummariesTable);

export type StudySummary = typeof studySummariesTable.$inferSelect;
export type InsertStudySummary = typeof studySummariesTable.$inferInsert;
