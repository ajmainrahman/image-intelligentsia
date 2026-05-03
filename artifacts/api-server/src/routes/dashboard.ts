import { Router } from "express";
import { eq } from "drizzle-orm";
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
    const pinnedJobs = jobs.filter((j) => (j.pinned ?? 0) > 0);
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
      pinnedJobs: pinnedJobs.length,
    });
  } catch (err) { next(err); }
});

router.get("/dashboard/skill-gap", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const uid = req.userId!;
    const [goals, progress, jobs] = await Promise.all([
      db.select({ skills: goalsTable.skills }).from(goalsTable).where(eq(goalsTable.userId, uid)),
      db.select({ title: progressTable.title, category: progressTable.category }).from(progressTable).where(eq(progressTable.userId, uid)),
      db.select({ skills: jobsTable.skills }).from(jobsTable).where(eq(jobsTable.userId, uid)),
    ]);

    const goalSkills = new Set<string>();
    for (const g of goals) for (const s of g.skills ?? []) goalSkills.add(s.trim().toLowerCase());
    const learnedSkills = new Set<string>();
    for (const p of progress) {
      learnedSkills.add(p.title.trim().toLowerCase());
      learnedSkills.add(p.category.trim().toLowerCase());
      p.title.split(/\s+/).forEach((word) => learnedSkills.add(word.trim().toLowerCase()));
    }
    for (const j of jobs) for (const s of j.skills ?? []) learnedSkills.add(s.trim().toLowerCase());

    const covered = [...goalSkills].filter((s) => learnedSkills.has(s));
    const gaps = [...goalSkills].filter((s) => !learnedSkills.has(s));
    const coveragePercent = goalSkills.size > 0 ? Math.round((covered.length / goalSkills.size) * 100) : 0;
    const studyPlan = gaps.slice(0, 5).map((skill) => ({ skill, action: `Study ${skill} for 30 minutes` }));

    res.json({ goalSkills: [...goalSkills], covered, gaps, coveragePercent, studyPlan });
  } catch (err) { next(err); }
});

export default router;
