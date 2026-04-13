import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, remindersTable } from "@workspace/db";
import {
  CreateReminderBody,
  UpdateReminderBody,
  UpdateReminderParams,
  UpdateReminderResponse,
  DeleteReminderParams,
  ListRemindersResponse,
} from "@workspace/api-zod";
import { serializeRow, serializeRows } from "../lib/serialize.js";

const router: IRouter = Router();

router.get("/reminders", async (_req, res): Promise<void> => {
  const reminders = await db.select().from(remindersTable).orderBy(remindersTable.createdAt);
  res.json(ListRemindersResponse.parse(serializeRows(reminders)));
});

router.post("/reminders", async (req, res): Promise<void> => {
  const parsed = CreateReminderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const insertData = {
    ...parsed.data,
    dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
  };
  const [reminder] = await db.insert(remindersTable).values(insertData).returning();
  res.status(201).json(ListRemindersResponse.element.parse(serializeRow(reminder)));
});

router.put("/reminders/:id", async (req, res): Promise<void> => {
  const params = UpdateReminderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateReminderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData = {
    ...parsed.data,
    dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
    updatedAt: new Date(),
  };
  const [reminder] = await db
    .update(remindersTable)
    .set(updateData)
    .where(eq(remindersTable.id, params.data.id))
    .returning();
  if (!reminder) {
    res.status(404).json({ error: "Reminder not found" });
    return;
  }
  res.json(UpdateReminderResponse.parse(serializeRow(reminder)));
});

router.delete("/reminders/:id", async (req, res): Promise<void> => {
  const params = DeleteReminderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [reminder] = await db.delete(remindersTable).where(eq(remindersTable.id, params.data.id)).returning();
  if (!reminder) {
    res.status(404).json({ error: "Reminder not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
