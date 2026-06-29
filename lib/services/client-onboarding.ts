import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { clientHandoffs, notifications, organizations, users } from "@/lib/db/schema";
import { nextId, assertCanMutate, type Ctx } from "@/lib/services/_mapping";
import { upsertOrg, upsertMembership, ourUserId } from "@/lib/services/identity-sync";
import { AccessError } from "@/lib/services/managers";
import { createPropertyForOrg, bulkAssignProperties } from "@/lib/services/properties";
import type { NewProperty, PropertyTypeChoice } from "@/lib/data/types/property";
import { logger } from "@/lib/logger";

// ────────────────────────────────────────────────────────────────────────────
// Manager-led client onboarding (Phase 1/3). A manager (org:admin) creates a
// Clerk org for their client, optionally seeds properties, sends an invitation,
// and tracks lifecycle through client_handoffs.
//
// This file REUSES the insertAccessNotification pattern from managers.ts (line 73)
// but keeps its own copy so we don't create a cross-dependency between two
// service modules that manage entirely different access flows.
// ────────────────────────────────────────────────────────────────────────────

// ─── Shared notification helper ─────────────────────────────────────────────

/**
 * Writes ONE in-app notification row (category "ACCESS").
 *
 * Reuses the exact pattern from managers.ts:73-91. A notification is a side
 * effect, never a reason to fail the flow — callers MUST wrap in try/catch.
 */
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

// ─── Handles the "Send invitation" step of onboarding ───────────────────────

export type OnboardResult = {
  handoffId: string;
  orgId: string;
  invitationUrl: string | null;
  // Total properties wired to the new portfolio: stubs created + existing
  // properties assigned. The action surfaces this as `count` in the UI.
  propertyCount: number;
};

// A lightweight property the manager sketches in the wizard. We only collect a
// name, a coarse type label, and an optional value — the full add-property flow
// (photos, documents, location, financials) is deferred to Phase 2.
type PropertyStub = {
  name: string;
  type: string;
  value?: number;
};

// Maps the wizard's human "type" label (e.g. "Residential", "Commercial",
// "Land") to the internal property type enum. Anything we don't recognise
// falls back to "other" so a stray label can never reject the whole onboard.
function stubTypeToPropertyType(rawType: string): PropertyTypeChoice {
  const key = rawType.trim().toLowerCase();
  if (key === "residential") return "residential";
  if (key === "commercial") return "commercial";
  if (key === "land") return "land";
  return "other";
}

// Builds a full, schema-valid NewProperty from a lightweight stub. The wizard
// only gathers name/type/value, but createPropertyForOrg parses against the
// whole PropertySchema, so every required field needs a sane default here.
//   - status "Vacant": a freshly-sketched property has no tenant yet.
//   - lat/lng 0: no location is collected in Phase 1 (added in Phase 2).
//   - totalArea "": the schema allows an empty string; we have no area yet.
//   - title "—": the schema's "unknown title" sentinel.
//   - buyNumeric / currentMarketValue: driven by the optional value field.
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

// ─── Manager side ───────────────────────────────────────────────────────────

/**
 * Creates a Clerk organisation for the client, upserts the Neon mirror, sends
 * an invitation to the client's email, and persists a client_handoffs row.
 *
 * Previously this only called Clerk's createOrganizationInvitation and relied
 * on Clerk's built-in email. Phase 3 replaces that: we still call Clerk to
 * create the invitation (we need the invitation URL and ID), but we SEND the
 * email via Resend so we get bounce detection + locale support.
 *
 * What could go wrong: clerk calls (org create, org invite) can fail due to
 * rate limits or bad input. We let the underlying error propagate — the action
 * layer catches and generic-ises it.
 */
export async function onboardClientPortfolio(
  ctx: Ctx,
  input: {
    name: string;
    clientEmail: string;
    role: "view" | "full";
    locale?: "en" | "km";
    // New properties to create directly in the client's portfolio org.
    propertyStubs?: PropertyStub[];
    // Existing (unassigned) property ids from the manager's book to earmark
    // for this client.
    assignPropertyIds?: string[];
  },
): Promise<OnboardResult> {
  assertCanMutate();

  // 1. Create the Clerk organisation. We use the manager's org as the
  //    "creating" org so the manager becomes org:admin automatically.
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

  // 2. Upsert the Neon mirror (idempotent).
  await upsertOrg({ id: clerkOrg.id, name: input.name });

  // 2b. Mirror the manager's membership in the new org as admin. Clerk makes
  //     the org creator an admin automatically, but that membership only
  //     reaches our Neon mirror through an async webhook that may not have
  //     fired yet inside this request. We mirror it now so (a) the manager is
  //     immediately an admin in our records and (b) createPropertyForOrg's
  //     admin check (which reads the mirror) passes deterministically.
  //     upsertMembership is idempotent — a later webhook re-running is harmless.
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

  // 3. Create the Clerk invitation so we get an invitationUrl and invitationId.
  const invitation = await client.organizations.createOrganizationInvitation({
    organizationId: clerkOrg.id,
    inviterUserId: managerUser.clerkUserId,
    emailAddress: input.clientEmail,
    role: input.role === "full" ? "org:admin" : "org:viewer",
  });

  // 4. Insert the handoff row.
  const handoffId = await nextId("CHO");
  await db.insert(clientHandoffs).values({
    id: handoffId,
    managerUserId: ctx.userId,
    orgId: orgRow.id,
    clientName: input.name,
    clientEmail: input.clientEmail,
    clerkInvitationId: invitation.id,
    status: "pending",
    role: input.role,
    // Phase 3 columns
    managerAccess: "granted",
    invitationUrl: invitation.url ?? null,
    locale: input.locale ?? "en",
  });

  // 4b. Seed the portfolio with properties. Both inputs are optional — a
  //     manager can onboard with zero properties and add them later.
  let propertiesCreated = 0;
  let propertiesAssigned = 0;

  const stubs = input.propertyStubs ?? [];
  const assignIds = input.assignPropertyIds ?? [];

  if (stubs.length > 0) {
    // The manager's admin membership in the new org is already mirrored above
    // (step 2b), so createPropertyForOrg's admin check passes here.
    for (const stub of stubs) {
      await createPropertyForOrg(ctx, orgRow.id, buildPropertyFromStub(stub));
      propertiesCreated += 1;
    }
  }

  if (assignIds.length > 0) {
    // No client user exists until the invitation is accepted, so we earmark
    // the assigned properties against the new portfolio org id (used here as
    // the clientId pointer). The proper owner link is established when the
    // client accepts and is provisioned (Phase 3 webhook flow).
    const assignResult = await bulkAssignProperties(ctx, orgRow.id, orgRow.id, assignIds);
    propertiesAssigned = assignResult.assigned;
  }

  // 5. Notify the manager that the invitation was sent. Best-effort.
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

  // Revoke old invitation if exists.
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

  // Create new invitation.
  const client = await clerkClient();
  const invitation = await client.organizations.createOrganizationInvitation({
    organizationId: orgRow.clerkOrgId,
    inviterUserId: managerUser.clerkUserId,
    emailAddress: handoff.clientEmail,
    role: handoff.role === "full" ? "org:admin" : "org:viewer",
  });

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

  return { invitationUrl: invitation.url ?? null };
}

/**
 * Stamps the invitationLastCopiedAt timestamp when a manager copies the
 * invitation link. No-op if the handoff doesn't belong to the caller.
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
 * Verifies the handoff is accepted, belongs to the caller, and managerAccess is still granted.
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
 * Handles an email bounce webhook from Resend. Matches by email address,
 * flips the most-recent pending handoff to bounced status.
 */
export async function handleBounce(email: string, bounceType: string): Promise<void> {
  // Find the most recent pending handoff for this email.
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
    logger.warn("handleBounce: no pending handoff for email", { email });
    return;
  }

  await db
    .update(clientHandoffs)
    .set({ status: "bounced", bouncedAt: new Date(), updatedAt: new Date() })
    .where(eq(clientHandoffs.id, handoff.id));

  // Notify the manager. Best-effort.
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
 * Looks up the handoff by clerk_invitation_id, flips status to accepted,
 * stamps acceptedAt, and writes a notification for the manager.
 */
export async function handleInvitationAccepted(clerkInvitationId: string): Promise<void> {
  const [handoff] = await db
    .select({
      id: clientHandoffs.id,
      managerUserId: clientHandoffs.managerUserId,
      clientName: clientHandoffs.clientName,
      orgId: clientHandoffs.orgId,
      status: clientHandoffs.status,
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

  // Notify the manager. Best-effort.
  try {
    await insertAccessNotification({
      orgId: handoff.orgId,
      userId: handoff.managerUserId,
      title: "Client accepted",
      description: `${handoff.clientName} accepted their portfolio invitation`,
      linkTo: "/pro/clients",
    });
  } catch (err) {
    logger.error("handleInvitationAccepted: notification failed", { error: String(err), handoffId: handoff.id });
  }
}

/**
 * Returns a client_handoffs row, verifying it belongs to the calling manager.
 * Throws AccessError if not found or not owned.
 */
async function getOwnHandoff(ctx: Ctx, handoffId: string): Promise<{
  id: string;
  orgId: string;
  managerUserId: string;
  clientName: string;
  clientEmail: string;
  clerkInvitationId: string | null;
  status: string;
  role: string;
  managerAccess: string;
  invitationUrl: string | null;
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
    })
    .from(clientHandoffs)
    .where(
      and(eq(clientHandoffs.id, handoffId), eq(clientHandoffs.managerUserId, ctx.userId)),
    )
    .limit(1);

  if (!handoff) throw new AccessError("Handoff not found.");
  return handoff;
}


