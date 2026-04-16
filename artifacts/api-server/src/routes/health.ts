import { Router, type IRouter } from "express";
import { db, sql } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

router.get("/healthz/db", async (_req, res): Promise<void> => {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    res.status(200).json({ status: "ok", db: "connected", latencyMs: Date.now() - start });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(503).json({ status: "error", db: "unreachable", latencyMs: Date.now() - start, error });
  }
});

export default router;
