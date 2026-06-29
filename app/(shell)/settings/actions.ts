"use server";
import {
  listNotificationPreferences,
  createNotificationPreference,
  updateNotificationPreference,
} from "@/lib/services/notification-preferences";
import { upsertUserProfile } from "@/lib/services/user-profiles";
import { requireCtx } from "@/lib/auth/ctx";
import type { NotificationEventType } from "@/lib/data/types/notification-preference";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  getOrCreateInviteCode,
  regenerateInviteCode,
  approveAccessRequest,
  denyAccessRequest,
  AccessError,
} from "@/lib/services/managers";
import { setUserIsManager } from "@/lib/services/identity-sync";
import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";

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

// ─── Manager actions (owner-side) ────────────────────────────────────────────

// ─── Manager mode toggle ─────────────────────────────────────────────────────

/**
 * Flips the caller's own is_manager flag.
 *
 * Security: the Clerk user id is always read from auth() on the server — it is
 * NEVER taken from the client payload. This means the action can only ever mutate
 * the row belonging to the authenticated caller (no IDOR path).
 *
 * Revalidates /settings and "/" so the shell layout re-fetches the flag and the
 * header pill appears/disappears immediately without a full page refresh.
 *
 * What could go wrong: if the user is not authenticated, auth() returns a null
 * userId and we return an error rather than throwing (safe for the client to
 * handle). Any unexpected DB error is logged server-side and surfaced as a
 * generic string so no details leak to the client.
 */
export async function setManagerMode(enabled: boolean): Promise<{ ok: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { ok: false, error: "Not authenticated." };
    }
    // userId here is the Clerk user_… id — setUserIsManager resolves the internal row.
    await setUserIsManager(userId, enabled);
    revalidatePath("/settings");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    logger.error("setManagerMode failed", { error: String(err) });
    return { ok: false, error: "Could not update manager mode." };
  }
}

// Generate the invite code for the first time (idempotent — returns the existing
// code if one already exists). Blocked in DEMO_MODE by assertCanMutate inside
// getOrCreateInviteCode.
export async function generateInviteCodeAction(): Promise<{ ok: boolean; error?: string }> {
  try {
    const ctx = await requireCtx();
    await getOrCreateInviteCode(ctx);
    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    if (err instanceof AccessError) return { ok: false, error: err.message };
    logger.error("generateInviteCodeAction failed", { error: String(err) });
    return { ok: false, error: "Could not generate invite code." };
  }
}

// Invalidates the old code and issues a fresh one. Existing grants are unaffected.
export async function regenerateInviteCodeAction(): Promise<{ ok: boolean; error?: string }> {
  try {
    const ctx = await requireCtx();
    await regenerateInviteCode(ctx);
    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    if (err instanceof AccessError) return { ok: false, error: err.message };
    logger.error("regenerateInviteCodeAction failed", { error: String(err) });
    return { ok: false, error: "Could not regenerate invite code." };
  }
}

const requestIdSchema = z.string().min(1).max(64).regex(/^ARQ-/);

// Creates the Clerk membership + mirrors to Neon + flips the request to approved.
export async function approveRequestAction(requestId: string): Promise<{ ok: boolean; error?: string }> {
  const parsed = requestIdSchema.safeParse(requestId);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  try {
    const ctx = await requireCtx();
    await approveAccessRequest(ctx, parsed.data);
    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    if (err instanceof AccessError) return { ok: false, error: err.message };
    logger.error("approveRequestAction failed", { requestId, error: String(err) });
    return { ok: false, error: "Could not approve request." };
  }
}

// Stamps the request as denied — no membership is created.
export async function denyRequestAction(requestId: string): Promise<{ ok: boolean; error?: string }> {
  const parsed = requestIdSchema.safeParse(requestId);
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  try {
    const ctx = await requireCtx();
    await denyAccessRequest(ctx, parsed.data);
    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    if (err instanceof AccessError) return { ok: false, error: err.message };
    logger.error("denyRequestAction failed", { requestId, error: String(err) });
    return { ok: false, error: "Could not deny request." };
  }
}
