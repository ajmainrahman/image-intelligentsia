import express, { type Request, type Response, type NextFunction, type ErrorRequestHandler } from "express";
import cors from "cors";
import { logger } from "./lib/logger.js";
import router from "./routes/index.js";

const app = express();

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    logger.info({
      method: req.method,
      url: req.url?.split("?")[0],
      statusCode: res.statusCode,
      duration: Date.now() - start,
    });
  });
  next();
});

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

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  logger.error(err);
  const status = (err as { status?: number; statusCode?: number }).status
    ?? (err as { statusCode?: number }).statusCode
    ?? 500;
  res.status(status).json({ error: err.message ?? "Internal server error" });
};

app.use(errorHandler);

export default app;
