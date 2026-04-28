import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { db, activityLogTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth.js";
import { logActivity, type ActivityType } from "../lib/activity.js";

const router = Router();

router.get("/activity", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const events = await db.select().from(activityLogTable)
      .where(eq(activityLogTable.userId, req.userId!))
      .orderBy(desc(activityLogTable.createdAt))
      .limit(limit);
    res.json(events.map((e) => ({
      id: e.id,
      type: e.type,
      relatedId: e.relatedId,
      title: e.title,
      action: e.action,
      createdAt: e.createdAt.toISOString(),
    })));
  } catch (err) { next(err); }
});

const NoteEventBody = z.object({
  title: z.string().min(1).max(200),
  action: z.enum(["created", "updated"]).default("created"),
});

router.post("/activity/note", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const parsed = NoteEventBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    await logActivity(req.userId!, "note" as ActivityType, parsed.data.title, null, parsed.data.action);
    res.sendStatus(204);
  } catch (err) { next(err); }
});

export default router;
