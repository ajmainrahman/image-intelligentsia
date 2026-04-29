import { Router } from "express";
import { eq, and, gte, lte, lt, sql } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  goalsTable,
  progressTable,
  roadmapTable,
  remindersTable,
  weeklyReviewsTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router = Router();

function startOfWeek(d: Date) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  dt.setDate(dt.getDate() - dt.getDay());
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

// GET /api/goals/:id/detail
router.get("/goals/:id/detail", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [goal] = await db.select().from(goalsTable)
      .where(and(eq(goalsTable.id, id), eq(goalsTable.userId, req.userId!)));
    if (!goal) { res.status(404).json({ error: "Goal not found" }); return; }
    const learningEntries = await db.select().from(progressTable)
      .where(and(eq(progressTable.goalId, id), eq(progressTable.userId, req.userId!)));
    const milestones = await db.select().from(roadmapTable)
      .where(and(eq(roadmapTable.goalId, id), eq(roadmapTable.userId, req.userId!)));
    res.json({ goal, learningEntries, milestones });
  } catch (err) { next(err); }
});

// PUT /api/goals/:id/achieve
router.put("/goals/:id/achieve", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const { reflection } = req.body;
    const [updated] = await db.update(goalsTable)
      .set({ status: "completed", reflection: reflection ?? null, achievedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(goalsTable.id, id), eq(goalsTable.userId, req.userId!)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Goal not found" }); return; }
    const learningEntries = await db.select().from(progressTable)
      .where(and(eq(progressTable.goalId, id), eq(progressTable.userId, req.userId!)));
    const milestones = await db.select().from(roadmapTable)
      .where(and(eq(roadmapTable.goalId, id), eq(roadmapTable.userId, req.userId!)));
    const totalHours = learningEntries.reduce((sum, e) => sum + Number(e.durationHours ?? 0), 0);
    res.json({
      goal: updated,
      learningEntries,
      milestones,
      summary: {
        totalHours,
        entriesCount: learningEntries.length,
        milestonesCompleted: milestones.filter((m) => m.status === "completed").length,
        milestonesTotal: milestones.length,
      },
    });
  } catch (err) { next(err); }
});

// GET /api/weekly-review
router.get("/weekly-review", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const userId = req.userId!;
    const offset = Number(req.query.offset ?? 0);
    const refDate = addDays(new Date(), -7 * offset);
    const weekStart = startOfWeek(refDate);
    const weekEnd = endOfWeek(refDate);

    const entries = await db.select().from(progressTable)
      .where(and(eq(progressTable.userId, userId), gte(progressTable.createdAt, weekStart), lte(progressTable.createdAt, weekEnd)));
    const weekGoals = await db.select().from(goalsTable)
      .where(and(eq(goalsTable.userId, userId), gte(goalsTable.updatedAt, weekStart), lte(goalsTable.updatedAt, weekEnd)));
    const hoursLogged = entries.reduce((sum, e) => sum + Number(e.durationHours ?? 0), 0);

    const existing = await db.select().from(weeklyReviewsTable)
      .where(and(eq(weeklyReviewsTable.userId, userId), gte(weeklyReviewsTable.weekStart, weekStart), lte(weeklyReviewsTable.weekEnd, weekEnd)));

    let review;
    if (existing.length === 0) {
      [review] = await db.insert(weeklyReviewsTable).values({
        userId, weekStart, weekEnd,
        hoursLogged, entriesCompleted: entries.length, goalsProgressed: weekGoals.length,
      }).returning();
    } else {
      review = existing[0];
    }
    res.json({ review, entries, goals: weekGoals });
  } catch (err) { next(err); }
});

// PUT /api/weekly-review/:id/notes
router.put("/weekly-review/:id/notes", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const { notes } = req.body;
    const [updated] = await db.update(weeklyReviewsTable)
      .set({ notes })
      .where(eq(weeklyReviewsTable.id, id))
      .returning();
    res.json(updated);
  } catch (err) { next(err); }
});

// GET /api/skills-gap
router.get("/skills-gap", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const userId = req.userId!;
    const userGoals = await db.select().from(goalsTable).where(eq(goalsTable.userId, userId));
    const entries = await db.select().from(progressTable).where(eq(progressTable.userId, userId));

    const goalSkills = new Set<string>();
    userGoals.forEach((g) => (g.skills ?? []).forEach((s) => goalSkills.add(s.toLowerCase().trim())));

    const learnedSkills = new Set<string>();
    entries.forEach((e) => {
      if (e.title) learnedSkills.add(e.title.toLowerCase().trim());
      if (e.toolOrResource) learnedSkills.add(e.toolOrResource.toLowerCase().trim());
    });

    const gaps = [...goalSkills].filter((s) => !learnedSkills.has(s));
    const covered = [...goalSkills].filter((s) => learnedSkills.has(s));

    res.json({
      goalSkills: [...goalSkills],
      learnedSkills: [...learnedSkills],
      gaps,
      covered,
      coveragePercent: goalSkills.size === 0 ? 100 : Math.round((covered.length / goalSkills.size) * 100),
    });
  } catch (err) { next(err); }
});

// GET /api/due-warnings
router.get("/due-warnings", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const userId = req.userId!;
    const now = new Date();
    const in7 = addDays(now, 7);

    const overdueReminders = await db.select().from(remindersTable)
      .where(and(eq(remindersTable.userId, userId), lt(remindersTable.dueDate, now), eq(remindersTable.completed, false)));
    const soonReminders = await db.select().from(remindersTable)
      .where(and(eq(remindersTable.userId, userId), gte(remindersTable.dueDate, now), lte(remindersTable.dueDate, in7), eq(remindersTable.completed, false)));
    const overdueGoals = await db.select().from(goalsTable)
      .where(and(eq(goalsTable.userId, userId), lt(goalsTable.targetDate, now), sql`${goalsTable.status} != 'completed'`));
    const soonGoals = await db.select().from(goalsTable)
      .where(and(eq(goalsTable.userId, userId), gte(goalsTable.targetDate, now), lte(goalsTable.targetDate, in7), sql`${goalsTable.status} != 'completed'`));

    res.json({ overdueReminders, soonReminders, overdueGoals, soonGoals });
  } catch (err) { next(err); }
});

// PUT /api/reminders/:id/complete (recurring)
router.put("/reminders/:id/complete", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const [current] = await db.select().from(remindersTable)
      .where(and(eq(remindersTable.id, id), eq(remindersTable.userId, req.userId!)));
    if (!current) { res.status(404).json({ error: "Reminder not found" }); return; }

    const [completed] = await db.update(remindersTable)
      .set({ completed: true, updatedAt: new Date() })
      .where(eq(remindersTable.id, id))
      .returning();

    let nextReminder = null;
    if (current.recurrence && current.dueDate) {
      const nextDue = new Date(current.dueDate);
      if (current.recurrence === "daily") nextDue.setDate(nextDue.getDate() + 1);
      else if (current.recurrence === "weekly") nextDue.setDate(nextDue.getDate() + 7);
      else if (current.recurrence === "monthly") nextDue.setMonth(nextDue.getMonth() + 1);

      [nextReminder] = await db.insert(remindersTable).values({
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
      }).returning();
    }
    res.json({ completed, nextReminder });
  } catch (err) { next(err); }
});

export default router;
