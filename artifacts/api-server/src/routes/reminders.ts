import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db, remindersTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router = Router();

const ReminderBody = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  completed: z.boolean().default(false),
  category: z.enum(["apply", "learn", "network", "review", "other"]).default("other"),
});

router.get("/reminders", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const reminders = await db.select().from(remindersTable)
      .where(eq(remindersTable.userId, req.userId!))
      .orderBy(remindersTable.createdAt);
    res.json(reminders.map(serializeReminder));
  } catch (err) { next(err); }
});

router.post("/reminders", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const parsed = ReminderBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const { dueDate, ...rest } = parsed.data;
    const [reminder] = await db.insert(remindersTable).values({
      ...rest,
      userId: req.userId!,
      dueDate: dueDate ? new Date(dueDate) : null,
    }).returning();
    res.status(201).json(serializeReminder(reminder));
  } catch (err) { next(err); }
});

router.put("/reminders/:id", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
    const parsed = ReminderBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const { dueDate, ...rest } = parsed.data;
    const [reminder] = await db.update(remindersTable)
      .set({ ...rest, dueDate: dueDate ? new Date(dueDate) : null, updatedAt: new Date() })
      .where(and(eq(remindersTable.id, id), eq(remindersTable.userId, req.userId!)))
      .returning();
    if (!reminder) { res.status(404).json({ error: "Reminder not found" }); return; }
    res.json(serializeReminder(reminder));
  } catch (err) { next(err); }
});

router.delete("/reminders/:id", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
    const [reminder] = await db.delete(remindersTable)
      .where(and(eq(remindersTable.id, id), eq(remindersTable.userId, req.userId!)))
      .returning();
    if (!reminder) { res.status(404).json({ error: "Reminder not found" }); return; }
    res.sendStatus(204);
  } catch (err) { next(err); }
});

function serializeReminder(r: typeof remindersTable.$inferSelect) {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    dueDate: r.dueDate ? r.dueDate.toISOString() : null,
    priority: r.priority,
    completed: r.completed,
    category: r.category,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export default router;
