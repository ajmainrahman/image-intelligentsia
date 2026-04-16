import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db, progressTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router = Router();

const ProgressBody = z.object({
  title: z.string().min(1),
  category: z.enum(["course", "tool", "project", "certification", "reading", "other"]).default("other"),
  description: z.string().nullable().optional(),
  status: z.enum(["not_started", "in_progress", "completed"]).default("not_started"),
  toolOrResource: z.string().nullable().optional(),
  goalId: z.number().int().nullable().optional(),
});

router.get("/progress", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const entries = await db.select().from(progressTable)
      .where(eq(progressTable.userId, req.userId!))
      .orderBy(progressTable.createdAt);
    res.json(entries.map(serializeProgress));
  } catch (err) { next(err); }
});

router.post("/progress", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const parsed = ProgressBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const [entry] = await db.insert(progressTable).values({ ...parsed.data, userId: req.userId! }).returning();
    res.status(201).json(serializeProgress(entry));
  } catch (err) { next(err); }
});

router.put("/progress/:id", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
    const parsed = ProgressBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const [entry] = await db.update(progressTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(progressTable.id, id), eq(progressTable.userId, req.userId!)))
      .returning();
    if (!entry) { res.status(404).json({ error: "Entry not found" }); return; }
    res.json(serializeProgress(entry));
  } catch (err) { next(err); }
});

router.delete("/progress/:id", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
    const [entry] = await db.delete(progressTable)
      .where(and(eq(progressTable.id, id), eq(progressTable.userId, req.userId!)))
      .returning();
    if (!entry) { res.status(404).json({ error: "Entry not found" }); return; }
    res.sendStatus(204);
  } catch (err) { next(err); }
});

function serializeProgress(p: typeof progressTable.$inferSelect) {
  return {
    id: p.id,
    title: p.title,
    category: p.category,
    description: p.description,
    status: p.status,
    toolOrResource: p.toolOrResource,
    goalId: p.goalId,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export default router;
