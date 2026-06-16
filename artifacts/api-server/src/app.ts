import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp_ from "pino-http";
import { rateLimit } from "express-rate-limit";
import { logger } from "./lib/logger.js";
import router from "./routes/index.js";

// pino-http uses CJS exports; this handles both ESM and CJS interop
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pinoHttp = ((pinoHttp_ as any).default ?? pinoHttp_) as typeof pinoHttp_;

const app = express();

app.use(pinoHttp({ logger }));

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
  : [];
const vercelOrigin = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : null;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.length === 0) return callback(null, true);
      if (vercelOrigin && origin === vercelOrigin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

// Parse cookies before routes so requireAuth can read the HttpOnly token
app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Rate limiting ──────────────────────────────────────────────────────────────

// Strict limit on auth endpoints: 10 requests per 15 minutes per IP
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many auth attempts. Please try again in 15 minutes." },
});

// General API safeguard: 100 requests per 15 minutes per IP
const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});

app.use("/api/auth", authRateLimit);
app.use("/api", apiRateLimit);

// ─────────────────────────────────────────────────────────────────────────────

// Strip null values from request bodies so optional Zod fields receive undefined
app.use((req, _res, next) => {
  if (req.body && typeof req.body === "object") {
    const strip = (obj: Record<string, unknown>) => {
      for (const key of Object.keys(obj)) {
        if (obj[key] === null) {
          delete obj[key];
        } else if (
          typeof obj[key] === "object" &&
          !Array.isArray(obj[key])
        ) {
          strip(obj[key] as Record<string, unknown>);
        }
      }
    };
    strip(req.body);
  }
  next();
});

app.use("/api", router);

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
      (err as { publicMessage?: string }).publicMessage ??
      (process.env.NODE_ENV === "production" && statusCode >= 500
        ? "Internal server error"
        : err instanceof Error
          ? err.message
          : "Internal server error");
    res.statusCode = statusCode;
    res.json({ error: message });
  },
);

export default app;
