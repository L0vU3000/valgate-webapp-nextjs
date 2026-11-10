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
import { logger } from "@/lib/logger";

import { inviteOrgMember, removeMember, orgMembershipIdSchema } from "@/lib/services/org-members";
import { actionLimiter, allowed } from "@/lib/ratelimit";
import type { Ctx } from "@/lib/services/_mapping";

const VALID_NOTIF_KEYS = ["valuationUpdates", "teamComments", "marketInsights"] as const;

export async function saveNotificationPreference(
  eventType: string,
  channels: { email: boolean; slack: boolean; sms: boolean }
) {
  if (!VALID_NOTIF_KEYS.includes(eventType as typeof VALID_NOTIF_KEYS[number])) {
    return { ok: false, error: "Invalid event type" };
  }
  try {
    const ctx = await requireCtx();
    if (ctx.orgRole !== "owner") return { ok: false, error: "Only organization owners can make changes." };
    const parsed = z.object({ email: z.boolean(), slack: z.boolean(), sms: z.boolean() }).safeParse(channels);
    if (!parsed.success) return { ok: false, error: "Invalid channels." };
    const all = await listNotificationPreferences(ctx);
    const existing = all.find(p => p.eventType === eventType);
    if (existing) {
      await updateNotificationPreference(ctx, existing.id, parsed.data);
    } else {
      await createNotificationPreference(ctx, { eventType: eventType as NotificationEventType, ...parsed.data });
    }
    return { ok: true };
  } catch (err) {
    logger.error("saveNotificationPreference failed", { error: String(err) });
    return { ok: false, error: "Could not save notification preferences." };
  }
}

export async function saveUserPreferences(
  patch: { dashboardView?: string; language?: string; timezone?: string }
) {
  const parsed = z.object({ dashboardView: z.string().max(64).optional(), language: z.string().max(32).optional(), timezone: z.string().max(64).optional() }).safeParse(patch);
  if (!parsed.success) return { ok: false, error: "Invalid preferences." };
  try {
    const ctx = await requireCtx();
    if (ctx.orgRole !== "owner") return { ok: false, error: "Only organization owners can make changes." };
    await upsertUserProfile(ctx, parsed.data);
    return { ok: true };
  } catch (err) {
    logger.error("saveUserPreferences failed", { error: String(err) });
    return { ok: false, error: "Could not save preferences." };
  }
}

// ─── Manager actions (owner-side) ────────────────────────────────────────────

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

// Organization membership actions. Services re-check the active owner mirror.

async function orgMemberAction(operation: (ctx: Ctx) => Promise<void>): Promise<{ ok: boolean; error?: string }> {
  try {
    const ctx = await requireCtx();
    if (ctx.orgRole !== "owner") return { ok: false, error: "Only organization owners can manage members." };
    if (!await allowed(actionLimiter, ctx.userId, "settings.orgMembers")) {
      return { ok: false, error: "Too many requests. Try again shortly." };
    }
    await operation(ctx);
    revalidatePath("/settings");
    return { ok: true };
  } catch (err) {
    logger.error("Organization member action failed", { error: String(err) });
    return { ok: false, error: "Could not update organization members." };
  }
}

export async function inviteOrgMemberAction(email: string): Promise<{ ok: boolean; error?: string }> {
  const parsed = z.string().trim().email().max(254).safeParse(email);
  if (!parsed.success) return { ok: false, error: "Invalid email." };
  return orgMemberAction(ctx => inviteOrgMember(ctx, parsed.data, "viewer"));
}

export async function removeMemberAction(membershipId: string): Promise<{ ok: boolean; error?: string }> {
  const parsed = orgMembershipIdSchema.safeParse(membershipId);
  if (!parsed.success) return { ok: false, error: "Invalid membership." };
  return orgMemberAction(ctx => removeMember(ctx, parsed.data));
}
