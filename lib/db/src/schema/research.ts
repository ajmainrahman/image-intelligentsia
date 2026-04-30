import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";

export const researchTable = pgTable("research", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  type: text("type").notNull().default("paper"),
  authors: text("authors"),
  source: text("source"),
  summary: text("summary"),
  tags: text("tags").array().notNull().default([]),
  status: text("status").notNull().default("to_explore"),
  notes: text("notes"),
  goalId: integer("goal_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Research = typeof researchTable.$inferSelect;
