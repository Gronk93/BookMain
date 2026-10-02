import { pgTable, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { usersTable } from "./users";
import { booksTable } from "./books";

export const aiConversationsTable = pgTable(
  "ai_conversations",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    bookId: varchar("book_id", { length: 36 })
      .notNull()
      .references(() => booksTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    scopeType: varchar("scope_type", { length: 32 }).notNull().default("book"),
    scopeRef: text("scope_ref"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("ai_conversations_user_book_idx").on(table.userId, table.bookId),
  ],
);

export const insertAiConversationSchema = createInsertSchema(aiConversationsTable);
export const selectAiConversationSchema = createSelectSchema(aiConversationsTable);

export type AiConversation = typeof aiConversationsTable.$inferSelect;
export type InsertAiConversation = typeof aiConversationsTable.$inferInsert;
