import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { db, jobsTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth.js";
import { logActivity } from "../lib/activity.js";

const router = Router();

const JobBody = z.object({
  title: z.string().min(1),
  company: z.string().nullable().optional(),
  description: z.string().min(1),
  keywords: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  notes: z.string().nullable().optional(),
  status: z.enum(["saved", "applied", "interviewing", "rejected", "offered"]).default("saved"),
  url: z.string().url().nullable().optional(),
  applyDate: z.string().nullable().optional(),
  interviewQuestions: z.array(z.string()).default([]),
  interviewAnswers: z.array(z.string()).default([]),
  pinned: z.boolean().default(false),
});

router.get("/jobs", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const jobs = await db.select().from(jobsTable)
      .where(eq(jobsTable.userId, req.userId!))
      .orderBy(desc(jobsTable.updatedAt), desc(jobsTable.createdAt));
    res.json(jobs.map(serializeJob));
  } catch (err) { next(err); }
});

router.post("/jobs", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const parsed = JobBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const [job] = await db.insert(jobsTable).values({
      userId: req.userId!,
      title: parsed.data.title,
      company: parsed.data.company ?? null,
      description: parsed.data.description,
      keywords: parsed.data.keywords ?? [],
      skills: parsed.data.skills ?? [],
      notes: parsed.data.notes ?? null,
      status: parsed.data.status,
      url: parsed.data.url ?? null,
      applyDate: parsed.data.applyDate ? new Date(parsed.data.applyDate) : null,
      interviewQuestions: parsed.data.interviewQuestions ?? [],
      interviewAnswers: parsed.data.interviewAnswers ?? [],
      pinned: parsed.data.pinned ? 1 : 0,
    }).returning();
    void logActivity(req.userId!, "job", job.title, job.id, "added");
    res.status(201).json(serializeJob(job));
  } catch (err) { next(err); }
});

router.put("/jobs/:id", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
    const parsed = JobBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const [job] = await db.update(jobsTable)
      .set({
        title: parsed.data.title,
        company: parsed.data.company ?? null,
        description: parsed.data.description,
        keywords: parsed.data.keywords ?? [],
        skills: parsed.data.skills ?? [],
        notes: parsed.data.notes ?? null,
        status: parsed.data.status,
        url: parsed.data.url ?? null,
        applyDate: parsed.data.applyDate ? new Date(parsed.data.applyDate) : null,
        interviewQuestions: parsed.data.interviewQuestions ?? [],
        interviewAnswers: parsed.data.interviewAnswers ?? [],
        pinned: parsed.data.pinned ? 1 : 0,
        updatedAt: new Date(),
      })
      .where(and(eq(jobsTable.id, id), eq(jobsTable.userId, req.userId!)))
      .returning();
    if (!job) { res.status(404).json({ error: "Job not found" }); return; }
    res.json(serializeJob(job));
  } catch (err) { next(err); }
});

router.post("/jobs/:id/pin", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const current = await db.select({ pinned: jobsTable.pinned }).from(jobsTable).where(and(eq(jobsTable.id, id), eq(jobsTable.userId, req.userId!))).limit(1);
    if (!current[0]) { res.status(404).json({ error: "Job not found" }); return; }
    const [job] = await db.update(jobsTable)
      .set({ pinned: current[0].pinned > 0 ? 0 : 1, updatedAt: new Date() })
      .where(and(eq(jobsTable.id, id), eq(jobsTable.userId, req.userId!)))
      .returning();
    res.json(serializeJob(job));
  } catch (err) { next(err); }
});

router.delete("/jobs/:id", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
    const [job] = await db.delete(jobsTable)
      .where(and(eq(jobsTable.id, id), eq(jobsTable.userId, req.userId!)))
      .returning();
    if (!job) { res.status(404).json({ error: "Job not found" }); return; }
    res.sendStatus(204);
  } catch (err) { next(err); }
});

router.get("/jobs/analytics", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const jobs = await db.select().from(jobsTable).where(eq(jobsTable.userId, req.userId!));
    const skills = new Map<string, number>();
    for (const job of jobs) for (const skill of job.skills ?? []) skills.set(skill, (skills.get(skill) ?? 0) + 1);
    const topSkills = [...skills.entries()].map(([skill, count]) => ({ skill, count })).sort((a, b) => b.count - a.count).slice(0, 8);
    const pinned = jobs.filter((j) => (j.pinned ?? 0) > 0).length;
    const interviewCount = jobs.filter((j) => j.status === "interviewing").length;
    const questionsCount = jobs.reduce((sum, job) => sum + (job.interviewQuestions?.length ?? 0), 0);
    res.json({ totalJobs: jobs.length, pinned, interviewCount, topSkills, questionsCount });
  } catch (err) { next(err); }
});

function serializeJob(j: typeof jobsTable.$inferSelect) {
  return {
    id: j.id,
    title: j.title,
    company: j.company,
    description: j.description,
    keywords: j.keywords ?? [],
    skills: j.skills ?? [],
    notes: j.notes,
    status: j.status,
    url: j.url,
    applyDate: j.applyDate ? j.applyDate.toISOString() : null,
    interviewQuestions: j.interviewQuestions ?? [],
    interviewAnswers: j.interviewAnswers ?? [],
    pinned: (j.pinned ?? 0) > 0,
    createdAt: j.createdAt.toISOString(),
    updatedAt: j.updatedAt.toISOString(),
  };
}

export default router;
