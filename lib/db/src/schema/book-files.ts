import { pgTable, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { booksTable } from "./books";

export const bookFilesTable = pgTable("book_files", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  bookId: varchar("book_id", { length: 36 })
    .notNull()
    .references(() => booksTable.id, { onDelete: "cascade" }),
  originalFilename: text("original_filename").notNull().default("document.pdf"),
  filePath: text("file_path").notNull(),
  fileSizeBytes: integer("file_size_bytes").notNull().default(0),
  mimeType: varchar("mime_type", { length: 100 }).notNull().default("application/pdf"),
  checksumSha256: varchar("checksum_sha256", { length: 64 }),
  storageProvider: varchar("storage_provider", { length: 50 }).notNull().default("local"),
  uploadStatus: varchar("upload_status", { length: 30 }).notNull().default("uploaded"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBookFileSchema = createInsertSchema(bookFilesTable);
export const selectBookFileSchema = createSelectSchema(bookFilesTable);

export type BookFile = typeof bookFilesTable.$inferSelect;
export type InsertBookFile = typeof bookFilesTable.$inferInsert;
