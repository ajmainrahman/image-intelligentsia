// ============================================================
// FILE: lib/db/src/schema.ts  — ADD these columns/tables
// ============================================================
// Find your existing schema.ts and ADD the pieces below.
// Existing tables (goals, progress_entries, roadmap_items,
// reminders, jobs, users) stay untouched — only additions.
// ============================================================

import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  serial,
} from "drizzle-orm/pg-core";

// ── existing tables (reference only, do not re-declare) ──────
// export const goals = pgTable("goals", { ... });
// export const roadmapItems = pgTable("roadmap_items", { ... });
// export const reminders = pgTable("reminders", { ... });

// ── 1. Add to existing `goals` table ────────────────────────
//    ALTER: add reflection + achievedAt columns
//    In your schema add these two fields inside the goals table:
//
//    reflection:  text("reflection"),
//    achievedAt:  timestamp("achieved_at"),
//
// ── 2. Add to existing `roadmap_items` table ────────────────
//    ALTER: add reflection column
//    In your schema add inside the roadmap_items table:
//
//    reflection:  text("reflection"),
//
// ── 3. Add to existing `reminders` table ────────────────────
//    ALTER: add recurrence fields
//    In your schema add inside the reminders table:
//
//    recurrence:      text("recurrence"),        // "daily" | "weekly" | "monthly" | null
//    recurrenceCount: integer("recurrence_count").default(0),
//    parentReminderId: integer("parent_reminder_id"),

// ── NEW TABLE: weekly_reviews ────────────────────────────────
export const weeklyReviews = pgTable("weekly_reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  weekStart: timestamp("week_start").notNull(),
  weekEnd: timestamp("week_end").notNull(),
  hoursLogged: integer("hours_logged").default(0),
  entriesCompleted: integer("entries_completed").default(0),
  goalsProgressed: integer("goals_progressed").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Type exports ─────────────────────────────────────────────
export type WeeklyReview = typeof weeklyReviews.$inferSelect;
export type NewWeeklyReview = typeof weeklyReviews.$inferInsert;
