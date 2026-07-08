import "server-only";
import * as agentRunsDb from "@/lib/data/db/agent-runs";
import { getAiMessage } from "@/lib/services/ai-messages";
// Notifications are still read directly (used outside the batched Promise.all
// inside loadProContext).
import { listNotifications } from "@/lib/services/notifications";
import { getFsUserId } from "@/lib/data/auth-shim";
import { requireCtx } from "@/lib/auth/ctx";
import { listActivitiesForScope } from "@/lib/services/activities";
import { listManagedAccounts, getIsManager } from "@/lib/services/managers";
import { listPortfolioMembers as svcListPortfolioMembers } from "@/lib/services/client-onboarding";
import type { PortfolioMember, PortfolioInvitee } from "@/lib/services/client-onboarding";
import { OWN_PORTFOLIO_ID } from "@/app/(pro)/pro/_components/pro-shell-types";
// DB-backed context loading + list queries — moved to the services layer
// (services own all Drizzle access; this file composes them).
import {
  loadProContext,
  augmentRollupsWithOrgData,
  getClerkOrgIdForOrg,
} from "@/lib/services/pro-dashboard";
// Pure derivation helpers — moved to the services layer with the DB split.
import {
  DAY,
  currentMonthStartUtc,
  monthLabelUtc,
  isActiveProperty,
  sumPropertyValues,
  sumExpectedRent,
  sumCollectedRent,
  computeNoiMonthly,
  severityRank,
  severityRankMaintenance,
  statusRankMaintenance,
  rentStatusRank,
  safetyRiskSeverityRank,
  countWorkOrders,
  countLeasesExpiring,
  buildClientRollup,
  buildOwnPortfolioRollup,
  buildRollupFromProperties,
  buildPropertyRow,
  buildWorkOrderRow,
  buildComplianceRows,
  buildActivityFeed,
  buildRentRollRow,
  buildCashflowSeries,
  buildOwnerStatement,
  deriveRunStatus,
} from "@/lib/services/pro-derive";
import type {
  ProContext,
  ProAlert,
  ClientHealth,
  ClientRollup,
  ProPropertyRow,
  ProWorkOrderRow,
  ProComplianceRow,
  ProActivityEvent,
  CashflowPoint,
  RentRollRow,
  OwnerStatement,
} from "@/lib/services/pro-derive";
import { formatCurrency, addUtcMonths } from "@/lib/format";
import { getUserProfile } from "@/lib/services/user-profiles";
import type { Client } from "@/lib/data/types/client";
import type { Notification } from "@/lib/data/types/notification";
import type { Property, PropertyListItem } from "@/lib/data/types/property";
import type {
  SafetyRiskSeverity,
  SafetyRiskStatus,
} from "@/lib/data/types/safety-risk";
import type { Inspection } from "@/lib/data/types/inspection";
import type { Professional } from "@/lib/data/types/professional";
import type { AgentRun, AgentRunStatus } from "@/lib/data/types/agent-run";
import type { AiMessage } from "@/lib/data/types/ai-message";

// ---------------------------------------------------------------------------
// Pro query layer.
//
// The Pro interface is a multi-owner overlay on the client-side schema:
// every number rendered on a Pro page is derived here from the same
// entities the client side uses (Property, Lease, Payment, Tenant,
// MaintenanceItem, Certification, SafetyRisk, ...), grouped by
// Property.clientId and rolled up per client or across the whole book.
//
// The layer is split in three (services own all Drizzle access):
// - lib/services/pro-dashboard.ts — every DB read (loadProContext + list queries).
// - lib/services/pro-derive.ts — the pure derivation math and shared row types.
// - this file — the page-level query functions that compose the two.
//
// Derivation conventions (documented per helper in pro-derive.ts):
// - "active" property = not Sold, not Archived (same as computeStats).
// - Money month = current UTC calendar month (same as computeKpis).
// - Owner statements cover the previous full calendar month.
// ---------------------------------------------------------------------------

// Re-exported so server-side callers can still import from here.
export { OWN_PORTFOLIO_ID };

// Shared alert/rollup/row types now live with their derivation functions in
// lib/services/pro-derive.ts — re-exported here so existing importers
// (components, actions) keep working unchanged.
export type {
  AlertSeverity,
  AlertCategory,
  ProAlert,
  ClientHealth,
  ClientRollup,
  ProPropertyRow,
  ProWorkOrderRow,
  ProComplianceRow,
  ProActivityEvent,
  CashflowPoint,
  RentStatus,
  RentRollRow,
  OwnerStatement,
} from "@/lib/services/pro-derive";

export type ProKpis = {
  totalValue: number;
  totalValueFormatted: string;
  propertyCount: number;
  clientCount: number;
  occupancyRate: number;
  monthlyExpected: number;
  monthlyCollected: number;
  collectionRate: number;
  noiMonthly: number;
  monthLabel: string;
};

export type ProDashboardData = {
  kpis: ProKpis;
  alerts: ProAlert[];
  clients: ClientRollup[];
  properties: ProPropertyRow[];
  workOrders: {
    counts: { open: number; inProgress: number; resolved: number };
    queue: ProWorkOrderRow[];
  };
  financials: {
    expected: number;
    collected: number;
    outstanding: number;
    series: CashflowPoint[];
  };
  occupancy: {
    rented: number;
    vacant: number;
    occupancyRate: number;
    leasesExpiring90d: number;
  };
  compliance: ProComplianceRow[];
  activity: ProActivityEvent[];
};

export type RentPageData = {
  monthLabel: string;
  expected: number;
  collected: number;
  outstanding: number;
  collectionRate: number;
  rentRoll: RentRollRow[];
  overdue: RentRollRow[];
  expiring: Array<{
    leaseId: string;
    propertyId: string;
    propertyName: string;
    clientName: string;
    tenantName: string;
    endDate: number;
    monthlyRent: number;
    renewalStatus?: string;
    daysLeft: number;
    termMonths: number;
    // The end date a renewal would produce (current end + one full term).
    // Pre-computed here so the renew modal can show the owner exactly
    // what they are confirming, using the same math as the renewLease
    // server action.
    projectedEndDate: number;
  }>;
  occupancy: { rented: number; vacant: number; occupancyRate: number };
  clients: Array<{ id: string; name: string }>;
  series: CashflowPoint[];
};

export type WorkOrdersPageData = {
  rows: ProWorkOrderRow[];
  counts: {
    open: number;
    inProgress: number;
    resolved: number;
    urgentOpen: number;
  };
  totalOpenCost: number;
  vendors: Array<{
    id: string;
    name: string;
    company: string;
    category: Professional["category"];
    available: boolean;
    rating: number;
  }>;
  properties: Array<{ id: string; name: string; clientName: string }>;
};

export type ClientPortfolioData = {
  rollup: ClientRollup;
  properties: ProPropertyRow[];
  workOrders: ProWorkOrderRow[];
  // Client-scoped work-order surfaces — the same shapes the global
  // /pro/work-orders page renders, derived over this client's slice
  // (see deriveWorkOrderSurfaces).
  workOrderCounts: {
    open: number;
    inProgress: number;
    resolved: number;
    urgentOpen: number;
  };
  totalOpenWorkOrderCost: number;
  workOrderVendors: WorkOrdersPageData["vendors"];
  compliance: ProComplianceRow[];
  // Client-scoped compliance surfaces — the same shapes the global
  // /pro/compliance page renders, derived over this client's slice (see
  // deriveComplianceSurfaces). `compliance` above is the certification list;
  // these add the book-level summary counts, the safety-risk register, and the
  // inspection log for the same client.
  complianceSummary: CompliancePageData["summary"];
  safetyRisks: ProSafetyRiskRow[];
  inspections: ProInspectionRow[];
  activity: ProActivityEvent[];
  financialSeries: CashflowPoint[];
  // Client-scoped rent surfaces — the same shapes the global /pro/rent page
  // renders, derived over this client's slice (see deriveRentSurfaces).
  rentRoll: RentRollRow[];
  overdue: RentRollRow[];
  expiring: RentPageData["expiring"];
  collectionRate: number;
  leasesExpiring90d: number;
  ownerStatement: OwnerStatement;
  // Clerk org id behind this client's portfolio, used by the "View as client"
  // button to switch into the client's org. Null for the own-portfolio view
  // and any client without a linked org.
  viewAsClerkOrgId: string | null;
};

export type ProShellData = {
  clients: Array<{
    id: string;
    name: string;
    initials: string;
    avatarBg: string;
    health: ClientHealth;
    propertyCount: number;
  }>;
  openWorkOrders: number;
  urgentAlerts: number;
  manager: { name: string; initials: string };
  // Properties shaped for the command palette (PropertyListItem).
  searchProperties: PropertyListItem[];
  // Owner accounts the manager has been granted access to. Not currently
  // rendered anywhere — the account-switcher UI was removed; this is kept
  // in case a future account-management surface needs it. Empty array for
  // non-managers (owners are never managers).
  managedAccounts: { clerkOrgId: string; name: string; level: "view" | "full" }[];
  // Whether the user has manager mode on — drives the My portfolio ⇄ Pro pill in the header.
  isManager: boolean;
  // Notifications for the manager's current org (ctx.orgId) — seeds the header bell
  // panel. Without this the Pro panel would always render empty (owner shell fetches
  // these in app/(shell)/layout.tsx; the Pro shell must do the same).
  notifications: Notification[];
};

// ---------------------------------------------------------------------------
// Public queries
// ---------------------------------------------------------------------------

export async function getProDashboardData(): Promise<ProDashboardData> {
  const authCtx = await requireCtx();
  const ctx = await loadProContext();
  const monthStart = currentMonthStartUtc();

  const rollups = ctx.clients
    .map((client) => buildClientRollup(client, ctx, monthStart))
    .sort((a, b) => b.totalValue - a.totalValue);

  // Prepend the manager's own book (his directly-held properties) so it shows
  // first in the clients table and its alerts flow into the dashboard feed.
  // Always included — new users see an empty "My Portfolio" card.
  const ownRollup = buildOwnPortfolioRollup(ctx, monthStart, authCtx.userId);
  rollups.unshift(ownRollup);

  // Augment rollups with portfolio org data (member/pending counts, confirmation status)
  // for clients that were created via manager-led onboarding (have client.orgId set).
  await augmentRollupsWithOrgData(authCtx.userId, rollups);

  const allAlerts = rollups
    .flatMap((r) => r.alerts)
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity));

  const activeProperties = ctx.properties.filter(isActiveProperty);
  const totalValue = sumPropertyValues(activeProperties);
  const rentedCount = activeProperties.filter(
    (p) => p.status === "Rented",
  ).length;
  const vacantCount = activeProperties.filter(
    (p) => p.status === "Vacant",
  ).length;
  const occupancyRate =
    activeProperties.length === 0
      ? 0
      : Math.round((rentedCount / activeProperties.length) * 100);

  const expected = sumExpectedRent(ctx.leases, monthStart);
  const collected = sumCollectedRent(ctx.payments, monthStart);
  const noiMonthly = computeNoiMonthly(
    activeProperties,
    ctx.leases,
    ctx.maintenance,
    monthStart,
  );

  const workOrderRows = ctx.maintenance
    .map((m) => buildWorkOrderRow(m, ctx))
    .filter((r): r is ProWorkOrderRow => r !== null)
    .sort(
      (a, b) =>
        severityRankMaintenance(a.severity) -
          severityRankMaintenance(b.severity) || b.createdAt - a.createdAt,
    );

  return {
    kpis: {
      totalValue,
      totalValueFormatted: formatCurrency(totalValue),
      propertyCount: activeProperties.length,
      clientCount: ctx.clients.length,
      occupancyRate,
      monthlyExpected: expected,
      monthlyCollected: collected,
      collectionRate: expected === 0 ? 0 : Math.round((collected / expected) * 100),
      noiMonthly,
      monthLabel: monthLabelUtc(monthStart),
    },
    alerts: allAlerts,
    clients: rollups,
    properties: ctx.properties
      .map((p) => buildPropertyRow(p, ctx))
      .filter((r): r is ProPropertyRow => r !== null),
    workOrders: {
      counts: countWorkOrders(ctx.maintenance),
      queue: workOrderRows.filter((r) => r.status !== "Resolved" && r.status !== "Cancelled"),
    },
    financials: {
      expected,
      collected,
      outstanding: Math.max(0, expected - collected),
      series: buildCashflowSeries(ctx.payments, monthStart, 6),
    },
    occupancy: {
      rented: rentedCount,
      vacant: vacantCount,
      occupancyRate,
      leasesExpiring90d: countLeasesExpiring(ctx.leases, 90),
    },
    compliance: buildComplianceRows(ctx),
    activity: buildActivityFeed(ctx, 20),
  };
}

// One owner's band in the grouped Properties register. Every stat here is
// lifted straight from that owner's ClientRollup (the same rollup the
// dashboard and the owner's /pro/clients/[id] portfolio page render), so a
// band and that portfolio page can never show different numbers.
export type ProOwnerGroup = {
  ownerId: string; // client.id, or OWN_PORTFOLIO_ID for the manager's own book
  ownerName: string; // "My Portfolio" | client.name
  isOwnPortfolio: boolean;
  initials: string;
  avatarBg: string;
  propertyCount: number; // rows in this band (all of the owner's properties)
  totalValueFormatted: string;
  rentedCount: number;
  vacantCount: number;
  occupancyRate: number;
  avgProgress: number;
  alertCount: number; // actionable alerts only (urgent + warning)
  properties: ProPropertyRow[];
};

// Cross-client Properties register: the full asset list plus an owner-grouped
// view of the same rows, the small client list needed to power the flat-mode
// filter, and book-level summary stats. Reuses the same property row + value
// helpers as the dashboard so the numbers match everywhere.
export type ProPropertiesData = {
  // The register grouped by owner: My Portfolio first, then each client that
  // holds at least one property, ordered by portfolio value descending.
  groups: ProOwnerGroup[];
  // The flat list of every row (all owners), retained for the "Flat list"
  // view mode and its cross-owner bulk actions (assign to client, CSV import).
  properties: ProPropertyRow[];
  clients: Array<{ id: string; name: string }>;
  summary: {
    totalCount: number;
    activeCount: number;
    totalValueFormatted: string;
    rented: number;
    vacant: number;
  };
};

export async function getProPropertiesData(): Promise<ProPropertiesData> {
  const authCtx = await requireCtx();
  const ctx = await loadProContext();
  const monthStart = currentMonthStartUtc();

  const properties = ctx.properties
    .map((p) => buildPropertyRow(p, ctx))
    .filter((r): r is ProPropertyRow => r !== null)
    .sort((a, b) => b.value - a.value);

  const activeProperties = ctx.properties.filter(isActiveProperty);
  const totalValue = sumPropertyValues(activeProperties);

  // Clients that actually own at least one property, for the flat-mode filter.
  const clients = ctx.clients
    .map((client) => ({ id: client.id, name: client.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // --- Group the register by owner -----------------------------------------
  // Roll up each owner once. Client rollups key on client.id; the manager's
  // own book keys on OWN_PORTFOLIO_ID. These are the exact rollups the client
  // portfolio pages read, so band stats and portfolio stats always agree.
  const rollupByOwnerId = new Map<string, ClientRollup>();
  for (const client of ctx.clients) {
    rollupByOwnerId.set(client.id, buildClientRollup(client, ctx, monthStart));
  }
  const ownRollup = buildOwnPortfolioRollup(ctx, monthStart, authCtx.userId);
  rollupByOwnerId.set(OWN_PORTFOLIO_ID, ownRollup);

  // Bucket the already-built rows under their owner so the union of every band
  // equals the flat list exactly — no row is dropped or duplicated. Rows for
  // the manager's own book carry an empty clientId (buildPropertyRow), which
  // maps to the synthetic My Portfolio owner.
  const rowsByOwnerId = new Map<string, ProPropertyRow[]>();
  for (const row of properties) {
    const ownerId = row.clientId === "" ? OWN_PORTFOLIO_ID : row.clientId;
    const bucket = rowsByOwnerId.get(ownerId) ?? [];
    bucket.push(row);
    rowsByOwnerId.set(ownerId, bucket);
  }

  // Assemble one band from a rollup + its bucketed rows. alertCount counts only
  // actionable severities (urgent + warning) so an owner with nothing but
  // "rent pending" info notes doesn't raise a scary amber chip.
  const toGroup = (rollup: ClientRollup): ProOwnerGroup => {
    const ownerId = rollup.client.id;
    const ownerRows = rowsByOwnerId.get(ownerId) ?? [];
    return {
      ownerId,
      ownerName: rollup.client.name,
      isOwnPortfolio: ownerId === OWN_PORTFOLIO_ID,
      initials: rollup.client.initials,
      avatarBg: rollup.client.avatarBg,
      propertyCount: ownerRows.length,
      totalValueFormatted: rollup.totalValueFormatted,
      rentedCount: rollup.rentedCount,
      vacantCount: rollup.vacantCount,
      occupancyRate: rollup.occupancyRate,
      avgProgress: rollup.avgProgress,
      alertCount: rollup.alerts.filter(
        (a) => a.severity === "urgent" || a.severity === "warning",
      ).length,
      properties: ownerRows,
    };
  };

  // My Portfolio pins first, even with zero properties (a new manager sees an
  // empty band inviting a first property). Client bands follow only when they
  // actually hold a property, ordered by portfolio value descending to match
  // the dashboard's client table.
  const clientGroups = ctx.clients
    .filter((client) => (rowsByOwnerId.get(client.id) ?? []).length > 0)
    .map((client) => rollupByOwnerId.get(client.id)!)
    .sort((a, b) => b.totalValue - a.totalValue)
    .map(toGroup);

  const groups: ProOwnerGroup[] = [toGroup(ownRollup), ...clientGroups];

  return {
    groups,
    properties,
    clients,
    summary: {
      totalCount: properties.length,
      activeCount: activeProperties.length,
      totalValueFormatted: formatCurrency(totalValue),
      rented: activeProperties.filter((p) => p.status === "Rented").length,
      vacant: activeProperties.filter((p) => p.status === "Vacant").length,
    },
  };
}

// ---------------------------------------------------------------------------
// Compliance page (/pro/compliance)
//
// A read-only oversight surface that brings together three real record
// types the dashboard touches but never fully shows:
//   - Certifications — the expiry timeline (already shaped by
//     buildComplianceRows; we bucket on its server-computed daysLeft).
//   - SafetyRisks — risks per property, ranked by severity. Both open and
//     resolved risks are returned; the page's "Show resolved" toggle reveals
//     the resolved ones read-only, and the summary counts the open/resolved
//     split.
//   - Inspections — the recent inspection log, newest first.
// ---------------------------------------------------------------------------

// One open safety risk, joined to its property and owning client.
export type ProSafetyRiskRow = {
  id: string;
  severity: SafetyRiskSeverity;
  title: string;
  description: string;
  status: SafetyRiskStatus;
  resolvedAt?: number;
  createdAt: number;
  propertyName: string;
  clientName: string;
  clientId: string;
};

// One inspection record, joined to its property and owning client. The
// inspector name is intentionally omitted: inspectorId does not reliably
// resolve through professionalById, so we keep the join out rather than
// render a "—" placeholder.
export type ProInspectionRow = {
  id: string;
  type: Inspection["type"];
  status: Inspection["status"];
  issues: number;
  inspectedAt: number;
  propertyName: string;
  clientName: string;
  clientId: string;
};

export type CompliancePageData = {
  certifications: ProComplianceRow[];
  safetyRisks: ProSafetyRiskRow[];
  inspections: ProInspectionRow[];
  // The owning clients, for the filter chip row.
  clients: Array<{ id: string; name: string }>;
  summary: {
    expiredCount: number;
    expiringCount: number;
    validCount: number;
    openRiskCount: number;
    resolvedRiskCount: number;
    highRiskCount: number;
    failedInspections: number;
  };
};

// Certification/safety-risk/inspection/summary surfaces derived from any
// ProContext slice. Shared by the global Compliance page (full ctx) and each
// client's Compliance tab (client-scoped slice) so the two can never drift.
// Mirrors deriveRentSurfaces / deriveWorkOrderSurfaces. The lookup maps on `ctx`
// (propertyById/clientById) stay whole even on a scoped slice — only the row
// arrays are filtered — so name resolution still works.
type ComplianceSurfaces = {
  certifications: ProComplianceRow[];
  safetyRisks: ProSafetyRiskRow[];
  inspections: ProInspectionRow[];
  summary: CompliancePageData["summary"];
};

function deriveComplianceSurfaces(ctx: ProContext): ComplianceSurfaces {
  // Certifications — already joined + sorted by expiry in buildComplianceRows.
  const certifications = buildComplianceRows(ctx);

  // Safety risks — join each to its property/client, then sort by severity
  // (Critical first), breaking ties with the most recently raised first.
  const allSafetyRiskRows: ProSafetyRiskRow[] = ctx.safetyRisks
    .map((risk) => {
      const property = ctx.propertyById.get(risk.propertyId);
      const client = property?.clientId
        ? ctx.clientById.get(property.clientId)
        : undefined;
      return {
        id: risk.id,
        severity: risk.severity,
        title: risk.title,
        description: risk.description,
        status: risk.status,
        resolvedAt: risk.resolvedAt,
        createdAt: risk.createdAt,
        propertyName: property?.name ?? "Unknown property",
        clientName: client?.name ?? "Unassigned",
        clientId: client?.id ?? "",
      };
    })
    .sort(
      (a, b) =>
        safetyRiskSeverityRank(a.severity) -
          safetyRiskSeverityRank(b.severity) || b.createdAt - a.createdAt,
    );

  // We return BOTH open and resolved risks so the compliance surface's "Show
  // resolved" toggle can reveal the resolved ones (read-only) without a second
  // round-trip. The card defaults to open-only; the page filters this list
  // client-side. `openRisks` drives the summary counts so the KPI strip still
  // reports the open/resolved split correctly.
  const openRisks = allSafetyRiskRows.filter((r) => r.status === "Open");
  const safetyRisks = allSafetyRiskRows;

  // Inspections — join each to its property/client, newest inspection first.
  const inspections: ProInspectionRow[] = ctx.inspections
    .map((inspection) => {
      const property = ctx.propertyById.get(inspection.propertyId);
      const client = property?.clientId
        ? ctx.clientById.get(property.clientId)
        : undefined;
      return {
        id: inspection.id,
        type: inspection.type,
        status: inspection.status,
        issues: inspection.issues,
        inspectedAt: inspection.inspectedAt,
        propertyName: property?.name ?? "Unknown property",
        clientName: client?.name ?? "Unassigned",
        clientId: client?.id ?? "",
      };
    })
    .sort((a, b) => b.inspectedAt - a.inspectedAt);

  return {
    certifications,
    safetyRisks,
    inspections,
    summary: {
      // The three cert-status counts mirror the colored status pills and sum to
      // the total, so the KPI strip always reconciles with what the manager
      // sees in the timeline (a cert flagged "Expiring" counts here even once
      // its expiry date has slipped past). This STATUS partition is deliberately
      // NOT the same as the date-based daysLeft horizon buckets — do not "fix"
      // that gap.
      expiredCount: certifications.filter((c) => c.status === "Expired").length,
      expiringCount: certifications.filter((c) => c.status === "Expiring")
        .length,
      validCount: certifications.filter((c) => c.status === "Valid").length,
      openRiskCount: openRisks.length,
      resolvedRiskCount: allSafetyRiskRows.length - openRisks.length,
      highRiskCount: openRisks.filter(
        (r) => r.severity === "Critical" || r.severity === "High",
      ).length,
      failedInspections: inspections.filter((i) => i.status === "Failed")
        .length,
    },
  };
}

export async function getCompliancePageData(): Promise<CompliancePageData> {
  const ctx = await loadProContext();

  const { certifications, safetyRisks, inspections, summary } =
    deriveComplianceSurfaces(ctx);

  // The clients that actually own at least one of these records, so the
  // filter chips never offer a client with nothing to show. This is
  // global-page-only chrome (the single-client tab has no chip row), so it
  // stays out of the shared helper.
  const clientIdsWithRecords = new Set<string>();
  for (const cert of certifications) clientIdsWithRecords.add(cert.clientId);
  for (const risk of safetyRisks) clientIdsWithRecords.add(risk.clientId);
  for (const inspection of inspections) {
    clientIdsWithRecords.add(inspection.clientId);
  }
  const clients = ctx.clients
    .filter((client) => clientIdsWithRecords.has(client.id))
    .map((client) => ({ id: client.id, name: client.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { certifications, safetyRisks, inspections, clients, summary };
}

// Maps an audit-log `entity` string onto a feed category. The three that line up
// with synthesized events share their icon/color; everything else (property edits,
// photos, documents, co-owners, change requests …) falls into "update".
function categoryForEntity(entity: string): ProActivityEvent["category"] {
  switch (entity) {
    case "payment":
      return "payment";
    case "workOrder":
      return "maintenance";
    case "lease":
      return "lease";
    default:
      return "update";
  }
}

export async function getClientPortfolioData(
  clientId: string,
): Promise<ClientPortfolioData | null> {
  const ctx = await loadProContext();
  const authCtx = await requireCtx();
  const monthStart = currentMonthStartUtc();

  // Resolve which properties this view owns. The synthetic own-portfolio id
  // maps to the manager's unassigned properties; every other id is a persisted
  // client matched on Property.clientId.
  let client: Client;
  let belongsToView: (p: Property) => boolean;

  if (clientId === OWN_PORTFOLIO_ID) {
    const ownRollup = buildOwnPortfolioRollup(ctx, monthStart, authCtx.userId);
    client = ownRollup.client;
    belongsToView = (p) => !p.clientId;
  } else {
    const found = ctx.clientById.get(clientId);
    if (!found) return null;
    client = found;
    belongsToView = (p) => p.clientId === clientId;
  }

  const rollup = buildRollupFromProperties(
    client,
    ctx.properties.filter(belongsToView),
    ctx,
    monthStart,
  );

  const clientPropertyIds = new Set(
    ctx.properties.filter(belongsToView).map((p) => p.id),
  );

  const scoped: ProContext = {
    ...ctx,
    properties: ctx.properties.filter((p) => clientPropertyIds.has(p.id)),
    leases: ctx.leases.filter((l) => clientPropertyIds.has(l.propertyId)),
    maintenance: ctx.maintenance.filter((m) =>
      clientPropertyIds.has(m.propertyId),
    ),
    certifications: ctx.certifications.filter((c) =>
      clientPropertyIds.has(c.propertyId),
    ),
    payments: ctx.payments.filter((pay) => {
      const propertyId = pay.leaseId
        ? ctx.propertyIdByLeaseId.get(pay.leaseId)
        : undefined;
      return propertyId !== undefined && clientPropertyIds.has(propertyId);
    }),
    // Safety risks + inspections were not scoped before — the compliance
    // workspace needs all three entity families, not just certs.
    safetyRisks: ctx.safetyRisks.filter((r) =>
      clientPropertyIds.has(r.propertyId),
    ),
    inspections: ctx.inspections.filter((i) =>
      clientPropertyIds.has(i.propertyId),
    ),
  };

  // Resolve the Clerk org id behind this client (for the "View as client"
  // org switch). Null for the own-portfolio view and clients with no org.
  let viewAsClerkOrgId: string | null = null;
  if (client.orgId) {
    viewAsClerkOrgId = await getClerkOrgIdForOrg(client.orgId);
  }

  // Same rent-roll/overdue/expiring/collection-rate derivation the global
  // /pro/rent page uses, over this client's scoped slice.
  const rentSurfaces = deriveRentSurfaces(scoped, monthStart);

  // Same work-order rows/counts/open-cost/vendor derivation the global
  // /pro/work-orders page uses, over this client's scoped slice.
  const workOrderSurfaces = deriveWorkOrderSurfaces(scoped);

  // Same certification/safety-risk/inspection/summary derivation the global
  // /pro/compliance page uses, over this client's scoped slice.
  const complianceSurfaces = deriveComplianceSurfaces(scoped);

  // Activity timeline = the real audit log (who/what/when) MERGED with the
  // synthesized payment/work-order/lease events. Two complementary sources:
  //   - audit rows  → actions taken (manager on-behalf edits, change requests …)
  //   - synthesized → operational reality derived from records (covers seed data
  //                   and anything not written through the audited path)
  // Scope org-first (client.orgId), else by the client's property ids.
  const auditRows = await listActivitiesForScope(
    {
      orgId: client.orgId ?? undefined,
      propertyIds: [...clientPropertyIds],
    },
    50,
  );
  const auditEvents: ProActivityEvent[] = auditRows.map((row) => ({
    id: `audit-${row.id}`,
    category: categoryForEntity(row.entity),
    description: row.description,
    clientName: client.name,
    // Only name a property we can resolve in this client's slice; never invent one.
    propertyName: row.propertyId
      ? (scoped.propertyById.get(row.propertyId)?.name ?? "")
      : "",
    timestamp: row.createdAt,
    // "You" only when the actor is the signed-in manager. Otherwise omit — the
    // audit log stores a raw Clerk id, and we never fabricate a display name.
    actor: row.userId === authCtx.userId ? "You" : undefined,
    source: "audit",
  }));
  const recordEvents: ProActivityEvent[] = buildActivityFeed(scoped, 50).map(
    (event) => ({ ...event, source: "record" as const }),
  );
  // Merge, newest-first, cap. No fuzzy dedup in v1 — the two sources carry
  // distinct `source`/icons and read as complementary.
  const activity = [...auditEvents, ...recordEvents]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 50);

  return {
    rollup,
    properties: scoped.properties
      .map((p) => buildPropertyRow(p, ctx))
      .filter((r): r is ProPropertyRow => r !== null),
    workOrders: workOrderSurfaces.rows,
    workOrderCounts: workOrderSurfaces.counts,
    totalOpenWorkOrderCost: workOrderSurfaces.totalOpenCost,
    workOrderVendors: workOrderSurfaces.vendors,
    // `compliance` stays the certification list (byte-identical to
    // buildComplianceRows(scoped)); the new fields add the summary + the
    // safety-risk and inspection registers for the same client.
    compliance: complianceSurfaces.certifications,
    complianceSummary: complianceSurfaces.summary,
    safetyRisks: complianceSurfaces.safetyRisks,
    inspections: complianceSurfaces.inspections,
    activity,
    financialSeries: buildCashflowSeries(scoped.payments, monthStart, 6),
    rentRoll: rentSurfaces.rentRoll,
    overdue: rentSurfaces.overdue,
    expiring: rentSurfaces.expiring,
    collectionRate: rentSurfaces.collectionRate,
    leasesExpiring90d: countLeasesExpiring(scoped.leases, 90),
    ownerStatement: buildOwnerStatement(client, scoped, monthStart),
    viewAsClerkOrgId,
  };
}

// Authz + resolution for the "View as client" preview route — the query
// (including its requireCtx guard) lives in lib/services/pro-dashboard.ts.
export { resolveClientOrgForManager } from "@/lib/services/pro-dashboard";

// Rent-roll, overdue, and expiring-lease surfaces derived from any ProContext
// slice. Shared by the global Rent & Collections page (full ctx) and each
// client's Financials tab (client-scoped slice) so the two can never drift.
// The lookup maps on `ctx` (propertyById/clientById/tenantById) stay whole even
// on a scoped slice — only the row arrays are filtered — so name resolution
// still works.
type RentSurfaces = {
  expected: number;
  collected: number;
  outstanding: number;
  collectionRate: number;
  rentRoll: RentRollRow[];
  overdue: RentRollRow[];
  expiring: RentPageData["expiring"];
};

function deriveRentSurfaces(
  ctx: ProContext,
  monthStart: number,
): RentSurfaces {
  const rentRoll = ctx.leases
    .filter((l) => l.stage === "Signed" && l.endDate >= monthStart)
    .map((lease) => buildRentRollRow(lease, ctx, monthStart))
    .filter((r): r is RentRollRow => r !== null)
    .sort((a, b) => rentStatusRank(a.rentStatus) - rentStatusRank(b.rentStatus));

  const expected = sumExpectedRent(ctx.leases, monthStart);
  const collected = sumCollectedRent(ctx.payments, monthStart);

  const now = Date.now();
  const expiring = ctx.leases
    .filter(
      (l) =>
        l.stage === "Signed" &&
        l.endDate >= now &&
        l.endDate <= now + 90 * DAY,
    )
    .map((l) => {
      const property = ctx.propertyById.get(l.propertyId);
      const client = property?.clientId
        ? ctx.clientById.get(property.clientId)
        : undefined;
      const tenant = l.tenantId ? ctx.tenantById.get(l.tenantId) : undefined;
      // Same projection the renewLease action applies: advance the end
      // date by one full lease term. addUtcMonths clamps the day into the
      // target month so the preview can't drift from what the action saves.
      const projectedEndDate = addUtcMonths(l.endDate, l.termMonths);
      return {
        leaseId: l.id,
        propertyId: l.propertyId,
        propertyName: property?.name ?? l.propertyId,
        clientName: client?.name ?? "—",
        tenantName: tenant?.name ?? "—",
        endDate: l.endDate,
        monthlyRent: l.monthlyRent,
        renewalStatus: l.renewalStatus,
        daysLeft: Math.max(0, Math.ceil((l.endDate - now) / DAY)),
        termMonths: l.termMonths,
        projectedEndDate,
      };
    })
    .sort((a, b) => a.endDate - b.endDate);

  return {
    expected,
    collected,
    outstanding: Math.max(0, expected - collected),
    collectionRate:
      expected === 0 ? 0 : Math.round((collected / expected) * 100),
    rentRoll,
    overdue: rentRoll.filter(
      (r) => r.rentStatus === "Overdue" || r.rentStatus === "Unpaid",
    ),
    expiring,
  };
}

export async function getRentPageData(): Promise<RentPageData> {
  const ctx = await loadProContext();
  const monthStart = currentMonthStartUtc();

  const surfaces = deriveRentSurfaces(ctx, monthStart);

  const activeProperties = ctx.properties.filter(isActiveProperty);
  const rented = activeProperties.filter((p) => p.status === "Rented").length;
  const vacant = activeProperties.filter((p) => p.status === "Vacant").length;

  return {
    monthLabel: monthLabelUtc(monthStart),
    expected: surfaces.expected,
    collected: surfaces.collected,
    outstanding: surfaces.outstanding,
    collectionRate: surfaces.collectionRate,
    rentRoll: surfaces.rentRoll,
    overdue: surfaces.overdue,
    expiring: surfaces.expiring,
    occupancy: {
      rented,
      vacant,
      occupancyRate:
        activeProperties.length === 0
          ? 0
          : Math.round((rented / activeProperties.length) * 100),
    },
    clients: ctx.clients.map((c) => ({ id: c.id, name: c.name })),
    series: buildCashflowSeries(ctx.payments, monthStart, 6),
  };
}

// Work-order surfaces (sorted rows, status counts, open-cost total, and the
// trade-vendor directory) derived from any ProContext slice. Shared by the
// global Work Orders page (full ctx) and each client's Work Orders tab
// (client-scoped slice) so the two can never drift. Mirrors deriveRentSurfaces.
// The lookup maps on `ctx` (propertyById/clientById/professionalById) stay whole
// even on a scoped slice — only the row arrays are filtered — so name and vendor
// resolution still works.
type WorkOrderSurfaces = {
  rows: ProWorkOrderRow[];
  counts: {
    open: number;
    inProgress: number;
    resolved: number;
    urgentOpen: number;
  };
  totalOpenCost: number;
  vendors: WorkOrdersPageData["vendors"];
};

function deriveWorkOrderSurfaces(ctx: ProContext): WorkOrderSurfaces {
  const rows = ctx.maintenance
    .map((m) => buildWorkOrderRow(m, ctx))
    .filter((r): r is ProWorkOrderRow => r !== null)
    .sort(
      (a, b) =>
        statusRankMaintenance(a.status) - statusRankMaintenance(b.status) ||
        severityRankMaintenance(a.severity) -
          severityRankMaintenance(b.severity) ||
        b.createdAt - a.createdAt,
    );

  const counts = countWorkOrders(ctx.maintenance);
  const urgentOpen = ctx.maintenance.filter(
    (m) =>
      m.status !== "Resolved" &&
      m.status !== "Cancelled" &&
      (m.severity === "Emergency" || m.severity === "Urgent"),
  ).length;

  const totalOpenCost = ctx.maintenance
    .filter((m) => m.status !== "Resolved" && m.status !== "Cancelled")
    .reduce((sum, m) => sum + (m.cost ?? 0), 0);

  // Trade categories that can take a work order.
  const tradeCategories: Professional["category"][] = [
    "Maintenance",
    "Electrician",
    "Plumber",
    "Inspector",
  ];

  const vendors = ctx.professionals
    .filter((p) => tradeCategories.includes(p.category))
    .map((p) => ({
      id: p.id,
      name: p.name,
      company: p.company,
      category: p.category,
      available: p.available,
      rating: p.rating,
    }));

  return { rows, counts: { ...counts, urgentOpen }, totalOpenCost, vendors };
}

export async function getWorkOrdersPageData(): Promise<WorkOrdersPageData> {
  const ctx = await loadProContext();

  const surfaces = deriveWorkOrderSurfaces(ctx);

  return {
    rows: surfaces.rows,
    counts: surfaces.counts,
    totalOpenCost: surfaces.totalOpenCost,
    vendors: surfaces.vendors,
    // Property picker for the New Work Order modal — global-page-only, since
    // the client tab does not create orders inline. Stays out of the shared helper.
    properties: ctx.properties.filter(isActiveProperty).map((p) => ({
      id: p.id,
      name: p.name,
      clientName: p.clientId
        ? (ctx.clientById.get(p.clientId)?.name ?? "—")
        : "—",
    })),
  };
}

// Archived-clients list for the clients index page — the query (including its
// requireCtx guard) lives in lib/services/pro-dashboard.ts.
export { getInactiveClients } from "@/lib/services/pro-dashboard";

export async function getProShellData(): Promise<ProShellData> {
  const authCtx = await requireCtx();
  const [ctx, profile, rawAccounts, isManager, notifications] = await Promise.all([
    loadProContext(),
    getUserProfile(authCtx, authCtx.userId),
    listManagedAccounts(authCtx),
    getIsManager(authCtx),
    listNotifications(authCtx),
  ]);
  const monthStart = currentMonthStartUtc();

  const rollups = ctx.clients
    .map((client) => buildClientRollup(client, ctx, monthStart))
    .sort((a, b) => b.totalValue - a.totalValue);

  // Include the own-portfolio rollup so the workspace tab provider can open it
  // as a tab and the sidebar lists it next to the managed clients.
  // Always included — new users see an empty "My Portfolio" card.
  const ownRollup = buildOwnPortfolioRollup(ctx, monthStart, authCtx.userId);
  rollups.unshift(ownRollup);

  const managerName = profile
    ? `${profile.firstName} ${profile.lastName}`.trim()
    : "Manager";
  const managerInitials = profile
    ? `${profile.firstName[0] ?? ""}${profile.lastName[0] ?? ""}`.toUpperCase()
    : "M";

  return {
    clients: rollups.map((r) => ({
      id: r.client.id,
      name: r.client.name,
      initials: r.client.initials,
      avatarBg: r.client.avatarBg,
      health: r.health,
      propertyCount: r.propertyCount,
    })),
    openWorkOrders: ctx.maintenance.filter(
      (m) => m.status !== "Resolved" && m.status !== "Cancelled",
    ).length,
    urgentAlerts: rollups
      .flatMap((r) => r.alerts)
      .filter((a) => a.severity === "urgent").length,
    manager: { name: managerName, initials: managerInitials },
    searchProperties: ctx.properties.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      type: p.type,
      province: p.province,
      status: p.status,
      totalArea: p.totalArea,
      title: p.title,
      buy: p.buyNumeric ? formatCurrency(p.buyNumeric) : "—",
      buyNumeric: p.buyNumeric,
      isArchived: p.isArchived,
      progress: ctx.progressByPropertyId.get(p.id) ?? 0,
      orgId: p.orgId,
    })),
    managedAccounts: rawAccounts.map((a) => ({
      clerkOrgId: a.clerkOrgId,
      name: a.name,
      level: a.level,
    })),
    isManager,
    notifications,
  };
}

// ---------------------------------------------------------------------------
// Agent Hub (/pro/agents)
// ---------------------------------------------------------------------------

export type AgentHubRun = AgentRun & {
  derivedStatus: AgentRunStatus;
  linkedMessage?: AiMessage;
};

export type AgentHubData = {
  runs: AgentHubRun[];
};

export async function getAgentHubData(): Promise<AgentHubData> {
  const authCtx = await requireCtx();
  const runs = await agentRunsDb.list(getFsUserId(authCtx.userId));

  const enriched = await Promise.all(
    runs.map(async (run) => {
      if (!run.proposalMessageId) {
        return { ...run, derivedStatus: run.status } as AgentHubRun;
      }
      const msg = await getAiMessage(authCtx, run.proposalMessageId);
      const derivedStatus = deriveRunStatus(run, msg);
      return { ...run, derivedStatus, linkedMessage: msg ?? undefined } as AgentHubRun;
    }),
  );

  return { runs: enriched };
}

// ---------------------------------------------------------------------------
// Client portfolios — manager-led onboarding handoffs (client_handoffs)
// ---------------------------------------------------------------------------

// The list queries (including their requireCtx guards) live in
// lib/services/pro-dashboard.ts; their row types are re-exported here so
// existing importers keep working unchanged.
export type { PortfolioRow, HandoffRow } from "@/lib/services/pro-dashboard";
export {
  listClientHandoffs,
  listClientPortfolios,
} from "@/lib/services/pro-dashboard";

// Re-export so drawer consumers can import types from one place.
export type { PortfolioMember, PortfolioInvitee };

// Server-side drawer data — delegates to the service (auth + org guard happen there).
export async function getPortfolioMembersQuery(
  orgId: string,
): Promise<{ members: PortfolioMember[]; invitees: PortfolioInvitee[] }> {
  const authCtx = await requireCtx();
  return svcListPortfolioMembers(authCtx, orgId);
}
