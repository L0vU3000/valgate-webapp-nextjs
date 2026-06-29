import "server-only";
import * as agentRunsDb from "@/lib/data/db/agent-runs";
import { getAiMessage } from "@/lib/services/ai-messages";
import * as clientsDb from "@/lib/data/db/clients";
import { listProperties } from "@/lib/services/properties";
import { listLeases } from "@/lib/services/leases";
import { listPayments } from "@/lib/services/payments";
import { listTenants } from "@/lib/services/tenants";
import { listMaintenanceItems } from "@/lib/services/maintenance-items";
import { listCertifications } from "@/lib/services/certifications";
import { listInspections } from "@/lib/services/inspections";
import { listSafetyRisks } from "@/lib/services/safety-risks";
import { listPropertyValuations } from "@/lib/services/property-valuations";
import { listProfessionals } from "@/lib/services/professionals";
import { listOwnershipRecords } from "@/lib/services/ownership-records";
import { listCoOwners } from "@/lib/services/co-owners";
import { listOwnershipDocuments } from "@/lib/services/ownership-documents";
import { listEmergencyContacts } from "@/lib/services/emergency-contacts";
import { listEstateAssignments } from "@/lib/services/estate-assignments";
import { listDocuments } from "@/lib/services/documents";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import { requireCtx } from "@/lib/auth/ctx";
import { listManagedAccounts, getIsManager } from "@/lib/services/managers";
import { OWN_PORTFOLIO_ID } from "@/app/(pro)/pro/_components/pro-shell-types";
import {
  computeProgress,
  type ProgressContext,
} from "@/lib/data/derivations/progress";
import { formatCurrency, formatCurrencyFull, addUtcMonths } from "@/lib/format";
import { getUserProfile } from "@/lib/services/user-profiles";
import type { Client, ClientType } from "@/lib/data/types/client";
import type {
  Property,
  PropertyStatus,
  PropertyListItem,
} from "@/lib/data/types/property";
import type { Lease } from "@/lib/data/types/lease";
import type { Payment } from "@/lib/data/types/payment";
import type { Tenant } from "@/lib/data/types/tenant";
import type {
  MaintenanceItem,
  MaintenanceStatus,
} from "@/lib/data/types/maintenance-item";
import type { Certification } from "@/lib/data/types/certification";
import type {
  SafetyRisk,
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
// Derivation conventions (documented per helper below):
// - "active" property = not Sold, not Archived (same as computeStats).
// - Money month = current UTC calendar month (same as computeKpis).
// - Owner statements cover the previous full calendar month.
// ---------------------------------------------------------------------------

const DAY = 24 * 60 * 60 * 1000;
const INACTIVE_STATUSES: PropertyStatus[] = ["Sold", "Archived"];

export type AlertSeverity = "urgent" | "warning" | "info";
export type AlertCategory =
  | "payment"
  | "lease"
  | "compliance"
  | "risk"
  | "workorder"
  | "data";

export type ProAlert = {
  id: string;
  severity: AlertSeverity;
  category: AlertCategory;
  label: string;
  clientId: string;
  clientName: string;
  propertyId?: string;
};

export type ClientHealth = "healthy" | "needs-attention" | "critical";

// Re-exported so server-side callers can still import from here.
export { OWN_PORTFOLIO_ID };

export type ClientRollup = {
  client: Client;
  propertyCount: number;
  totalValue: number;
  totalValueFormatted: string;
  rentedCount: number;
  vacantCount: number;
  occupancyRate: number;
  monthlyExpected: number;
  monthlyCollected: number;
  outstanding: number;
  collectionRate: number;
  noiMonthly: number;
  avgProgress: number;
  alerts: ProAlert[];
  health: ClientHealth;
  lastActivityAt: number;
};

export type ProPropertyRow = {
  id: string;
  name: string;
  addressLabel: string;
  type: Property["type"];
  status: PropertyStatus;
  value: number;
  valueFormatted: string;
  progress: number;
  updatedAt: number;
  clientId: string;
  clientName: string;
  clientInitials: string;
  clientAvatarBg: string;
};

export type ProWorkOrderRow = {
  id: string;
  title: string;
  severity: MaintenanceItem["severity"];
  status: MaintenanceStatus;
  cost?: number;
  createdAt: number;
  propertyId: string;
  propertyName: string;
  clientId: string;
  clientName: string;
  vendorId?: string;
  vendorName?: string;
  vendorCategory?: Professional["category"];
};

export type ProComplianceRow = {
  id: string;
  name: Certification["name"];
  status: Certification["status"];
  expiresAt: number;
  dueLabel: string;
  // Whole days until expiry, computed server-side at request time (the
  // route is force-dynamic). Negative = already overdue. The compliance
  // timeline buckets on this; the dashboard's ComplianceTable ignores it.
  daysLeft: number;
  propertyId: string;
  propertyName: string;
  clientId: string;
  clientName: string;
  clientInitials: string;
  clientAvatarBg: string;
};

export type ProActivityEvent = {
  id: string;
  category: "payment" | "maintenance" | "lease";
  description: string;
  clientName: string;
  propertyName: string;
  timestamp: number;
};

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

export type CashflowPoint = { month: string; collected: number };

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

export type RentStatus = "Paid" | "Pending" | "Overdue" | "Unpaid";

export type RentRollRow = {
  leaseId: string;
  propertyId: string;
  propertyName: string;
  clientId: string;
  clientName: string;
  tenantName: string;
  unit: string;
  monthlyRent: number;
  leaseEnd: number;
  renewalStatus?: string;
  rentStatus: RentStatus;
  paymentId?: string;
  lastPaidDate?: number;
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

export type OwnerStatement = {
  monthLabel: string;
  periodStart: number;
  periodEnd: number;
  rentCollected: number;
  otherIncome: number;
  managementFeePct: number;
  managementFee: number;
  taxAccrual: number;
  insuranceAccrual: number;
  maintenanceCosts: number;
  totalExpenses: number;
  netOperatingIncome: number;
  occupancyRate: number;
  workOrdersOpenedInMonth: number;
  workOrdersOpenToday: number;
  upcomingLeaseExpirations: Array<{
    propertyName: string;
    tenantName: string;
    endDate: number;
    monthlyRent: number;
  }>;
  upcomingCertExpirations: Array<{
    propertyName: string;
    name: Certification["name"];
    expiresAt: number;
  }>;
};

export type ClientPortfolioData = {
  rollup: ClientRollup;
  properties: ProPropertyRow[];
  workOrders: ProWorkOrderRow[];
  compliance: ProComplianceRow[];
  activity: ProActivityEvent[];
  financialSeries: CashflowPoint[];
  leasesExpiring90d: number;
  ownerStatement: OwnerStatement;
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
  // Owner accounts the manager has been granted access to — drives AccountSwitcher.
  // Empty array for non-managers (owners are never managers).
  managedAccounts: { clerkOrgId: string; name: string; level: "view" | "full" }[];
  // Whether the user has manager mode on — drives the My portfolio ⇄ Pro pill in the header.
  isManager: boolean;
};

// ---------------------------------------------------------------------------
// Context loading — one parallel read of every entity the Pro pages use.
// ---------------------------------------------------------------------------

type ProContext = {
  clients: Client[];
  properties: Property[];
  leases: Lease[];
  payments: Payment[];
  tenants: Tenant[];
  maintenance: MaintenanceItem[];
  certifications: Certification[];
  safetyRisks: SafetyRisk[];
  inspections: Inspection[];
  professionals: Professional[];
  progressByPropertyId: Map<string, number>;
  propertyById: Map<string, Property>;
  clientById: Map<string, Client>;
  leaseById: Map<string, Lease>;
  tenantById: Map<string, Tenant>;
  professionalById: Map<string, Professional>;
  // payments are linked to properties through their lease
  propertyIdByLeaseId: Map<string, string>;
};

async function loadProContext(): Promise<ProContext> {
  const userId = getCurrentUserId();
  const authCtx = await requireCtx();

  const [
    clients,
    properties,
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
    clientsDb.list(userId),
    listProperties(authCtx),
    listLeases(authCtx),
    listPayments(authCtx),
    listTenants(authCtx),
    listMaintenanceItems(authCtx),
    listCertifications(authCtx),
    listSafetyRisks(authCtx),
    listProfessionals(authCtx),
    listPropertyValuations(authCtx),
    listInspections(authCtx),
    listOwnershipRecords(authCtx),
    listCoOwners(authCtx),
    listOwnershipDocuments(authCtx),
    listEmergencyContacts(authCtx),
    listEstateAssignments(authCtx),
    listDocuments(authCtx),
  ]);

  // Filter inactive clients so they vanish from rollups, alerts, the client
  // book, and all derived counts. Absent status field = Active (back-compatible
  // with existing FS records that predate this field).
  const activeClients = clients.filter((c) => c.status !== "Inactive");

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
  for (const p of properties) {
    progressByPropertyId.set(p.id, computeProgress(p, progressCtx));
  }

  const propertyIdByLeaseId = new Map<string, string>();
  for (const l of leases) {
    propertyIdByLeaseId.set(l.id, l.propertyId);
  }

  return {
    clients: activeClients,
    properties,
    leases,
    payments,
    tenants,
    maintenance,
    certifications,
    safetyRisks,
    inspections,
    professionals,
    progressByPropertyId,
    propertyById: new Map(properties.map((p) => [p.id, p])),
    clientById: new Map(activeClients.map((c) => [c.id, c])),
    leaseById: new Map(leases.map((l) => [l.id, l])),
    tenantById: new Map(tenants.map((t) => [t.id, t])),
    professionalById: new Map(professionals.map((p) => [p.id, p])),
    propertyIdByLeaseId,
  };
}

// ---------------------------------------------------------------------------
// Public queries
// ---------------------------------------------------------------------------

export async function getProDashboardData(): Promise<ProDashboardData> {
  const ctx = await loadProContext();
  const monthStart = currentMonthStartUtc();

  const rollups = ctx.clients
    .map((client) => buildClientRollup(client, ctx, monthStart))
    .sort((a, b) => b.totalValue - a.totalValue);

  // Prepend the manager's own book (his directly-held properties) so it shows
  // first in the clients table and its alerts flow into the dashboard feed.
  const ownRollup = buildOwnPortfolioRollup(ctx, monthStart);
  if (ownRollup) {
    rollups.unshift(ownRollup);
  }

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

// Cross-client Properties register: the full asset list with the small
// client list needed to power the filter, plus book-level summary stats.
// Reuses the same property row + value helpers as the dashboard so the
// numbers match everywhere.
export type ProPropertiesData = {
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
  const ctx = await loadProContext();

  const properties = ctx.properties
    .map((p) => buildPropertyRow(p, ctx))
    .filter((r): r is ProPropertyRow => r !== null)
    .sort((a, b) => b.value - a.value);

  const activeProperties = ctx.properties.filter(isActiveProperty);
  const totalValue = sumPropertyValues(activeProperties);

  // Clients that actually own at least one property, for the filter.
  const clients = ctx.clients
    .map((client) => ({ id: client.id, name: client.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
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

export async function getCompliancePageData(): Promise<CompliancePageData> {
  const ctx = await loadProContext();

  // Certifications — already joined + sorted by expiry in buildComplianceRows.
  const certifications = buildComplianceRows(ctx);

  // Safety risks — join each to its property/client, then sort by severity
  // (Critical first), breaking ties with the most recently raised first.
  const allSafetyRiskRows = ctx.safetyRisks
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

  // We now return BOTH open and resolved risks so the compliance page's
  // "Show resolved" toggle can reveal the resolved ones (read-only) without a
  // second round-trip. The card defaults to open-only; the page filters this
  // list client-side. `openRisks` is kept for the summary counts below so the
  // KPI strip still reports the open/resolved split correctly.
  const openRisks = allSafetyRiskRows.filter((r) => r.status === "Open");
  const safetyRisks = allSafetyRiskRows;

  // Inspections — join each to its property/client, newest inspection first.
  const inspections = ctx.inspections
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

  // The clients that actually own at least one of these records, so the
  // filter chips never offer a client with nothing to show.
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

  return {
    certifications,
    safetyRisks,
    inspections,
    clients,
    summary: {
      // The three cert-status counts mirror the colored status pills on the
      // page and sum to the total, so the KPI strip always reconciles with
      // what the manager sees in the timeline (a cert flagged "Expiring"
      // counts here even once its expiry date has slipped past).
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

export async function getClientPortfolioData(
  clientId: string,
): Promise<ClientPortfolioData | null> {
  const ctx = await loadProContext();
  const monthStart = currentMonthStartUtc();

  // Resolve which properties this view owns. The synthetic own-portfolio id
  // maps to the manager's unassigned properties; every other id is a persisted
  // client matched on Property.clientId.
  let client: Client;
  let belongsToView: (p: Property) => boolean;

  if (clientId === OWN_PORTFOLIO_ID) {
    const ownRollup = buildOwnPortfolioRollup(ctx, monthStart);
    if (!ownRollup) return null;
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
  };

  return {
    rollup,
    properties: scoped.properties
      .map((p) => buildPropertyRow(p, ctx))
      .filter((r): r is ProPropertyRow => r !== null),
    workOrders: scoped.maintenance
      .map((m) => buildWorkOrderRow(m, ctx))
      .filter((r): r is ProWorkOrderRow => r !== null)
      .sort((a, b) => b.createdAt - a.createdAt),
    compliance: buildComplianceRows(scoped),
    activity: buildActivityFeed(scoped, 12),
    financialSeries: buildCashflowSeries(scoped.payments, monthStart, 6),
    leasesExpiring90d: countLeasesExpiring(scoped.leases, 90),
    ownerStatement: buildOwnerStatement(client, scoped, monthStart),
  };
}

export async function getRentPageData(): Promise<RentPageData> {
  const ctx = await loadProContext();
  const monthStart = currentMonthStartUtc();

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

  const activeProperties = ctx.properties.filter(isActiveProperty);
  const rented = activeProperties.filter((p) => p.status === "Rented").length;
  const vacant = activeProperties.filter((p) => p.status === "Vacant").length;

  return {
    monthLabel: monthLabelUtc(monthStart),
    expected,
    collected,
    outstanding: Math.max(0, expected - collected),
    collectionRate: expected === 0 ? 0 : Math.round((collected / expected) * 100),
    rentRoll,
    overdue: rentRoll.filter(
      (r) => r.rentStatus === "Overdue" || r.rentStatus === "Unpaid",
    ),
    expiring,
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

export async function getWorkOrdersPageData(): Promise<WorkOrdersPageData> {
  const ctx = await loadProContext();

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

  return {
    rows,
    counts: { ...counts, urgentOpen },
    totalOpenCost,
    vendors: ctx.professionals
      .filter((p) => tradeCategories.includes(p.category))
      .map((p) => ({
        id: p.id,
        name: p.name,
        company: p.company,
        category: p.category,
        available: p.available,
        rating: p.rating,
      })),
    properties: ctx.properties.filter(isActiveProperty).map((p) => ({
      id: p.id,
      name: p.name,
      clientName: p.clientId
        ? (ctx.clientById.get(p.clientId)?.name ?? "—")
        : "—",
    })),
  };
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
  const userId = getCurrentUserId();
  const all = await clientsDb.list(userId);
  return all
    .filter((c) => c.status === "Inactive")
    .map((c) => ({
      id: c.id,
      name: c.name,
      initials: c.initials,
      avatarBg: c.avatarBg,
      clientType: c.clientType,
    }));
}

export async function getProShellData(): Promise<ProShellData> {
  const authCtx = await requireCtx();
  const [ctx, profile, rawAccounts, isManager] = await Promise.all([
    loadProContext(),
    getUserProfile(authCtx, authCtx.userId),
    listManagedAccounts(authCtx),
    getIsManager(authCtx),
  ]);
  const monthStart = currentMonthStartUtc();

  const rollups = ctx.clients
    .map((client) => buildClientRollup(client, ctx, monthStart))
    .sort((a, b) => b.totalValue - a.totalValue);

  // Include the own-portfolio rollup so the workspace tab provider can open it
  // as a tab and the sidebar lists it next to the managed clients.
  const ownRollup = buildOwnPortfolioRollup(ctx, monthStart);
  if (ownRollup) {
    rollups.unshift(ownRollup);
  }

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
    })),
    managedAccounts: rawAccounts.map((a) => ({
      clerkOrgId: a.clerkOrgId,
      name: a.name,
      level: a.level,
    })),
    isManager,
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

// Derives the kanban column for a run from its linked message (if any).
// Monitor-only runs (no proposalMessageId) use their stored status.
function deriveRunStatus(run: AgentRun, msg: AiMessage | null): AgentRunStatus {
  if (!msg) return run.status;
  if (!msg.actionResult) return "needs-approval";
  if (msg.actionResult.ok && !msg.actionResult.undone) return "done";
  // undone, rejected, or errored → back to detected so the finding is visible
  return "detected";
}

export async function getAgentHubData(): Promise<AgentHubData> {
  const userId = getCurrentUserId();
  const authCtx = await requireCtx();
  const runs = await agentRunsDb.list(userId);

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
// Pure derivation helpers
// ---------------------------------------------------------------------------

function isActiveProperty(p: Property): boolean {
  return !p.isArchived && !INACTIVE_STATUSES.includes(p.status);
}

// Property value: prefer the live market value, fall back to purchase price.
function propertyValue(p: Property): number {
  return p.currentMarketValue ?? p.buyNumeric ?? 0;
}

function sumPropertyValues(properties: Property[]): number {
  return properties.reduce((sum, p) => sum + propertyValue(p), 0);
}

function currentMonthStartUtc(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
}

function monthLabelUtc(monthStart: number): string {
  return new Date(monthStart).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Short "Mar 27" label for alert chips. A property can have more than one
// overdue rent payment at once (e.g. March and June both unpaid), so the
// chips need the due date to stay distinguishable.
function shortDateUtc(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// Expected rent this month: signed leases still running this month.
// Same convention as the client side's computeKpis.
function sumExpectedRent(leases: Lease[], monthStart: number): number {
  return leases
    .filter((l) => l.stage === "Signed" && l.endDate >= monthStart)
    .reduce((sum, l) => sum + l.monthlyRent, 0);
}

// Collected rent this month: rent payments marked Paid, dated in the month.
function sumCollectedRent(payments: Payment[], monthStart: number): number {
  return payments
    .filter(
      (p) => p.kind === "Rent" && p.status === "Paid" && p.date >= monthStart,
    )
    .reduce((sum, p) => sum + p.amount, 0);
}

// Monthly NOI (accrual basis):
//   expected rent
//   − accrued tax + insurance (annual figures / 12)
//   − maintenance costs booked this month (items created in the month).
function computeNoiMonthly(
  activeProperties: Property[],
  leases: Lease[],
  maintenance: MaintenanceItem[],
  monthStart: number,
): number {
  const income = sumExpectedRent(
    leases.filter((l) =>
      activeProperties.some((p) => p.id === l.propertyId),
    ),
    monthStart,
  );

  const accruals = activeProperties.reduce(
    (sum, p) =>
      sum + ((p.annualPropertyTax ?? 0) + (p.annualInsurance ?? 0)) / 12,
    0,
  );

  const activeIds = new Set(activeProperties.map((p) => p.id));
  const maintenanceCosts = maintenance
    .filter(
      (m) => activeIds.has(m.propertyId) && m.createdAt >= monthStart,
    )
    .reduce((sum, m) => sum + (m.cost ?? 0), 0);

  return Math.round(income - accruals - maintenanceCosts);
}

function severityRank(s: AlertSeverity): number {
  return s === "urgent" ? 0 : s === "warning" ? 1 : 2;
}

function severityRankMaintenance(s: MaintenanceItem["severity"]): number {
  return s === "Emergency" ? 0 : s === "Urgent" ? 1 : 2;
}

function statusRankMaintenance(s: MaintenanceStatus): number {
  // Cancelled sorts after Resolved so closed-out orders sink to the bottom.
  return s === "Open" ? 0 : s === "InProgress" ? 1 : s === "Resolved" ? 2 : 3;
}

function rentStatusRank(s: RentStatus): number {
  return s === "Overdue" ? 0 : s === "Unpaid" ? 1 : s === "Pending" ? 2 : 3;
}

// Orders safety risks most-severe first for the compliance register.
function safetyRiskSeverityRank(s: SafetyRiskSeverity): number {
  return s === "Critical" ? 0 : s === "High" ? 1 : s === "Medium" ? 2 : 3;
}

function countWorkOrders(maintenance: MaintenanceItem[]): {
  open: number;
  inProgress: number;
  resolved: number;
} {
  return {
    open: maintenance.filter((m) => m.status === "Open").length,
    inProgress: maintenance.filter((m) => m.status === "InProgress").length,
    resolved: maintenance.filter((m) => m.status === "Resolved").length,
  };
}

function countLeasesExpiring(leases: Lease[], days: number): number {
  const now = Date.now();
  return leases.filter(
    (l) =>
      l.stage === "Signed" &&
      l.endDate >= now &&
      l.endDate <= now + days * DAY,
  ).length;
}

// Alerts for one client, derived from real records. Each rule is listed
// with the entity it reads — nothing here is invented.
function deriveClientAlerts(
  client: Client,
  properties: Property[],
  leases: Lease[],
  payments: Payment[],
  maintenance: MaintenanceItem[],
  certifications: Certification[],
  safetyRisks: SafetyRisk[],
  propertyById: Map<string, Property>,
  propertyIdByLeaseId: Map<string, string>,
): ProAlert[] {
  const alerts: ProAlert[] = [];
  const now = Date.now();
  const propertyName = (id: string | undefined) =>
    (id && propertyById.get(id)?.name) || "Unknown property";

  // Payment.status — Overdue (urgent) and Pending (info)
  for (const pay of payments) {
    if (pay.kind !== "Rent") continue;
    const propertyId = pay.leaseId
      ? propertyIdByLeaseId.get(pay.leaseId)
      : undefined;
    if (pay.status === "Overdue") {
      alerts.push({
        id: `alert-${pay.id}`,
        severity: "urgent",
        category: "payment",
        label: `Rent overdue — ${propertyName(propertyId)} (${formatCurrencyFull(pay.amount)}, due ${shortDateUtc(pay.date)})`,
        clientId: client.id,
        clientName: client.name,
        propertyId,
      });
    } else if (pay.status === "Pending") {
      alerts.push({
        id: `alert-${pay.id}`,
        severity: "info",
        category: "payment",
        label: `Rent pending — ${propertyName(propertyId)}`,
        clientId: client.id,
        clientName: client.name,
        propertyId,
      });
    }
  }

  // Lease.endDate — expiring within 30d (urgent) or 90d (warning)
  for (const lease of leases) {
    if (lease.stage !== "Signed") continue;
    if (lease.endDate < now || lease.endDate > now + 90 * DAY) continue;
    const daysLeft = Math.ceil((lease.endDate - now) / DAY);
    alerts.push({
      id: `alert-${lease.id}-expiry`,
      severity: daysLeft <= 30 ? "urgent" : "warning",
      category: "lease",
      label: `Lease expires in ${daysLeft}d — ${propertyName(lease.propertyId)}`,
      clientId: client.id,
      clientName: client.name,
      propertyId: lease.propertyId,
    });
  }

  // Certification.status — Expired (urgent), Expiring (warning)
  for (const cert of certifications) {
    if (cert.status === "Valid") continue;
    alerts.push({
      id: `alert-${cert.id}`,
      severity: cert.status === "Expired" ? "urgent" : "warning",
      category: "compliance",
      label: `${cert.name} ${cert.status === "Expired" ? "expired" : "expiring"} — ${propertyName(cert.propertyId)}`,
      clientId: client.id,
      clientName: client.name,
      propertyId: cert.propertyId,
    });
  }

  // SafetyRisk.severity — Critical/High open risks (urgent). Resolved risks
  // no longer raise an alert.
  for (const risk of safetyRisks) {
    if (risk.status === "Resolved") continue;
    if (risk.severity !== "Critical" && risk.severity !== "High") continue;
    alerts.push({
      id: `alert-${risk.id}`,
      severity: "urgent",
      category: "risk",
      label: `${risk.severity} risk — ${risk.title} (${propertyName(risk.propertyId)})`,
      clientId: client.id,
      clientName: client.name,
      propertyId: risk.propertyId,
    });
  }

  // MaintenanceItem — Emergency not resolved (urgent), Urgent open (warning)
  for (const item of maintenance) {
    // Both terminal states suppress alerts — Cancelled orders are no longer actionable.
    if (item.status === "Resolved" || item.status === "Cancelled") continue;
    if (item.severity === "Emergency") {
      alerts.push({
        id: `alert-${item.id}`,
        severity: "urgent",
        category: "workorder",
        label: `Emergency work order — ${item.title}`,
        clientId: client.id,
        clientName: client.name,
        propertyId: item.propertyId,
      });
    } else if (item.severity === "Urgent" && item.status === "Open") {
      alerts.push({
        id: `alert-${item.id}`,
        severity: "warning",
        category: "workorder",
        label: `Urgent work order unassigned — ${item.title}`,
        clientId: client.id,
        clientName: client.name,
        propertyId: item.propertyId,
      });
    }
  }

  return alerts.sort(
    (a, b) => severityRank(a.severity) - severityRank(b.severity),
  );
}

// Health is derived from the alert mix:
//   2+ urgent → critical · 1 urgent or 2+ warnings → needs-attention
//   otherwise → healthy
function deriveHealth(alerts: ProAlert[]): ClientHealth {
  const urgent = alerts.filter((a) => a.severity === "urgent").length;
  const warnings = alerts.filter((a) => a.severity === "warning").length;
  if (urgent >= 2) return "critical";
  if (urgent === 1 || warnings >= 2) return "needs-attention";
  return "healthy";
}

function buildClientRollup(
  client: Client,
  ctx: ProContext,
  monthStart: number,
): ClientRollup {
  const properties = ctx.properties.filter((p) => p.clientId === client.id);
  return buildRollupFromProperties(client, properties, ctx, monthStart);
}

// Build the synthetic "My Portfolio" rollup from the properties the manager
// owns directly (no clientId). Returns null when he has no such properties,
// so the card only appears when there is something real to show.
function buildOwnPortfolioRollup(
  ctx: ProContext,
  monthStart: number,
): ClientRollup | null {
  const ownProperties = ctx.properties.filter((p) => !p.clientId);
  if (ownProperties.length === 0) {
    return null;
  }

  // A stand-in Client for the manager's own book. It is never persisted —
  // it only carries the labels the rollup and the clients table need to render.
  const selfClient: Client = {
    id: OWN_PORTFOLIO_ID,
    userId: getCurrentUserId(),
    name: "My Portfolio",
    clientType: "Individual",
    initials: "ME",
    avatarBg: "bg-blue-600",
    clientSince: 0,
    createdAt: 0,
    updatedAt: 0,
  };

  return buildRollupFromProperties(selfClient, ownProperties, ctx, monthStart);
}

// Core rollup math, shared by real managed clients and the synthetic
// own-portfolio rollup. `properties` is the already-scoped property list.
function buildRollupFromProperties(
  client: Client,
  properties: Property[],
  ctx: ProContext,
  monthStart: number,
): ClientRollup {
  const active = properties.filter(isActiveProperty);
  const propertyIds = new Set(properties.map((p) => p.id));

  const leases = ctx.leases.filter((l) => propertyIds.has(l.propertyId));
  const leaseIds = new Set(leases.map((l) => l.id));
  const payments = ctx.payments.filter(
    (pay) => pay.leaseId !== undefined && leaseIds.has(pay.leaseId),
  );
  const maintenance = ctx.maintenance.filter((m) =>
    propertyIds.has(m.propertyId),
  );
  const certifications = ctx.certifications.filter((c) =>
    propertyIds.has(c.propertyId),
  );
  const safetyRisks = ctx.safetyRisks.filter((r) =>
    propertyIds.has(r.propertyId),
  );

  const totalValue = sumPropertyValues(active);
  const rentedCount = active.filter((p) => p.status === "Rented").length;
  const vacantCount = active.filter((p) => p.status === "Vacant").length;

  const monthlyExpected = sumExpectedRent(leases, monthStart);
  const monthlyCollected = sumCollectedRent(payments, monthStart);

  const progressValues = active.map(
    (p) => ctx.progressByPropertyId.get(p.id) ?? 0,
  );
  const avgProgress =
    progressValues.length === 0
      ? 0
      : Math.round(
          progressValues.reduce((sum, v) => sum + v, 0) /
            progressValues.length,
        );

  const alerts = deriveClientAlerts(
    client,
    properties,
    leases,
    payments,
    maintenance,
    certifications,
    safetyRisks,
    ctx.propertyById,
    ctx.propertyIdByLeaseId,
  );

  const lastActivityAt = Math.max(
    client.updatedAt,
    ...payments.map((p) => p.date),
    ...maintenance.map((m) => m.createdAt),
    ...leases.map((l) => l.startDate),
  );

  return {
    client,
    propertyCount: active.length,
    totalValue,
    totalValueFormatted: formatCurrency(totalValue),
    rentedCount,
    vacantCount,
    occupancyRate:
      active.length === 0 ? 0 : Math.round((rentedCount / active.length) * 100),
    monthlyExpected,
    monthlyCollected,
    outstanding: Math.max(0, monthlyExpected - monthlyCollected),
    collectionRate:
      monthlyExpected === 0
        ? 0
        : Math.round((monthlyCollected / monthlyExpected) * 100),
    noiMonthly: computeNoiMonthly(active, leases, maintenance, monthStart),
    avgProgress,
    alerts,
    health: deriveHealth(alerts),
    lastActivityAt,
  };
}

function buildPropertyRow(
  p: Property,
  ctx: ProContext,
): ProPropertyRow | null {
  const client = p.clientId ? ctx.clientById.get(p.clientId) : undefined;
  const value = propertyValue(p);
  return {
    id: p.id,
    name: p.name,
    addressLabel:
      [p.addressLine, p.city ?? p.province].filter(Boolean).join(", ") ||
      p.province ||
      "—",
    type: p.type,
    status: p.status,
    value,
    valueFormatted: formatCurrency(value),
    progress: ctx.progressByPropertyId.get(p.id) ?? 0,
    updatedAt: p.updatedAt,
    clientId: client?.id ?? "",
    clientName: client?.name ?? "Unassigned",
    clientInitials: client?.initials ?? "—",
    clientAvatarBg: client?.avatarBg ?? "bg-zinc-400",
  };
}

function buildWorkOrderRow(
  m: MaintenanceItem,
  ctx: ProContext,
): ProWorkOrderRow | null {
  const property = ctx.propertyById.get(m.propertyId);
  if (!property) return null;
  const client = property.clientId
    ? ctx.clientById.get(property.clientId)
    : undefined;
  const vendor = m.vendorId
    ? ctx.professionalById.get(m.vendorId)
    : undefined;
  return {
    id: m.id,
    title: m.title,
    severity: m.severity,
    status: m.status,
    cost: m.cost,
    createdAt: m.createdAt,
    propertyId: property.id,
    propertyName: property.name,
    clientId: client?.id ?? "",
    clientName: client?.name ?? "Unassigned",
    vendorId: vendor?.id,
    vendorName: vendor?.name,
    vendorCategory: vendor?.category,
  };
}

function buildComplianceRows(ctx: ProContext): ProComplianceRow[] {
  const now = Date.now();
  return ctx.certifications
    .map((cert) => {
      const property = ctx.propertyById.get(cert.propertyId);
      if (!property) return null;
      const client = property.clientId
        ? ctx.clientById.get(property.clientId)
        : undefined;
      const daysDiff = Math.round((cert.expiresAt - now) / DAY);
      const dueLabel =
        daysDiff < 0
          ? `Overdue ${Math.abs(daysDiff)}d`
          : daysDiff === 0
            ? "Due today"
            : `in ${daysDiff}d`;
      return {
        id: cert.id,
        name: cert.name,
        status: cert.status,
        expiresAt: cert.expiresAt,
        dueLabel,
        daysLeft: daysDiff,
        propertyId: property.id,
        propertyName: property.name,
        clientId: client?.id ?? "",
        clientName: client?.name ?? "Unassigned",
        clientInitials: client?.initials ?? "—",
        clientAvatarBg: client?.avatarBg ?? "bg-zinc-400",
      };
    })
    .filter((r): r is ProComplianceRow => r !== null)
    .sort((a, b) => a.expiresAt - b.expiresAt);
}

// Activity feed derived from real records: payments (by date),
// work orders (by createdAt), leases (by startDate). Newest first.
function buildActivityFeed(ctx: ProContext, limit: number): ProActivityEvent[] {
  const events: ProActivityEvent[] = [];

  const nameFor = (propertyId: string | undefined) => {
    const property = propertyId ? ctx.propertyById.get(propertyId) : undefined;
    const client = property?.clientId
      ? ctx.clientById.get(property.clientId)
      : undefined;
    return {
      propertyName: property?.name ?? "Unknown property",
      clientName: client?.name ?? "Unassigned",
    };
  };

  for (const pay of ctx.payments) {
    const propertyId = pay.leaseId
      ? ctx.propertyIdByLeaseId.get(pay.leaseId)
      : undefined;
    const { propertyName, clientName } = nameFor(propertyId);
    const verb =
      pay.status === "Paid"
        ? "collected"
        : pay.status === "Overdue"
          ? "overdue"
          : pay.status.toLowerCase();
    events.push({
      id: `act-${pay.id}`,
      category: "payment",
      description: `${pay.kind} ${verb} — ${formatCurrencyFull(pay.amount)}`,
      clientName,
      propertyName,
      timestamp: pay.date,
    });
  }

  for (const m of ctx.maintenance) {
    const { propertyName, clientName } = nameFor(m.propertyId);
    events.push({
      id: `act-${m.id}`,
      category: "maintenance",
      description: `Work order ${m.status === "Resolved" ? "resolved" : m.status === "Cancelled" ? "cancelled" : "created"} — ${m.title}`,
      clientName,
      propertyName,
      timestamp: m.createdAt,
    });
  }

  for (const lease of ctx.leases) {
    const { propertyName, clientName } = nameFor(lease.propertyId);
    events.push({
      id: `act-${lease.id}`,
      category: "lease",
      description: `Lease ${lease.stage.toLowerCase()} — ${formatCurrencyFull(lease.monthlyRent)}/mo`,
      clientName,
      propertyName,
      timestamp: lease.startDate,
    });
  }

  return events.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
}

function buildRentRollRow(
  lease: Lease,
  ctx: ProContext,
  monthStart: number,
): RentRollRow | null {
  const property = ctx.propertyById.get(lease.propertyId);
  if (!property) return null;
  const client = property.clientId
    ? ctx.clientById.get(property.clientId)
    : undefined;
  const tenant = lease.tenantId
    ? ctx.tenantById.get(lease.tenantId)
    : undefined;

  // This month's rent payment for the lease (if any record exists).
  const monthPayments = ctx.payments.filter(
    (p) =>
      p.leaseId === lease.id && p.kind === "Rent" && p.date >= monthStart,
  );
  const paid = monthPayments.find((p) => p.status === "Paid");
  const overdue = monthPayments.find((p) => p.status === "Overdue");
  const pending = monthPayments.find((p) => p.status === "Pending");

  const rentStatus: RentStatus = paid
    ? "Paid"
    : overdue
      ? "Overdue"
      : pending
        ? "Pending"
        : "Unpaid";

  const lastPaid = ctx.payments
    .filter(
      (p) => p.leaseId === lease.id && p.kind === "Rent" && p.status === "Paid",
    )
    .sort((a, b) => b.date - a.date)[0];

  return {
    leaseId: lease.id,
    propertyId: property.id,
    propertyName: property.name,
    clientId: client?.id ?? "",
    clientName: client?.name ?? "Unassigned",
    tenantName: tenant?.name ?? "—",
    unit: lease.unit,
    monthlyRent: lease.monthlyRent,
    leaseEnd: lease.endDate,
    renewalStatus: lease.renewalStatus,
    rentStatus,
    paymentId: (overdue ?? pending)?.id,
    lastPaidDate: lastPaid?.date,
  };
}

// Builds the cashflow series: Paid rent per calendar month for the
// `months` most recent months (oldest → newest, current month last).
function buildCashflowSeries(
  payments: Payment[],
  monthStart: number,
  months: number,
): CashflowPoint[] {
  const series: CashflowPoint[] = [];
  const anchor = new Date(monthStart);

  for (let i = months - 1; i >= 0; i--) {
    const start = Date.UTC(
      anchor.getUTCFullYear(),
      anchor.getUTCMonth() - i,
      1,
    );
    const end = Date.UTC(
      anchor.getUTCFullYear(),
      anchor.getUTCMonth() - i + 1,
      1,
    );
    const collected = payments
      .filter(
        (p) =>
          p.kind === "Rent" &&
          p.status === "Paid" &&
          p.date >= start &&
          p.date < end,
      )
      .reduce((sum, p) => sum + p.amount, 0);
    series.push({
      month: new Date(start).toLocaleString("en-US", {
        month: "short",
        timeZone: "UTC",
      }),
      collected,
    });
  }
  return series;
}

// Owner statement for the previous full calendar month — the packet a
// manager sends the owner. All figures from real records of that month.
function buildOwnerStatement(
  client: Client,
  scoped: ProContext,
  monthStart: number,
): OwnerStatement {
  const anchor = new Date(monthStart);
  const periodStart = Date.UTC(
    anchor.getUTCFullYear(),
    anchor.getUTCMonth() - 1,
    1,
  );
  const periodEnd = monthStart;
  const now = Date.now();

  const inPeriod = (ts: number) => ts >= periodStart && ts < periodEnd;

  const rentCollected = scoped.payments
    .filter((p) => p.kind === "Rent" && p.status === "Paid" && inPeriod(p.date))
    .reduce((sum, p) => sum + p.amount, 0);

  const otherIncome = scoped.payments
    .filter(
      (p) =>
        (p.kind === "Fee" || p.kind === "Deposit") &&
        p.status === "Paid" &&
        inPeriod(p.date),
    )
    .reduce((sum, p) => sum + p.amount, 0);

  const managementFeePct = client.managementFeePct ?? 0;
  const managementFee = Math.round((rentCollected * managementFeePct) / 100);

  const active = scoped.properties.filter(isActiveProperty);
  const taxAccrual = Math.round(
    active.reduce((sum, p) => sum + (p.annualPropertyTax ?? 0) / 12, 0),
  );
  const insuranceAccrual = Math.round(
    active.reduce((sum, p) => sum + (p.annualInsurance ?? 0) / 12, 0),
  );

  const maintenanceCosts = scoped.maintenance
    .filter((m) => inPeriod(m.createdAt))
    .reduce((sum, m) => sum + (m.cost ?? 0), 0);

  const totalExpenses =
    managementFee + taxAccrual + insuranceAccrual + maintenanceCosts;

  const rentedCount = active.filter((p) => p.status === "Rented").length;

  return {
    monthLabel: monthLabelUtc(periodStart),
    periodStart,
    periodEnd,
    rentCollected,
    otherIncome,
    managementFeePct,
    managementFee,
    taxAccrual,
    insuranceAccrual,
    maintenanceCosts,
    totalExpenses,
    netOperatingIncome: rentCollected + otherIncome - totalExpenses,
    occupancyRate:
      active.length === 0 ? 0 : Math.round((rentedCount / active.length) * 100),
    workOrdersOpenedInMonth: scoped.maintenance.filter((m) =>
      inPeriod(m.createdAt),
    ).length,
    workOrdersOpenToday: scoped.maintenance.filter(
      (m) => m.status !== "Resolved" && m.status !== "Cancelled",
    ).length,
    upcomingLeaseExpirations: scoped.leases
      .filter(
        (l) =>
          l.stage === "Signed" &&
          l.endDate >= now &&
          l.endDate <= now + 90 * DAY,
      )
      .map((l) => ({
        propertyName:
          scoped.propertyById.get(l.propertyId)?.name ?? l.propertyId,
        tenantName: l.tenantId
          ? (scoped.tenantById.get(l.tenantId)?.name ?? "—")
          : "—",
        endDate: l.endDate,
        monthlyRent: l.monthlyRent,
      }))
      .sort((a, b) => a.endDate - b.endDate),
    upcomingCertExpirations: scoped.certifications
      .filter((c) => c.expiresAt >= now && c.expiresAt <= now + 90 * DAY)
      .map((c) => ({
        propertyName:
          scoped.propertyById.get(c.propertyId)?.name ?? c.propertyId,
        name: c.name,
        expiresAt: c.expiresAt,
      }))
      .sort((a, b) => a.expiresAt - b.expiresAt),
  };
}
