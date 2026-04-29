import { Router } from "express";
import healthRouter from "./health.js";
import goalsRouter from "./goals.js";
import progressRouter from "./progress.js";
import roadmapRouter from "./roadmap.js";
import jobsRouter from "./jobs.js";
import remindersRouter from "./reminders.js";
import dashboardRouter from "./dashboard.js";
import authRouter from "./auth.js";
import activityRouter from "./activity.js";
import profileRouter from "./profile.js";

const router = Router();
router.use(healthRouter);
router.use(authRouter);
router.use(goalsRouter);
router.use(progressRouter);
router.use(roadmapRouter);
router.use(jobsRouter);
router.use(remindersRouter);
router.use(dashboardRouter);
router.use(activityRouter);
router.use(profileRouter);

export default router;

import featuresRouter from "./features.js";
router.use("/", featuresRouter);
