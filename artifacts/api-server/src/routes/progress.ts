import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, progressTable } from "@workspace/db";
import {
  CreateProgressBody,
  UpdateProgressBody,
  UpdateProgressParams,
  UpdateProgressResponse,
  DeleteProgressParams,
  ListProgressResponse,
} from "@workspace/api-zod";
import { serializeRow, serializeRows } from "../lib/serialize.js";

const router: IRouter = Router();

router.get("/progress", async (_req, res, next): Promise<void> => {
  try {
    const entries = await db.select().from(progressTable).orderBy(progressTable.createdAt);
    res.json(ListProgressResponse.parse(serializeRows(entries)));
  } catch (err) {
    next(err);
  }
});

router.post("/progress", async (req, res, next): Promise<void> => {
  try {
    const parsed = CreateProgressBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [entry] = await db.insert(progressTable).values(parsed.data).returning();
    res.status(201).json(ListProgressResponse.element.parse(serializeRow(entry)));
  } catch (err) {
    next(err);
  }
});

router.put("/progress/:id", async (req, res, next): Promise<void> => {
  try {
    const params = UpdateProgressParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = UpdateProgressBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [entry] = await db
      .update(progressTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(progressTable.id, params.data.id))
      .returning();
    if (!entry) {
      res.status(404).json({ error: "Progress entry not found" });
      return;
    }
    res.json(UpdateProgressResponse.parse(serializeRow(entry)));
  } catch (err) {
    next(err);
  }
});

router.delete("/progress/:id", async (req, res, next): Promise<void> => {
  try {
    const params = DeleteProgressParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [entry] = await db.delete(progressTable).where(eq(progressTable.id, params.data.id)).returning();
    if (!entry) {
      res.status(404).json({ error: "Progress entry not found" });
      return;
    }
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

export default router;
