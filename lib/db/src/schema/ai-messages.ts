import { pgTable, varchar, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { aiConversationsTable } from "./ai-conversations";

export const aiMessagesTable = pgTable(
  "ai_messages",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    conversationId: varchar("conversation_id", { length: 36 })
      .notNull()
      .references(() => aiConversationsTable.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 32 }).notNull(), // user, assistant, system
    content: text("content").notNull(),
    model: varchar("model", { length: 64 }),
    provider: varchar("provider", { length: 32 }),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    promptVersion: varchar("prompt_version", { length: 32 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ai_messages_conversation_idx").on(table.conversationId),
  ],
);

export const insertAiMessageSchema = createInsertSchema(aiMessagesTable);
export const selectAiMessageSchema = createSelectSchema(aiMessagesTable);

export type AiMessage = typeof aiMessagesTable.$inferSelect;
export type InsertAiMessage = typeof aiMessagesTable.$inferInsert;
