import { Router, type IRouter } from "express";
import { db, goalsTable, progressTable, jobsTable, remindersTable, roadmapTable } from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetTopSkillsResponse,
  GetRecentActivityResponse,
} from "@workspace/api-zod";
import { serializeRow } from "../lib/serialize.js";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const [goals, progress, jobs, reminders, roadmap] = await Promise.all([
    db.select().from(goalsTable),
    db.select().from(progressTable),
    db.select().from(jobsTable),
    db.select().from(remindersTable),
    db.select().from(roadmapTable),
  ]);

  const summary = {
    totalGoals: goals.length,
    activeGoals: goals.filter((g) => g.status === "active").length,
    progressCompleted: progress.filter((p) => p.status === "completed").length,
    progressInProgress: progress.filter((p) => p.status === "in_progress").length,
    totalJobs: jobs.length,
    appliedJobs: jobs.filter((j) => j.status === "applied" || j.status === "interviewing").length,
    pendingReminders: reminders.filter((r) => !r.completed).length,
    roadmapCompleted: roadmap.filter((r) => r.status === "completed").length,
    roadmapTotal: roadmap.length,
  };

  res.json(GetDashboardSummaryResponse.parse(summary));
});

router.get("/dashboard/top-skills", async (_req, res): Promise<void> => {
  const jobs = await db.select({ skills: jobsTable.skills }).from(jobsTable);

  const skillCount: Record<string, number> = {};
  for (const job of jobs) {
    for (const skill of job.skills ?? []) {
      const normalized = skill.trim().toLowerCase();
      if (normalized) {
        skillCount[normalized] = (skillCount[normalized] ?? 0) + 1;
      }
    }
  }

  const topSkills = Object.entries(skillCount)
    .map(([skill, count]) => ({ skill, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  res.json(GetTopSkillsResponse.parse(topSkills));
});

router.get("/dashboard/recent-activity", async (_req, res): Promise<void> => {
  const [goals, progress, jobs, reminders, roadmap] = await Promise.all([
    db.select().from(goalsTable).orderBy(goalsTable.createdAt).limit(5),
    db.select().from(progressTable).orderBy(progressTable.createdAt).limit(5),
    db.select().from(jobsTable).orderBy(jobsTable.createdAt).limit(5),
    db.select().from(remindersTable).orderBy(remindersTable.createdAt).limit(5),
    db.select().from(roadmapTable).orderBy(roadmapTable.createdAt).limit(5),
  ]);

  const activity = [
    ...goals.map((g) => ({ id: g.id, type: "goal" as const, title: g.title, action: `Goal: ${g.status}`, createdAt: g.createdAt.toISOString() })),
    ...progress.map((p) => ({ id: p.id, type: "progress" as const, title: p.title, action: `Progress: ${p.status}`, createdAt: p.createdAt.toISOString() })),
    ...jobs.map((j) => ({ id: j.id, type: "job" as const, title: j.title, action: `Job: ${j.status}`, createdAt: j.createdAt.toISOString() })),
    ...reminders.map((r) => ({ id: r.id, type: "reminder" as const, title: r.title, action: `Reminder: ${r.completed ? "completed" : "pending"}`, createdAt: r.createdAt.toISOString() })),
    ...roadmap.map((r) => ({ id: r.id, type: "roadmap" as const, title: r.title, action: `Roadmap: ${r.status}`, createdAt: r.createdAt.toISOString() })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 15);

  res.json(GetRecentActivityResponse.parse(activity));
});

export default router;
