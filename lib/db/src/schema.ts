import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  serial,
  numeric,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const goalsTable = pgTable("goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  targetRole: text("target_role").notNull(),
  description: text("description"),
  skills: text("skills").array(),
  progress: integer("progress").default(0),
  status: text("status").default("active"),
  targetYear: integer("target_year"),
  pinned: boolean("pinned").default(false),
  archived: boolean("archived").default(false),
  reflection: text("reflection"),
  achievedAt: timestamp("achieved_at"),
  targetDate: timestamp("target_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const progressTable = pgTable("progress_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  category: text("category").default("other"),
  description: text("description"),
  status: text("status").default("not_started"),
  toolOrResource: text("tool_or_resource"),
  resourceUrl: text("resource_url"),
  durationHours: numeric("duration_hours").default("0"),
  completedAt: timestamp("completed_at"),
  goalId: integer("goal_id"),
  pinned: boolean("pinned").default(false),
  archived: boolean("archived").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const roadmapTable = pgTable("roadmap_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  yearTarget: integer("year_target").notNull(),
  phase: text("phase").default("short_term"),
  status: text("status").default("planned"),
  goalId: integer("goal_id"),
  order: integer("order").default(0),
  pinned: boolean("pinned").default(false),
  archived: boolean("archived").default(false),
  reflection: text("reflection"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const remindersTable = pgTable("reminders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  priority: text("priority").default("medium"),
  completed: boolean("completed").default(false),
  category: text("category").default("other"),
  recurrence: text("recurrence"),
  recurrenceCount: integer("recurrence_count").default(0),
  parentReminderId: integer("parent_reminder_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const activityTable = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(),
  label: text("label").notNull(),
  refId: integer("ref_id"),
  action: text("action"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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

export type User = typeof usersTable.$inferSelect;
export type Goal = typeof goalsTable.$inferSelect;
export type Progress = typeof progressTable.$inferSelect;
export type RoadmapItem = typeof roadmapTable.$inferSelect;
export type Reminder = typeof remindersTable.$inferSelect;
export type WeeklyReview = typeof weeklyReviewsTable.$inferSelect;
export type NewWeeklyReview = typeof weeklyReviewsTable.$inferInsert;

export const jobsTable = pgTable("jobs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  company: text("company"),
  description: text("description").notNull(),
  keywords: text("keywords").array().default([]),
  skills: text("skills").array().default([]),
  notes: text("notes"),
  status: text("status").default("saved"),
  url: text("url"),
  applyDate: timestamp("apply_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const profileTable = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  tagline: text("tagline").default(""),
  about: text("about").default(""),
  expertise: text("expertise").array().default([]),
  skills: text("skills").array().default([]),
  interests: text("interests").array().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const activityLogTable = pgTable("activity_log_v2", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  relatedId: integer("related_id"),
  action: text("action"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
