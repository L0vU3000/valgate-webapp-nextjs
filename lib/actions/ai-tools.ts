import "server-only";

import { tool } from "ai";

import { requireCtx } from "@/lib/auth/ctx";
import { VALGATE_TOOLS, audit, type ValgateToolDef } from "@/mcp-server/tool-defs";

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
  search_properties: toolFor("search_properties"),
  search_professionals: toolFor("search_professionals"),
  create_property: toolFor("create_property"),
  update_property: toolFor("update_property"),
  delete_property: toolFor("delete_property"),
  record_maintenance: toolFor("record_maintenance"),
  update_maintenance: toolFor("update_maintenance"),
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
  // Single-owner chat gets one read-only lookup tool. The 5 old read tools were
  // Pro/manager-scoped (dashboard, rent roll, work orders, compliance, clients)
  // and were removed with the Pro cut. Richer owner-scoped tools + MCP write
  // tools are a tracked follow-up; for now the assistant answers mainly from the
  // portfolio context in its system prompt.
  search_properties: toolFor("search_properties"),
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
    case "search_professionals":
      return "Searched professionals/vendors";
    case "create_property":
      return "Created a property";
    case "update_property":
      return `Updated property ${args.id ?? ""}`;
    case "delete_property":
      return `Prepared property delete for approval (${args.id ?? ""})`;
    case "record_maintenance":
      return "Logged a maintenance item";
    case "update_maintenance":
      return args.patch && typeof args.patch === "object" && "vendorId" in args.patch
        ? `Assigned a vendor to maintenance item ${args.id ?? ""}`
        : `Updated maintenance item ${args.id ?? ""}`;
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
