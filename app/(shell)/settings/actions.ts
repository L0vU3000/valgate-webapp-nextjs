"use server";
import * as db from "@/lib/data/db";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import type { NotificationEventType } from "@/lib/data/types/notification-preference";

const VALID_NOTIF_KEYS = ["valuationUpdates", "teamComments", "marketInsights"] as const;

export async function saveNotificationPreference(
  eventType: string,
  channels: { email: boolean; slack: boolean; sms: boolean }
) {
  if (!VALID_NOTIF_KEYS.includes(eventType as typeof VALID_NOTIF_KEYS[number])) {
    return { ok: false, error: "Invalid event type" };
  }
  const userId = getCurrentUserId();
  const all = await db.notificationPreferences.list(userId);
  const existing = all.find(p => p.eventType === eventType);
  const now = Date.now();
  if (existing) {
    await db.notificationPreferences.update(userId, existing.id, { ...channels, updatedAt: now });
  } else {
    await db.notificationPreferences.create(userId, { eventType: eventType as NotificationEventType, ...channels, createdAt: now, updatedAt: now });
  }
  return { ok: true };
}

export async function saveUserPreferences(
  patch: { dashboardView?: string; language?: string; timezone?: string }
) {
  const userId = getCurrentUserId();
  await db.userProfiles.upsert(userId, patch);
  return { ok: true };
}
