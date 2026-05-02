import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";

export const weeklyReviewsTable = pgTable("weekly_reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  weekStart: timestamp("week_start").notNull(),
  weekEnd: timestamp("week_end").notNull(),
  hoursLogged: integer("hours_logged").default(0),
  entriesCompleted: integer("entries_completed").default(0),
  goalsProgressed: integer("goals_progressed").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type WeeklyReview = typeof weeklyReviewsTable.$inferSelect;
export type NewWeeklyReview = typeof weeklyReviewsTable.$inferInsert;
