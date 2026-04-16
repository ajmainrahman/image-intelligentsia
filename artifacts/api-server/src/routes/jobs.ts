import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db, jobsTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

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
});

router.get("/jobs", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const jobs = await db.select().from(jobsTable)
      .where(eq(jobsTable.userId, req.userId!))
      .orderBy(jobsTable.createdAt);
    res.json(jobs.map(serializeJob));
  } catch (err) { next(err); }
});

router.post("/jobs", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const parsed = JobBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const [job] = await db.insert(jobsTable).values({ ...parsed.data, userId: req.userId! }).returning();
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
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(jobsTable.id, id), eq(jobsTable.userId, req.userId!)))
      .returning();
    if (!job) { res.status(404).json({ error: "Job not found" }); return; }
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

function serializeJob(j: typeof jobsTable.$inferSelect) {
  return {
    id: j.id,
    title: j.title,
    company: j.company,
    description: j.description,
    keywords: j.keywords,
    skills: j.skills,
    notes: j.notes,
    status: j.status,
    url: j.url,
    createdAt: j.createdAt.toISOString(),
    updatedAt: j.updatedAt.toISOString(),
  };
}

export default router;
