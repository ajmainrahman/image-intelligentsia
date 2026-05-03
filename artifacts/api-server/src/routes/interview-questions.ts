import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, interviewQuestionsTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../lib/auth.js";

const router = Router();

const QuestionBody = z.object({
  question: z.string().min(1),
  answer: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
});

router.get("/interview-questions", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const rows = await db.select().from(interviewQuestionsTable).where(eq(interviewQuestionsTable.userId, req.userId!)).orderBy(desc(interviewQuestionsTable.createdAt));
    res.json(rows.map(serializeQuestion));
  } catch (err) {
    next(err);
  }
});

router.post("/interview-questions", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const parsed = QuestionBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const [row] = await db.insert(interviewQuestionsTable).values({
      userId: req.userId!,
      question: parsed.data.question,
      answer: parsed.data.answer ?? null,
      category: parsed.data.category ?? null,
    }).returning();
    res.status(201).json(serializeQuestion(row));
  } catch (err) {
    next(err);
  }
});

router.put("/interview-questions/:id", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
    const parsed = QuestionBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const [row] = await db.update(interviewQuestionsTable)
      .set({ question: parsed.data.question, answer: parsed.data.answer ?? null, category: parsed.data.category ?? null })
      .where(and(eq(interviewQuestionsTable.id, id), eq(interviewQuestionsTable.userId, req.userId!)))
      .returning();
    if (!row) { res.status(404).json({ error: "Question not found" }); return; }
    res.json(serializeQuestion(row));
  } catch (err) {
    next(err);
  }
});

router.delete("/interview-questions/:id", requireAuth, async (req: AuthRequest, res, next): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
    const [row] = await db.delete(interviewQuestionsTable).where(and(eq(interviewQuestionsTable.id, id), eq(interviewQuestionsTable.userId, req.userId!))).returning();
    if (!row) { res.status(404).json({ error: "Question not found" }); return; }
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

function serializeQuestion(row: typeof interviewQuestionsTable.$inferSelect) {
  return {
    id: row.id,
    userId: row.userId,
    question: row.question,
    answer: row.answer,
    category: row.category,
    createdAt: row.createdAt.toISOString(),
  };
}

export default router;
