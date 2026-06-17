import "server-only"; // C1
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { notifications } from "@/lib/db/schema";
import { NotificationSchema, type Notification } from "@/lib/data/types/notification";
import type { NewNotification, NotificationPatch } from "@/lib/data/types/notification";
import { toDomain, type Ctx } from "@/lib/services/_mapping";
import { scopedInsert, scopedUpdate, scopedDelete } from "@/lib/services/_crud";

const rowToNotification = (r: typeof notifications.$inferSelect): Notification =>
  NotificationSchema.parse(toDomain(notifications, r)); // C6/C7

export async function listNotifications(ctx: Ctx, propertyId?: string): Promise<Notification[]> {
  const rows = await db.select().from(notifications)
    .where(propertyId
      ? and(eq(notifications.orgId, ctx.orgId), eq(notifications.propertyId, propertyId))
      : eq(notifications.orgId, ctx.orgId)) // C3
    .orderBy(desc(notifications.createdAt), asc(notifications.id)) // newest first
    .limit(500)
  return rows.map(rowToNotification);
}

export async function getNotification(ctx: Ctx, id: string): Promise<Notification | null> {
  const [row] = await db.select().from(notifications)
    .where(and(eq(notifications.orgId, ctx.orgId), eq(notifications.id, id))); // C3
  return row ? rowToNotification(row) : null;
}

export async function createNotification(ctx: Ctx, input: NewNotification): Promise<Notification> {
  const now = Date.now();
  return scopedInsert(ctx, notifications, "NOTIF", { ...input, createdAt: now }, rowToNotification);
}

export async function updateNotification(ctx: Ctx, id: string, patch: NotificationPatch): Promise<Notification | null> {
  return scopedUpdate(ctx, notifications, id, patch, rowToNotification, false);
}

export async function deleteNotification(ctx: Ctx, id: string): Promise<void> {
  await scopedDelete(ctx, notifications, id);
}
