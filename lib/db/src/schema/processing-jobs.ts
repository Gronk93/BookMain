import { pgTable, varchar, text, integer, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { booksTable } from "./books";

export interface ProcessingJobSummary {
  totalPages: number;
  digitalPages: number;
  scannedPages: number;
  hybridPages: number;
  blankPages: number;
  ocrPages: number;
  lowConfidencePages: number;
  processingDurationMs?: number;
  ocrDurationMs?: number;
}

export const processingJobsTable = pgTable(
  "processing_jobs",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    bookId: varchar("book_id", { length: 36 })
      .notNull()
      .references(() => booksTable.id, { onDelete: "cascade" }),
    jobType: varchar("job_type", { length: 50 }).notNull().default("pdf_ingestion"), // pdf_ingestion | pdf_processing | ocr_reprocess
    status: varchar("status", { length: 30 }).notNull().default("pending"), // pending | running | completed | failed | cancelled
    stage: varchar("stage", { length: 50 }).notNull().default("pending"),
    progressPercent: integer("progress_percent").notNull().default(0),
    attempt: integer("attempt").notNull().default(1),
    processedPages: integer("processed_pages").notNull().default(0),
    totalPages: integer("total_pages").notNull().default(0),
    errorCode: varchar("error_code", { length: 50 }),
    errorMessageSafe: text("error_message_safe"),
    errorMessage: text("error_message"),
    summary: jsonb("summary").$type<ProcessingJobSummary>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("processing_jobs_book_id_idx").on(table.bookId),
    index("processing_jobs_status_idx").on(table.status),
  ],
);

export const insertProcessingJobSchema = createInsertSchema(processingJobsTable);
export const selectProcessingJobSchema = createSelectSchema(processingJobsTable);

export type ProcessingJob = typeof processingJobsTable.$inferSelect;
export type InsertProcessingJob = typeof processingJobsTable.$inferInsert;
