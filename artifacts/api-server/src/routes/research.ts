import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { db, researchTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth.js";
import { logActivity } from "../lib/activity.js";

const router = Router();

const ResearchBody = z.object({
  title: z.string().min(1),
  type: z.enum(["paper", "article", "book", "dataset", "thesis", "topic", "note"]).default("paper"),
  authors: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  status: z.enum(["to_explore", "reading", "working", "completed"]).default("to_explore"),
  notes: z.string().nullable().optional(),
  goalId: z.number().int().positive().nullable().optional(),
});

router.get("/research", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const items = await db.select().from(researchTable).where(eq(researchTable.userId, req.userId!)).orderBy(desc(researchTable.createdAt));
    res.json(items.map(serializeResearch));
  } catch (err) { next(err); }
});

router.post("/research", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const parsed = ResearchBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const [item] = await db.insert(researchTable).values({ ...parsed.data, userId: req.userId! }).returning();
    await logActivity(req.userId!, "research", item.title, item.id, "added");
    res.status(201).json(serializeResearch(item));
  } catch (err) { next(err); }
});

router.put("/research/:id", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
    const parsed = ResearchBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const [item] = await db.update(researchTable).set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(researchTable.id, id), eq(researchTable.userId, req.userId!))).returning();
    if (!item) { res.status(404).json({ error: "Research item not found" }); return; }
    res.json(serializeResearch(item));
  } catch (err) { next(err); }
});

router.delete("/research/:id", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
    const [item] = await db.delete(researchTable).where(and(eq(researchTable.id, id), eq(researchTable.userId, req.userId!))).returning();
    if (!item) { res.status(404).json({ error: "Research item not found" }); return; }
    res.sendStatus(204);
  } catch (err) { next(err); }
});

function serializeResearch(r: typeof researchTable.$inferSelect) {
  return {
    id: r.id, title: r.title, type: r.type, authors: r.authors, source: r.source,
    summary: r.summary, tags: r.tags, status: r.status, notes: r.notes, goalId: r.goalId,
    createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
  };
}

export default router;
