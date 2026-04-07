import { Router, type IRouter } from "express";
import healthRouter from "./health";
import goalsRouter from "./goals";
import progressRouter from "./progress";
import roadmapRouter from "./roadmap";
import jobsRouter from "./jobs";
import remindersRouter from "./reminders";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(goalsRouter);
router.use(progressRouter);
router.use(roadmapRouter);
router.use(jobsRouter);
router.use(remindersRouter);
router.use(dashboardRouter);

export default router;
