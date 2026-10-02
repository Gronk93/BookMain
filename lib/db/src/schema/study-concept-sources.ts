import { pgTable, varchar, text, integer, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { booksTable } from "./books";
import { studyConceptsTable } from "./study-concepts";

export const studyConceptSourcesTable = pgTable(
  "study_concept_sources",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    conceptId: varchar("concept_id", { length: 36 })
      .notNull()
      .references(() => studyConceptsTable.id, { onDelete: "cascade" }),
    chunkId: varchar("chunk_id", { length: 36 }),
    bookId: varchar("book_id", { length: 36 })
      .notNull()
      .references(() => booksTable.id, { onDelete: "cascade" }),
    pageNumber: integer("page_number").notNull(),
    quote: text("quote").notNull(),
    rank: integer("rank").notNull().default(0),
  },
  (table) => [
    index("study_concept_sources_concept_idx").on(table.conceptId),
  ],
);

export const insertStudyConceptSourceSchema = createInsertSchema(studyConceptSourcesTable);
export const selectStudyConceptSourceSchema = createSelectSchema(studyConceptSourcesTable);

export type StudyConceptSource = typeof studyConceptSourcesTable.$inferSelect;
export type InsertStudyConceptSource = typeof studyConceptSourcesTable.$inferInsert;
