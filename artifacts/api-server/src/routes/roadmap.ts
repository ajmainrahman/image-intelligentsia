import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, roadmapTable } from "@workspace/db";
import {
  CreateRoadmapItemBody,
  UpdateRoadmapItemBody,
  UpdateRoadmapItemParams,
  UpdateRoadmapItemResponse,
  DeleteRoadmapItemParams,
  ListRoadmapItemsResponse,
} from "@workspace/api-zod";
import { serializeRow, serializeRows } from "../lib/serialize.js";

const router: IRouter = Router();

router.get("/roadmap", async (_req, res, next): Promise<void> => {
  try {
    const items = await db.select().from(roadmapTable).orderBy(roadmapTable.yearTarget, roadmapTable.order);
    res.json(ListRoadmapItemsResponse.parse(serializeRows(items)));
  } catch (err) {
    next(err);
  }
});

router.post("/roadmap", async (req, res, next): Promise<void> => {
  try {
    const parsed = CreateRoadmapItemBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [item] = await db.insert(roadmapTable).values(parsed.data).returning();
    res.status(201).json(ListRoadmapItemsResponse.element.parse(serializeRow(item)));
  } catch (err) {
    next(err);
  }
});

router.put("/roadmap/:id", async (req, res, next): Promise<void> => {
  try {
    const params = UpdateRoadmapItemParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = UpdateRoadmapItemBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [item] = await db
      .update(roadmapTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(roadmapTable.id, params.data.id))
      .returning();
    if (!item) {
      res.status(404).json({ error: "Roadmap item not found" });
      return;
    }
    res.json(UpdateRoadmapItemResponse.parse(serializeRow(item)));
  } catch (err) {
    next(err);
  }
});

router.delete("/roadmap/:id", async (req, res, next): Promise<void> => {
  try {
    const params = DeleteRoadmapItemParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [item] = await db.delete(roadmapTable).where(eq(roadmapTable.id, params.data.id)).returning();
    if (!item) {
      res.status(404).json({ error: "Roadmap item not found" });
      return;
    }
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

export default router;
