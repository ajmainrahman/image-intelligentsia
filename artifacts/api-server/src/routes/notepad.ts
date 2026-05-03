import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@workspace/db";
import { notesTable } from "../../../../lib/db/src/schema/notepad.js";
import { requireAuth, type AuthRequest } from "../lib/auth.js";
import { logActivity } from "../lib/activity.js";

const router = Router();

const NoteBody = z.object({
  title: z.string().max(200).default("") ,
  content: z.string().default("")
});

router.get("/notes", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const notes = await db
      .select()
      .from(notesTable)
      .where(eq(notesTable.userId, req.userId!))
      .orderBy(desc(notesTable.updatedAt));
    res.json(notes.map(serializeNote));
  } catch (err) {
    next(err);
  }
});

router.post("/notes", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const parsed = NoteBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [note] = await db.insert(notesTable).values({
      userId: req.userId!,
      title: parsed.data.title.trim(),
      content: parsed.data.content,
      updatedAt: new Date(),
    }).returning();

    await logActivity(req.userId!, "note", note.title || "Untitled note", note.id, "created");
    res.status(201).json(serializeNote(note));
  } catch (err) {
    next(err);
  }
});

router.put("/notes/:id", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const parsed = NoteBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [note] = await db.update(notesTable)
      .set({
        title: parsed.data.title.trim(),
        content: parsed.data.content,
        updatedAt: new Date(),
      })
      .where(and(eq(notesTable.id, id), eq(notesTable.userId, req.userId!)))
      .returning();

    if (!note) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    await logActivity(req.userId!, "note", note.title || "Untitled note", note.id, "updated");
    res.json(serializeNote(note));
  } catch (err) {
    next(err);
  }
});

router.delete("/notes/:id", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!id) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const [note] = await db.delete(notesTable)
      .where(and(eq(notesTable.id, id), eq(notesTable.userId, req.userId!)))
      .returning();

    if (!note) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

function serializeNote(note: typeof notesTable.$inferSelect) {
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

export default router;
