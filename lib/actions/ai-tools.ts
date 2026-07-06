import "server-only";

import { tool } from "ai";
import { z } from "zod";

import { requireCtx } from "@/lib/auth/ctx";
import {
  getProDashboardData,
  getRentPageData,
  getWorkOrdersPageData,
  getCompliancePageData,
  getClientPortfolioData,
} from "@/app/(pro)/pro/queries";
import { VALGATE_TOOLS, audit, type ValgateToolDef } from "@/mcp-server/tool-defs";

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
// Real action tools — built from the shared VALGATE_TOOLS registry
// (mcp-server/tool-defs.ts), the same bodies the MCP connector runs.
//
//   - "read" / "write" tools EXECUTE FOR REAL: the session's Ctx (requireCtx())
//     is resolved here, the tool body runs, and on a successful write we log
//     an audit row — exactly like the MCP surface, just with a session Ctx
//     instead of an OAuth one.
//   - "destructive" tools (the 4 deletes) do NOT execute. They run `preview()`
//     only and hand back a `proposedAction` — the amber ApprovalGate card in
//     the chat UI — so a human has to click Approve before anything is
//     permanently deleted. Approving calls `commit()` via
//     approveProposedAction() in ai-overlay.actions.ts.
// ---------------------------------------------------------------------------

function buildReadOrWriteTool(def: Extract<ValgateToolDef, { kind: "read" | "write" }>) {
  return tool({
    description: def.description,
    inputSchema: def.input,
    execute: async (args: Record<string, unknown>) => {
      const ctx = await requireCtx();
      const result = await def.run(ctx, args);
      if (!result.ok) return { error: result.message };
      if (def.kind === "write" && def.audit) {
        await audit(ctx, def.audit(ctx, args, result.data));
      }
      return result.data;
    },
  });
}

function buildDestructiveTool(def: Extract<ValgateToolDef, { kind: "destructive" }>) {
  return tool({
    description: def.description,
    inputSchema: def.input,
    execute: async (args: Record<string, unknown>) => {
      const ctx = await requireCtx();
      const preview = await def.preview(ctx, args);
      if (!preview.ok) return { error: preview.message };
      return {
        proposedAction: {
          toolName: def.name,
          args,
          consequence: preview.data.consequence,
          cascade: preview.data.cascade,
        },
      };
    },
  });
}

// Looks up a tool body by name in the shared registry and wraps it for the AI SDK. Throws at
// module load if a name is misspelled here — a build-time invariant, not a runtime concern.
function toolFor(name: string) {
  const def = VALGATE_TOOLS.find((candidate) => candidate.name === name);
  if (!def) throw new Error(`Unknown Valgate tool: ${name}`);
  return def.kind === "destructive" ? buildDestructiveTool(def) : buildReadOrWriteTool(def);
}

// The full tool set for Pro routes — passed to generateText. Reads for grounded answers, direct
// writes (create/update/record execute immediately), and gated deletes (propose → human approves).
export const PRO_TOOLS = {
  getDashboardOverview,
  getRentCollection,
  getWorkOrders,
  getComplianceOverview,
  getClientPortfolio,
  search_properties: toolFor("search_properties"),
  create_property: toolFor("create_property"),
  update_property: toolFor("update_property"),
  delete_property: toolFor("delete_property"),
  record_maintenance: toolFor("record_maintenance"),
  create_lease: toolFor("create_lease"),
  update_lease: toolFor("update_lease"),
  delete_lease: toolFor("delete_lease"),
  create_tenant: toolFor("create_tenant"),
  update_tenant: toolFor("update_tenant"),
  delete_tenant: toolFor("delete_tenant"),
  record_payment: toolFor("record_payment"),
  update_payment: toolFor("update_payment"),
  delete_payment: toolFor("delete_payment"),
};

// READ-only tools for non-Pro routes (no writes — property owners can't mutate via chat).
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
    case "search_properties":
      return "Searched properties";
    case "create_property":
      return "Created a property";
    case "update_property":
      return `Updated property ${args.id ?? ""}`;
    case "delete_property":
      return `Prepared property delete for approval (${args.id ?? ""})`;
    case "record_maintenance":
      return "Logged a maintenance item";
    case "create_lease":
      return "Created a lease";
    case "update_lease":
      return `Updated lease ${args.id ?? ""}`;
    case "delete_lease":
      return `Prepared lease delete for approval (${args.id ?? ""})`;
    case "create_tenant":
      return "Created a tenant";
    case "update_tenant":
      return `Updated tenant ${args.id ?? ""}`;
    case "delete_tenant":
      return `Prepared tenant delete for approval (${args.id ?? ""})`;
    case "record_payment":
      return "Recorded a payment";
    case "update_payment":
      return `Updated payment ${args.id ?? ""}`;
    case "delete_payment":
      return `Prepared payment delete for approval (${args.id ?? ""})`;
    default:
      return `Called tool: ${toolName}`;
  }
}
