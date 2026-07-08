import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { clientHandoffs, organizationMemberships, organizations, users } from "@/lib/db/schema";
import { getClientInvitationRedirectUrl } from "@/lib/app-origin";
import { nextId, assertCanMutate, type Ctx } from "@/lib/services/_mapping";
import { upsertOrg, upsertMembership, removeMembership } from "@/lib/services/identity-sync";
import { assertOrgAdmin } from "@/lib/services/_crud";
import { AccessError } from "@/lib/services/managers";
import { createPropertyForOrg, bulkAssignProperties } from "@/lib/services/properties";
import { logger } from "@/lib/logger";
import {
  MAX_UNCONFIRMED_CLIENTS,
  countUnconfirmedClients,
  createClientRecord,
  stampClientIdOnOrgProperties,
} from "@/lib/services/client-records";
import {
  sendInvitationEmail,
  insertAccessNotification,
  getOwnHandoff,
} from "@/lib/services/client-invitations";
import {
  clerkRoleForPortfolioRole,
  buildPropertyFromStub,
  type PortfolioRole,
  type PropertyStub,
} from "@/lib/services/portfolio-shared";

// Derives a fallback portfolio/org name from the primary invitee, used when the
// manager leaves the name field blank. Prefers a typed name ("Sokha Family" →
// "Sokha Family Portfolio"); otherwise falls back to the email's local part with
// a capitalised first letter ("sokha@example.com" → "Sokha Portfolio").
function deriveDefaultPortfolioName(primaryInvitee: { email: string; name?: string }): string {
  const typedName = (primaryInvitee.name ?? "").trim();
  if (typedName.length > 0) {
    return `${typedName} Portfolio`;
  }

  // No name was collected — build one from the email address instead.
  const localPart = (primaryInvitee.email.split("@")[0] ?? "").trim();
  // Turn separators (dots, underscores, hyphens) into spaces so "jane.doe" reads "jane doe".
  const spaced = localPart.replace(/[._-]+/g, " ").trim();
  const capitalised = spaced.charAt(0).toUpperCase() + spaced.slice(1);

  // Guard against a pathological empty local part (e.g. "@example.com").
  return `${capitalised || "New"} Portfolio`;
}

// ────────────────────────────────────────────────────────────────────────────
// Manager-led client onboarding (Phase 1/3/6). A manager (org:admin) creates a
// Clerk org for their client, optionally seeds properties, sends invitations,
// and tracks lifecycle through client_handoffs.
// ────────────────────────────────────────────────────────────────────────────

// PortfolioRole, clerkRoleForPortfolioRole, PropertyStub, and buildPropertyFromStub
// moved to portfolio-shared.ts (cycle break with client-invitations.ts); re-exported
// below so this module's public surface is unchanged.
export {
  clerkRoleForPortfolioRole,
  buildPropertyFromStub,
  type PortfolioRole,
  type PropertyStub,
} from "@/lib/services/portfolio-shared";

// Maps the org_role enum (identity mirror) back to PortfolioRole for the drawer.
// normaliseRole maps org:admin → "owner", so we need to handle "owner" as admin.
function orgRoleToPortfolioRole(orgRole: string): PortfolioRole {
  if (orgRole === "owner" || orgRole === "admin") return "admin";
  if (orgRole === "member") return "member";
  return "viewer";
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
    managerAccessModel?: "approval" | "full" | "remove";
  },
): Promise<CreatePortfolioResult> {
  assertCanMutate();

  // Cap guard: block before doing any Clerk work.
  const unconfirmed = await countUnconfirmedClients(ctx.userId);
  if (unconfirmed >= MAX_UNCONFIRMED_CLIENTS) {
    throw new AccessError(
      `You have reached the limit of ${MAX_UNCONFIRMED_CLIENTS} pending client invitations. ` +
      `Accept or remove existing invitations to add more.`,
    );
  }

  const client = await clerkClient();
  const [managerUser] = await db
    .select({ clerkUserId: users.clerkUserId })
    .from(users)
    .where(eq(users.id, ctx.userId))
    .limit(1);
  if (!managerUser) throw new AccessError("Could not find your user record.");

  // Resolve the org name: use what the manager typed, or fall back to a default
  // built from the primary (first) invitee — e.g. "Sokha Portfolio".
  const primaryInvitee = input.invitees[0];
  const resolvedPortfolioName =
    input.portfolioName.trim() ||
    (primaryInvitee ? deriveDefaultPortfolioName(primaryInvitee) : "New Portfolio");

  // 1. Create the Clerk organisation. The creating user becomes org:admin automatically.
  const clerkOrg = await client.organizations.createOrganization({
    name: resolvedPortfolioName,
    createdBy: managerUser.clerkUserId,
  });

  // 2. Upsert Neon mirror (idempotent).
  await upsertOrg({ id: clerkOrg.id, name: resolvedPortfolioName });

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
  const managerAccessModel: "approval" | "full" | "remove" = input.managerAccessModel ?? "approval";

  for (const invitee of input.invitees) {
    let clerkInvitationId: string | null = null;
    let invitationUrl: string | null = null;
    // "bounced" = the Clerk invite was created but email delivery failed. We still
    // finish onboarding so the manager keeps the client + can copy the invite link.
    let status: "draft" | "pending" | "bounced" = input.sendNow ? "pending" : "draft";

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

      // A failed third-party email must NOT abort onboarding — that would orphan the
      // Clerk org + invitation with no client row. Mark it bounced and keep going;
      // the invitation URL is persisted so the manager can deliver the link manually.
      try {
        await sendInvitationEmail(
          invitee.email,
          invitation.url ?? "",
          locale,
          invitee.name || input.portfolioName,
        );
      } catch (err) {
        logger.error("createClientPortfolioWithInvitees: invitation email failed; marking bounced", {
          error: String(err),
          email: invitee.email,
        });
        status = "bounced";
      }
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
      managerAccessModel,
      bouncedAt: status === "bounced" ? new Date() : null,
    });
    handoffIds.push(handoffId);
  }

  // 4. Create the client record (Drizzle-only) and link it to the org.
  const primaryEmail = input.invitees[0]?.email;
  const clientId = await createClientRecord(
    ctx.userId,
    orgRow.id,
    input.portfolioName,
    primaryEmail,
  );

  // 5. Seed the portfolio with properties, then stamp the new clientId.
  let propertiesCreated = 0;
  let propertiesAssigned = 0;

  for (const stub of (input.propertyStubs ?? [])) {
    await createPropertyForOrg(ctx, orgRow.id, buildPropertyFromStub(stub));
    propertiesCreated++;
  }

  if ((input.assignPropertyIds ?? []).length > 0) {
    const assignResult = await bulkAssignProperties(ctx, clientId, orgRow.id, input.assignPropertyIds!);
    propertiesAssigned = assignResult.assigned;
  }

  // Stamp clientId on any properties that were just created/assigned to this org.
  await stampClientIdOnOrgProperties(orgRow.id, clientId);

  // 6. Notify manager. Best-effort.
  try {
    const n = input.invitees.length;
    // Three cases: a draft with nobody invited yet, invitations just emailed, or
    // draft handoffs saved for later. The name shown is the resolved portfolio name
    // (falls back to what the manager typed).
    const displayName = resolvedPortfolioName;
    let title: string;
    let description: string;
    if (n === 0) {
      title = "Draft portfolio created";
      description = `${displayName} created — invite the client when you're ready`;
    } else {
      title = input.sendNow ? "Invitations sent" : "Portfolio created";
      description = `${displayName} created with ${n} ${n === 1 ? "invitee" : "invitees"}`;
    }
    await insertAccessNotification({
      orgId: ctx.orgId,
      userId: ctx.userId,
      title,
      description,
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
      managerAccessModel: "approval",
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

// ─── Membership role lookup (authorization boundary) ───────────────────────────

// Returns the manager's active membership role in a client's org, or null if they
// have no active grant there. This is the SERVER-ONLY authorization boundary for
// the "act on behalf" preview: the grant already lives as data (created by
// approveAccessRequest), so we read it fresh on every request instead of trusting
// any client-supplied role. `viewer` = read/propose only; `admin`/`owner` = write.
export async function getMembershipRole(
  orgId: string,
  userId: string,
): Promise<Ctx["orgRole"] | null> {
  const [row] = await db
    .select({ role: organizationMemberships.role })
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.orgId, orgId),
        eq(organizationMemberships.userId, userId),
        eq(organizationMemberships.status, "active"),
      ),
    )
    .limit(1);
  return (row?.role as Ctx["orgRole"]) ?? null;
}
