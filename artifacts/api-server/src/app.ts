import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger.js";
import router from "./routes/index.js";

const app = express();

app.use(pinoHttp({ logger }));

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.length === 0) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  logger.error(err);
  const status =
    (err as { status?: number }).status ??
    (err as { statusCode?: number }).statusCode ??
    500;
  const message =
    err instanceof Error ? err.message : "Internal server error";
  res.status(status).json({ error: message });
});

export default app;
