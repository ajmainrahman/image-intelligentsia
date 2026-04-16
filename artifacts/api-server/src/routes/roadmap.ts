import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db, roadmapTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router = Router();

const RoadmapBody = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  yearTarget: z.number().int().min(2000).max(2100),
  phase: z.enum(["short_term", "mid_term", "long_term"]).default("short_term"),
  status: z.enum(["planned", "in_progress", "completed"]).default("planned"),
  goalId: z.number().int().nullable().optional(),
  order: z.number().int().default(0),
});

router.get("/roadmap", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const items = await db.select().from(roadmapTable)
      .where(eq(roadmapTable.userId, req.userId!))
      .orderBy(roadmapTable.order);
    res.json(items.map(serializeRoadmapItem));
  } catch (err) { next(err); }
});

router.post("/roadmap", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const parsed = RoadmapBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const [item] = await db.insert(roadmapTable).values({ ...parsed.data, userId: req.userId! }).returning();
    res.status(201).json(serializeRoadmapItem(item));
  } catch (err) { next(err); }
});

router.put("/roadmap/:id", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
    const parsed = RoadmapBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const [item] = await db.update(roadmapTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(roadmapTable.id, id), eq(roadmapTable.userId, req.userId!)))
      .returning();
    if (!item) { res.status(404).json({ error: "Item not found" }); return; }
    res.json(serializeRoadmapItem(item));
  } catch (err) { next(err); }
});

router.delete("/roadmap/:id", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
    const [item] = await db.delete(roadmapTable)
      .where(and(eq(roadmapTable.id, id), eq(roadmapTable.userId, req.userId!)))
      .returning();
    if (!item) { res.status(404).json({ error: "Item not found" }); return; }
    res.sendStatus(204);
  } catch (err) { next(err); }
});

function serializeRoadmapItem(r: typeof roadmapTable.$inferSelect) {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    yearTarget: r.yearTarget,
    phase: r.phase,
    status: r.status,
    goalId: r.goalId,
    order: r.order,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export default router;
