import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, goalsTable } from "@workspace/db";
import {
  CreateGoalBody,
  UpdateGoalBody,
  GetGoalParams,
  GetGoalResponse,
  UpdateGoalParams,
  UpdateGoalResponse,
  DeleteGoalParams,
  ListGoalsResponse,
} from "@workspace/api-zod";
import { serializeRow, serializeRows } from "../lib/serialize.js";

const router: IRouter = Router();

router.get("/goals", async (_req, res, next): Promise<void> => {
  try {
    const goals = await db.select().from(goalsTable).orderBy(goalsTable.createdAt);
    res.json(ListGoalsResponse.parse(serializeRows(goals)));
  } catch (err) {
    next(err);
  }
});

router.post("/goals", async (req, res, next): Promise<void> => {
  try {
    const parsed = CreateGoalBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [goal] = await db.insert(goalsTable).values(parsed.data).returning();
    res.status(201).json(GetGoalResponse.parse(serializeRow(goal)));
  } catch (err) {
    next(err);
  }
});

router.get("/goals/:id", async (req, res, next): Promise<void> => {
  try {
    const params = GetGoalParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [goal] = await db.select().from(goalsTable).where(eq(goalsTable.id, params.data.id));
    if (!goal) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }
    res.json(GetGoalResponse.parse(serializeRow(goal)));
  } catch (err) {
    next(err);
  }
});

router.put("/goals/:id", async (req, res, next): Promise<void> => {
  try {
    const params = UpdateGoalParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = UpdateGoalBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [goal] = await db
      .update(goalsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(goalsTable.id, params.data.id))
      .returning();
    if (!goal) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }
    res.json(UpdateGoalResponse.parse(serializeRow(goal)));
  } catch (err) {
    next(err);
  }
});

router.delete("/goals/:id", async (req, res, next): Promise<void> => {
  try {
    const params = DeleteGoalParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [goal] = await db.delete(goalsTable).where(eq(goalsTable.id, params.data.id)).returning();
    if (!goal) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

export default router;
