import { pgTable, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { booksTable } from "./books";

export const processingJobsTable = pgTable("processing_jobs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  bookId: varchar("book_id", { length: 36 })
    .notNull()
    .references(() => booksTable.id, { onDelete: "cascade" }),
  jobType: varchar("job_type", { length: 50 }).notNull().default("pdf_ingestion"),
  status: varchar("status", { length: 30 }).notNull().default("pending"), // pending | processing | completed | failed
  progressPercent: integer("progress_percent").notNull().default(0),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProcessingJobSchema = createInsertSchema(processingJobsTable);
export const selectProcessingJobSchema = createSelectSchema(processingJobsTable);

export type ProcessingJob = typeof processingJobsTable.$inferSelect;
export type InsertProcessingJob = typeof processingJobsTable.$inferInsert;
