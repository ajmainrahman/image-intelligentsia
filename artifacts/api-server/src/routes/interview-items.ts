import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { db, interviewItemsTable, jobsTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router = Router();

const InterviewItemBody = z.object({
  question: z.string().min(1),
  answer: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  jobId: z.number().int().nullable().optional(),
});

type InterviewItemRow = typeof interviewItemsTable.$inferSelect & {
  jobTitle?: string | null;
  company?: string | null;
};

router.get("/interview-items", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const items = await db.select().from(interviewItemsTable)
      .where(eq(interviewItemsTable.userId, req.userId!))
      .orderBy(desc(interviewItemsTable.updatedAt), desc(interviewItemsTable.createdAt));

    const jobs = await db.select({ id: jobsTable.id, title: jobsTable.title, company: jobsTable.company })
      .from(jobsTable)
      .where(eq(jobsTable.userId, req.userId!));

    const jobMap = new Map(jobs.map((job) => [job.id, job]));

    res.json(items.map((item) => serializeItem({ ...item, ...jobMap.get(item.jobId ?? -1) } as InterviewItemRow)));
  } catch (err) { next(err); }
});

router.post("/interview-items", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const parsed = InterviewItemBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

    if (parsed.data.jobId) {
      const [job] = await db.select({ id: jobsTable.id, title: jobsTable.title, company: jobsTable.company }).from(jobsTable)
        .where(and(eq(jobsTable.id, parsed.data.jobId), eq(jobsTable.userId, req.userId!)))
        .limit(1);
      if (!job) { res.status(400).json({ error: "Job not found or not yours" }); return; }
    }

    const [item] = await db.insert(interviewItemsTable).values({
      question: parsed.data.question,
      answer: parsed.data.answer ?? null,
      category: parsed.data.category ?? null,
      jobId: parsed.data.jobId ?? null,
      userId: req.userId!,
    }).returning();

    const [job] = item.jobId
      ? await db.select({ id: jobsTable.id, title: jobsTable.title, company: jobsTable.company }).from(jobsTable)
        .where(and(eq(jobsTable.id, item.jobId), eq(jobsTable.userId, req.userId!)))
        .limit(1)
      : [];

    res.status(201).json(serializeItem({ ...item, jobTitle: job?.title ?? null, company: job?.company ?? null }));
  } catch (err) { next(err); }
});

router.put("/interview-items/:id", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
    const parsed = InterviewItemBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

    if (parsed.data.jobId) {
      const [job] = await db.select({ id: jobsTable.id, title: jobsTable.title, company: jobsTable.company }).from(jobsTable)
        .where(and(eq(jobsTable.id, parsed.data.jobId), eq(jobsTable.userId, req.userId!)))
        .limit(1);
      if (!job) { res.status(400).json({ error: "Job not found or not yours" }); return; }
    }

    const [item] = await db.update(interviewItemsTable)
      .set({
        question: parsed.data.question,
        answer: parsed.data.answer ?? null,
        category: parsed.data.category ?? null,
        jobId: parsed.data.jobId ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(interviewItemsTable.id, id), eq(interviewItemsTable.userId, req.userId!)))
      .returning();

    if (!item) { res.status(404).json({ error: "Item not found" }); return; }

    const [job] = item.jobId
      ? await db.select({ id: jobsTable.id, title: jobsTable.title, company: jobsTable.company }).from(jobsTable)
        .where(and(eq(jobsTable.id, item.jobId), eq(jobsTable.userId, req.userId!)))
        .limit(1)
      : [];

    res.json(serializeItem({ ...item, jobTitle: job?.title ?? null, company: job?.company ?? null }));
  } catch (err) { next(err); }
});

router.delete("/interview-items/:id", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
    const [item] = await db.delete(interviewItemsTable)
      .where(and(eq(interviewItemsTable.id, id), eq(interviewItemsTable.userId, req.userId!)))
      .returning();
    if (!item) { res.status(404).json({ error: "Item not found" }); return; }
    res.sendStatus(204);
  } catch (err) { next(err); }
});

function serializeItem(item: InterviewItemRow) {
  return {
    id: item.id,
    question: item.question,
    answer: item.answer,
    category: item.category,
    jobId: item.jobId,
    jobTitle: item.jobTitle ?? null,
    company: item.company ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export default router;
