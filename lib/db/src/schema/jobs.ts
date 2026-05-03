import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";

export const jobsTable = pgTable("jobs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  company: text("company"),
  description: text("description").notNull(),
  keywords: text("keywords").array().notNull().default([]),
  skills: text("skills").array().notNull().default([]),
  notes: text("notes"),
  status: text("status").notNull().default("saved"),
  url: text("url"),
  applyDate: timestamp("apply_date", { withTimezone: true }),
  interviewQuestions: text("interview_questions").array().notNull().default([]),
  interviewAnswers: text("interview_answers").array().notNull().default([]),
  pinned: integer("pinned").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Job = typeof jobsTable.$inferSelect;
