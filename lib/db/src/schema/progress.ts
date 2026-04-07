import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const progressTable = pgTable("progress_entries", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull().default("other"),
  description: text("description"),
  status: text("status").notNull().default("not_started"),
  toolOrResource: text("tool_or_resource"),
  goalId: integer("goal_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProgressSchema = createInsertSchema(progressTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProgress = z.infer<typeof insertProgressSchema>;
export type ProgressEntry = typeof progressTable.$inferSelect;
