import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db, usersTable, goalsTable, progressTable, researchTable, roadmapTable, remindersTable, weeklyReviewsTable } from "@workspace/db";

async function main() {
  const email = "starter@imageintelligentsia.app";
  const [existingUser] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  const passwordHash = await bcrypt.hash("starter123", 10);

  const user = existingUser ?? (await db.insert(usersTable).values({
    name: "Starter User",
    email,
    passwordHash,
  }).returning())[0];

  await db.delete(weeklyReviewsTable).where(eq(weeklyReviewsTable.userId, user.id));
  await db.delete(remindersTable).where(eq(remindersTable.userId, user.id));
  await db.delete(progressTable).where(eq(progressTable.userId, user.id));
  await db.delete(researchTable).where(eq(researchTable.userId, user.id));
  await db.delete(roadmapTable).where(eq(roadmapTable.userId, user.id));
  await db.delete(goalsTable).where(eq(goalsTable.userId, user.id));

  const [goal1, goal2] = await db.insert(goalsTable).values([
    {
      userId: user.id,
      title: "Build a stronger ML research workflow",
      targetRole: "Applied AI Researcher",
      description: "Ship a repeatable system for reading, summarizing, and tracking papers.",
      skills: ["paper reading", "note taking", "experiment tracking"],
      progress: 45,
      status: "active",
      targetYear: new Date().getFullYear() + 1,
    },
    {
      userId: user.id,
      title: "Publish one visible case study",
      targetRole: "Research Engineer",
      description: "Turn a project into a public artifact with clear results.",
      skills: ["writing", "portfolio", "communication"],
      progress: 20,
      status: "active",
      targetYear: new Date().getFullYear() + 1,
    },
  ]).returning();

  await db.insert(progressTable).values([
    {
      userId: user.id,
      title: "Read and annotate diffusion paper",
      category: "research",
      description: "Summarized core method and limitations.",
      status: "completed",
      durationHours: "2.5",
      goalId: goal1.id,
    },
    {
      userId: user.id,
      title: "Draft notes for weekly review",
      category: "learning",
      description: "Captured wins and blockers for the week.",
      status: "in_progress",
      durationHours: "1.0",
      goalId: goal1.id,
    },
    {
      userId: user.id,
      title: "Outline case study structure",
      category: "writing",
      description: "Defined sections and key visuals for the post.",
      status: "completed",
      durationHours: "1.5",
      goalId: goal2.id,
    },
  ]);

  await db.insert(researchTable).values([
    {
      userId: user.id,
      title: "Latent diffusion summary",
      type: "paper",
      authors: "Rombach et al.",
      source: "arXiv",
      summary: "Foundational generative modeling technique worth tracking.",
      tags: ["diffusion", "generation"],
      status: "reading",
      goalId: goal1.id,
    },
    {
      userId: user.id,
      title: "Portfolio storytelling notes",
      type: "note",
      source: "internal",
      summary: "Structure a project around problem, process, and impact.",
      tags: ["portfolio", "writing"],
      status: "to_explore",
      goalId: goal2.id,
    },
  ]);

  await db.insert(roadmapTable).values([
    {
      userId: user.id,
      title: "Finish weekly research synthesis",
      description: "Publish a concise summary every Friday.",
      yearTarget: new Date().getFullYear(),
      phase: "short_term",
      status: "in_progress",
      goalId: goal1.id,
      order: 0,
    },
    {
      userId: user.id,
      title: "Launch public case study",
      description: "Create a polished write-up and share it.",
      yearTarget: new Date().getFullYear() + 1,
      phase: "mid_term",
      status: "planned",
      goalId: goal2.id,
      order: 1,
    },
  ]);

  await db.insert(remindersTable).values([
    {
      userId: user.id,
      title: "Review next paper",
      description: "Pick one paper for deeper reading.",
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      priority: "high",
      completed: false,
      category: "research",
    },
    {
      userId: user.id,
      title: "Publish weekly notes",
      description: "Turn review notes into an update.",
      dueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
      priority: "medium",
      completed: false,
      category: "writing",
    },
  ]);

  await db.insert(weeklyReviewsTable).values({
    userId: user.id,
    weekStart: new Date(),
    weekEnd: new Date(),
    hoursLogged: 5,
    entriesCompleted: 3,
    goalsProgressed: 2,
    notes: "Strong research momentum this week. Next step: turn notes into a shareable synthesis.",
  });

  console.log(`Seeded database for ${email} / starter123`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
