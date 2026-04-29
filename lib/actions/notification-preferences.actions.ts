"use server";

import { revalidateTag } from "next/cache";
import * as db from "@/lib/data/db/notification-preferences";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import type { NotificationPreference } from "@/lib/data/types/notification-preference";
import type { ActionResult } from "./properties.actions";

export async function createNotificationPreference(
  data: db.NewNotificationPreference,
): Promise<ActionResult<NotificationPreference>> {
  const userId = getCurrentUserId();
  const pref = await db.create(userId, data);
  revalidateTag("notification-preferences");
  return { ok: true, data: pref };
}

export async function updateNotificationPreference(
  id: string,
  patch: Partial<NotificationPreference>,
): Promise<ActionResult<NotificationPreference>> {
  const userId = getCurrentUserId();
  const updated = await db.update(userId, id, patch);
  if (!updated) return { ok: false, error: "Notification preference not found" };
  revalidateTag("notification-preferences");
  return { ok: true, data: updated };
}

export async function deleteNotificationPreference(
  id: string,
): Promise<ActionResult<void>> {
  const userId = getCurrentUserId();
  await db.remove(userId, id);
  revalidateTag("notification-preferences");
  return { ok: true, data: undefined };
}

export async function togglePreference(
  eventType: string,
  channel: "email" | "slack" | "sms",
): Promise<ActionResult<NotificationPreference>> {
  const userId = getCurrentUserId();
  const all = await db.list(userId);
  const existing = all.find((p) => p.eventType === eventType);
  if (existing) {
    const updated = await db.update(userId, existing.id, {
      [channel]: !existing[channel],
    } as Partial<NotificationPreference>);
    revalidateTag("notification-preferences");
    return { ok: true, data: updated! };
  } else {
    const created = await db.create(userId, {
      eventType,
      email: channel === "email" ? true : false,
      slack: channel === "slack" ? true : false,
      sms: channel === "sms" ? true : false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    revalidateTag("notification-preferences");
    return { ok: true, data: created };
  }
}
