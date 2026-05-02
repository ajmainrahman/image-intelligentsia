import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db, roadmapTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth.js";
import { logActivity } from "../lib/activity.js";

const router = Router();

const RoadmapDescriptionV2 = z.object({
  v: z.literal(2),
  focusOn: z.string().default(""),
  responsibilities: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  level: z.number().int().min(1).max(5).default(1),
  progress: z.number().int().min(0).max(100).default(0),
});

const RoadmapBody = z.object({
  title: z.string().min(1),
  description: z.union([z.string(), RoadmapDescriptionV2]).nullable().optional(),
  yearTarget: z.number().int().min(2000).max(2100),
  phase: z.enum(["short_term", "mid_term", "long_term"]).default("short_term"),
  status: z.enum(["planned", "in_progress", "completed"]).default("planned"),
  goalId: z.number().int().nullable().optional(),
  order: z.number().int().default(0),
  pinned: z.boolean().default(false),
  archived: z.boolean().default(false),
  reflection: z.string().nullable().optional(),
});

function normaliseDescription(raw: string | object | null | undefined): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "object") return JSON.stringify(raw);
  return raw;
}

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
    const [item] = await db.insert(roadmapTable).values({
      ...parsed.data,
      description: normaliseDescription(parsed.data.description),
      userId: req.userId!,
    }).returning();
    await logActivity(req.userId!, "roadmap", item.title, item.id, "created");
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
      .set({
        ...parsed.data,
        description: normaliseDescription(parsed.data.description),
        updatedAt: new Date(),
      })
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

// PATCH for pin/archive/reflection without full body
router.patch("/roadmap/:id", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
    const patch = z.object({
      pinned: z.boolean().optional(),
      archived: z.boolean().optional(),
      status: z.enum(["planned", "in_progress", "completed"]).optional(),
      reflection: z.string().nullable().optional(),
    }).safeParse(req.body);
    if (!patch.success) { res.status(400).json({ error: patch.error.message }); return; }
    const [item] = await db.update(roadmapTable)
      .set({ ...patch.data, updatedAt: new Date() })
      .where(and(eq(roadmapTable.id, id), eq(roadmapTable.userId, req.userId!)))
      .returning();
    if (!item) { res.status(404).json({ error: "Item not found" }); return; }
    res.json(serializeRoadmapItem(item));
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
    pinned: r.pinned ?? false,
    archived: r.archived ?? false,
    reflection: r.reflection ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export default router;
// Bulk reorder — receives [{id, order}, ...]
router.patch("/roadmap/reorder", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const schema = z.array(z.object({ id: z.number().int(), order: z.number().int() }));
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    await Promise.all(
      parsed.data.map(({ id, order }) =>
        db.update(roadmapTable).set({ order, updatedAt: new Date() })
          .where(and(eq(roadmapTable.id, id), eq(roadmapTable.userId, req.userId!)))
      )
    );
    res.sendStatus(204);
  } catch (err) { next(err); }
});
