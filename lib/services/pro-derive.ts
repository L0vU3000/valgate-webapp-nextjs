import "server-only";
import { OWN_PORTFOLIO_ID } from "@/app/(pro)/pro/_components/pro-shell-types";
import { formatCurrency, formatCurrencyFull } from "@/lib/format";
import type { Client } from "@/lib/data/types/client";
import type {
  Property,
  PropertyStatus,
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
} from "@/lib/data/types/safety-risk";
import type { Inspection } from "@/lib/data/types/inspection";
import type { Professional } from "@/lib/data/types/professional";
import type { AgentRun, AgentRunStatus } from "@/lib/data/types/agent-run";
import type { AiMessage } from "@/lib/data/types/ai-message";

// ---------------------------------------------------------------------------
// Pro derivation layer (pure).
//
// Every function in this module is a pure derivation over already-loaded
// domain entities — no DB access, no auth. The DB-backed context these
// helpers consume (ProContext) is loaded by lib/services/pro-dashboard.ts,
// and the page-level query functions live in app/(pro)/pro/queries.ts.
//
// Derivation conventions (documented per helper below):
// - "active" property = not Sold, not Archived (same as computeStats).
// - Money month = current UTC calendar month (same as computeKpis).
// - Owner statements cover the previous full calendar month.
// ---------------------------------------------------------------------------

export const DAY = 24 * 60 * 60 * 1000;
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
  // Portfolio org data — only present when client was created via manager-led onboarding.
  memberCount?: number;
  pendingCount?: number;
  // Derived from the best (most actionable) handoff status across the org.
  confirmationStatus?: "draft" | "pending" | "accepted" | "bounced";
};

export type ProPropertyRow = {
  id: string;
  orgId: string;
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

export type CashflowPoint = { month: string; collected: number };

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

// The one-parallel-read context every Pro page derives from. Built by
// loadProContext in lib/services/pro-dashboard.ts.
export type ProContext = {
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

// ---------------------------------------------------------------------------
// Pure derivation helpers
// ---------------------------------------------------------------------------

export function isActiveProperty(p: Property): boolean {
  return !p.isArchived && !INACTIVE_STATUSES.includes(p.status);
}

// Property value: prefer the live market value, fall back to purchase price.
function propertyValue(p: Property): number {
  return p.currentMarketValue ?? p.buyNumeric ?? 0;
}

export function sumPropertyValues(properties: Property[]): number {
  return properties.reduce((sum, p) => sum + propertyValue(p), 0);
}

export function currentMonthStartUtc(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
}

export function monthLabelUtc(monthStart: number): string {
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
export function sumExpectedRent(leases: Lease[], monthStart: number): number {
  return leases
    .filter((l) => l.stage === "Signed" && l.endDate >= monthStart)
    .reduce((sum, l) => sum + l.monthlyRent, 0);
}

// Collected rent this month: rent payments marked Paid, dated in the month.
export function sumCollectedRent(payments: Payment[], monthStart: number): number {
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
export function computeNoiMonthly(
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

export function severityRank(s: AlertSeverity): number {
  return s === "urgent" ? 0 : s === "warning" ? 1 : 2;
}

export function severityRankMaintenance(s: MaintenanceItem["severity"]): number {
  return s === "Emergency" ? 0 : s === "Urgent" ? 1 : 2;
}

export function statusRankMaintenance(s: MaintenanceStatus): number {
  // Cancelled sorts after Resolved so closed-out orders sink to the bottom.
  return s === "Open" ? 0 : s === "InProgress" ? 1 : s === "Resolved" ? 2 : 3;
}

export function rentStatusRank(s: RentStatus): number {
  return s === "Overdue" ? 0 : s === "Unpaid" ? 1 : s === "Pending" ? 2 : 3;
}

// Orders safety risks most-severe first for the compliance register.
export function safetyRiskSeverityRank(s: SafetyRiskSeverity): number {
  return s === "Critical" ? 0 : s === "High" ? 1 : s === "Medium" ? 2 : 3;
}

export function countWorkOrders(maintenance: MaintenanceItem[]): {
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

export function countLeasesExpiring(leases: Lease[], days: number): number {
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

export function buildClientRollup(
  client: Client,
  ctx: ProContext,
  monthStart: number,
): ClientRollup {
  const properties = ctx.properties.filter((p) => p.clientId === client.id);
  return buildRollupFromProperties(client, properties, ctx, monthStart);
}

// Build the synthetic "My Portfolio" rollup from the properties the manager
// owns directly (no clientId). Always returns a rollup — new users with 0
// properties see an empty card rather than no card at all.
export function buildOwnPortfolioRollup(
  ctx: ProContext,
  monthStart: number,
  userId: string,
): ClientRollup {
  const ownProperties = ctx.properties.filter((p) => !p.clientId);

  // A stand-in Client for the manager's own book. It is never persisted —
  // it only carries the labels the rollup and the clients table need to render.
  const selfClient: Client = {
    id: OWN_PORTFOLIO_ID,
    userId,
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
export function buildRollupFromProperties(
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

export function buildPropertyRow(
  p: Property,
  ctx: ProContext,
): ProPropertyRow | null {
  const client = p.clientId ? ctx.clientById.get(p.clientId) : undefined;
  const value = propertyValue(p);
  return {
    id: p.id,
    orgId: p.orgId,
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

export function buildWorkOrderRow(
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

export function buildComplianceRows(ctx: ProContext): ProComplianceRow[] {
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
export function buildActivityFeed(ctx: ProContext, limit: number): ProActivityEvent[] {
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

export function buildRentRollRow(
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
export function buildCashflowSeries(
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
export function buildOwnerStatement(
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

// Derives the kanban column for a run from its linked message (if any).
// Monitor-only runs (no proposalMessageId) use their stored status.
export function deriveRunStatus(run: AgentRun, msg: AiMessage | null): AgentRunStatus {
  if (!msg) return run.status;
  if (!msg.actionResult) return "needs-approval";
  if (msg.actionResult.ok && !msg.actionResult.undone) return "done";
  // undone, rejected, or errored → back to detected so the finding is visible
  return "detected";
}
