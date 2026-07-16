"use server";


import { requireCtx } from "@/lib/auth/ctx";
import type { ActionResult } from "@/app/actions/_result";
import { revalidateFeTag } from "@/app/actions/_result";
import { NewNotificationSchema, NotificationPatchSchema } from "@/lib/data/types/notification";
import type { Notification } from "@/lib/data/types/notification";
import {
  createNotification as svcCreateNotification,
  updateNotification as svcUpdateNotification,
  deleteNotification as svcDeleteNotification,
  
} from "@/lib/services/notifications";

export async function createNotification(data: unknown): Promise<ActionResult<Notification>> {
  const parsed = NewNotificationSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: "Invalid notification" };
  const ctx = await requireCtx();
  try {
    const result = await svcCreateNotification(ctx, parsed.data);
    revalidateFeTag("notifications");
    return { ok: true, data: result };
  } catch (err) {
    console.error("createNotification", err);
    return { ok: false, error: "Could not create notification" };
  }
}

export async function updateNotification(id: string, patch: unknown): Promise<ActionResult<Notification>> {
  const parsed = NotificationPatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: "Invalid notification" };
  const ctx = await requireCtx();
  try {
    const result = await svcUpdateNotification(ctx, id, parsed.data);
    if (!result) return { ok: false, error: "Notification not found" };
    revalidateFeTag("notifications");
    return { ok: true, data: result };
  } catch (err) {
    console.error("updateNotification", err);
    return { ok: false, error: "Could not update notification" };
  }
}

export async function deleteNotification(id: string): Promise<ActionResult<void>> {
  const ctx = await requireCtx();
  try {
    await svcDeleteNotification(ctx, id);
    revalidateFeTag("notifications");
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("deleteNotification", err);
    return { ok: false, error: "Could not delete notification" };
  }
}


import { z } from "zod";
import { listNotifications as svcListNotifications } from "@/lib/services/notifications";

const MarkReadSchema = z.object({ id: z.string().min(1) });

export async function markRead(id: string): Promise<ActionResult<void>> {
  const result = MarkReadSchema.safeParse({ id });
  if (!result.success) return { ok: false, error: "Invalid input" };
  const ctx = await requireCtx();
  try {
    const updated = await svcUpdateNotification(ctx, result.data.id, { read: true });
    if (!updated) return { ok: false, error: "Notification not found" };
    revalidateFeTag("notifications");
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("markRead", err);
    return { ok: false, error: "Could not mark notification read" };
  }
}

export async function markAllRead(): Promise<ActionResult<void>> {
  const ctx = await requireCtx();
  try {
    const all = await svcListNotifications(ctx);
    for (const n of all.filter((item) => !item.read)) {
      await svcUpdateNotification(ctx, n.id, { read: true });
    }
    revalidateFeTag("notifications");
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("markAllRead", err);
    return { ok: false, error: "Could not mark all notifications read" };
  }
}
