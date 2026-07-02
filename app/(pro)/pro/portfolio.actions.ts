"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { AccessError } from "@/lib/services/managers";
import {
  onboardClientPortfolio,
  revokeClientInvitation,
  resendClientInvitation,
  removeManagerAccess,
  recordInvitationLinkCopy,
  createClientPortfolioWithInvitees,
  addPortfolioInvitees,
  changeMemberRole,
  changeInviteeRole,
  removePortfolioMember,
  listPortfolioMembers,
} from "@/lib/services/client-onboarding";
import type { PortfolioRole, PortfolioMember, PortfolioInvitee } from "@/lib/services/client-onboarding";
import { requireCtx } from "@/lib/auth/ctx";
import { logger } from "@/lib/logger";
import type { ProActionResult } from "./_lib/revalidate";

// --- Manager-led client onboarding (Phase 1 / Phase 3) ------------------------

// A property the manager sketches in the onboarding wizard. Lightweight by
// design — name, a coarse type label, and an optional value. The service maps
// the type label to the internal enum and fills the remaining schema defaults.
const propertyStubSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  value: z.number().positive().optional(),
});

const onboardClientPortfolioSchema = z.object({
  name: z.string().min(2),
  clientEmail: z.string().email(),
  role: z.enum(["view", "full"]),
  locale: z.enum(["en", "km"]).optional(),
  // New properties to create in the client's portfolio org.
  propertyStubs: z.array(propertyStubSchema).default([]),
  // Existing unassigned property ids to earmark for the client.
  assignPropertyIds: z.array(z.string().min(1)).default([]),
  // Phase 3 finish: whether the manager wants to keep their access after the
  // client accepts. Defaults to true (safe). The server clamps to true when
  // role = "view" regardless of what is sent.
  retainAccess: z.boolean().default(true),
});

export async function onboardClientPortfolioAction(input: {
  name: string;
  clientEmail: string;
  role: "view" | "full";
  locale?: "en" | "km";
  propertyStubs?: Array<{ name: string; type: string; value?: number }>;
  assignPropertyIds?: string[];
  // Whether the manager wants to keep their org membership after the client accepts.
  retainAccess?: boolean;
}): Promise<ProActionResult> {
  const parsed = onboardClientPortfolioSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const authCtx = await requireCtx();
  // Map the boolean UI value to the DB enum. The service layer also clamps
  // "leave" to "keep" when role = "view", but we do it here too as defense-in-depth.
  const intent: "keep" | "leave" = parsed.data.retainAccess ? "keep" : "leave";
  try {
    const result = await onboardClientPortfolio(authCtx, { ...parsed.data, intent });
    revalidatePath("/pro/clients");
    return {
      ok: true,
      count: result.propertyCount,
      invitationUrl: result.invitationUrl ?? undefined,
      // D2: returned so the caller (e.g. AddPropertyFlowPro nested wizard) can set
      // the new org as targetOrgId and resume the property wizard immediately.
      orgId: result.orgId,
    };
  } catch (err) {
    logger.error("onboardClientPortfolioAction: failed", { error: String(err) });
    return { ok: false, error: "Could not send invitation. Please try again." };
  }
}

const handoffIdSchema = z.object({
  handoffId: z.string().min(1),
});

export async function revokeClientInvitationAction(input: {
  handoffId: string;
}): Promise<ProActionResult> {
  const parsed = handoffIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const authCtx = await requireCtx();
  try {
    await revokeClientInvitation(authCtx, parsed.data.handoffId);
  } catch (err) {
    if (err instanceof AccessError) return { ok: false, error: err.message };
    logger.error("revokeClientInvitationAction: failed", { error: String(err) });
    return { ok: false, error: "Could not revoke invitation." };
  }
  revalidatePath("/pro/clients");
  return { ok: true };
}

export async function resendClientInvitationAction(input: {
  handoffId: string;
}): Promise<ProActionResult> {
  const parsed = handoffIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const authCtx = await requireCtx();
  try {
    const result = await resendClientInvitation(authCtx, parsed.data.handoffId);
    revalidatePath("/pro/clients");
    return { ok: true, invitationUrl: result.invitationUrl ?? undefined };
  } catch (err) {
    if (err instanceof AccessError) return { ok: false, error: err.message };
    logger.error("resendClientInvitationAction: failed", { error: String(err) });
    return { ok: false, error: "Could not resend invitation." };
  }
}

export async function removeManagerAccessAction(input: {
  handoffId: string;
}): Promise<ProActionResult> {
  const parsed = handoffIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const authCtx = await requireCtx();
  try {
    await removeManagerAccess(authCtx, parsed.data.handoffId);
  } catch (err) {
    if (err instanceof AccessError) return { ok: false, error: err.message };
    logger.error("removeManagerAccessAction: failed", { error: String(err) });
    return { ok: false, error: "Could not remove access." };
  }
  revalidatePath("/pro/clients");
  return { ok: true };
}

export async function copyInvitationLinkAction(input: {
  handoffId: string;
}): Promise<ProActionResult> {
  const parsed = handoffIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const authCtx = await requireCtx();
  try {
    const result = await recordInvitationLinkCopy(authCtx, parsed.data.handoffId);
    return { ok: true, invitationUrl: result.invitationUrl ?? undefined };
  } catch (err) {
    if (err instanceof AccessError) return { ok: false, error: err.message };
    logger.error("copyInvitationLinkAction: failed", { error: String(err) });
    return { ok: false, error: "Could not copy invitation link." };
  }
}

// --- Phase 6: multi-user portfolios ----------------------------------------

const inviteeSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member", "viewer"]),
  name: z.string().max(120).optional(),
});

const createPortfolioSchema = z
  .object({
    // Blank is allowed ONLY when there is at least one invitee — the service then
    // defaults the name to "<client name> Portfolio" derived from the first email.
    // The .refine() below enforces a name when there are zero invitees (a draft).
    portfolioName: z.string().max(120),
    // Zero invitees is allowed: this creates a DRAFT portfolio (org + client row +
    // properties, no invitation, no email). The manager invites later from the
    // Manage members drawer. When invitees are present each still needs a valid email.
    invitees: z.array(inviteeSchema).default([]),
    propertyStubs: z.array(propertyStubSchema).default([]),
    assignPropertyIds: z.array(z.string().min(1)).default([]),
    locale: z.enum(["en", "km"]).optional(),
    sendNow: z.boolean(),
    managerAccessModel: z.enum(["approval", "full", "remove"]).default("approval"),
  })
  // A draft (no invitees) has no email to derive a name from, so the manager must
  // type one. The error is attached to portfolioName so the UI can surface it inline.
  .refine((data) => data.invitees.length > 0 || data.portfolioName.trim().length > 0, {
    message: "Give the portfolio a name.",
    path: ["portfolioName"],
  });

// Creates a portfolio org. With one or more invitees, sendNow=true sends invitations
// immediately and sendNow=false saves draft handoffs without emailing. With zero
// invitees it creates a draft portfolio (no handoffs, no email) to invite into later.
export async function createPortfolioAction(input: {
  portfolioName: string;
  invitees: Array<{ email: string; role: PortfolioRole; name?: string }>;
  propertyStubs?: Array<{ name: string; type: string; value?: number }>;
  assignPropertyIds?: string[];
  locale?: "en" | "km";
  sendNow: boolean;
  managerAccessModel?: "approval" | "full" | "remove";
}): Promise<ProActionResult> {
  const parsed = createPortfolioSchema.safeParse(input);
  if (!parsed.success) {
    // These validation messages are authored by us (e.g. "Give the portfolio a
    // name.") and safe to show the user; fall back to a generic string otherwise.
    const firstIssue = parsed.error.issues[0]?.message;
    return { ok: false, error: firstIssue ?? "Invalid input." };
  }
  const authCtx = await requireCtx();
  try {
    const result = await createClientPortfolioWithInvitees(authCtx, {
      portfolioName: parsed.data.portfolioName,
      invitees: parsed.data.invitees as Array<{ email: string; role: PortfolioRole; name?: string }>,
      propertyStubs: parsed.data.propertyStubs,
      assignPropertyIds: parsed.data.assignPropertyIds,
      locale: parsed.data.locale,
      sendNow: parsed.data.sendNow,
      managerAccessModel: parsed.data.managerAccessModel,
    });
    revalidatePath("/pro/clients");
    return { ok: true, count: result.propertyCount, orgId: result.orgId };
  } catch (err) {
    if (err instanceof AccessError) return { ok: false, error: err.message };
    logger.error("createPortfolioAction: failed", { error: String(err) });
    return { ok: false, error: "Could not create portfolio. Please try again." };
  }
}

const addInviteesSchema = z.object({
  orgId: z.string().min(1),
  invitees: z.array(inviteeSchema).min(1),
  sendNow: z.boolean(),
});

// Adds more invitees to an existing portfolio. Manager must be org:admin.
export async function addPortfolioInviteesAction(input: {
  orgId: string;
  invitees: Array<{ email: string; role: PortfolioRole; name?: string }>;
  sendNow: boolean;
}): Promise<ProActionResult> {
  const parsed = addInviteesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const authCtx = await requireCtx();
  try {
    const result = await addPortfolioInvitees(
      authCtx,
      parsed.data.orgId,
      parsed.data.invitees as Array<{ email: string; role: PortfolioRole; name?: string }>,
      parsed.data.sendNow,
    );
    revalidatePath("/pro/clients");
    return { ok: true, count: result.added };
  } catch (err) {
    if (err instanceof AccessError) return { ok: false, error: err.message };
    logger.error("addPortfolioInviteesAction: failed", { error: String(err) });
    return { ok: false, error: "Could not add invitees. Please try again." };
  }
}

const changeMemberRoleSchema = z.object({
  orgId: z.string().min(1),
  memberClerkUserId: z.string().min(1),
  role: z.enum(["admin", "member", "viewer"]),
});

// Updates an accepted member's role in the Clerk org + Neon mirror.
export async function changeMemberRoleAction(input: {
  orgId: string;
  memberClerkUserId: string;
  role: PortfolioRole;
}): Promise<ProActionResult> {
  const parsed = changeMemberRoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const authCtx = await requireCtx();
  try {
    await changeMemberRole(authCtx, parsed.data.orgId, parsed.data.memberClerkUserId, parsed.data.role as PortfolioRole);
    revalidatePath("/pro/clients");
    return { ok: true };
  } catch (err) {
    if (err instanceof AccessError) return { ok: false, error: err.message };
    logger.error("changeMemberRoleAction: failed", { error: String(err) });
    return { ok: false, error: "Could not update member role." };
  }
}

const changeInviteeRoleSchema = z.object({
  handoffId: z.string().min(1),
  role: z.enum(["admin", "member", "viewer"]),
});

// Changes the role on a draft or pending invitation.
// For pending: revokes old Clerk invite + creates a new one with the updated role.
export async function changeInviteeRoleAction(input: {
  handoffId: string;
  role: PortfolioRole;
}): Promise<ProActionResult> {
  const parsed = changeInviteeRoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const authCtx = await requireCtx();
  try {
    await changeInviteeRole(authCtx, parsed.data.handoffId, parsed.data.role as PortfolioRole);
    revalidatePath("/pro/clients");
    return { ok: true };
  } catch (err) {
    if (err instanceof AccessError) return { ok: false, error: err.message };
    logger.error("changeInviteeRoleAction: failed", { error: String(err) });
    return { ok: false, error: "Could not update invitee role." };
  }
}

const removePortfolioMemberSchema = z.object({
  orgId: z.string().min(1),
  memberClerkUserId: z.string().min(1),
});

// Removes an accepted member from the portfolio. Guards: no self-remove, no last-admin remove.
export async function removePortfolioMemberAction(input: {
  orgId: string;
  memberClerkUserId: string;
}): Promise<ProActionResult> {
  const parsed = removePortfolioMemberSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const authCtx = await requireCtx();
  try {
    await removePortfolioMember(authCtx, parsed.data.orgId, parsed.data.memberClerkUserId);
    revalidatePath("/pro/clients");
    return { ok: true };
  } catch (err) {
    if (err instanceof AccessError) return { ok: false, error: err.message };
    logger.error("removePortfolioMemberAction: failed", { error: String(err) });
    return { ok: false, error: "Could not remove member." };
  }
}

const getPortfolioMembersSchema = z.object({
  orgId: z.string().min(1),
});

export type GetPortfolioMembersResult =
  | { ok: true; members: PortfolioMember[]; invitees: PortfolioInvitee[] }
  | { ok: false; error: string };

// Returns the member + invitee list for the drawer. Called from the Client Component
// when the drawer opens.
export async function getPortfolioMembersAction(input: {
  orgId: string;
}): Promise<GetPortfolioMembersResult> {
  const parsed = getPortfolioMembersSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const authCtx = await requireCtx();
  try {
    const result = await listPortfolioMembers(authCtx, parsed.data.orgId);
    return { ok: true, ...result };
  } catch (err) {
    if (err instanceof AccessError) return { ok: false, error: err.message };
    logger.error("getPortfolioMembersAction: failed", { error: String(err) });
    return { ok: false, error: "Could not load members." };
  }
}
