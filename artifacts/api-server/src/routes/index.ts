import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import goalsRouter from "./goals.js";
import progressRouter from "./progress.js";
import roadmapRouter from "./roadmap.js";
import jobsRouter from "./jobs.js";
import remindersRouter from "./reminders.js";
import dashboardRouter from "./dashboard.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(goalsRouter);
router.use(progressRouter);
router.use(roadmapRouter);
router.use(jobsRouter);
router.use(remindersRouter);
router.use(dashboardRouter);

export default router;
