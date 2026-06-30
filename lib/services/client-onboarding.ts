import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { Resend } from "resend";
import { db } from "@/lib/db/client";
import { clientHandoffs, notifications, organizationMemberships, organizations, users } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { buildInvitationEmailEn } from "@/lib/email-templates/invitation-en";
import { buildInvitationEmailKm } from "@/lib/email-templates/invitation-km";
import { getClientInvitationRedirectUrl } from "@/lib/app-origin";
import { nextId, assertCanMutate, type Ctx } from "@/lib/services/_mapping";
import { upsertOrg, upsertMembership, removeMembership } from "@/lib/services/identity-sync";
import { assertOrgAdmin } from "@/lib/services/_crud";
import { AccessError } from "@/lib/services/managers";
import { createPropertyForOrg, bulkAssignProperties } from "@/lib/services/properties";
import type { NewProperty, PropertyTypeChoice } from "@/lib/data/types/property";
import { logger } from "@/lib/logger";

const DEFAULT_FROM_EMAIL = "Valgate <onboarding@resend.dev>";

// ────────────────────────────────────────────────────────────────────────────
// Manager-led client onboarding (Phase 1/3/6). A manager (org:admin) creates a
// Clerk org for their client, optionally seeds properties, sends invitations,
// and tracks lifecycle through client_handoffs.
// ────────────────────────────────────────────────────────────────────────────

// Phase 6: three-tier portfolio role.
export type PortfolioRole = "admin" | "member" | "viewer";

// Maps our PortfolioRole to the Clerk org role string.
function clerkRoleForPortfolioRole(role: PortfolioRole): string {
  if (role === "admin") return "org:admin";
  if (role === "member") return "org:member";
  return "org:viewer";
}

// Maps the org_role enum (identity mirror) back to PortfolioRole for the drawer.
// normaliseRole maps org:admin → "owner", so we need to handle "owner" as admin.
function orgRoleToPortfolioRole(orgRole: string): PortfolioRole {
  if (orgRole === "owner" || orgRole === "admin") return "admin";
  if (orgRole === "member") return "member";
  return "viewer";
}

// ─── Shared notification helper ─────────────────────────────────────────────

/**
 * Sends the localized portfolio invitation email via Resend.
 * Clerk still creates the invitation (URL + ID); Resend delivers the email body.
 */
export async function sendInvitationEmail(
  email: string,
  invitationUrl: string,
  locale: "en" | "km",
  clientName: string,
): Promise<void> {
  if (!env.RESEND_API_KEY) {
    logger.warn("sendInvitationEmail: RESEND_API_KEY not set, skipping email send", { email });
    return;
  }
  if (!invitationUrl) {
    logger.warn("sendInvitationEmail: missing invitation URL, skipping", { email });
    return;
  }

  const template =
    locale === "km"
      ? buildInvitationEmailKm({ clientName, invitationUrl })
      : buildInvitationEmailEn({ clientName, invitationUrl });

  const resend = new Resend(env.RESEND_API_KEY);
  const from = env.RESEND_FROM_EMAIL ?? DEFAULT_FROM_EMAIL;

  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: template.subject,
    html: template.html,
  });

  if (error) {
    logger.error("sendInvitationEmail: Resend API error", { error: String(error), email });
    throw new AccessError("Could not send invitation email.");
  }
}

export async function insertAccessNotification(input: {
  orgId: string;
  userId: string;
  title: string;
  description: string;
  linkTo: string;
}): Promise<void> {
  const id = await nextId("NOTIF");
  await db.insert(notifications).values({
    id,
    orgId: input.orgId,
    userId: input.userId,
    category: "ACCESS",
    title: input.title,
    description: input.description,
    read: false,
    linkTo: input.linkTo,
  });
}

// ─── Shared internal helpers ─────────────────────────────────────────────────

export type OnboardResult = {
  handoffId: string;
  orgId: string;
  invitationUrl: string | null;
  propertyCount: number;
};

type PropertyStub = {
  name: string;
  type: string;
  value?: number;
};

function stubTypeToPropertyType(rawType: string): PropertyTypeChoice {
  const key = rawType.trim().toLowerCase();
  if (key === "residential") return "residential";
  if (key === "commercial") return "commercial";
  if (key === "land") return "land";
  return "other";
}

function buildPropertyFromStub(stub: PropertyStub): NewProperty {
  return {
    name: stub.name,
    type: stubTypeToPropertyType(stub.type),
    status: "Vacant",
    lat: 0,
    lng: 0,
    totalArea: "",
    title: "—",
    buyNumeric: stub.value ?? 0,
    currentMarketValue: stub.value,
  };
}

// ─── Phase 6: multi-invitee portfolio creation ───────────────────────────────

export type CreatePortfolioResult = {
  orgId: string;
  handoffIds: string[];
  propertyCount: number;
};

/**
 * Creates a Clerk org for the portfolio, mirrors it in Neon, seeds properties,
 * and creates one client_handoffs row per invitee.
 *
 * When sendNow=true: creates Clerk invitations + sends Resend emails → status "pending".
 * When sendNow=false: records handoffs without emailing → status "draft".
 */
export async function createClientPortfolioWithInvitees(
  ctx: Ctx,
  input: {
    portfolioName: string;
    invitees: Array<{ email: string; role: PortfolioRole; name?: string }>;
    propertyStubs?: PropertyStub[];
    assignPropertyIds?: string[];
    locale?: "en" | "km";
    sendNow: boolean;
    retainAccess?: boolean;
  },
): Promise<CreatePortfolioResult> {
  assertCanMutate();

  const client = await clerkClient();
  const [managerUser] = await db
    .select({ clerkUserId: users.clerkUserId })
    .from(users)
    .where(eq(users.id, ctx.userId))
    .limit(1);
  if (!managerUser) throw new AccessError("Could not find your user record.");

  // 1. Create the Clerk organisation. The creating user becomes org:admin automatically.
  const clerkOrg = await client.organizations.createOrganization({
    name: input.portfolioName,
    createdBy: managerUser.clerkUserId,
  });

  // 2. Upsert Neon mirror (idempotent).
  await upsertOrg({ id: clerkOrg.id, name: input.portfolioName });

  // 2b. Mirror the manager's membership immediately so createPropertyForOrg's
  //     admin check passes before the webhook arrives.
  await upsertMembership({
    clerkOrgId: clerkOrg.id,
    clerkUserId: managerUser.clerkUserId,
    role: "org:admin",
  });

  // Resolve the new org's Neon id.
  const [orgRow] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.clerkOrgId, clerkOrg.id))
    .limit(1);
  if (!orgRow) throw new AccessError("Could not create the portfolio org.");

  // 3. Create one handoff row per invitee. If sendNow, also create a Clerk
  //    invitation and send the Resend email for that invitee.
  const handoffIds: string[] = [];
  const locale = input.locale ?? "en";
  const managerAccessIntent: "keep" | "leave" = input.retainAccess === false ? "leave" : "keep";

  for (const invitee of input.invitees) {
    let clerkInvitationId: string | null = null;
    let invitationUrl: string | null = null;
    const status: "draft" | "pending" = input.sendNow ? "pending" : "draft";

    if (input.sendNow) {
      const invitation = await client.organizations.createOrganizationInvitation({
        organizationId: clerkOrg.id,
        inviterUserId: managerUser.clerkUserId,
        emailAddress: invitee.email,
        role: clerkRoleForPortfolioRole(invitee.role),
        redirectUrl: getClientInvitationRedirectUrl(),
      });
      clerkInvitationId = invitation.id;
      invitationUrl = invitation.url ?? null;

      await sendInvitationEmail(
        invitee.email,
        invitation.url ?? "",
        locale,
        invitee.name || input.portfolioName,
      );
    }

    const handoffId = await nextId("CHO");
    await db.insert(clientHandoffs).values({
      id: handoffId,
      managerUserId: ctx.userId,
      orgId: orgRow.id,
      clientName: invitee.name || null,
      clientEmail: invitee.email,
      clerkInvitationId,
      status,
      role: invitee.role,
      managerAccess: "granted",
      invitationUrl,
      locale,
      managerAccessIntent,
    });
    handoffIds.push(handoffId);
  }

  // 4. Seed the portfolio with properties.
  let propertiesCreated = 0;
  let propertiesAssigned = 0;

  for (const stub of (input.propertyStubs ?? [])) {
    await createPropertyForOrg(ctx, orgRow.id, buildPropertyFromStub(stub));
    propertiesCreated++;
  }

  if ((input.assignPropertyIds ?? []).length > 0) {
    const assignResult = await bulkAssignProperties(ctx, orgRow.id, orgRow.id, input.assignPropertyIds!);
    propertiesAssigned = assignResult.assigned;
  }

  // 5. Notify manager. Best-effort.
  try {
    const verb = input.sendNow ? "Invitations sent" : "Portfolio created";
    const n = input.invitees.length;
    await insertAccessNotification({
      orgId: ctx.orgId,
      userId: ctx.userId,
      title: verb,
      description: `${input.portfolioName} created with ${n} ${n === 1 ? "invitee" : "invitees"}`,
      linkTo: "/pro/clients",
    });
  } catch (err) {
    logger.error("createClientPortfolioWithInvitees: notification failed", { error: String(err) });
  }

  return { orgId: orgRow.id, handoffIds, propertyCount: propertiesCreated + propertiesAssigned };
}

// ─── Phase 6: add people to an EXISTING portfolio ────────────────────────────

/**
 * Adds more invitees to an existing portfolio org. Manager must be admin.
 * sendNow=true → Clerk invitation + Resend email → status "pending".
 * sendNow=false → handoff only, no email → status "draft".
 */
export async function addPortfolioInvitees(
  ctx: Ctx,
  orgId: string,
  invitees: Array<{ email: string; role: PortfolioRole; name?: string }>,
  sendNow: boolean,
): Promise<{ added: number }> {
  assertCanMutate();
  await assertOrgAdmin(ctx, orgId);

  const [orgRow] = await db
    .select({ clerkOrgId: organizations.clerkOrgId })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  if (!orgRow) throw new AccessError("Portfolio org not found.");

  const [managerUser] = await db
    .select({ clerkUserId: users.clerkUserId })
    .from(users)
    .where(eq(users.id, ctx.userId))
    .limit(1);
  if (!managerUser) throw new AccessError("Could not find your user record.");

  const client = await clerkClient();
  let added = 0;

  for (const invitee of invitees) {
    let clerkInvitationId: string | null = null;
    let invitationUrl: string | null = null;
    const status: "draft" | "pending" = sendNow ? "pending" : "draft";

    if (sendNow) {
      const invitation = await client.organizations.createOrganizationInvitation({
        organizationId: orgRow.clerkOrgId,
        inviterUserId: managerUser.clerkUserId,
        emailAddress: invitee.email,
        role: clerkRoleForPortfolioRole(invitee.role),
        redirectUrl: getClientInvitationRedirectUrl(),
      });
      clerkInvitationId = invitation.id;
      invitationUrl = invitation.url ?? null;
      await sendInvitationEmail(invitee.email, invitation.url ?? "", "en", invitee.name || "");
    }

    const handoffId = await nextId("CHO");
    await db.insert(clientHandoffs).values({
      id: handoffId,
      managerUserId: ctx.userId,
      orgId,
      clientName: invitee.name || null,
      clientEmail: invitee.email,
      clerkInvitationId,
      status,
      role: invitee.role,
      managerAccess: "granted",
      invitationUrl,
      locale: "en",
      managerAccessIntent: "keep",
    });
    added++;
  }

  return { added };
}

// ─── Phase 6: change an ACCEPTED member's role ───────────────────────────────

/**
 * Updates the Clerk org role for an accepted member and mirrors the change in Neon.
 * Calls updateOrganizationMembership — the one new Clerk call in Phase 6.
 * The organizationMembership.updated webhook re-syncs (idempotent).
 */
export async function changeMemberRole(
  ctx: Ctx,
  orgId: string,
  memberClerkUserId: string,
  role: PortfolioRole,
): Promise<void> {
  assertCanMutate();
  await assertOrgAdmin(ctx, orgId);

  const [orgRow] = await db
    .select({ clerkOrgId: organizations.clerkOrgId })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  if (!orgRow) throw new AccessError("Portfolio org not found.");

  const clerkRole = clerkRoleForPortfolioRole(role);

  const client = await clerkClient();
  await client.organizations.updateOrganizationMembership({
    organizationId: orgRow.clerkOrgId,
    userId: memberClerkUserId,
    role: clerkRole,
  });

  // Mirror the change immediately rather than waiting for the webhook.
  await upsertMembership({
    clerkOrgId: orgRow.clerkOrgId,
    clerkUserId: memberClerkUserId,
    role: clerkRole,
  });
}

// ─── Phase 6: change a PENDING invitee's role ────────────────────────────────

/**
 * Changes the role on a draft or pending client_handoffs row.
 *   draft   → just update the DB row (no Clerk call needed).
 *   pending → revoke existing Clerk invitation + recreate with new role + update DB.
 */
export async function changeInviteeRole(
  ctx: Ctx,
  handoffId: string,
  role: PortfolioRole,
): Promise<void> {
  assertCanMutate();
  const handoff = await getOwnHandoff(ctx, handoffId);

  if (handoff.status === "draft" || handoff.status === "revoked") {
    await db
      .update(clientHandoffs)
      .set({ role, updatedAt: new Date() })
      .where(eq(clientHandoffs.id, handoffId));
    return;
  }

  if (handoff.status !== "pending" && handoff.status !== "bounced") {
    throw new AccessError("Can only change role of a draft, pending, or bounced invitation.");
  }

  const [orgRow] = await db
    .select({ clerkOrgId: organizations.clerkOrgId })
    .from(organizations)
    .where(eq(organizations.id, handoff.orgId))
    .limit(1);
  if (!orgRow) throw new AccessError("Portfolio org not found.");

  const [managerUser] = await db
    .select({ clerkUserId: users.clerkUserId })
    .from(users)
    .where(eq(users.id, ctx.userId))
    .limit(1);
  if (!managerUser) throw new AccessError("Could not find your user record.");

  const client = await clerkClient();

  // Revoke the old invitation so the existing link stops working.
  if (handoff.clerkInvitationId) {
    try {
      await client.organizations.revokeOrganizationInvitation({
        organizationId: orgRow.clerkOrgId,
        invitationId: handoff.clerkInvitationId,
        requestingUserId: managerUser.clerkUserId,
      });
    } catch (err) {
      logger.error("changeInviteeRole: revoke old invitation failed", { error: String(err), handoffId });
    }
  }

  // Create a new invitation with the updated role.
  const invitation = await client.organizations.createOrganizationInvitation({
    organizationId: orgRow.clerkOrgId,
    inviterUserId: managerUser.clerkUserId,
    emailAddress: handoff.clientEmail,
    role: clerkRoleForPortfolioRole(role),
    redirectUrl: getClientInvitationRedirectUrl(),
  });

  await db
    .update(clientHandoffs)
    .set({
      role,
      clerkInvitationId: invitation.id,
      invitationUrl: invitation.url ?? null,
      status: "pending",
      bouncedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(clientHandoffs.id, handoffId));
}

// ─── Phase 6: remove an accepted member ──────────────────────────────────────

/**
 * Removes an accepted member from the Clerk org and mirrors the change in Neon.
 *
 * Guards:
 *   - Cannot remove yourself (use removeManagerAccess for that).
 *   - Cannot remove the last admin — at least one must remain.
 */
export async function removePortfolioMember(
  ctx: Ctx,
  orgId: string,
  memberClerkUserId: string,
): Promise<void> {
  assertCanMutate();
  await assertOrgAdmin(ctx, orgId);

  // Resolve the member's Neon userId from their Clerk id.
  const [memberUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, memberClerkUserId))
    .limit(1);
  if (!memberUser) throw new AccessError("Member not found.");

  // Guard: cannot remove yourself — use removeManagerAccess for that.
  if (memberUser.id === ctx.userId) {
    throw new AccessError("Use 'Remove your access' to leave this portfolio.");
  }

  // Check if this member is an admin so we can enforce the last-admin guard.
  const [memberMembership] = await db
    .select({ role: organizationMemberships.role })
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.orgId, orgId),
        eq(organizationMemberships.userId, memberUser.id),
        eq(organizationMemberships.status, "active"),
      ),
    )
    .limit(1);

  if (!memberMembership) throw new AccessError("Member is not active in this portfolio.");

  const memberIsAdmin = memberMembership.role === "owner" || memberMembership.role === "admin";

  if (memberIsAdmin) {
    // Count remaining active admins. If this member is the only one, block.
    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(organizationMemberships)
      .where(
        and(
          eq(organizationMemberships.orgId, orgId),
          eq(organizationMemberships.status, "active"),
          inArray(organizationMemberships.role, ["owner", "admin"]),
        ),
      );
    if ((countRow?.count ?? 0) <= 1) {
      throw new AccessError("Cannot remove the only admin from this portfolio.");
    }
  }

  const [orgRow] = await db
    .select({ clerkOrgId: organizations.clerkOrgId })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  if (!orgRow) throw new AccessError("Portfolio org not found.");

  const client = await clerkClient();
  try {
    await client.organizations.deleteOrganizationMembership({
      organizationId: orgRow.clerkOrgId,
      userId: memberClerkUserId,
    });
  } catch (err) {
    logger.error("removePortfolioMember: clerk deleteOrganizationMembership failed", {
      error: String(err),
      orgId,
      memberClerkUserId,
    });
    throw new AccessError("Could not remove member. Please try again.");
  }

  await removeMembership({ clerkOrgId: orgRow.clerkOrgId, clerkUserId: memberClerkUserId });
}

// ─── Phase 6: drawer data — members + invitees ───────────────────────────────

export type PortfolioMember = {
  clerkUserId: string;
  name: string | null;
  email: string;
  role: PortfolioRole;
  isYou: boolean;
};

export type PortfolioInvitee = {
  handoffId: string;
  email: string;
  name: string | null;
  role: PortfolioRole;
  status: "draft" | "pending" | "bounced";
  invitationUrl: string | null;
};

/**
 * Returns the unified member + invitee list for the Manage Members drawer.
 *   members  = active organization_memberships rows, role normalised to PortfolioRole.
 *   invitees = client_handoffs where status is draft / pending / bounced.
 */
export async function listPortfolioMembers(
  ctx: Ctx,
  orgId: string,
): Promise<{ members: PortfolioMember[]; invitees: PortfolioInvitee[] }> {
  await assertOrgAdmin(ctx, orgId);

  const memberRows = await db
    .select({
      clerkUserId: users.clerkUserId,
      displayName: users.displayName,
      primaryEmail: users.primaryEmail,
      role: organizationMemberships.role,
      userId: organizationMemberships.userId,
    })
    .from(organizationMemberships)
    .innerJoin(users, eq(users.id, organizationMemberships.userId))
    .where(
      and(
        eq(organizationMemberships.orgId, orgId),
        eq(organizationMemberships.status, "active"),
      ),
    );

  const members: PortfolioMember[] = memberRows.map((row) => ({
    clerkUserId: row.clerkUserId,
    name: row.displayName,
    email: row.primaryEmail,
    role: orgRoleToPortfolioRole(row.role),
    isYou: row.userId === ctx.userId,
  }));

  const inviteeRows = await db
    .select({
      id: clientHandoffs.id,
      clientEmail: clientHandoffs.clientEmail,
      clientName: clientHandoffs.clientName,
      role: clientHandoffs.role,
      status: clientHandoffs.status,
      invitationUrl: clientHandoffs.invitationUrl,
    })
    .from(clientHandoffs)
    .where(
      and(
        eq(clientHandoffs.orgId, orgId),
        inArray(clientHandoffs.status, ["draft", "pending", "bounced"]),
      ),
    );

  const invitees: PortfolioInvitee[] = inviteeRows.map((row) => ({
    handoffId: row.id,
    email: row.clientEmail,
    name: row.clientName,
    role: row.role as PortfolioRole,
    status: row.status as "draft" | "pending" | "bounced",
    invitationUrl: row.invitationUrl,
  }));

  return { members, invitees };
}

// ─── Legacy single-invitee path (Phase 1/3) ─────────────────────────────────
// Kept for backward compatibility. Maps old "view"/"full" role strings to the
// new portfolioRoleEnum values before writing to the DB.

/**
 * Creates a Clerk organisation for the client, upserts the Neon mirror, sends
 * an invitation to the client's email, and persists a client_handoffs row.
 *
 * Phase 6: role is now stored as "admin"/"viewer" (portfolioRoleEnum).
 * Callers that still pass "view"/"full" are mapped here for backward compat.
 */
export async function onboardClientPortfolio(
  ctx: Ctx,
  input: {
    name: string;
    clientEmail: string;
    role: "view" | "full";
    locale?: "en" | "km";
    propertyStubs?: PropertyStub[];
    assignPropertyIds?: string[];
    intent?: "keep" | "leave";
  },
): Promise<OnboardResult> {
  assertCanMutate();

  // Map legacy role → new PortfolioRole.
  const portfolioRole: PortfolioRole = input.role === "full" ? "admin" : "viewer";

  const client = await clerkClient();
  const [managerUser] = await db
    .select({ clerkUserId: users.clerkUserId })
    .from(users)
    .where(eq(users.id, ctx.userId))
    .limit(1);
  if (!managerUser) throw new AccessError("Could not find your user record.");

  const clerkOrg = await client.organizations.createOrganization({
    name: input.name,
    createdBy: managerUser.clerkUserId,
  });

  await upsertOrg({ id: clerkOrg.id, name: input.name });

  await upsertMembership({
    clerkOrgId: clerkOrg.id,
    clerkUserId: managerUser.clerkUserId,
    role: "org:admin",
  });

  const [orgRow] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.clerkOrgId, clerkOrg.id))
    .limit(1);
  if (!orgRow) throw new AccessError("Could not create the portfolio org.");

  const invitation = await client.organizations.createOrganizationInvitation({
    organizationId: clerkOrg.id,
    inviterUserId: managerUser.clerkUserId,
    emailAddress: input.clientEmail,
    role: clerkRoleForPortfolioRole(portfolioRole),
    redirectUrl: getClientInvitationRedirectUrl(),
  });

  const invitationUrl = invitation.url ?? "";
  await sendInvitationEmail(
    input.clientEmail,
    invitationUrl,
    input.locale ?? "en",
    input.name,
  );

  const resolvedIntent: "keep" | "leave" =
    input.role === "view" ? "keep" : (input.intent ?? "keep");

  const handoffId = await nextId("CHO");
  await db.insert(clientHandoffs).values({
    id: handoffId,
    managerUserId: ctx.userId,
    orgId: orgRow.id,
    clientName: input.name,
    clientEmail: input.clientEmail,
    clerkInvitationId: invitation.id,
    status: "pending",
    role: portfolioRole,
    managerAccess: "granted",
    invitationUrl: invitation.url ?? null,
    locale: input.locale ?? "en",
    managerAccessIntent: resolvedIntent,
  });

  let propertiesCreated = 0;
  let propertiesAssigned = 0;

  for (const stub of (input.propertyStubs ?? [])) {
    await createPropertyForOrg(ctx, orgRow.id, buildPropertyFromStub(stub));
    propertiesCreated++;
  }

  if ((input.assignPropertyIds ?? []).length > 0) {
    const assignResult = await bulkAssignProperties(ctx, orgRow.id, orgRow.id, input.assignPropertyIds!);
    propertiesAssigned = assignResult.assigned;
  }

  try {
    await insertAccessNotification({
      orgId: ctx.orgId,
      userId: ctx.userId,
      title: "Invitation sent",
      description: `Invitation sent to ${input.name}`,
      linkTo: "/pro/clients",
    });
  } catch (err) {
    logger.error("onboardClientPortfolio: notification failed", { error: String(err) });
  }

  return {
    handoffId,
    orgId: orgRow.id,
    invitationUrl: invitation.url ?? null,
    propertyCount: propertiesCreated + propertiesAssigned,
  };
}

/**
 * Revokes a pending Clerk invitation and marks the handoff as revoked.
 */
export async function revokeClientInvitation(ctx: Ctx, handoffId: string): Promise<void> {
  assertCanMutate();
  const handoff = await getOwnHandoff(ctx, handoffId);
  if (handoff.status !== "pending" && handoff.status !== "bounced") {
    throw new AccessError("Can only revoke a pending or bounced invitation.");
  }

  if (handoff.clerkInvitationId) {
    try {
      const [orgRow] = await db
        .select({ clerkOrgId: organizations.clerkOrgId })
        .from(organizations)
        .where(eq(organizations.id, handoff.orgId))
        .limit(1);
      const [managerUser] = await db
        .select({ clerkUserId: users.clerkUserId })
        .from(users)
        .where(eq(users.id, ctx.userId))
        .limit(1);
      if (orgRow && managerUser) {
        const client = await clerkClient();
        await client.organizations.revokeOrganizationInvitation({
          organizationId: orgRow.clerkOrgId,
          invitationId: handoff.clerkInvitationId,
          requestingUserId: managerUser.clerkUserId,
        });
      }
    } catch (err) {
      logger.error("revokeClientInvitation: clerk revoke failed", { error: String(err), handoffId });
    }
  }

  await db
    .update(clientHandoffs)
    .set({ status: "revoked", updatedAt: new Date() })
    .where(eq(clientHandoffs.id, handoffId));
}

/**
 * Resends a client invitation: revokes the old Clerk invitation (if any),
 * creates a new one, updates the handoff row, and captures the new URL.
 */
export async function resendClientInvitation(
  ctx: Ctx,
  handoffId: string,
): Promise<{ invitationUrl: string | null }> {
  assertCanMutate();
  const handoff = await getOwnHandoff(ctx, handoffId);
  if (handoff.status !== "pending" && handoff.status !== "bounced") {
    throw new AccessError("Can only resend a pending or bounced invitation.");
  }

  const [orgRow] = await db
    .select({ clerkOrgId: organizations.clerkOrgId })
    .from(organizations)
    .where(eq(organizations.id, handoff.orgId))
    .limit(1);
  if (!orgRow) throw new AccessError("Portfolio org not found.");

  const [managerUser] = await db
    .select({ clerkUserId: users.clerkUserId })
    .from(users)
    .where(eq(users.id, ctx.userId))
    .limit(1);
  if (!managerUser) throw new AccessError("Could not find your user record.");

  if (handoff.clerkInvitationId) {
    try {
      const client = await clerkClient();
      await client.organizations.revokeOrganizationInvitation({
        organizationId: orgRow.clerkOrgId,
        invitationId: handoff.clerkInvitationId,
        requestingUserId: managerUser.clerkUserId,
      });
    } catch (err) {
      logger.error("resendClientInvitation: revoke old invitation failed", { error: String(err), handoffId });
    }
  }

  const client = await clerkClient();
  const invitation = await client.organizations.createOrganizationInvitation({
    organizationId: orgRow.clerkOrgId,
    inviterUserId: managerUser.clerkUserId,
    emailAddress: handoff.clientEmail,
    role: clerkRoleForPortfolioRole(handoff.role as PortfolioRole),
    redirectUrl: getClientInvitationRedirectUrl(),
  });

  const invitationUrl = invitation.url ?? "";
  await db
    .update(clientHandoffs)
    .set({
      clerkInvitationId: invitation.id,
      invitationUrl: invitation.url ?? null,
      status: "pending",
      bouncedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(clientHandoffs.id, handoffId));

  const locale = handoff.locale === "km" ? "km" : "en";
  await sendInvitationEmail(
    handoff.clientEmail,
    invitationUrl,
    locale,
    handoff.clientName ?? handoff.clientEmail,
  );

  return { invitationUrl: invitation.url ?? null };
}

/**
 * Stamps the invitationLastCopiedAt timestamp when a manager copies the
 * invitation link.
 */
export async function recordInvitationLinkCopy(ctx: Ctx, handoffId: string): Promise<{ invitationUrl: string | null }> {
  const [handoff] = await db
    .select({
      id: clientHandoffs.id,
      invitationUrl: clientHandoffs.invitationUrl,
      orgId: clientHandoffs.orgId,
      managerUserId: clientHandoffs.managerUserId,
      clerkInvitationId: clientHandoffs.clerkInvitationId,
    })
    .from(clientHandoffs)
    .where(
      and(eq(clientHandoffs.id, handoffId), eq(clientHandoffs.managerUserId, ctx.userId)),
    )
    .limit(1);

  if (!handoff) throw new AccessError("Handoff not found.");

  await db
    .update(clientHandoffs)
    .set({ invitationLastCopiedAt: new Date(), updatedAt: new Date() })
    .where(eq(clientHandoffs.id, handoffId));

  return { invitationUrl: handoff.invitationUrl };
}

/**
 * Removes the manager from the client's Clerk org after the handoff is accepted.
 */
export async function removeManagerAccess(ctx: Ctx, handoffId: string): Promise<void> {
  assertCanMutate();
  const handoff = await getOwnHandoff(ctx, handoffId);

  if (handoff.status !== "accepted") {
    throw new AccessError("Can only remove access from an accepted handoff.");
  }
  if (handoff.managerAccess !== "granted") {
    throw new AccessError("Access has already been removed.");
  }

  const [orgRow] = await db
    .select({ clerkOrgId: organizations.clerkOrgId })
    .from(organizations)
    .where(eq(organizations.id, handoff.orgId))
    .limit(1);
  if (!orgRow) throw new AccessError("Portfolio org not found.");

  const [managerUser] = await db
    .select({ clerkUserId: users.clerkUserId })
    .from(users)
    .where(eq(users.id, ctx.userId))
    .limit(1);
  if (!managerUser) throw new AccessError("Could not find your user record.");

  try {
    const client = await clerkClient();
    await client.organizations.deleteOrganizationMembership({
      organizationId: orgRow.clerkOrgId,
      userId: managerUser.clerkUserId,
    });
  } catch (err) {
    logger.error("removeManagerAccess: clerk deleteOrganizationMembership failed", {
      error: String(err),
      handoffId,
    });
    throw new AccessError("Could not remove your access. Please try again.");
  }

  await db
    .update(clientHandoffs)
    .set({ managerAccess: "removed", updatedAt: new Date() })
    .where(eq(clientHandoffs.id, handoffId));
}

/**
 * Handles an email bounce webhook from Resend.
 */
export async function handleBounce(email: string, bounceType: string): Promise<void> {
  const [handoff] = await db
    .select({ id: clientHandoffs.id, clientName: clientHandoffs.clientName, managerUserId: clientHandoffs.managerUserId, orgId: clientHandoffs.orgId })
    .from(clientHandoffs)
    .where(
      and(
        eq(clientHandoffs.clientEmail, email),
        eq(clientHandoffs.status, "pending"),
      ),
    )
    .orderBy(sql`${clientHandoffs.createdAt} desc`)
    .limit(1);

  if (!handoff) {
    logger.warn("handleBounce: no pending handoff for email", { email, bounceType });
    return;
  }

  await db
    .update(clientHandoffs)
    .set({ status: "bounced", bouncedAt: new Date(), updatedAt: new Date() })
    .where(eq(clientHandoffs.id, handoff.id));

  try {
    await insertAccessNotification({
      orgId: handoff.orgId,
      userId: handoff.managerUserId,
      title: "Invitation bounced",
      description: `Invitation to ${email} bounced`,
      linkTo: "/pro/clients",
    });
  } catch (err) {
    logger.error("handleBounce: notification failed", { error: String(err), handoffId: handoff.id });
  }
}

/**
 * Handles the organizationInvitation.accepted Clerk webhook event.
 */
export async function handleInvitationAccepted(clerkInvitationId: string): Promise<void> {
  const [handoff] = await db
    .select({
      id: clientHandoffs.id,
      managerUserId: clientHandoffs.managerUserId,
      clientName: clientHandoffs.clientName,
      orgId: clientHandoffs.orgId,
      status: clientHandoffs.status,
      role: clientHandoffs.role,
      managerAccessIntent: clientHandoffs.managerAccessIntent,
    })
    .from(clientHandoffs)
    .where(eq(clientHandoffs.clerkInvitationId, clerkInvitationId))
    .limit(1);

  if (!handoff) {
    logger.warn("handleInvitationAccepted: no handoff found for clerk_invitation_id", { clerkInvitationId });
    return;
  }

  if (handoff.status === "accepted") {
    logger.info("handleInvitationAccepted: handoff already accepted, skipping", { handoffId: handoff.id });
    return;
  }

  await db
    .update(clientHandoffs)
    .set({ status: "accepted", acceptedAt: new Date(), updatedAt: new Date() })
    .where(eq(clientHandoffs.id, handoff.id));

  const displayName = handoff.clientName ?? "Your client";

  try {
    await insertAccessNotification({
      orgId: handoff.orgId,
      userId: handoff.managerUserId,
      title: "Client accepted",
      description: `${displayName} accepted their portfolio invitation`,
      linkTo: "/pro/clients",
    });
  } catch (err) {
    logger.error("handleInvitationAccepted: notification failed", { error: String(err), handoffId: handoff.id });
  }

  // Phase 3 finish: if manager chose to leave an admin-level portfolio, prompt them.
  if (handoff.managerAccessIntent === "leave" && handoff.role === "admin") {
    try {
      await insertAccessNotification({
        orgId: handoff.orgId,
        userId: handoff.managerUserId,
        title: "Ready to hand off",
        description: `${displayName} accepted — you chose to step away. Remove your access when ready.`,
        linkTo: "/pro/clients",
      });
    } catch (err) {
      logger.error("handleInvitationAccepted: leave-intent notification failed", {
        error: String(err),
        handoffId: handoff.id,
      });
    }
  }
}

// ─── Private helpers ──────────────────────────────────────────────────────────

async function getOwnHandoff(ctx: Ctx, handoffId: string): Promise<{
  id: string;
  orgId: string;
  managerUserId: string;
  clientName: string | null;
  clientEmail: string;
  clerkInvitationId: string | null;
  status: string;
  role: string;
  managerAccess: string;
  invitationUrl: string | null;
  locale: string;
  managerAccessIntent: string;
}> {
  const [handoff] = await db
    .select({
      id: clientHandoffs.id,
      orgId: clientHandoffs.orgId,
      managerUserId: clientHandoffs.managerUserId,
      clientName: clientHandoffs.clientName,
      clientEmail: clientHandoffs.clientEmail,
      clerkInvitationId: clientHandoffs.clerkInvitationId,
      status: clientHandoffs.status,
      role: clientHandoffs.role,
      managerAccess: clientHandoffs.managerAccess,
      invitationUrl: clientHandoffs.invitationUrl,
      locale: clientHandoffs.locale,
      managerAccessIntent: clientHandoffs.managerAccessIntent,
    })
    .from(clientHandoffs)
    .where(
      and(eq(clientHandoffs.id, handoffId), eq(clientHandoffs.managerUserId, ctx.userId)),
    )
    .limit(1);

  if (!handoff) throw new AccessError("Handoff not found.");
  return handoff;
}
