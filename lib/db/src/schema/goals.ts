import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";

export const goalsTable = pgTable("goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  targetRole: text("target_role").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"),
  targetYear: integer("target_year"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Goal = typeof goalsTable.$inferSelect;
