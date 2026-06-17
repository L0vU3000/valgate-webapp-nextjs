"use server";
import {
  listNotificationPreferences,
  createNotificationPreference,
  updateNotificationPreference,
} from "@/lib/services/notification-preferences";
import { upsertUserProfile } from "@/lib/services/user-profiles";
import { requireCtx } from "@/lib/auth/ctx";
import type { NotificationEventType } from "@/lib/data/types/notification-preference";

const VALID_NOTIF_KEYS = ["valuationUpdates", "teamComments", "marketInsights"] as const;

export async function saveNotificationPreference(
  eventType: string,
  channels: { email: boolean; slack: boolean; sms: boolean }
) {
  if (!VALID_NOTIF_KEYS.includes(eventType as typeof VALID_NOTIF_KEYS[number])) {
    return { ok: false, error: "Invalid event type" };
  }
  const ctx = await requireCtx();
  const all = await listNotificationPreferences(ctx);
  const existing = all.find(p => p.eventType === eventType);
  if (existing) {
    await updateNotificationPreference(ctx, existing.id, { ...channels });
  } else {
    await createNotificationPreference(ctx, { eventType: eventType as NotificationEventType, ...channels });
  }
  return { ok: true };
}

export async function saveUserPreferences(
  patch: { dashboardView?: string; language?: string; timezone?: string }
) {
  const ctx = await requireCtx();
  await upsertUserProfile(ctx, patch);
  return { ok: true };
}
