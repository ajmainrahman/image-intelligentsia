import { Router } from "express";
import { eq, and, lte, gte } from "drizzle-orm";
import { db, goalsTable, progressTable, jobsTable, remindersTable, roadmapTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router = Router();

router.get("/dashboard/summary", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const uid = req.userId!;
    const [goals, progress, jobs, reminders, roadmap] = await Promise.all([
      db.select().from(goalsTable).where(eq(goalsTable.userId, uid)),
      db.select().from(progressTable).where(eq(progressTable.userId, uid)),
      db.select().from(jobsTable).where(eq(jobsTable.userId, uid)),
      db.select().from(remindersTable).where(eq(remindersTable.userId, uid)),
      db.select().from(roadmapTable).where(eq(roadmapTable.userId, uid)),
    ]);
    res.json({
      totalGoals: goals.length,
      activeGoals: goals.filter(g => g.status === "active").length,
      progressCompleted: progress.filter(p => p.status === "completed").length,
      progressInProgress: progress.filter(p => p.status === "in_progress").length,
      totalJobs: jobs.length,
      appliedJobs: jobs.filter(j => j.status === "applied" || j.status === "interviewing").length,
      pendingReminders: reminders.filter(r => !r.completed).length,
      roadmapCompleted: roadmap.filter(r => r.status === "completed").length,
      roadmapTotal: roadmap.length,
    });
  } catch (err) { next(err); }
});

router.get("/dashboard/top-skills", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const jobs = await db.select({ skills: jobsTable.skills }).from(jobsTable)
      .where(eq(jobsTable.userId, req.userId!));
    const skillCount: Record<string, number> = {};
    for (const job of jobs) {
      for (const skill of job.skills ?? []) {
        const k = skill.trim().toLowerCase();
        if (k) skillCount[k] = (skillCount[k] ?? 0) + 1;
      }
    }
    const topSkills = Object.entries(skillCount)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
    res.json(topSkills);
  } catch (err) { next(err); }
});

router.get("/dashboard/recent-activity", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const uid = req.userId!;
    const [goals, progress, jobs, reminders, roadmap] = await Promise.all([
      db.select().from(goalsTable).where(eq(goalsTable.userId, uid)).orderBy(goalsTable.createdAt).limit(5),
      db.select().from(progressTable).where(eq(progressTable.userId, uid)).orderBy(progressTable.createdAt).limit(5),
      db.select().from(jobsTable).where(eq(jobsTable.userId, uid)).orderBy(jobsTable.createdAt).limit(5),
      db.select().from(remindersTable).where(eq(remindersTable.userId, uid)).orderBy(remindersTable.createdAt).limit(5),
      db.select().from(roadmapTable).where(eq(roadmapTable.userId, uid)).orderBy(roadmapTable.createdAt).limit(5),
    ]);
    const activity = [
      ...goals.map(g => ({ id: g.id, type: "goal", title: g.title, action: `Goal: ${g.status}`, createdAt: g.createdAt.toISOString() })),
      ...progress.map(p => ({ id: p.id, type: "progress", title: p.title, action: `Progress: ${p.status}`, createdAt: p.createdAt.toISOString() })),
      ...jobs.map(j => ({ id: j.id, type: "job", title: j.title, action: `Job: ${j.status}`, createdAt: j.createdAt.toISOString() })),
      ...reminders.map(r => ({ id: r.id, type: "reminder", title: r.title, action: `Reminder`, createdAt: r.createdAt.toISOString() })),
      ...roadmap.map(r => ({ id: r.id, type: "roadmap", title: r.title, action: `Roadmap: ${r.status}`, createdAt: r.createdAt.toISOString() })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 15);
    res.json(activity);
  } catch (err) { next(err); }
});

// ── Due warnings ─────────────────────────────────────────────
router.get("/due-warnings", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const uid = req.userId!;
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [reminders, goals] = await Promise.all([
      db.select().from(remindersTable).where(eq(remindersTable.userId, uid)),
      db.select().from(goalsTable).where(eq(goalsTable.userId, uid)),
    ]);

    const overdueReminders = reminders.filter(r =>
      !r.completed && r.dueDate && new Date(r.dueDate) < now
    ).map(r => ({ id: r.id, title: r.title, dueDate: r.dueDate }));

    const soonReminders = reminders.filter(r =>
      !r.completed && r.dueDate &&
      new Date(r.dueDate) >= now &&
      new Date(r.dueDate) <= in7Days
    ).map(r => ({ id: r.id, title: r.title, dueDate: r.dueDate }));

    const overdueGoals = goals.filter(g =>
      g.status === "active" &&
      g.targetYear &&
      g.targetYear < now.getFullYear()
    ).map(g => ({ id: g.id, title: g.title, targetYear: g.targetYear }));

    const soonGoals = goals.filter(g =>
      g.status === "active" &&
      g.targetYear &&
      g.targetYear === now.getFullYear()
    ).map(g => ({ id: g.id, title: g.title, targetYear: g.targetYear }));

    res.json({ overdueReminders, soonReminders, overdueGoals, soonGoals });
  } catch (err) { next(err); }
});

// ── Skills gap analysis ───────────────────────────────────────
router.get("/skills-gap", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const uid = req.userId!;
    const [goals, progress] = await Promise.all([
      db.select({ skills: goalsTable.skills }).from(goalsTable).where(eq(goalsTable.userId, uid)),
      db.select({ title: progressTable.title, category: progressTable.category })
        .from(progressTable).where(eq(progressTable.userId, uid)),
    ]);

    // Collect all skills from goals
    const goalSkillsSet = new Set<string>();
    for (const g of goals) {
      for (const s of g.skills ?? []) {
        goalSkillsSet.add(s.trim().toLowerCase());
      }
    }
    const goalSkills = Array.from(goalSkillsSet);

    // Collect all skills from progress titles/categories as a proxy
    const learnedSkills = new Set<string>();
    for (const p of progress) {
      learnedSkills.add(p.title.trim().toLowerCase());
      learnedSkills.add(p.category.trim().toLowerCase());
      // Split title words as potential skill matches
      for (const word of p.title.split(/\s+/)) {
        learnedSkills.add(word.trim().toLowerCase());
      }
    }

    const covered = goalSkills.filter(s => learnedSkills.has(s));
    const gaps = goalSkills.filter(s => !learnedSkills.has(s));
    const coveragePercent = goalSkills.length > 0
      ? Math.round((covered.length / goalSkills.length) * 100)
      : 0;

    res.json({ goalSkills, covered, gaps, coveragePercent });
  } catch (err) { next(err); }
});

export default router;
