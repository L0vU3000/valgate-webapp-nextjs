"use server";


import { requireCtx } from "@/lib/auth/ctx";
import type { ActionResult } from "@/app/actions/_result";
import { revalidateFeTag, NOT_IMPLEMENTED_UNTIL_B6 } from "@/app/actions/_result";
import { NewNotificationPreferenceSchema, NotificationPreferencePatchSchema } from "@/lib/data/types/notification-preference";
import type { NotificationPreference } from "@/lib/data/types/notification-preference";
import {
  createNotificationPreference as svcCreateNotificationPreference,
  updateNotificationPreference as svcUpdateNotificationPreference,
  deleteNotificationPreference as svcDeleteNotificationPreference,
  
  
} from "@/lib/services/notification-preferences";

export async function createNotificationPreference(data: unknown): Promise<ActionResult<NotificationPreference>> {
  const parsed = NewNotificationPreferenceSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: "Invalid notification preference" };
  const ctx = await requireCtx();
  try {
    const result = await svcCreateNotificationPreference(ctx, parsed.data);
    revalidateFeTag("notification-preferences");
    return { ok: true, data: result };
  } catch (err) {
    console.error("createNotificationPreference", err);
    return { ok: false, error: "Could not create notification preference" };
  }
}

export async function updateNotificationPreference(id: string, patch: unknown): Promise<ActionResult<NotificationPreference>> {
  const parsed = NotificationPreferencePatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: "Invalid notification preference" };
  const ctx = await requireCtx();
  try {
    const result = await svcUpdateNotificationPreference(ctx, id, parsed.data);
    if (!result) return { ok: false, error: "Notification preference not found" };
    revalidateFeTag("notification-preferences");
    return { ok: true, data: result };
  } catch (err) {
    console.error("updateNotificationPreference", err);
    return { ok: false, error: "Could not update notification preference" };
  }
}

export async function deleteNotificationPreference(id: string): Promise<ActionResult<void>> {
  const ctx = await requireCtx();
  try {
    await svcDeleteNotificationPreference(ctx, id);
    revalidateFeTag("notification-preferences");
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("deleteNotificationPreference", err);
    return { ok: false, error: "Could not delete notification preference" };
  }
}


import type { NotificationEventType } from "@/lib/data/types/notification-preference";
import { listNotificationPreferences as svcListPrefs } from "@/lib/services/notification-preferences";

export async function togglePreference(
  eventType: string,
  channel: "email" | "slack" | "sms",
): Promise<ActionResult<NotificationPreference>> {
  const ctx = await requireCtx();
  try {
    const all = await svcListPrefs(ctx);
    const existing = all.find((p) => p.eventType === eventType);
    if (existing) {
      const updated = await svcUpdateNotificationPreference(ctx, existing.id, {
        [channel]: !existing[channel],
      });
      if (!updated) return { ok: false, error: "Notification preference not found" };
      revalidateFeTag("notification-preferences");
      return { ok: true, data: updated };
    }
    const created = await svcCreateNotificationPreference(ctx, {
      eventType: eventType as NotificationEventType,
      email: channel === "email",
      slack: channel === "slack",
      sms: channel === "sms",
    });
    revalidateFeTag("notification-preferences");
    return { ok: true, data: created };
  } catch (err) {
    console.error("togglePreference", err);
    return { ok: false, error: "Could not toggle notification preference" };
  }
}
