import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db, goalsTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth.js";
import { logActivity } from "../lib/activity.js";

const router = Router();

const GoalBody = z.object({
  title: z.string().min(1),
  targetRole: z.string().min(1),
  description: z.string().nullable().optional(),
  skills: z.array(z.string()).default([]),
  progress: z.number().int().min(0).max(100).default(0),
  status: z.enum(["active", "completed", "paused"]).default("active"),
  targetYear: z.number().int().min(2000).max(2100).nullable().optional(),
});

router.get("/goals", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const goals = await db.select().from(goalsTable)
      .where(eq(goalsTable.userId, req.userId!))
      .orderBy(goalsTable.createdAt);
    res.json(goals.map(serializeGoal));
  } catch (err) { next(err); }
});

router.post("/goals", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const parsed = GoalBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const [goal] = await db.insert(goalsTable).values({ ...parsed.data, userId: req.userId! }).returning();
    await logActivity(req.userId!, "goal", goal.title, goal.id, "created");
    res.status(201).json(serializeGoal(goal));
  } catch (err) { next(err); }
});

router.put("/goals/:id", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
    const parsed = GoalBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const [goal] = await db.update(goalsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(goalsTable.id, id), eq(goalsTable.userId, req.userId!)))
      .returning();
    if (!goal) { res.status(404).json({ error: "Goal not found" }); return; }
    res.json(serializeGoal(goal));
  } catch (err) { next(err); }
});

router.delete("/goals/:id", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
    const [goal] = await db.delete(goalsTable)
      .where(and(eq(goalsTable.id, id), eq(goalsTable.userId, req.userId!)))
      .returning();
    if (!goal) { res.status(404).json({ error: "Goal not found" }); return; }
    res.sendStatus(204);
  } catch (err) { next(err); }
});

function serializeGoal(g: typeof goalsTable.$inferSelect) {
  return {
    id: g.id,
    title: g.title,
    targetRole: g.targetRole,
    description: g.description,
    skills: g.skills ?? [],
    progress: g.progress ?? 0,
    status: g.status,
    targetYear: g.targetYear,
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  };
}

export default router;
