import { db, activityLogTable } from "@workspace/db";

export type ActivityType = "job" | "goal" | "progress" | "reminder" | "note" | "roadmap";

export async function logActivity(
  userId: number,
  type: ActivityType,
  title: string,
  relatedId?: number | null,
  action: string = "created",
): Promise<void> {
  try {
    await db.insert(activityLogTable).values({
      userId,
      type,
      relatedId: relatedId ?? null,
      title: title.slice(0, 200),
      action,
    });
  } catch {
    // never block the originating request on activity logging
  }
}
