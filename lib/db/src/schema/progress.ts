import { pgTable, text, serial, timestamp, integer, numeric, boolean } from "drizzle-orm/pg-core";

export const progressTable = pgTable("progress_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  category: text("category").notNull().default("other"),
  description: text("description"),
  status: text("status").notNull().default("not_started"),
  toolOrResource: text("tool_or_resource"),
  resourceUrl: text("resource_url"),
  durationHours: numeric("duration_hours", { precision: 8, scale: 2 }).notNull().default("0"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  goalId: integer("goal_id"),
  pinned: boolean("pinned").notNull().default(false),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type ProgressEntry = typeof progressTable.$inferSelect;
