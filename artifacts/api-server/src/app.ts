import express from "express";
import cors from "cors";
import pinoHttp_ from "pino-http";
import { logger } from "./lib/logger.js";
import router from "./routes/index.js";

// pino-http uses CJS exports; this handles both ESM and CJS interop
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pinoHttp = ((pinoHttp_ as any).default ?? pinoHttp_) as typeof pinoHttp_;

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
app.use(router);

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    logger.error(err);
    const statusCode =
      (err as { status?: number }).status ??
      (err as { statusCode?: number }).statusCode ??
      500;
    const message =
      err instanceof Error ? err.message : "Internal server error";
    res.statusCode = statusCode;
    res.json({ error: message });
  },
);

export default app;
