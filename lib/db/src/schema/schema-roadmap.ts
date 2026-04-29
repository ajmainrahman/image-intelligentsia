import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const roadmapTable = pgTable("roadmap_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  yearTarget: integer("year_target").notNull(),
  phase: text("phase").notNull().default("short_term"),
  status: text("status").notNull().default("planned"),
  goalId: integer("goal_id"),
  order: integer("order").notNull().default(0),
  pinned: boolean("pinned").notNull().default(false),
  archived: boolean("archived").notNull().default(false),
  reflection: text("reflection"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type RoadmapItem = typeof roadmapTable.$inferSelect;
