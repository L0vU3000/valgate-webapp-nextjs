import "server-only";
import { and, eq, inArray, notInArray, isNull, isNotNull, ne, sql, countDistinct } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { Resend } from "resend";
import { db } from "@/lib/db/client";
import { clientHandoffs, clients, notifications, organizationMemberships, organizations, properties, users } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { buildInvitationEmailEn } from "@/lib/email-templates/invitation-en";
import { buildInvitationEmailKm } from "@/lib/email-templates/invitation-km";
import { getClientInvitationRedirectUrl } from "@/lib/app-origin";
import { nextId, assertCanMutate, type Ctx } from "@/lib/services/_mapping";
import { upsertOrg, upsertMembership, removeMembership } from "@/lib/services/identity-sync";
import { assertOrgAdmin } from "@/lib/services/_crud";
import { AccessError, ensureManagerHomeOrganizationForClerkUser } from "@/lib/services/managers";
import { createPropertyForOrg, bulkAssignProperties } from "@/lib/services/properties";
import * as clientsDb from "@/lib/data/db/clients";
import { getFsUserId } from "@/lib/data/auth-shim";
import type { NewProperty, PropertyTypeChoice } from "@/lib/data/types/property";
import { logger } from "@/lib/logger";

// Cap: a manager cannot have more than this many unconfirmed client portfolios.
// "Unconfirmed" = the client has not accepted yet — this covers drafts (not invited
// at all), pending invites, and bounced invites. Accepted portfolios don't count.
export const MAX_UNCONFIRMED_CLIENTS = 20;

/**
 * Counts this manager's client portfolios that the client hasn't accepted yet.
 *
 * A portfolio becomes "confirmed" only once one of its client_handoffs is accepted.
 * We therefore count the manager's active client portfolios (rows in `clients` that
 * are backed by an org) and subtract the ones whose org already has an accepted
 * handoff. This deliberately includes DRAFT portfolios that have no handoff row at
 * all, so a manager can't create unlimited backing orgs by never inviting anyone.
 *
 * Two small queries (instead of one correlated subquery) keep the intent readable;
 * the row counts here are tiny (capped at MAX_UNCONFIRMED_CLIENTS), so the extra
 * round-trip is negligible.
 */
export async function countUnconfirmedClients(managerUserId: string): Promise<number> {
  // Step 1: find every org this manager has where the client already accepted.
  // These are "confirmed" and must be excluded from the count.
  const acceptedRows = await db
    .select({ orgId: clientHandoffs.orgId })
    .from(clientHandoffs)
    .where(
      and(
        eq(clientHandoffs.managerUserId, managerUserId),
        eq(clientHandoffs.status, "accepted"),
      ),
    );
  const acceptedOrgIds = acceptedRows.map((r) => r.orgId);

  // Step 2: count this manager's active, org-backed client portfolios, excluding the
  // accepted ones. notInArray is only applied when there is something to exclude —
  // an empty list would make the SQL "NOT IN ()" which behaves inconsistently.
  const conditions = [
    eq(clients.managerUserId, managerUserId),
    isNotNull(clients.orgId),
    eq(clients.status, "active"),
  ];
  if (acceptedOrgIds.length > 0) {
    conditions.push(notInArray(clients.orgId, acceptedOrgIds));
  }

  const [row] = await db
    .select({ count: countDistinct(clients.orgId) })
    .from(clients)
    .where(and(...conditions));
  return row?.count ?? 0;
}

// Every portfolio org a manager onboarded a client into (the handoff path).
// The access-request based listManagedAccounts does NOT include these, so the
// owner shell uses this to recognise "manager viewing as client" for onboarded
// portfolios — both for the context banner and the client-view glow.
export async function listManagerClientOrgs(
  ctx: Ctx,
): Promise<Array<{ orgId: string; clerkOrgId: string; name: string }>> {
  return db
    .selectDistinct({
      orgId: organizations.id,
      clerkOrgId: organizations.clerkOrgId,
      name: organizations.name,
    })
    .from(clientHandoffs)
    .innerJoin(organizations, eq(organizations.id, clientHandoffs.orgId))
    .where(eq(clientHandoffs.managerUserId, ctx.userId));
}

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

// ─── Visual helpers ───────────────────────────────────────────────────────────

// Derives short initials from a display name (up to 2 chars, uppercase).
function nameToInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return ((parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")).toUpperCase();
}

// Deterministic colour slot derived from the portfolio name.
const AVATAR_COLORS = [
  "bg-blue-600 text-white",
  "bg-indigo-600 text-white",
  "bg-violet-600 text-white",
  "bg-purple-600 text-white",
  "bg-teal-600 text-white",
  "bg-emerald-600 text-white",
  "bg-rose-600 text-white",
  "bg-amber-600 text-white",
];

function nameToAvatarBg(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (Math.imul(31, h) + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

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

// ─── Shared dual-write helper ─────────────────────────────────────────────────

/**
 * Creates a Drizzle clients row (canonical) and a best-effort FS mirror record,
 * both sharing the same CLI-xxxx id.
 *
 * Idempotent: if a row already exists for this (managerUserId, orgId) pair
 * (non-null orgId only), the insert is a no-op and the existing id is returned.
 * orgId=null (manual wizard clients) always inserts a new row — no unique constraint applies.
 *
 * Exported so actions.ts can route the manual-wizard create through Neon too.
 */
export async function createClientRecord(
  managerUserId: string,
  orgId: string | null,
  name: string,
  email: string | undefined,
  fsUserId: string,
): Promise<string> {
  const clientId = await nextId("CLI");
  const initials = nameToInitials(name);
  const avatarBg = nameToAvatarBg(name);
  const now = Date.now();

  // Neon insert — canonical. ON CONFLICT on the partial unique index (non-null orgId)
  // is a no-op; returning() gives us the inserted id (empty array = conflict occurred).
  const inserted = await db
    .insert(clients)
    .values({
      id: clientId,
      managerUserId,
      orgId,
      name,
      email: email ?? null,
      clientType: "Individual",
      initials,
      avatarBg,
    })
    .onConflictDoNothing()
    .returning({ id: clients.id });

  // If insert was a no-op (conflict on unique index), fetch the existing row's id.
  let canonicalId = inserted[0]?.id;
  if (canonicalId === undefined && orgId !== null) {
    const [existing] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.managerUserId, managerUserId), eq(clients.orgId, orgId)))
      .limit(1);
    canonicalId = existing?.id ?? clientId;
  }
  if (canonicalId === undefined) {
    canonicalId = clientId;
  }

  // FS mirror — best-effort only. Neon is the canonical store from here on.
  try {
    await clientsDb.create(
      fsUserId,
      {
        userId: fsUserId,
        name,
        clientType: "Individual",
        initials,
        avatarBg,
        email,
        orgId: orgId ?? undefined,
        clientSince: now,
      },
      canonicalId,
    );
  } catch (err) {
    logger.error("createClientRecord: FS mirror write failed (non-fatal)", { error: String(err) });
  }

  return canonicalId;
}

// ─── Stamp properties in an org with a clientId ───────────────────────────────

async function stampClientIdOnOrgProperties(orgId: string, clientId: string): Promise<void> {
  await db
    .update(properties)
    .set({ clientId, updatedAt: new Date() })
    .where(and(eq(properties.orgId, orgId), sql`${properties.clientId} IS NULL`));
}

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

  // 4. Create the client record (Drizzle + FS dual-write) and link it to the org.
  const primaryEmail = input.invitees[0]?.email;
  const fsUserId = getFsUserId(ctx.userId);
  const clientId = await createClientRecord(
    ctx.userId,
    orgRow.id,
    input.portfolioName,
    primaryEmail,
    fsUserId,
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

  // Create the client record (Drizzle + FS dual-write) and link it to the org.
  const fsUserId = getFsUserId(ctx.userId);
  const clientId = await createClientRecord(
    ctx.userId,
    orgRow.id,
    input.name,
    input.clientEmail,
    fsUserId,
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

// ─── One-off backfill ─────────────────────────────────────────────────────────

/**
 * Creates a Drizzle clients row + FS client record for every portfolio org that
 * belongs to this manager but doesn't have a linked client yet.
 * Also stamps clientId on properties in those orgs that lack one.
 *
 * Idempotent — safe to call multiple times; existing rows are skipped.
 * Designed to run once from the /pro/clients page on first load after deploy.
 */
export async function backfillClientsForHandoffs(ctx: Ctx): Promise<void> {
  // Find all orgs this manager has handoffs for.
  const handoffOrgs = await db
    .selectDistinct({ orgId: clientHandoffs.orgId, orgName: organizations.name })
    .from(clientHandoffs)
    .innerJoin(organizations, eq(organizations.id, clientHandoffs.orgId))
    .where(eq(clientHandoffs.managerUserId, ctx.userId));

  if (handoffOrgs.length === 0) return;

  // Find which orgs already have a Drizzle clients row.
  const existingOrgIds = new Set(
    (
      await db
        .select({ orgId: clients.orgId })
        .from(clients)
        .where(
          and(
            eq(clients.managerUserId, ctx.userId),
            inArray(
              clients.orgId,
              handoffOrgs.map((r) => r.orgId),
            ),
          ),
        )
    )
      .map((r) => r.orgId)
      .filter((id): id is string => id !== null),
  );

  const fsUserId = getFsUserId(ctx.userId);

  for (const { orgId, orgName } of handoffOrgs) {
    if (existingOrgIds.has(orgId)) continue;

    // Get the primary email from the first handoff for this org.
    const [firstHandoff] = await db
      .select({ clientEmail: clientHandoffs.clientEmail })
      .from(clientHandoffs)
      .where(eq(clientHandoffs.orgId, orgId))
      .orderBy(clientHandoffs.createdAt)
      .limit(1);

    try {
      const clientId = await createClientRecord(
        ctx.userId,
        orgId,
        orgName,
        firstHandoff?.clientEmail,
        fsUserId,
      );
      await stampClientIdOnOrgProperties(orgId, clientId);
    } catch (err) {
      // Best-effort: log and continue so one bad org doesn't block the rest.
      logger.error("backfillClientsForHandoffs: failed for org", { orgId, error: String(err) });
    }
  }
}
