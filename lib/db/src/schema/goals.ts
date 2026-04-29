import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const goalsTable = pgTable("goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  targetRole: text("target_role").notNull(),
  description: text("description"),
  skills: text("skills").array().notNull().default([]),
  progress: integer("progress").notNull().default(0),
  status: text("status").notNull().default("active"),
  targetYear: integer("target_year"),
  pinned: boolean("pinned").notNull().default(false),
  archived: boolean("archived").notNull().default(false),
  reflection: text("reflection"),
  achievedAt: timestamp("achieved_at", { withTimezone: true }),
  targetDate: timestamp("target_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Goal = typeof goalsTable.$inferSelect;
