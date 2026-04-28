import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, profileTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router = Router();

const ProfileBody = z.object({
  tagline: z.string().max(200).default(""),
  about: z.string().max(2000).default(""),
  expertise: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  interests: z.array(z.string()).default([]),
});

router.get("/profile", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const [profile] = await db
      .select()
      .from(profileTable)
      .where(eq(profileTable.userId, req.userId!));
    if (!profile) {
      res.json({
        tagline: "", about: "", expertise: [], skills: [], interests: [],
      });
      return;
    }
    res.json(serializeProfile(profile));
  } catch (err) { next(err); }
});

router.put("/profile", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const parsed = ProfileBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

    const existing = await db
      .select()
      .from(profileTable)
      .where(eq(profileTable.userId, req.userId!));

    if (existing.length > 0) {
      const [profile] = await db
        .update(profileTable)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(profileTable.userId, req.userId!))
        .returning();
      res.json(serializeProfile(profile));
    } else {
      const [profile] = await db
        .insert(profileTable)
        .values({ ...parsed.data, userId: req.userId! })
        .returning();
      res.json(serializeProfile(profile));
    }
  } catch (err) { next(err); }
});

function serializeProfile(p: typeof profileTable.$inferSelect) {
  return {
    tagline: p.tagline,
    about: p.about,
    expertise: p.expertise ?? [],
    skills: p.skills ?? [],
    interests: p.interests ?? [],
    updatedAt: p.updatedAt.toISOString(),
  };
}

export default router;
