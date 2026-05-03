import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db, goalsTable, progressTable, roadmapTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth.js";
import { logActivity } from "../lib/activity.js";

const router = Router();

const GoalBody = z.object({
  title: z.string().min(1),
  targetRole: z.string().min(1),
  description: z.string().nullable().optional(),
  skills: z.array(z.string()).default([]),
  progress: z.number().int().min(0).max(100).default(0),
  status: z.enum(["active", "completed", "paused"]).default("active"),
  targetYear: z.number().int().min(2000).max(2100).nullable().optional(),
  pinned: z.boolean().default(false),
  archived: z.boolean().default(false),
});

router.get(
  "/goals",
  requireAuth,
  async (req: AuthRequest, res, next): Promise<void> => {
    try {
      const goals = await db
        .select()
        .from(goalsTable)
        .where(eq(goalsTable.userId, req.userId!))
        .orderBy(goalsTable.createdAt);
      res.json(goals.map(serializeGoal));
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/goals",
  requireAuth,
  async (req: AuthRequest, res, next): Promise<void> => {
    try {
      const parsed = GoalBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.message });
        return;
      }
      const [goal] = await db
        .insert(goalsTable)
        .values({ ...parsed.data, userId: req.userId! })
        .returning();
      await logActivity(req.userId!, "goal", goal.title, goal.id, "created");
      res.status(201).json(serializeGoal(goal));
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  "/goals/:id",
  requireAuth,
  async (req: AuthRequest, res, next): Promise<void> => {
    try {
      const id = Number(req.params.id);
      if (!id) {
        res.status(400).json({ error: "Invalid id" });
        return;
      }
      const parsed = GoalBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.message });
        return;
      }

      // Auto-achieve: if all linked progress + roadmap items are completed, mark goal achieved
      let { status, progress } = parsed.data;
      const linkedProgress = await db
        .select()
        .from(progressTable)
        .where(
          and(
            eq(progressTable.goalId, id),
            eq(progressTable.userId, req.userId!),
          ),
        );
      const linkedRoadmap = await db
        .select()
        .from(roadmapTable)
        .where(
          and(
            eq(roadmapTable.goalId, id),
            eq(roadmapTable.userId, req.userId!),
          ),
        );

      const allItems = [...linkedProgress, ...linkedRoadmap];
      if (allItems.length > 0) {
        const completedProgress = linkedProgress.filter(
          (p) => p.status === "completed",
        ).length;
        const completedRoadmap = linkedRoadmap.filter(
          (r) => r.status === "completed",
        ).length;
        const totalCompleted = completedProgress + completedRoadmap;
        const totalItems = allItems.length;
        // Auto-calculate progress from linked children
        progress = Math.round((totalCompleted / totalItems) * 100);
        // Auto-achieve when all done
        if (totalCompleted === totalItems && totalItems > 0) {
          status = "completed";
        }
      }

      const [goal] = await db
        .update(goalsTable)
        .set({ ...parsed.data, progress, status, updatedAt: new Date() })
        .where(and(eq(goalsTable.id, id), eq(goalsTable.userId, req.userId!)))
        .returning();
      if (!goal) {
        res.status(404).json({ error: "Goal not found" });
        return;
      }
      res.json(serializeGoal(goal));
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  "/goals/:id",
  requireAuth,
  async (req: AuthRequest, res, next): Promise<void> => {
    try {
      const id = Number(req.params.id);
      if (!id) {
        res.status(400).json({ error: "Invalid id" });
        return;
      }
      const [goal] = await db
        .delete(goalsTable)
        .where(and(eq(goalsTable.id, id), eq(goalsTable.userId, req.userId!)))
        .returning();
      if (!goal) {
        res.status(404).json({ error: "Goal not found" });
        return;
      }
      res.sendStatus(204);
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/goals/:id/detail",
  requireAuth,
  async (req: AuthRequest, res, next): Promise<void> => {
    try {
      const id = Number(req.params.id);
      if (!id) {
        res.status(400).json({ error: "Invalid id" });
        return;
      }

      const [goal] = await db
        .select()
        .from(goalsTable)
        .where(and(eq(goalsTable.id, id), eq(goalsTable.userId, req.userId!)));
      if (!goal) {
        res.status(404).json({ error: "Goal not found" });
        return;
      }

      const learningEntries = await db
        .select()
        .from(progressTable)
        .where(and(eq(progressTable.goalId, id), eq(progressTable.userId, req.userId!)))
        .orderBy(progressTable.createdAt);

      const milestones = await db
        .select()
        .from(roadmapTable)
        .where(and(eq(roadmapTable.goalId, id), eq(roadmapTable.userId, req.userId!)))
        .orderBy(roadmapTable.order);

      res.json({
        goal: serializeGoal(goal),
        learningEntries: learningEntries.map(serializeProgressEntry),
        milestones: milestones.map(serializeRoadmapItem),
      });
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  "/goals/:id/achieve",
  requireAuth,
  async (req: AuthRequest, res, next): Promise<void> => {
    try {
      const id = Number(req.params.id);
      if (!id) {
        res.status(400).json({ error: "Invalid id" });
        return;
      }

      const reflection = z.object({ reflection: z.string().nullable().optional() }).safeParse(req.body);
      if (!reflection.success) {
        res.status(400).json({ error: reflection.error.message });
        return;
      }

      const [goal] = await db
        .update(goalsTable)
        .set({
          status: "completed",
          reflection: reflection.data.reflection ?? null,
          achievedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(goalsTable.id, id), eq(goalsTable.userId, req.userId!)))
        .returning();

      if (!goal) {
        res.status(404).json({ error: "Goal not found" });
        return;
      }

      const learningEntries = await db
        .select()
        .from(progressTable)
        .where(and(eq(progressTable.goalId, id), eq(progressTable.userId, req.userId!)));

      const milestones = await db
        .select()
        .from(roadmapTable)
        .where(and(eq(roadmapTable.goalId, id), eq(roadmapTable.userId, req.userId!)));

      const totalHours = learningEntries.reduce((sum, entry) => sum + Number(entry.durationHours ?? 0), 0);
      const entriesCount = learningEntries.length;
      const milestonesTotal = milestones.length;
      const milestonesCompleted = milestones.filter((item) => item.status === "completed").length;

      res.json({
        goal: serializeGoal(goal),
        summary: {
          totalHours,
          entriesCount,
          milestonesTotal,
          milestonesCompleted,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// PATCH for pinning/archiving without full body
router.patch(
  "/goals/:id",
  requireAuth,
  async (req: AuthRequest, res, next): Promise<void> => {
    try {
      const id = Number(req.params.id);
      if (!id) {
        res.status(400).json({ error: "Invalid id" });
        return;
      }
      const patch = z
        .object({
          pinned: z.boolean().optional(),
          archived: z.boolean().optional(),
          status: z.enum(["active", "completed", "paused"]).optional(),
          progress: z.number().int().min(0).max(100).optional(),
        })
        .safeParse(req.body);
      if (!patch.success) {
        res.status(400).json({ error: patch.error.message });
        return;
      }
      const [goal] = await db
        .update(goalsTable)
        .set({ ...patch.data, updatedAt: new Date() })
        .where(and(eq(goalsTable.id, id), eq(goalsTable.userId, req.userId!)))
        .returning();
      if (!goal) {
        res.status(404).json({ error: "Goal not found" });
        return;
      }
      res.json(serializeGoal(goal));
    } catch (err) {
      next(err);
    }
  },
);

function serializeGoal(g: typeof goalsTable.$inferSelect) {
  return {
    id: g.id,
    title: g.title,
    targetRole: g.targetRole,
    description: g.description,
    skills: g.skills ?? [],
    progress: g.progress ?? 0,
    status: g.status,
    targetYear: g.targetYear,
    pinned: g.pinned ?? false,
    archived: g.archived ?? false,
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  };
}

function serializeProgressEntry(p: typeof progressTable.$inferSelect) {
  return {
    id: p.id,
    title: p.title,
    category: p.category,
    description: p.description,
    status: p.status,
    toolOrResource: p.toolOrResource,
    resourceUrl: p.resourceUrl,
    durationHours: Number(p.durationHours ?? 0),
    startDate: p.startDate ? p.startDate.toISOString() : null,
    completedAt: p.completedAt ? p.completedAt.toISOString() : null,
    goalId: p.goalId,
    pinned: p.pinned ?? false,
    archived: p.archived ?? false,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function serializeRoadmapItem(r: typeof roadmapTable.$inferSelect) {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    yearTarget: r.yearTarget,
    phase: r.phase,
    status: r.status,
    goalId: r.goalId,
    order: r.order,
    pinned: r.pinned ?? false,
    archived: r.archived ?? false,
    reflection: r.reflection ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export default router;
