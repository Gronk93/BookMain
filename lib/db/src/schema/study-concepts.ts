import { pgTable, varchar, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { usersTable } from "./users";
import { booksTable } from "./books";

export const studyConceptsTable = pgTable(
  "study_concepts",
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
    term: varchar("term", { length: 255 }).notNull(),
    definition: text("definition").notNull(),
    simpleExplanation: text("simple_explanation"),
    importance: varchar("importance", { length: 32 }).notNull().default("high"),
    sourceHash: varchar("source_hash", { length: 64 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("ready"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("study_concepts_user_book_idx").on(table.userId, table.bookId),
    index("study_concepts_book_idx").on(table.bookId),
  ],
);

export const insertStudyConceptSchema = createInsertSchema(studyConceptsTable);
export const selectStudyConceptSchema = createSelectSchema(studyConceptsTable);

export type StudyConcept = typeof studyConceptsTable.$inferSelect;
export type InsertStudyConcept = typeof studyConceptsTable.$inferInsert;
