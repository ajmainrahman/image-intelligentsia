import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const roadmapTable = pgTable("roadmap_items", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  yearTarget: integer("year_target").notNull(),
  phase: text("phase").notNull().default("short_term"),
  status: text("status").notNull().default("planned"),
  goalId: integer("goal_id"),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertRoadmapSchema = createInsertSchema(roadmapTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRoadmapItem = z.infer<typeof insertRoadmapSchema>;
export type RoadmapItem = typeof roadmapTable.$inferSelect;
