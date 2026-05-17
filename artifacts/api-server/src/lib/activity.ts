import { db, activityLogTable } from "@workspace/db";

export type ActivityType = "job" | "goal" | "progress" | "reminder" | "note" | "roadmap" | "research";

export async function logActivity(
  userId: number,
  type: ActivityType,
  label: string,
  refId?: number | null,
  action: string = "created",
): Promise<void> {
  try {
    await db.insert(activityLogTable).values({
      userId,
      type,
      refId: refId ?? null,
      label: label.slice(0, 200),
      action,
    });
  } catch {
    // never block the originating request on activity logging
  }
}
