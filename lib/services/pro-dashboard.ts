import "server-only";
import { and, eq, inArray, sql, desc, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { getFsUserId } from "@/lib/data/auth-shim";
// Cached read-through wrappers (client-perf layer from v1.0.2). These replace the
// direct list* service calls in the batched Promise.all inside loadProContext.
import {
  cachedListLeases,
  cachedListPayments,
  cachedListTenants,
  cachedListMaintenanceItems,
  cachedListCertifications,
  cachedListInspections,
  cachedListSafetyRisks,
  cachedListPropertyValuations,
  cachedListOwnershipRecords,
  cachedListCoOwners,
  cachedListOwnershipDocuments,
  cachedListEmergencyContacts,
  cachedListEstateAssignments,
  cachedListDocuments,
  cachedListProperties,
  cachedListProfessionals,
} from "@/lib/data/cached-reads";
import { requireCtx } from "@/lib/auth/ctx";
import {
  clientHandoffs,
  organizationMemberships,
  clients,
  organizations,
  properties,
} from "@/lib/db/schema";
import { toDomain } from "@/lib/services/_mapping";
import { stampClientIdOnOrgProperties } from "@/lib/services/client-records";
import { PropertySchema } from "@/lib/data/types/property";
import {
  computeProgress,
  type ProgressContext,
} from "@/lib/data/derivations/progress";
import type { Client, ClientType } from "@/lib/data/types/client";
import type { ClientRollup, ProContext } from "@/lib/services/pro-derive";

// ---------------------------------------------------------------------------
// Pro dashboard service — the DB-backed half of the Pro query layer.
//
// This module owns every Drizzle read the Pro pages need (services own all
// Drizzle access); the pure derivation math lives in
// lib/services/pro-derive.ts and the page-level query functions in
// app/(pro)/pro/queries.ts compose the two.
// ---------------------------------------------------------------------------

// Reads all clients for a manager from Neon (authoritative after M5).
// Maps DB lowercase status enum → ClientSchema's capitalised enum.
// userId on each Client is set to the FS user id to preserve rollup semantics
// for code that still derives totals via client.userId.
async function listClientsForManager(managerUserId: string): Promise<Client[]> {
  const fsUserId = getFsUserId(managerUserId);
  const rows = await db
    .select()
    .from(clients)
    .where(eq(clients.managerUserId, managerUserId));

  return rows.map((row) => ({
    id: row.id,
    userId: fsUserId,
    name: row.name,
    clientType: row.clientType,
    orgId: row.orgId ?? undefined,
    initials: row.initials,
    avatarBg: row.avatarBg,
    email: row.email ?? undefined,
    status: row.status === "active" ? ("Active" as const) : ("Inactive" as const),
    clientSince: row.createdAt.getTime(),
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  }));
}

export async function loadProContext(): Promise<ProContext> {
  const authCtx = await requireCtx();

  // Resolve all orgs the manager has access to via client portfolios:
  //  1. clientHandoffs  — manager-led onboarding flow
  //  2. clients.orgId   — direct client records (e.g. seed data, manual creation)
  // Merge both so properties from ANY client-linked org are loaded.
  const [handoffOrgRows, clientOrgRows] = await Promise.all([
    db
      .selectDistinct({ orgId: clientHandoffs.orgId })
      .from(clientHandoffs)
      .where(eq(clientHandoffs.managerUserId, authCtx.userId)),
    db
      .select({ orgId: clients.orgId, clientId: clients.id })
      .from(clients)
      .where(
        and(eq(clients.managerUserId, authCtx.userId), isNotNull(clients.orgId)),
      ),
  ]);

  const handoffOrgIds = handoffOrgRows
    .map((r) => r.orgId)
    .filter((id): id is string => id !== null && id !== authCtx.orgId);

  const clientOrgIds = clientOrgRows
    .map((r) => r.orgId)
    .filter((id): id is string => id !== null && id !== authCtx.orgId);

  const allPortfolioOrgIds = [...new Set([...handoffOrgIds, ...clientOrgIds])];

  // Build org→clientId map from client rows for lazy-stamp below.
  const orgToClientId = new Map<string, string>();
  for (const row of clientOrgRows) {
    if (row.orgId && row.clientId) {
      orgToClientId.set(row.orgId, row.clientId);
    }
  }

  // Lazy-stamp: ensure properties in client-linked portfolio orgs have
  // clientId set. Idempotent (only updates NULL rows); handles seed /
  // pre-existing data where stampClientIdOnOrgProperties wasn't called
  // at creation time. Must run BEFORE loading portfolioProperties so the
  // SELECT picks up freshly-stamped clientId values.
  for (const [orgId, clientId] of orgToClientId) {
    await stampClientIdOnOrgProperties(orgId, clientId);
  }

  // Renamed `currentOrgProperties` to avoid shadowing the `properties` table import
  // used in the portfolio org query below.
  const [
    clientList,
    currentOrgProperties,
    portfolioProperties,
    leases,
    payments,
    tenants,
    maintenance,
    certifications,
    safetyRisks,
    professionals,
    valuations,
    inspections,
    ownershipRecords,
    coOwners,
    ownershipDocuments,
    emergencyContacts,
    successorAssignments,
    documents,
  ] = await Promise.all([
    listClientsForManager(authCtx.userId),
    cachedListProperties(authCtx),
    // Load properties from portfolio orgs (separate Clerk orgs holding client data)
    allPortfolioOrgIds.length > 0
      ? db.select().from(properties)
          .where(inArray(properties.orgId, allPortfolioOrgIds))
          .limit(500)
      : Promise.resolve([]),
    cachedListLeases(authCtx),
    cachedListPayments(authCtx),
    cachedListTenants(authCtx),
    cachedListMaintenanceItems(authCtx),
    cachedListCertifications(authCtx),
    cachedListSafetyRisks(authCtx),
    cachedListProfessionals(authCtx),
    cachedListPropertyValuations(authCtx),
    cachedListInspections(authCtx),
    cachedListOwnershipRecords(authCtx),
    cachedListCoOwners(authCtx),
    cachedListOwnershipDocuments(authCtx),
    cachedListEmergencyContacts(authCtx),
    cachedListEstateAssignments(authCtx),
    cachedListDocuments(authCtx),
  ]);

  // Merge portfolio properties into the main property list, converting DB rows
  // to domain objects using the same transform the service layer uses.
  const allProperties = allPortfolioOrgIds.length > 0
    ? [...currentOrgProperties, ...portfolioProperties.map((r) => PropertySchema.parse(toDomain(properties, r)))]
    : currentOrgProperties;

  // Filter inactive clients so they vanish from rollups, alerts, the client
  // book, and all derived counts.
  const activeClients = clientList.filter((c) => c.status !== "Inactive");

  // Re-use the client-side Progress derivation as-is.
  const progressCtx: ProgressContext = {
    leases,
    tenants,
    payments,
    ownershipRecords,
    coOwners,
    ownershipDocuments,
    valuations,
    safetyRisks,
    inspections,
    certifications,
    emergencyContacts,
    successorAssignments,
    documents,
  };

  const progressByPropertyId = new Map<string, number>();
  for (const p of allProperties) {
    progressByPropertyId.set(p.id, computeProgress(p, progressCtx));
  }

  const propertyIdByLeaseId = new Map<string, string>();
  for (const l of leases) {
    propertyIdByLeaseId.set(l.id, l.propertyId);
  }

  return {
    clients: activeClients,
    properties: allProperties,
    leases,
    payments,
    tenants,
    maintenance,
    certifications,
    safetyRisks,
    inspections,
    professionals,
    progressByPropertyId,
    propertyById: new Map(allProperties.map((p) => [p.id, p])),
    clientById: new Map(activeClients.map((c) => [c.id, c])),
    leaseById: new Map(leases.map((l) => [l.id, l])),
    tenantById: new Map(tenants.map((t) => [t.id, t])),
    professionalById: new Map(professionals.map((p) => [p.id, p])),
    propertyIdByLeaseId,
  };
}

// Authz + resolution for the "View as client" preview route.
// Returns the client's internal org id (so the owner view can be scoped to it)
// and the manager's own user id — only when the signed-in manager actually owns
// this client (clients.managerUserId). Returns null otherwise (not their client,
// or the client has no linked portfolio org yet), so the route can 404.
export async function resolveClientOrgForManager(
  clientId: string,
): Promise<{
  orgId: string;
  name: string;
  initials: string;
  managerUserId: string;
} | null> {
  const authCtx = await requireCtx();

  const [row] = await db
    .select({ orgId: clients.orgId, name: clients.name, initials: clients.initials })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.managerUserId, authCtx.userId)))
    .limit(1);

  if (!row || !row.orgId) {
    return null;
  }

  return {
    orgId: row.orgId,
    name: row.name,
    initials: row.initials,
    managerUserId: authCtx.userId,
  };
}

// Resolves the Clerk org id behind an internal organization id. Used by the
// "View as client" button on the client portfolio page to switch into the
// client's org. Returns null when the org row does not exist.
export async function getClerkOrgIdForOrg(orgId: string): Promise<string | null> {
  const [orgRow] = await db
    .select({ clerkOrgId: organizations.clerkOrgId })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  return orgRow?.clerkOrgId ?? null;
}

// Returns the minimal shape of clients whose status is "Inactive" (archived).
// Used by the clients index page so managers can see and reactivate archived
// clients — these are excluded from loadProContext so they won't appear in
// rollups or the active client list.
export async function getInactiveClients(): Promise<
  Array<{
    id: string;
    name: string;
    initials: string;
    avatarBg: string;
    clientType: ClientType;
  }>
> {
  const authCtx = await requireCtx();
  return db
    .select({
      id: clients.id,
      name: clients.name,
      initials: clients.initials,
      avatarBg: clients.avatarBg,
      clientType: clients.clientType,
    })
    .from(clients)
    .where(
      and(
        eq(clients.managerUserId, authCtx.userId),
        eq(clients.status, "inactive"),
      ),
    );
}

// ---------------------------------------------------------------------------
// Client portfolios — manager-led onboarding handoffs (client_handoffs)
// ---------------------------------------------------------------------------

// Phase 6: grouped portfolio view — one entry per org, not one per handoff.
export type PortfolioRow = {
  orgId: string;
  name: string;
  memberCount: number;
  pendingCount: number;
  propertyCount: number;
};

export type HandoffRow = {
  id: string;
  // Phase 6: nullable — email-only invitees have no name until they accept.
  clientName: string | null;
  clientEmail: string;
  // Phase 6: added "draft" (org created, invitation not yet sent).
  status: "draft" | "pending" | "accepted" | "revoked" | "bounced";
  // Phase 6: widened from "view" | "full" to three-tier.
  role: "admin" | "member" | "viewer";
  managerAccess: "granted" | "removed";
  // Phase 1: manager's chosen model at onboard time (what happens to them when client accepts).
  managerAccessModel: "approval" | "full" | "remove";
  invitationUrl: string | null;
  invitationLastCopiedAt: Date | null;
  locale: "en" | "km";
  createdAt: Date;
};

export async function listClientHandoffs(): Promise<HandoffRow[]> {
  const authCtx = await requireCtx();
  const rows = await db
    .select({
      id: clientHandoffs.id,
      clientName: clientHandoffs.clientName,
      clientEmail: clientHandoffs.clientEmail,
      status: clientHandoffs.status,
      role: clientHandoffs.role,
      managerAccess: clientHandoffs.managerAccess,
      managerAccessModel: clientHandoffs.managerAccessModel,
      invitationUrl: clientHandoffs.invitationUrl,
      invitationLastCopiedAt: clientHandoffs.invitationLastCopiedAt,
      locale: clientHandoffs.locale,
      createdAt: clientHandoffs.createdAt,
    })
    .from(clientHandoffs)
    .where(eq(clientHandoffs.managerUserId, authCtx.userId))
    .orderBy(desc(clientHandoffs.createdAt));
  return rows.map((row) => ({
    ...row,
    locale: row.locale === "km" ? "km" : "en",
  }));
}

// Phase 6: returns one PortfolioRow per org (not one per handoff).
// memberCount = active org_membership rows; pendingCount = draft/pending/bounced handoffs.
export async function listClientPortfolios(): Promise<PortfolioRow[]> {
  const authCtx = await requireCtx();

  // Distinct orgs this manager has any handoff for.
  const orgRows = await db
    .selectDistinct({
      orgId: clientHandoffs.orgId,
      orgName: organizations.name,
    })
    .from(clientHandoffs)
    .innerJoin(organizations, eq(organizations.id, clientHandoffs.orgId))
    .where(eq(clientHandoffs.managerUserId, authCtx.userId));

  if (orgRows.length === 0) return [];

  const orgIds = orgRows.map((r) => r.orgId);

  const [memberCounts, pendingCounts, propertyCounts] = await Promise.all([
    db
      .select({
        orgId: organizationMemberships.orgId,
        count: sql<number>`count(*)::int`,
      })
      .from(organizationMemberships)
      .where(
        and(
          inArray(organizationMemberships.orgId, orgIds),
          eq(organizationMemberships.status, "active"),
        ),
      )
      .groupBy(organizationMemberships.orgId),
    db
      .select({
        orgId: clientHandoffs.orgId,
        count: sql<number>`count(*)::int`,
      })
      .from(clientHandoffs)
      .where(
        and(
          eq(clientHandoffs.managerUserId, authCtx.userId),
          inArray(clientHandoffs.orgId, orgIds),
          inArray(clientHandoffs.status, ["draft", "pending", "bounced"]),
        ),
      )
      .groupBy(clientHandoffs.orgId),
    db
      .select({
        orgId: properties.orgId,
        count: sql<number>`count(*)::int`,
      })
      .from(properties)
      .where(inArray(properties.orgId, orgIds))
      .groupBy(properties.orgId),
  ]);

  const memberByOrg = new Map(memberCounts.map((r) => [r.orgId, r.count]));
  const pendingByOrg = new Map(pendingCounts.map((r) => [r.orgId, r.count]));
  const propByOrg = new Map(propertyCounts.map((r) => [r.orgId, r.count]));

  return orgRows.map((r) => ({
    orgId: r.orgId,
    name: r.orgName,
    memberCount: memberByOrg.get(r.orgId) ?? 0,
    pendingCount: pendingByOrg.get(r.orgId) ?? 0,
    propertyCount: propByOrg.get(r.orgId) ?? 0,
  }));
}

// ---------------------------------------------------------------------------
// Portfolio org augmentation — member/pending counts and confirmation status
// ---------------------------------------------------------------------------

// Priority order for collapsing multiple handoff statuses into one label:
// bounced needs immediate action, then pending (waiting), draft (unsent), accepted (done).
const STATUS_PRIORITY = ["bounced", "pending", "draft", "accepted"] as const;
type HandoffStatus = (typeof STATUS_PRIORITY)[number];

function bestStatus(statuses: HandoffStatus[]): HandoffStatus | undefined {
  for (const s of STATUS_PRIORITY) {
    if (statuses.includes(s)) return s;
  }
  return statuses[0];
}

export async function augmentRollupsWithOrgData(
  managerUserId: string,
  rollups: ClientRollup[],
): Promise<void> {
  const orgIds = rollups
    .map((r) => r.client.orgId)
    .filter((id): id is string => !!id);

  if (orgIds.length === 0) return;

  const [memberCounts, handoffRows] = await Promise.all([
    db
      .select({
        orgId: organizationMemberships.orgId,
        count: sql<number>`count(*)::int`,
      })
      .from(organizationMemberships)
      .where(
        and(
          inArray(organizationMemberships.orgId, orgIds),
          eq(organizationMemberships.status, "active"),
        ),
      )
      .groupBy(organizationMemberships.orgId),
    db
      .select({
        orgId: clientHandoffs.orgId,
        status: clientHandoffs.status,
        pendingCount: sql<number>`
          count(*) filter (where ${clientHandoffs.status} in ('draft','pending','bounced'))::int
        `,
      })
      .from(clientHandoffs)
      .where(
        and(
          eq(clientHandoffs.managerUserId, managerUserId),
          inArray(clientHandoffs.orgId, orgIds),
        ),
      )
      .groupBy(clientHandoffs.orgId, clientHandoffs.status),
  ]);

  // Build lookup maps.
  const memberByOrg = new Map(memberCounts.map((r) => [r.orgId, r.count]));

  // Collapse per-org handoff rows into pending count + best status.
  const handoffByOrg = new Map<string, { pendingCount: number; statuses: HandoffStatus[] }>();
  for (const row of handoffRows) {
    const entry = handoffByOrg.get(row.orgId) ?? { pendingCount: 0, statuses: [] };
    entry.pendingCount += row.pendingCount ?? 0;
    entry.statuses.push(row.status as HandoffStatus);
    handoffByOrg.set(row.orgId, entry);
  }

  // Stamp onto rollups.
  for (const rollup of rollups) {
    const orgId = rollup.client.orgId;
    if (!orgId) continue;
    rollup.memberCount = memberByOrg.get(orgId) ?? 0;
    const handoffEntry = handoffByOrg.get(orgId);
    rollup.pendingCount = handoffEntry?.pendingCount ?? 0;
    // A portfolio with an org but no handoff rows is a DRAFT the manager hasn't
    // invited anyone into yet — surface it as "draft" so the table shows the badge
    // instead of a bare "—". Any real handoff status still wins via bestStatus().
    rollup.confirmationStatus = bestStatus(handoffEntry?.statuses ?? []) || "draft";
  }
}
