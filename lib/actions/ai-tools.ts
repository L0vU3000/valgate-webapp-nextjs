import "server-only";

import { tool } from "ai";
import { z } from "zod";

import { getCurrentUserId } from "@/lib/data/auth-shim";
import { formatCurrency } from "@/lib/format";
import {
  getProDashboardData,
  getRentPageData,
  getWorkOrdersPageData,
  getCompliancePageData,
  getClientPortfolioData,
} from "@/app/(pro)/pro/queries";
import * as paymentsDb from "@/lib/data/db/payments";
import * as leasesDb from "@/lib/data/db/leases";
import * as maintenanceDb from "@/lib/data/db/maintenance-items";
import * as safetyRisksDb from "@/lib/data/db/safety-risks";
import * as propertiesDb from "@/lib/data/db/properties";

// ---------------------------------------------------------------------------
// READ tools — thin summaries over the Pro query layer so the AI can give
// grounded answers. The system prompt already carries the full portfolio
// context; these tools are called when the AI needs structured data that
// matches a specific page (rent roll, work orders, etc.) for accuracy and
// to produce Activity-pane trace rows.
// ponytail: compact return payloads only — full ProDashboardData is too large.
// ---------------------------------------------------------------------------

export const getDashboardOverview = tool({
  description:
    "Get the Pro manager dashboard overview: KPIs (total book value, occupancy, rent collection), alert counts, and work order counts.",
  inputSchema: z.object({}),
  execute: async () => {
    const data = await getProDashboardData();
    return {
      kpis: {
        totalValueFormatted: data.kpis.totalValueFormatted,
        propertyCount: data.kpis.propertyCount,
        clientCount: data.kpis.clientCount,
        occupancyRate: data.kpis.occupancyRate,
        monthlyExpected: data.kpis.monthlyExpected,
        monthlyCollected: data.kpis.monthlyCollected,
        collectionRate: data.kpis.collectionRate,
        monthLabel: data.kpis.monthLabel,
      },
      alerts: {
        urgent: data.alerts.filter((a) => a.severity === "urgent").length,
        warning: data.alerts.filter((a) => a.severity === "warning").length,
        topAlerts: data.alerts.slice(0, 5).map((a) => a.label),
      },
      workOrders: data.workOrders.counts,
      occupancy: data.occupancy,
    };
  },
});

export const getRentCollection = tool({
  description:
    "Get the current month's rent collection data: expected vs collected amounts, overdue leases, and expiring leases. Use this to answer questions about rent, overdue tenants, or payment status.",
  inputSchema: z.object({}),
  execute: async () => {
    const data = await getRentPageData();
    return {
      monthLabel: data.monthLabel,
      expected: data.expected,
      collected: data.collected,
      outstanding: data.outstanding,
      collectionRate: data.collectionRate,
      overdueCount: data.overdue.length,
      overdue: data.overdue.map((r) => ({
        propertyName: r.propertyName,
        clientName: r.clientName,
        tenantName: r.tenantName,
        unit: r.unit,
        monthlyRent: r.monthlyRent,
        rentStatus: r.rentStatus,
        leaseId: r.leaseId,
        paymentId: r.paymentId,
      })),
      expiringCount: data.expiring.length,
      expiring: data.expiring.map((e) => ({
        propertyName: e.propertyName,
        clientName: e.clientName,
        tenantName: e.tenantName,
        daysLeft: e.daysLeft,
        monthlyRent: e.monthlyRent,
        leaseId: e.leaseId,
      })),
    };
  },
});

export const getWorkOrders = tool({
  description:
    "Get the work orders queue: open, in-progress, and resolved counts, plus the list of active work orders with their severity and assigned vendor.",
  inputSchema: z.object({}),
  execute: async () => {
    const data = await getWorkOrdersPageData();
    return {
      counts: data.counts,
      totalOpenCost: data.totalOpenCost,
      queue: data.rows
        .filter((r) => r.status !== "Resolved")
        .slice(0, 20)
        .map((r) => ({
          id: r.id,
          title: r.title,
          severity: r.severity,
          status: r.status,
          propertyName: r.propertyName,
          clientName: r.clientName,
          vendorName: r.vendorName,
          cost: r.cost,
        })),
    };
  },
});

export const getComplianceOverview = tool({
  description:
    "Get compliance overview: certificate expiry status, open safety risks, and inspection results. Use for questions about expired/expiring certificates or open risks.",
  inputSchema: z.object({}),
  execute: async () => {
    const data = await getCompliancePageData();
    return {
      summary: data.summary,
      expiring: data.certifications
        .filter((c) => c.status === "Expiring" || c.status === "Expired")
        .slice(0, 10)
        .map((c) => ({
          name: c.name,
          status: c.status,
          dueLabel: c.dueLabel,
          propertyName: c.propertyName,
          clientName: c.clientName,
        })),
      openRisks: data.safetyRisks.slice(0, 10).map((r) => ({
        id: r.id,
        title: r.title,
        severity: r.severity,
        propertyName: r.propertyName,
        clientName: r.clientName,
      })),
    };
  },
});

export const getClientPortfolio = tool({
  description:
    "Get detailed data for a specific client's portfolio: properties, rent roll, work orders, and compliance. Use when the manager asks about a specific owner-client.",
  inputSchema: z.object({
    clientId: z.string().describe("The client ID, e.g. CLIENT-0001"),
  }),
  execute: async ({ clientId }) => {
    const data = await getClientPortfolioData(clientId);
    if (!data) return { error: `Client ${clientId} not found.` };
    return {
      name: data.rollup.client.name,
      propertyCount: data.rollup.propertyCount,
      totalValueFormatted: data.rollup.totalValueFormatted,
      occupancyRate: data.rollup.occupancyRate,
      monthlyExpected: data.rollup.monthlyExpected,
      monthlyCollected: data.rollup.monthlyCollected,
      outstanding: data.rollup.outstanding,
      health: data.rollup.health,
      alertCount: data.rollup.alerts.length,
      topAlerts: data.rollup.alerts.slice(0, 3).map((a) => a.label),
      workOrderCount: data.workOrders.filter((w) => w.status !== "Resolved").length,
      leasesExpiring90d: data.leasesExpiring90d,
    };
  },
});

// ---------------------------------------------------------------------------
// WRITE tools (proposal only) — these tools do NOT mutate any data.
// They look up the current state to build a human-readable consequence string
// and capture a pre-image for rollback, then return a proposed action object.
// The manager must approve in the UI before any mutation happens.
// ponytail: one tool per Pro action; no execution here.
// ---------------------------------------------------------------------------

export const proposeMarkRentPaid = tool({
  description:
    "Propose marking an existing Overdue or Pending rent payment as Paid. Use this when the manager wants to record that a tenant has paid their rent. Requires the paymentId from getRentCollection.",
  inputSchema: z.object({
    paymentId: z.string().describe("The payment ID to mark as Paid, e.g. PMT-0001"),
  }),
  execute: async ({ paymentId }) => {
    const userId = getCurrentUserId();
    const payment = await paymentsDb.get(userId, paymentId);
    if (!payment) return { error: `Payment ${paymentId} not found.` };

    return {
      proposedAction: {
        action: "markRentPaid",
        payload: { paymentId },
        consequence: `Mark payment ${paymentId} as Paid (${formatCurrency(payment.amount)} rent — currently ${payment.status})`,
        preImage: { status: payment.status },
      },
    };
  },
});

export const proposeLogRentPayment = tool({
  description:
    "Propose logging a new rent payment for a lease that has no payment record this month. Use this when recording cash or bank transfers.",
  inputSchema: z.object({
    leaseId: z.string().describe("The lease ID for which to record payment"),
    amount: z.number().positive().describe("Payment amount in the local currency"),
    method: z
      .enum(["ABA Bank", "Wing", "Wire transfer", "Cash"])
      .describe("Payment method used"),
  }),
  execute: async ({ leaseId, amount, method }) => {
    const userId = getCurrentUserId();
    const lease = await leasesDb.get(userId, leaseId);
    if (!lease) return { error: `Lease ${leaseId} not found.` };

    return {
      proposedAction: {
        action: "logRentPayment",
        payload: { leaseId, amount, method },
        consequence: `Log ${formatCurrency(amount)} rent payment via ${method} for lease ${leaseId}`,
        preImage: null,
      },
    };
  },
});

export const proposeRenewLease = tool({
  description:
    "Propose renewing a lease by extending it by one full term. Requires the leaseId from getRentCollection.",
  inputSchema: z.object({
    leaseId: z.string().describe("The lease ID to renew, e.g. LEASE-0001"),
  }),
  execute: async ({ leaseId }) => {
    const userId = getCurrentUserId();
    const lease = await leasesDb.get(userId, leaseId);
    if (!lease) return { error: `Lease ${leaseId} not found.` };

    const end = new Date(lease.endDate);
    end.setUTCMonth(end.getUTCMonth() + lease.termMonths);
    const newEnd = end.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

    return {
      proposedAction: {
        action: "renewLease",
        payload: { leaseId },
        consequence: `Renew lease ${leaseId} for ${lease.termMonths} months — new end date: ${newEnd}`,
        preImage: { endDate: lease.endDate, renewalStatus: lease.renewalStatus },
      },
    };
  },
});

export const proposeCreateWorkOrder = tool({
  description:
    "Propose creating a new work order (maintenance request) for a property. Requires the propertyId.",
  inputSchema: z.object({
    propertyId: z.string().describe("The property ID, e.g. PROP-0001"),
    title: z.string().min(3).max(200).describe("Short description of the work needed"),
    severity: z
      .enum(["Emergency", "Urgent", "Standard"])
      .describe("How urgent the work is"),
    vendorId: z.string().optional().describe("Optional vendor/professional ID to assign"),
    cost: z.number().nonnegative().optional().describe("Estimated cost in local currency"),
  }),
  execute: async ({ propertyId, title, severity, vendorId, cost }) => {
    const userId = getCurrentUserId();
    const property = await propertiesDb.get(userId, propertyId);
    if (!property) return { error: `Property ${propertyId} not found.` };

    const costLabel = cost != null ? ` — estimated ${formatCurrency(cost)}` : "";
    return {
      proposedAction: {
        action: "createWorkOrder",
        payload: { propertyId, title, severity, vendorId, cost },
        consequence: `Create ${severity} work order "${title}" for ${property.name}${costLabel}`,
        preImage: null,
      },
    };
  },
});

export const proposeUpdateWorkOrder = tool({
  description:
    "Propose updating an existing work order's status, assigned vendor, or cost.",
  inputSchema: z.object({
    id: z.string().describe("The maintenance item / work order ID, e.g. MAINT-0001"),
    status: z
      .enum(["Open", "InProgress", "Resolved"])
      .optional()
      .describe("New status for the work order"),
    vendorId: z.string().nullable().optional().describe("Vendor to assign (null to unassign)"),
    cost: z.number().nonnegative().optional().describe("Updated cost estimate"),
  }),
  execute: async ({ id, status, vendorId, cost }) => {
    const userId = getCurrentUserId();
    const item = await maintenanceDb.get(userId, id);
    if (!item) return { error: `Work order ${id} not found.` };

    const changes: string[] = [];
    if (status) changes.push(`status → ${status}`);
    if (vendorId !== undefined) changes.push(vendorId ? `assign vendor ${vendorId}` : "unassign vendor");
    if (cost !== undefined) changes.push(`cost → ${formatCurrency(cost)}`);

    return {
      proposedAction: {
        action: "updateWorkOrder",
        payload: { id, status, vendorId, cost },
        consequence: `Update work order "${item.title}": ${changes.join(", ")}`,
        preImage: { status: item.status, vendorId: item.vendorId, cost: item.cost },
      },
    };
  },
});

export const proposeResolveSafetyRisk = tool({
  description:
    "Propose resolving (closing) an open safety risk. Use the riskId from getComplianceOverview.",
  inputSchema: z.object({
    riskId: z.string().describe("The safety risk ID, e.g. RISK-0001"),
  }),
  execute: async ({ riskId }) => {
    const userId = getCurrentUserId();
    const risk = await safetyRisksDb.get(userId, riskId);
    if (!risk) return { error: `Safety risk ${riskId} not found.` };

    return {
      proposedAction: {
        action: "resolveSafetyRisk",
        payload: { riskId },
        consequence: `Resolve ${risk.severity} safety risk: "${risk.title}"`,
        preImage: { status: risk.status, resolvedAt: risk.resolvedAt },
      },
    };
  },
});

export const proposeAssignProperties = tool({
  description:
    "Propose assigning one or more properties to a client. Use when the manager wants to onboard unassigned properties.",
  inputSchema: z.object({
    clientId: z.string().describe("The client ID to assign the properties to"),
    propertyIds: z.array(z.string()).min(1).describe("List of property IDs to assign"),
  }),
  execute: async ({ clientId, propertyIds }) => {
    const userId = getCurrentUserId();

    // Capture pre-image: original clientId for each property (for rollback)
    const preImage: Record<string, { clientId: string | undefined }> = {};
    for (const propertyId of propertyIds) {
      const property = await propertiesDb.get(userId, propertyId);
      if (property) {
        preImage[propertyId] = { clientId: property.clientId };
      }
    }

    return {
      proposedAction: {
        action: "assignProperties",
        payload: { clientId, propertyIds },
        consequence: `Assign ${propertyIds.length} ${propertyIds.length === 1 ? "property" : "properties"} to client ${clientId}: ${propertyIds.join(", ")}`,
        preImage,
      },
    };
  },
});

// The full tool set for Pro routes — passed to generateText.
export const PRO_TOOLS = {
  getDashboardOverview,
  getRentCollection,
  getWorkOrders,
  getComplianceOverview,
  getClientPortfolio,
  proposeMarkRentPaid,
  proposeLogRentPayment,
  proposeRenewLease,
  proposeCreateWorkOrder,
  proposeUpdateWorkOrder,
  proposeResolveSafetyRisk,
  proposeAssignProperties,
};

// READ-only tools for non-Pro routes (no mutation proposals).
export const CONSUMER_TOOLS = {
  getDashboardOverview,
  getRentCollection,
  getWorkOrders,
  getComplianceOverview,
  getClientPortfolio,
};

// Human-readable label for each tool name — shown in the Activity pane.
export function toolSummaryLabel(toolName: string, args: Record<string, unknown>): string {
  switch (toolName) {
    case "getDashboardOverview":
      return "Read dashboard overview (KPIs, alerts, work orders)";
    case "getRentCollection":
      return "Read rent collection data for this month";
    case "getWorkOrders":
      return "Read work orders queue";
    case "getComplianceOverview":
      return "Read compliance overview (certifications, risks)";
    case "getClientPortfolio":
      return `Read portfolio for client ${args.clientId ?? ""}`;
    case "proposeMarkRentPaid":
      return `Prepared rent mark-paid proposal (payment ${args.paymentId ?? ""})`;
    case "proposeLogRentPayment":
      return `Prepared rent payment log proposal for lease ${args.leaseId ?? ""}`;
    case "proposeRenewLease":
      return `Prepared lease renewal proposal (lease ${args.leaseId ?? ""})`;
    case "proposeCreateWorkOrder":
      return `Prepared new work order proposal: "${args.title ?? ""}"`;
    case "proposeUpdateWorkOrder":
      return `Prepared work order update proposal (${args.id ?? ""})`;
    case "proposeResolveSafetyRisk":
      return `Prepared safety risk resolution proposal (${args.riskId ?? ""})`;
    case "proposeAssignProperties":
      return `Prepared property assignment proposal to client ${args.clientId ?? ""}`;
    default:
      return `Called tool: ${toolName}`;
  }
}
