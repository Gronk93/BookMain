import { pgTable, varchar, integer, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { usersTable } from "./users";
import { booksTable } from "./books";

export const aiUsageTable = pgTable(
  "ai_usage",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    bookId: varchar("book_id", { length: 36 }).references(() => booksTable.id, { onDelete: "cascade" }),
    operation: varchar("operation", { length: 32 }).notNull(),
    provider: varchar("provider", { length: 32 }).notNull().default("mock"),
    model: varchar("model", { length: 64 }).notNull(),
    inputUnits: integer("input_units").notNull().default(0),
    outputUnits: integer("output_units").notNull().default(0),
    durationMs: integer("duration_ms").notNull().default(0),
    estimatedCost: varchar("estimated_cost", { length: 32 }).notNull().default("0.0000"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ai_usage_user_idx").on(table.userId, table.createdAt),
    index("ai_usage_book_idx").on(table.bookId),
  ],
);

export const insertAiUsageSchema = createInsertSchema(aiUsageTable);
export const selectAiUsageSchema = createSelectSchema(aiUsageTable);

export type AiUsage = typeof aiUsageTable.$inferSelect;
export type InsertAiUsage = typeof aiUsageTable.$inferInsert;
