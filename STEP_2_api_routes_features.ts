// ============================================================
// FILE: artifacts/api-server/src/routes/features.ts  (NEW FILE)
// ============================================================
// Register in artifacts/api-server/src/app.ts:
//   import featuresRouter from "./routes/features.js";
//   app.use("/api", featuresRouter);
// ============================================================

import { Router } from "express";
import { db } from "@workspace/db";
import {
  goals,
  progressEntries,
  roadmapItems,
  reminders,
  weeklyReviews,
} from "@workspace/db/schema";
import { eq, and, gte, lte, lt, sql } from "drizzle-orm";
import { serialize } from "../lib/serialize.js";
import { z } from "zod/v4";

const router = Router();

// ─── Helper ─────────────────────────────────────────────────
function startOfWeek(d: Date) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  dt.setDate(dt.getDate() - dt.getDay()); // Sunday
  return dt;
}
function endOfWeek(d: Date) {
  const dt = startOfWeek(d);
  dt.setDate(dt.getDate() + 6);
  dt.setHours(23, 59, 59, 999);
  return dt;
}
function addDays(d: Date, n: number) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + n);
  return dt;
}

// ════════════════════════════════════════════════════════════
// FEATURE 16 — Goal Detail Page
// GET /api/goals/:id/detail
// ════════════════════════════════════════════════════════════
router.get("/goals/:id/detail", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [goal] = await db.select().from(goals).where(eq(goals.id, id));
  if (!goal) return res.status(404).json({ error: "Goal not found" });

  const learningEntries = await db
    .select()
    .from(progressEntries)
    .where(eq(progressEntries.goalId, id));

  const milestones = await db
    .select()
    .from(roadmapItems)
    .where(eq(roadmapItems.goalId, id));

  return res.json(
    serialize({
      goal,
      learningEntries,
      milestones,
    })
  );
});

// ════════════════════════════════════════════════════════════
// FEATURE 15 — Weekly Review Page
// GET /api/weekly-review?userId=X&offset=0
// offset=0 → current week, offset=1 → last week
// ════════════════════════════════════════════════════════════
router.get("/weekly-review", async (req, res) => {
  const userId = Number(req.query.userId);
  const offset = Number(req.query.offset ?? 0);
  if (isNaN(userId)) return res.status(400).json({ error: "Invalid userId" });

  const now = new Date();
  const refDate = addDays(now, -7 * offset);
  const weekStart = startOfWeek(refDate);
  const weekEnd = endOfWeek(refDate);

  // Entries completed this week (use updatedAt or createdAt)
  const entries = await db
    .select()
    .from(progressEntries)
    .where(
      and(
        eq(progressEntries.userId, userId),
        gte(progressEntries.createdAt, weekStart),
        lte(progressEntries.createdAt, weekEnd)
      )
    );

  // Goals that had status change to "in_progress" or "achieved"
  const weekGoals = await db
    .select()
    .from(goals)
    .where(
      and(
        eq(goals.userId, userId),
        gte(goals.updatedAt, weekStart),
        lte(goals.updatedAt, weekEnd)
      )
    );

  const hoursLogged = entries.reduce((sum, e) => sum + (e.hoursSpent ?? 0), 0);

  // Upsert weekly review snapshot
  const existing = await db
    .select()
    .from(weeklyReviews)
    .where(
      and(
        eq(weeklyReviews.userId, userId),
        gte(weeklyReviews.weekStart, weekStart),
        lte(weeklyReviews.weekEnd, weekEnd)
      )
    );

  let review;
  if (existing.length === 0) {
    [review] = await db
      .insert(weeklyReviews)
      .values({
        userId,
        weekStart,
        weekEnd,
        hoursLogged,
        entriesCompleted: entries.length,
        goalsProgressed: weekGoals.length,
      })
      .returning();
  } else {
    review = existing[0];
  }

  return res.json(
    serialize({
      review,
      entries,
      goals: weekGoals,
    })
  );
});

// PUT /api/weekly-review/:id/notes
router.put("/weekly-review/:id/notes", async (req, res) => {
  const id = Number(req.params.id);
  const { notes } = req.body;
  const [updated] = await db
    .update(weeklyReviews)
    .set({ notes })
    .where(eq(weeklyReviews.id, id))
    .returning();
  return res.json(serialize(updated));
});

// ════════════════════════════════════════════════════════════
// FEATURE 23 — Skills Gap Analysis
// GET /api/skills-gap?userId=X
// ════════════════════════════════════════════════════════════
router.get("/skills-gap", async (req, res) => {
  const userId = Number(req.query.userId);
  if (isNaN(userId)) return res.status(400).json({ error: "Invalid userId" });

  const userGoals = await db
    .select()
    .from(goals)
    .where(eq(goals.userId, userId));

  const entries = await db
    .select()
    .from(progressEntries)
    .where(eq(progressEntries.userId, userId));

  // Aggregate skills from goals (goals.skills is a text array)
  const goalSkills = new Set<string>();
  userGoals.forEach((g) => {
    (g.skills ?? []).forEach((s: string) => goalSkills.add(s.toLowerCase().trim()));
  });

  // Aggregate skills from learning entries
  const learnedSkills = new Set<string>();
  entries.forEach((e) => {
    (e.skills ?? []).forEach((s: string) =>
      learnedSkills.add(s.toLowerCase().trim())
    );
    if (e.title) learnedSkills.add(e.title.toLowerCase().trim());
  });

  const gaps = [...goalSkills].filter((s) => !learnedSkills.has(s));
  const covered = [...goalSkills].filter((s) => learnedSkills.has(s));
  const extra = [...learnedSkills].filter((s) => !goalSkills.has(s));

  return res.json(
    serialize({
      goalSkills: [...goalSkills],
      learnedSkills: [...learnedSkills],
      gaps,
      covered,
      extraSkills: extra,
      coveragePercent:
        goalSkills.size === 0
          ? 100
          : Math.round((covered.length / goalSkills.size) * 100),
    })
  );
});

// ════════════════════════════════════════════════════════════
// FEATURE 19 — Due-date Warning
// GET /api/due-warnings?userId=X
// Returns items due within 7 days or already overdue
// ════════════════════════════════════════════════════════════
router.get("/due-warnings", async (req, res) => {
  const userId = Number(req.query.userId);
  if (isNaN(userId)) return res.status(400).json({ error: "Invalid userId" });

  const now = new Date();
  const in7 = addDays(now, 7);

  const overdueReminders = await db
    .select()
    .from(reminders)
    .where(
      and(
        eq(reminders.userId, userId),
        lt(reminders.dueDate, now),
        eq(reminders.completed, false)
      )
    );

  const soonReminders = await db
    .select()
    .from(reminders)
    .where(
      and(
        eq(reminders.userId, userId),
        gte(reminders.dueDate, now),
        lte(reminders.dueDate, in7),
        eq(reminders.completed, false)
      )
    );

  const overdueGoals = await db
    .select()
    .from(goals)
    .where(
      and(
        eq(goals.userId, userId),
        lt(goals.targetDate, now),
        sql`${goals.status} != 'achieved'`
      )
    );

  const soonGoals = await db
    .select()
    .from(goals)
    .where(
      and(
        eq(goals.userId, userId),
        gte(goals.targetDate, now),
        lte(goals.targetDate, in7),
        sql`${goals.status} != 'achieved'`
      )
    );

  return res.json(
    serialize({
      overdueReminders,
      soonReminders,
      overdueGoals,
      soonGoals,
    })
  );
});

// ════════════════════════════════════════════════════════════
// FEATURE 11 — Milestone Reflection
// PUT /api/roadmap/:id/complete
// Body: { reflection?: string }
// ════════════════════════════════════════════════════════════
router.put("/roadmap/:id/complete", async (req, res) => {
  const id = Number(req.params.id);
  const { reflection } = req.body;

  const [updated] = await db
    .update(roadmapItems)
    .set({
      completed: true,
      reflection: reflection ?? null,
      updatedAt: new Date(),
    })
    .where(eq(roadmapItems.id, id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Milestone not found" });
  return res.json(serialize(updated));
});

// ════════════════════════════════════════════════════════════
// FEATURE 10 — Goal Retrospective
// PUT /api/goals/:id/achieve
// Body: { reflection?: string }
// Returns summary of all linked activity
// ════════════════════════════════════════════════════════════
router.put("/goals/:id/achieve", async (req, res) => {
  const id = Number(req.params.id);
  const { reflection } = req.body;

  const [updated] = await db
    .update(goals)
    .set({
      status: "achieved",
      reflection: reflection ?? null,
      achievedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(goals.id, id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Goal not found" });

  const learningEntries = await db
    .select()
    .from(progressEntries)
    .where(eq(progressEntries.goalId, id));

  const milestones = await db
    .select()
    .from(roadmapItems)
    .where(eq(roadmapItems.goalId, id));

  const totalHours = learningEntries.reduce(
    (sum, e) => sum + (e.hoursSpent ?? 0),
    0
  );

  return res.json(
    serialize({
      goal: updated,
      learningEntries,
      milestones,
      summary: {
        totalHours,
        entriesCount: learningEntries.length,
        milestonesCompleted: milestones.filter((m) => m.completed).length,
        milestonesTotal: milestones.length,
      },
    })
  );
});

// ════════════════════════════════════════════════════════════
// FEATURE 13 — Recurring Reminders
// PUT /api/reminders/:id/complete  (replaces simple complete)
// Auto-creates next reminder when recurrence is set
// ════════════════════════════════════════════════════════════
router.put("/reminders/:id/complete", async (req, res) => {
  const id = Number(req.params.id);

  const [current] = await db
    .select()
    .from(reminders)
    .where(eq(reminders.id, id));
  if (!current) return res.status(404).json({ error: "Reminder not found" });

  const [completed] = await db
    .update(reminders)
    .set({ completed: true, updatedAt: new Date() })
    .where(eq(reminders.id, id))
    .returning();

  let nextReminder = null;

  if (current.recurrence && current.dueDate) {
    const nextDue = new Date(current.dueDate);
    if (current.recurrence === "daily") nextDue.setDate(nextDue.getDate() + 1);
    else if (current.recurrence === "weekly")
      nextDue.setDate(nextDue.getDate() + 7);
    else if (current.recurrence === "monthly")
      nextDue.setMonth(nextDue.getMonth() + 1);

    [nextReminder] = await db
      .insert(reminders)
      .values({
        userId: current.userId,
        title: current.title,
        description: current.description,
        priority: current.priority,
        category: current.category,
        dueDate: nextDue,
        completed: false,
        recurrence: current.recurrence,
        recurrenceCount: (current.recurrenceCount ?? 0) + 1,
        parentReminderId: current.parentReminderId ?? current.id,
      })
      .returning();
  }

  return res.json(serialize({ completed, nextReminder }));
});

// PUT /api/reminders/:id/recurrence
// Set or update recurrence on an existing reminder
router.put("/reminders/:id/recurrence", async (req, res) => {
  const id = Number(req.params.id);
  const schema = z.object({
    recurrence: z.enum(["daily", "weekly", "monthly"]).nullable(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });

  const [updated] = await db
    .update(reminders)
    .set({ recurrence: parsed.data.recurrence, updatedAt: new Date() })
    .where(eq(reminders.id, id))
    .returning();

  return res.json(serialize(updated));
});

export default router;
