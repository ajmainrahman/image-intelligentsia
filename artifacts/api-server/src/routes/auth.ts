import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

const router: IRouter = Router();

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post("/auth/signin", async (req, res, next): Promise<void> => {
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

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
    let user = existing[0];

    if (!user) {
      const inserted = await db.insert(usersTable).values({ name, email }).returning();
      user = inserted[0];
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/auth/signout", (_req, res): void => {
  res.json({ ok: true });
});

export default router;
