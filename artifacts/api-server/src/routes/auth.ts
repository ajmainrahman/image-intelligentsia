import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

const router = Router();

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post("/auth/signup", async (req, res, next): Promise<void> => {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";

    if (!name) {
      res.status(400).json({ error: "Name is required" });
      return;
    }
    if (!email || !isValidEmail(email)) {
      res.status(400).json({ error: "A valid email address is required" });
      return;
    }

    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (existing) {
      const [updated] = await db
        .update(usersTable)
        .set({ name })
        .where(eq(usersTable.email, email))
        .returning();
      res.json({ id: updated.id, name: updated.name, email: updated.email });
      return;
    }

    const [user] = await db.insert(usersTable).values({ name, email }).returning();

    res.status(201).json({ id: user.id, name: user.name, email: user.email });
  } catch (err) {
    next(err);
  }
});

router.post("/auth/signin", async (req, res, next): Promise<void> => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";

    if (!email || !isValidEmail(email)) {
      res.status(400).json({ error: "A valid email address is required" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (!user) {
      const name = email.split("@")[0]?.replace(/[._-]+/g, " ").trim() || "New User";
      const [created] = await db.insert(usersTable).values({ name, email }).returning();
      res.status(201).json({ id: created.id, name: created.name, email: created.email });
      return;
    }

    res.json({ id: user.id, name: user.name, email: user.email });
  } catch (err) {
    next(err);
  }
});

router.post("/auth/signout", (_req, res): void => {
  res.json({ ok: true });
});

export default router;
