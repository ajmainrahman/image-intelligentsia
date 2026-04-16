import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, jobsTable } from "@workspace/db";
import {
  CreateJobBody,
  UpdateJobBody,
  GetJobParams,
  GetJobResponse,
  UpdateJobParams,
  UpdateJobResponse,
  DeleteJobParams,
  ListJobsResponse,
} from "@workspace/api-zod";
import { serializeRow, serializeRows } from "../lib/serialize.js";

const router: IRouter = Router();

router.get("/jobs", async (_req, res, next): Promise<void> => {
  try {
    const jobs = await db.select().from(jobsTable).orderBy(jobsTable.createdAt);
    res.json(ListJobsResponse.parse(serializeRows(jobs)));
  } catch (err) {
    next(err);
  }
});

router.post("/jobs", async (req, res, next): Promise<void> => {
  try {
    const parsed = CreateJobBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [job] = await db.insert(jobsTable).values(parsed.data).returning();
    res.status(201).json(GetJobResponse.parse(serializeRow(job)));
  } catch (err) {
    next(err);
  }
});

router.get("/jobs/:id", async (req, res, next): Promise<void> => {
  try {
    const params = GetJobParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, params.data.id));
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    res.json(GetJobResponse.parse(serializeRow(job)));
  } catch (err) {
    next(err);
  }
});

router.put("/jobs/:id", async (req, res, next): Promise<void> => {
  try {
    const params = UpdateJobParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const parsed = UpdateJobBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [job] = await db
      .update(jobsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(jobsTable.id, params.data.id))
      .returning();
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    res.json(UpdateJobResponse.parse(serializeRow(job)));
  } catch (err) {
    next(err);
  }
});

router.delete("/jobs/:id", async (req, res, next): Promise<void> => {
  try {
    const params = DeleteJobParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const [job] = await db.delete(jobsTable).where(eq(jobsTable.id, params.data.id)).returning();
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

export default router;
