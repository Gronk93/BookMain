import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { usersTable } from "./users";

export const userPreferencesTable = pgTable("user_preferences", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .unique()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  language: varchar("language", { length: 10 }).notNull().default("es-MX"),
  theme: varchar("theme", { length: 20 }).notNull().default("system"),
  readingMode: varchar("reading_mode", { length: 20 }).notNull().default("standard"),
  fontSize: varchar("font_size", { length: 10 }).notNull().default("medium"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferencesTable);
export const selectUserPreferencesSchema = createSelectSchema(userPreferencesTable);

export type UserPreferences = typeof userPreferencesTable.$inferSelect;
export type InsertUserPreferences = typeof userPreferencesTable.$inferInsert;
