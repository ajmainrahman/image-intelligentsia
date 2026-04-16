import { Router, type IRouter } from "express";
import { HealthCheckResponse, DbHealthCheckResponse } from "@workspace/api-zod";
import { sql } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/healthz/db", async (_req, res): Promise<void> => {
  const start = Date.now();
  try {
    await sql`SELECT 1`;
    const latencyMs = Date.now() - start;
    const data = DbHealthCheckResponse.parse({ status: "ok", db: "connected", latencyMs });
    res.status(200).json(data);
  } catch (err) {
    const latencyMs = Date.now() - start;
    const error = err instanceof Error ? err.message : String(err);
    const data = DbHealthCheckResponse.parse({ status: "error", db: "unreachable", latencyMs, error });
    res.status(503).json(data);
  }
});

export default router;
