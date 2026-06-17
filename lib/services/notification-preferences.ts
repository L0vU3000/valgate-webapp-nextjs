import "server-only"; // C1
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { notificationPreferences } from "@/lib/db/schema";
import { NotificationPreferenceSchema, type NotificationPreference } from "@/lib/data/types/notification-preference";
import type { NewNotificationPreference, NotificationPreferencePatch } from "@/lib/data/types/notification-preference";
import { toDomain, type Ctx } from "@/lib/services/_mapping";
import { scopedInsert, scopedUpdate, scopedDelete } from "@/lib/services/_crud";

const rowToNotificationPreference = (r: typeof notificationPreferences.$inferSelect): NotificationPreference =>
  NotificationPreferenceSchema.parse(toDomain(notificationPreferences, r)); // C6/C7

export async function listNotificationPreferences(ctx: Ctx): Promise<NotificationPreference[]> {
  const rows = await db.select().from(notificationPreferences)
    .where(eq(notificationPreferences.orgId, ctx.orgId)) // C3
    .orderBy(asc(notificationPreferences.createdAt), asc(notificationPreferences.id))
    .limit(500)
  return rows.map(rowToNotificationPreference);
}

export async function getNotificationPreference(ctx: Ctx, id: string): Promise<NotificationPreference | null> {
  const [row] = await db.select().from(notificationPreferences)
    .where(and(eq(notificationPreferences.orgId, ctx.orgId), eq(notificationPreferences.id, id))); // C3
  return row ? rowToNotificationPreference(row) : null;
}

export async function createNotificationPreference(ctx: Ctx, input: NewNotificationPreference): Promise<NotificationPreference> {
  const now = Date.now();
  return scopedInsert(ctx, notificationPreferences, "NPREF", { ...input, createdAt: now, updatedAt: now }, rowToNotificationPreference);
}

export async function updateNotificationPreference(ctx: Ctx, id: string, patch: NotificationPreferencePatch): Promise<NotificationPreference | null> {
  return scopedUpdate(ctx, notificationPreferences, id, patch, rowToNotificationPreference, true);
}

export async function deleteNotificationPreference(ctx: Ctx, id: string): Promise<void> {
  await scopedDelete(ctx, notificationPreferences, id);
}
