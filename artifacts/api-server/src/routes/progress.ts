import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db, progressTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth.js";
import { logActivity } from "../lib/activity.js";

const router = Router();

const ProgressBody = z.object({
  title: z.string().min(1),
  category: z.enum(["course", "tool", "project", "certification", "reading", "ai_tool", "book", "practice", "other"]).default("other"),
  description: z.string().nullable().optional(),
  status: z.enum(["not_started", "in_progress", "completed"]).default("not_started"),
  toolOrResource: z.string().nullable().optional(),
  resourceUrl: z.string().url().nullable().optional().or(z.literal("")),
  durationHours: z.union([z.number(), z.string()]).default(0).transform((value) => {
    const n = typeof value === "string" ? Number(value) : value;
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }),
  startDate: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  goalId: z.number().int().nullable().optional(),
  pinned: z.boolean().default(false),
  archived: z.boolean().default(false),
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
    const { resourceUrl, startDate, completedAt, durationHours, ...rest } = parsed.data;
    const [entry] = await db.insert(progressTable).values({
      ...rest,
      userId: req.userId!,
      resourceUrl: resourceUrl || null,
      durationHours: String(durationHours ?? 0),
      startDate: startDate ? new Date(startDate) : null,
      completedAt: completedAt ? new Date(completedAt) : null,
    }).returning();
    await logActivity(req.userId!, "progress", entry.title, entry.id, "logged");
    res.status(201).json(serializeProgress(entry));
  } catch (err) { next(err); }
});

router.put("/progress/:id", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
    const parsed = ProgressBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const { resourceUrl, startDate, completedAt, durationHours, ...rest } = parsed.data;
    const [entry] = await db.update(progressTable)
      .set({
        ...rest,
        resourceUrl: resourceUrl || null,
        durationHours: String(durationHours ?? 0),
        startDate: startDate ? new Date(startDate) : null,
        completedAt: completedAt ? new Date(completedAt) : null,
        updatedAt: new Date(),
      })
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

// PATCH for pin/archive without full body
router.patch("/progress/:id", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
    const patch = z.object({
      pinned: z.boolean().optional(),
      archived: z.boolean().optional(),
    }).safeParse(req.body);
    if (!patch.success) { res.status(400).json({ error: patch.error.message }); return; }
    const [entry] = await db.update(progressTable)
      .set({ ...patch.data, updatedAt: new Date() })
      .where(and(eq(progressTable.id, id), eq(progressTable.userId, req.userId!)))
      .returning();
    if (!entry) { res.status(404).json({ error: "Entry not found" }); return; }
    res.json(serializeProgress(entry));
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
    resourceUrl: p.resourceUrl,
    durationHours: Number(p.durationHours ?? 0),
    startDate: p.startDate ? p.startDate.toISOString() : null,
    completedAt: p.completedAt ? p.completedAt.toISOString() : null,
    goalId: p.goalId,
    pinned: p.pinned ?? false,
    archived: p.archived ?? false,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export default router;
