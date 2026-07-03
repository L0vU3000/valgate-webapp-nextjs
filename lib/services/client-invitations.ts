import "server-only";
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { Resend } from "resend";
import { db } from "@/lib/db/client";
import { clientHandoffs, clients, notifications, organizations, users } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { buildInvitationEmailEn } from "@/lib/email-templates/invitation-en";
import { buildInvitationEmailKm } from "@/lib/email-templates/invitation-km";
import { getClientInvitationRedirectUrl } from "@/lib/app-origin";
import { nextId, assertCanMutate, type Ctx } from "@/lib/services/_mapping";
import { upsertOrg, upsertMembership, removeMembership } from "@/lib/services/identity-sync";
import { AccessError, ensureManagerHomeOrganizationForClerkUser } from "@/lib/services/managers";
import { createPropertyForOrg, bulkAssignProperties } from "@/lib/services/properties";
import { logger } from "@/lib/logger";
import {
  MAX_UNCONFIRMED_CLIENTS,
  countUnconfirmedClients,
  createClientRecord,
  stampClientIdOnOrgProperties,
  nameToInitials,
  nameToAvatarBg,
} from "@/lib/services/client-records";
import {
  clerkRoleForPortfolioRole,
  buildPropertyFromStub,
  type PortfolioRole,
  type PropertyStub,
} from "@/lib/services/portfolio-shared";

// The client's one-time welcome message after accepting a manager's portfolio invite.
// Null once dismissed (welcomeSeenAt set), if the client's current org wasn't created via
// a handoff (e.g. a plain owner who signed up directly), or if the caller IS the manager
// who created the handoff — a manager who retains org membership post-accept (the
// "approval"/"full" access models) can switch into viewing this org too, and shouldn't
// see their own "your manager created this for you" message.
export async function getPendingWelcome(
  ctx: Ctx,
): Promise<{ handoffId: string; portfolioName: string; managerName: string } | null> {
  const [row] = await db
    .select({
      handoffId: clientHandoffs.id,
      portfolioName: organizations.name,
      managerName: users.displayName,
    })
    .from(clientHandoffs)
    .innerJoin(organizations, eq(organizations.id, clientHandoffs.orgId))
    .innerJoin(users, eq(users.id, clientHandoffs.managerUserId))
    .where(
      and(
        eq(clientHandoffs.orgId, ctx.orgId),
        eq(clientHandoffs.status, "accepted"),
        isNull(clientHandoffs.welcomeSeenAt),
        ne(clientHandoffs.managerUserId, ctx.userId),
      ),
    )
    .limit(1);

  if (!row) return null;
  return {
    handoffId: row.handoffId,
    portfolioName: row.portfolioName,
    managerName: row.managerName ?? "Your manager",
  };
}

// Pre-auth lookup: the client name a manager typed for this invitee in Step 2 of the
// onboarding wizard (optional — additional invitees may be email-only). Called from the
// accept-invitation page, before the client has an account or session, so it takes the
// raw Clerk organization invitation id rather than a Ctx.
export async function getInviteeNameForInvitation(clerkInvitationId: string): Promise<string | null> {
  const [row] = await db
    .select({
      clientName: clientHandoffs.clientName,
      orgName: organizations.name,
    })
    .from(clientHandoffs)
    .leftJoin(organizations, eq(organizations.id, clientHandoffs.orgId))
    .where(eq(clientHandoffs.clerkInvitationId, clerkInvitationId))
    .limit(1);
  // The per-invitee name is optional — many invitees are added email-only. Fall back to
  // the portfolio/org name (which IS the client's name for single-client portfolios) so
  // the invitation still greets them by the name the manager typed.
  return row?.clientName ?? row?.orgName ?? null;
}

const DEFAULT_FROM_EMAIL = "Valgate <onboarding@resend.dev>";

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

export type OnboardResult = {
  handoffId: string;
  orgId: string;
  invitationUrl: string | null;
  propertyCount: number;
};

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

  // Cap guard: block before doing any Clerk work.
  const unconfirmed = await countUnconfirmedClients(ctx.userId);
  if (unconfirmed >= MAX_UNCONFIRMED_CLIENTS) {
    throw new AccessError(
      `You have reached the limit of ${MAX_UNCONFIRMED_CLIENTS} pending client invitations. ` +
      `Accept or remove existing invitations to add more.`,
    );
  }

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

  // Legacy single-invitee flow: map old "leave"/"keep" intent to the new three-way model.
  // "leave" → "remove" (manager exits org on accept); anything else → "full" (manager stays admin).
  const managerAccessModel: "approval" | "full" | "remove" =
    input.intent === "leave" ? "remove" : "full";

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
    managerAccessModel,
  });

  // Create the client record (Drizzle-only) and link it to the org.
  const clientId = await createClientRecord(
    ctx.userId,
    orgRow.id,
    input.name,
    input.clientEmail,
  );

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

  // Stamp clientId on any properties in this org that don't have one yet.
  await stampClientIdOnOrgProperties(orgRow.id, clientId);

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

// Dismisses the client's one-time welcome banner. Scoped by ctx.orgId (not managerUserId) —
// this is a client-initiated action, not a manager one.
export async function markWelcomeSeen(ctx: Ctx, handoffId: string): Promise<void> {
  await db
    .update(clientHandoffs)
    .set({ welcomeSeenAt: new Date(), updatedAt: new Date() })
    .where(and(eq(clientHandoffs.id, handoffId), eq(clientHandoffs.orgId, ctx.orgId)));
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
 *
 * ORDER IS CRITICAL — client must be promoted to org:admin BEFORE the manager is
 * demoted or removed. Clerk requires every org to have ≥1 admin at all times.
 */
export async function handleInvitationAccepted(clerkInvitationId: string): Promise<void> {
  const [handoff] = await db
    .select({
      id: clientHandoffs.id,
      managerUserId: clientHandoffs.managerUserId,
      clientName: clientHandoffs.clientName,
      clientEmail: clientHandoffs.clientEmail,
      orgId: clientHandoffs.orgId,
      status: clientHandoffs.status,
      role: clientHandoffs.role,
      managerAccessModel: clientHandoffs.managerAccessModel,
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

  // Mark the handoff as accepted immediately so duplicate webhook deliveries are no-ops.
  await db
    .update(clientHandoffs)
    .set({ status: "accepted", acceptedAt: new Date(), updatedAt: new Date() })
    .where(eq(clientHandoffs.id, handoff.id));

  // The name shown to the manager in the accept notification. Starts as the label the
  // manager typed at onboarding; becomes the client's chosen name if they set one below.
  let displayName = handoff.clientName ?? "Your client";
  // When the client accepts under a different name than the manager's label, this holds
  // the sentence appended to the accept notification so the manager sees the change.
  let nameChangeNote: string | null = null;

  // Resolve the Clerk org id for this portfolio.
  const [orgRow] = await db
    .select({ clerkOrgId: organizations.clerkOrgId })
    .from(organizations)
    .where(eq(organizations.id, handoff.orgId))
    .limit(1);

  if (!orgRow) {
    logger.error("handleInvitationAccepted: org not found in Neon mirror", { orgId: handoff.orgId });
    return;
  }

  const clerk = await clerkClient();

  // Resolve the accepting client's Clerk userId via org membership list.
  // We list memberships rather than relying on the organizationMembership.created webhook
  // landing first — that ordering is not guaranteed by Clerk.
  const { data: members } = await clerk.organizations.getOrganizationMembershipList({
    organizationId: orgRow.clerkOrgId,
    limit: 100,
  });

  const clientMember = members.find(
    (m) => m.publicUserData?.identifier?.toLowerCase() === handoff.clientEmail.toLowerCase(),
  );
  const clientClerkUserId = clientMember?.publicUserData?.userId;

  if (!clientClerkUserId) {
    // The membership webhook hasn't synced yet — Clerk will retry this event, so we
    // log and return. The JIT path in upsertMembership will backfill the mirror later.
    logger.warn("handleInvitationAccepted: client membership not yet visible in Clerk, will retry", {
      handoffId: handoff.id,
      clientEmail: handoff.clientEmail,
    });
    return;
  }

  // Option A — the client owns their own display name. If they set a name during signup,
  // it now overwrites the label the manager typed at onboarding, on both the canonical
  // client record (shown in /pro/clients) and the handoff row. Initials/avatar are
  // re-derived so they stay in sync. Best-effort: a name-sync failure must not block the
  // access handoff below.
  const clientChosenName = [
    clientMember?.publicUserData?.firstName,
    clientMember?.publicUserData?.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (clientChosenName) {
    try {
      // The baseline for "did the name change?" is the name the manager currently sees
      // in /pro/clients — i.e. the canonical clients.name (which for an email-only invitee
      // is the portfolio/org name the manager typed). Fall back to the handoff label.
      const [existingClient] = await db
        .select({ name: clients.name })
        .from(clients)
        .where(eq(clients.orgId, handoff.orgId))
        .limit(1);
      const previousName = existingClient?.name ?? handoff.clientName ?? null;

      const isDifferent =
        previousName === null ||
        previousName.trim().toLowerCase() !== clientChosenName.toLowerCase();

      if (isDifferent) {
        await db
          .update(clients)
          .set({
            name: clientChosenName,
            initials: nameToInitials(clientChosenName),
            avatarBg: nameToAvatarBg(clientChosenName),
          })
          .where(eq(clients.orgId, handoff.orgId));

        await db
          .update(clientHandoffs)
          .set({ clientName: clientChosenName, updatedAt: new Date() })
          .where(eq(clientHandoffs.id, handoff.id));

        // Only flag a "change" (vs a first-time name) when there was a real prior label
        // to change from — otherwise the client simply filled in a name we didn't have.
        if (previousName) {
          nameChangeNote = `They joined as "${clientChosenName}" (you had them as "${previousName}").`;
        }
      }

      // Use the client's real name in the accept notification either way.
      displayName = clientChosenName;
    } catch (err) {
      logger.error("handleInvitationAccepted: failed to sync client-chosen name", {
        error: String(err),
        handoffId: handoff.id,
      });
    }
  }

  // Resolve the manager's Clerk userId.
  const [managerUser] = await db
    .select({ clerkUserId: users.clerkUserId })
    .from(users)
    .where(eq(users.id, handoff.managerUserId))
    .limit(1);

  if (!managerUser) {
    logger.error("handleInvitationAccepted: manager user not found", { managerUserId: handoff.managerUserId });
    return;
  }

  // STEP 1 — Promote the client to org:admin FIRST (before any demotion/removal).
  // Clerk rejects org operations that would leave an org with no admin, so
  // the client must be elevated before the manager is touched.
  try {
    await clerk.organizations.updateOrganizationMembership({
      organizationId: orgRow.clerkOrgId,
      userId: clientClerkUserId,
      role: "org:admin",
    });
    await upsertMembership({ clerkOrgId: orgRow.clerkOrgId, clerkUserId: clientClerkUserId, role: "org:admin" });
  } catch (err) {
    logger.error("handleInvitationAccepted: failed to promote client to org:admin", {
      error: String(err),
      handoffId: handoff.id,
    });
    return;
  }

  // STEP 2 — Apply the manager access model chosen at onboarding.
  const model = handoff.managerAccessModel ?? "approval";

  if (model === "approval") {
    // Demote manager to read-only viewer. They may propose change_requests in Phase 2.
    try {
      await clerk.organizations.updateOrganizationMembership({
        organizationId: orgRow.clerkOrgId,
        userId: managerUser.clerkUserId,
        role: "org:viewer",
      });
      await upsertMembership({ clerkOrgId: orgRow.clerkOrgId, clerkUserId: managerUser.clerkUserId, role: "org:viewer" });
    } catch (err) {
      logger.error("handleInvitationAccepted: failed to demote manager to org:viewer", {
        error: String(err),
        handoffId: handoff.id,
      });
    }
  } else if (model === "remove") {
    // Remove the manager from the org entirely.
    try {
      await clerk.organizations.deleteOrganizationMembership({
        organizationId: orgRow.clerkOrgId,
        userId: managerUser.clerkUserId,
      });
      await removeMembership({ clerkOrgId: orgRow.clerkOrgId, clerkUserId: managerUser.clerkUserId });
      await db
        .update(clientHandoffs)
        .set({ managerAccess: "removed", updatedAt: new Date() })
        .where(eq(clientHandoffs.id, handoff.id));
    } catch (err) {
      logger.error("handleInvitationAccepted: failed to remove manager from org", {
        error: String(err),
        handoffId: handoff.id,
      });
    }
  }
  // model === "full" → no-op: manager stays co-admin alongside the client.

  // Notify the manager. The message is model-aware.
  //
  // The notification MUST be stored against the manager's home org (not the
  // portfolio org), because the manager's notification panel queries by
  // ctx.orgId (their home org). A notification stored in the portfolio org
  // would be invisible.
  const notificationDescriptions: Record<typeof model, string> = {
    approval: `${displayName} accepted — you're now a read-only viewer on their portfolio.`,
    full: `${displayName} accepted their portfolio invitation. You remain a co-admin.`,
    remove: `${displayName} accepted — your access to the portfolio has been removed.`,
  };

  try {
    // Resolve the SAME home org the manager lands in by default (via /launch →
    // ensureManagerHomeOrganizationForClerkUser), and create it if this manager
    // never had one (legacy accounts onboarded before the home-org concept).
    // Using a different heuristic here was the bug: it could pick an orphaned
    // test org with no client_handoffs/access_requests row, which the manager
    // would never actually visit — so the notification was silently unreachable.
    const homeClerkOrgId = await ensureManagerHomeOrganizationForClerkUser(managerUser.clerkUserId);
    let [homeOrg] = homeClerkOrgId
      ? await db
          .select({ id: organizations.id })
          .from(organizations)
          .where(eq(organizations.clerkOrgId, homeClerkOrgId))
          .limit(1)
      : [];

    // The home org can be a pre-existing Clerk membership that this dev/test
    // environment's webhook never mirrored into Neon yet. Self-heal instead of
    // silently dropping the notification (mirrors the pattern approveAccessRequest
    // already uses: write the mirror now rather than waiting for the webhook).
    if (!homeOrg && homeClerkOrgId) {
      const clerkOrg = await clerk.organizations.getOrganization({ organizationId: homeClerkOrgId });
      await upsertOrg({ id: clerkOrg.id, name: clerkOrg.name, slug: clerkOrg.slug ?? null });
      [homeOrg] = await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.clerkOrgId, homeClerkOrgId))
        .limit(1);
    }

    if (homeOrg) {
      const baseDescription =
        notificationDescriptions[model] ?? `${displayName} accepted their portfolio invitation`;
      await insertAccessNotification({
        orgId: homeOrg.id,
        userId: handoff.managerUserId,
        title: nameChangeNote ? "Client accepted — name changed" : "Client accepted",
        // When the client renamed themselves, append the change so it's visible in the
        // same notification the manager already gets for the acceptance.
        description: nameChangeNote ? `${baseDescription} ${nameChangeNote}` : baseDescription,
        linkTo: "/pro/clients",
      });
    }
  } catch (err) {
    logger.error("handleInvitationAccepted: notification failed", { error: String(err), handoffId: handoff.id });
  }
}

// ─── Client-side acceptance fallback ──────────────────────────────────────────
//
// Called from /launch when the Clerk webhook (organizationInvitation.accepted)
// hasn't fired or wasn't delivered yet. Without this fallback, handoffs stay
// "pending" forever and the manager never receives the notification.
//
// Finds all pending handoffs where the user's email matches, then delegates to
// the same handleInvitationAccepted logic the webhook would have called.

export async function completePendingHandoffsForUser(clerkUserId: string): Promise<{ completed: number }> {
  const [user] = await db
    .select({ id: users.id, primaryEmail: users.primaryEmail })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);
  if (!user) return { completed: 0 };

  const pendingRows = await db
    .select({ id: clientHandoffs.id, clerkInvitationId: clientHandoffs.clerkInvitationId })
    .from(clientHandoffs)
    .where(
      and(
        eq(clientHandoffs.clientEmail, user.primaryEmail),
        eq(clientHandoffs.status, "pending"),
      ),
    );

  let completed = 0;
  for (const row of pendingRows) {
    if (row.clerkInvitationId) {
      await handleInvitationAccepted(row.clerkInvitationId);
      completed++;
    }
  }

  return { completed };
}

// ─── Private helpers ──────────────────────────────────────────────────────────

export async function getOwnHandoff(ctx: Ctx, handoffId: string): Promise<{
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
  managerAccessModel: string;
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
      managerAccessModel: clientHandoffs.managerAccessModel,
    })
    .from(clientHandoffs)
    .where(
      and(eq(clientHandoffs.id, handoffId), eq(clientHandoffs.managerUserId, ctx.userId)),
    )
    .limit(1);

  if (!handoff) throw new AccessError("Handoff not found.");
  return handoff;
}
