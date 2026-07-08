// Phase 4 — the write tools (outcome-shaped, audited, guarded).
//
// Design laws this file follows (from 02-ideal-mcp-design.md §C/§G):
//   - Tools are THIN wrappers over existing lib/services/* functions — no new business logic here.
//   - Inputs validate with the SAME Zod schemas the website uses (NewPropertySchema, …).
//   - Authorization is NOT re-implemented: the service layer already enforces org-scope, role
//     (requireMember / admin-only delete), and demo read-only (assertCanMutate). A viewer, a
//     wrong-org caller, or a demo instance is refused for free, deep in the service.
//   - Never leak err.message to the client — log internally, return a generic string.
//   - Every write is AUDITED via logActivity (activities table), wrapped so an audit failure can
//     never undo or hide the real change.
//   - Multi-tenant safety (M2): writes resolve their Ctx with requireExplicitOrg=true, so a
//     multi-org caller must name the org (getCtx throws "org_required" otherwise). Guessing an org
//     for a write is forbidden.
//   - Destructive delete is behind a confirm gate + a blast-radius preview (§G rules 6, 7).
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { NewPropertySchema, PropertyPatchSchema } from "@/lib/data/types/property";
import { NewMaintenanceItemSchema } from "@/lib/data/types/maintenance-item";
import { logActivity, type LogActivityInput } from "@/lib/services/activity";
import type { Ctx } from "@/lib/services/_mapping";
import type { GetCtx, McpCallExtra } from "./register";
import { VALGATE_TOOLS, type ReadOrWriteDef, type DestructiveDef } from "./tool-defs";

// A tool result the MCP SDK understands. `structuredContent` is the typed payload; `content` is the
// human-readable mirror. `isError: true` marks a tool-level failure (not a protocol error).
// Exported so the sibling rental write-tools module (writes-rental.ts) reuses the exact same
// result shape and helpers instead of duplicating them.
export type ToolResult = {
  content: { type: "text"; text: string }[];
  structuredContent?: { data: unknown };
  isError?: boolean;
};

export function toolOk(data: unknown): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    structuredContent: { data },
  };
}

export function toolError(message: string): ToolResult {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

// The `orgId` argument every write tool accepts. Reused so the description (and the fact it is
// optional-but-required-for-multi-org) is stated identically everywhere.
export const orgIdArg = z
  .string()
  .optional()
  .describe(
    "The workspace (organization) id to act in, e.g. ORG-0001. Optional if you belong to only one workspace; REQUIRED if you belong to several. Use list_workspaces to find it.",
  );

// Resolve the Ctx for a write. Writes never fall back to a guessed org, so we always pass
// requireExplicitOrg=true. Returns either a ready Ctx or a ToolResult to send straight back:
//   - "org_required" (multi-org caller gave no orgId) → actionable guidance, not a bare error.
//   - anything else (unknown user, org they're not in, …) → generic "not authorized".
export async function resolveWriteCtx(
  getCtx: GetCtx,
  extra: McpCallExtra,
  orgId: string | undefined,
  humanAction: string,
): Promise<{ ctx: Ctx } | { error: ToolResult }> {
  try {
    const ctx = await getCtx(extra, { requestedOrgId: orgId, requireExplicitOrg: true });
    return { ctx };
  } catch (err) {
    if (err instanceof Error && err.message === "org_required") {
      return {
        error: toolError(
          `You belong to more than one workspace, so I can't tell which one to ${humanAction} in. Call list_workspaces to see them, then retry with the orgId argument set.`,
        ),
      };
    }
    console.error("[valgate-mcp] write ctx resolution failed:", err);
    return { error: toolError("You are not authorized to act in that workspace.") };
  }
}

// Write one audit row. Deliberately swallows its own errors: a failed audit must never roll back
// or mask a mutation that already succeeded (it is logged so we still notice).
export async function audit(ctx: Ctx, input: LogActivityInput): Promise<void> {
  try {
    await logActivity(ctx, input);
  } catch (err) {
    console.error("[valgate-mcp] audit log failed (mutation already succeeded):", err);
  }
}

export function registerWriteTools(server: McpServer, getCtx: GetCtx): void {
  // ── create_property ────────────────────────────────────────────────────────
  server.registerTool(
    "create_property",
    {
      title: "Create property",
      description:
        "Add a new property to a workspace. Requires the core property fields (name, type, status, coordinates, purchase value, area, title). Requires member access or higher.",
      inputSchema: z.object({
        orgId: orgIdArg,
        property: NewPropertySchema.describe("The new property's fields, validated on the server."),
      }),
    },
    async (args, extra) => {
      const resolved = await resolveWriteCtx(getCtx, extra, args.orgId, "create the property");
      if ("error" in resolved) return resolved.error;
      const def = VALGATE_TOOLS.find((d) => d.name === "create_property")! as ReadOrWriteDef;
      const result = await def.run(resolved.ctx, { property: args.property });
      if (!result.ok) return toolError(result.message);
      if (def.audit) {
        const entry = def.audit(resolved.ctx, { property: args.property }, result.data);
        await audit(resolved.ctx, { ...entry, summary: `${entry.summary} via MCP` });
      }
      return toolOk(result.data);
    },
  );

  // ── update_property ──────────────────────────────────────────────────────────
  server.registerTool(
    "update_property",
    {
      title: "Update property",
      description:
        "Change fields on an existing property. Only the fields you pass in `patch` are updated; everything else is left as-is. Requires member access or higher.",
      inputSchema: z.object({
        orgId: orgIdArg,
        id: z.string().describe("The property id to update, e.g. PROP-0001."),
        patch: PropertyPatchSchema.describe(
          "The subset of property fields to change. Omitted fields are left unchanged.",
        ),
      }),
    },
    async (args, extra) => {
      const resolved = await resolveWriteCtx(getCtx, extra, args.orgId, "update the property");
      if ("error" in resolved) return resolved.error;
      const def = VALGATE_TOOLS.find((d) => d.name === "update_property")! as ReadOrWriteDef;
      const result = await def.run(resolved.ctx, { id: args.id, patch: args.patch });
      if (!result.ok) return toolError(result.message);
      if (def.audit) {
        const entry = def.audit(resolved.ctx, { id: args.id, patch: args.patch }, result.data);
        await audit(resolved.ctx, { ...entry, summary: `${entry.summary} via MCP` });
      }
      return toolOk(result.data);
    },
  );

  // ── preview_property_delete ────────────────────────────────────────────────────
  // The blast-radius preview. Read-only, delegates to VALGATE_TOOLS delete_property.preview.
  server.registerTool(
    "preview_property_delete",
    {
      title: "Preview property delete",
      description:
        "Show what would be permanently destroyed if a property were deleted (its leases, payments, documents, and every other linked record) — WITHOUT deleting anything. Always run this before delete_property.",
      inputSchema: z.object({
        orgId: orgIdArg,
        id: z.string().describe("The property id to inspect, e.g. PROP-0001."),
      }),
    },
    async (args, extra) => {
      const resolved = await resolveWriteCtx(getCtx, extra, args.orgId, "preview the delete");
      if ("error" in resolved) return resolved.error;
      const def = VALGATE_TOOLS.find((d) => d.name === "delete_property")! as DestructiveDef;
      const preview = await def.preview(resolved.ctx, { id: args.id });
      if (!preview.ok) return toolError(preview.message);
      return toolOk(preview.data);
    },
  );

  // ── delete_property ────────────────────────────────────────────────────────────
  // Permanent, irreversible, admin-only (enforced in the service). Delegates preview/commit
  // to VALGATE_TOOLS; the confirm flag maps to preview vs commit per design.md Decision 3.
  server.registerTool(
    "delete_property",
    {
      title: "Delete property",
      description:
        "Permanently delete a property and ALL of its linked records (leases, payments, documents, …). Irreversible and admin-only. Call with confirm: false first to see the blast radius; call again with confirm: true to actually delete.",
      inputSchema: z.object({
        orgId: orgIdArg,
        id: z.string().describe("The property id to delete, e.g. PROP-0001."),
        confirm: z
          .boolean()
          .optional()
          .describe(
            "Must be true to actually delete. When false or omitted, nothing is deleted and a preview of what WOULD be destroyed is returned instead.",
          ),
      }),
    },
    async (args, extra) => {
      const resolved = await resolveWriteCtx(getCtx, extra, args.orgId, "delete the property");
      if ("error" in resolved) return resolved.error;
      const def = VALGATE_TOOLS.find((d) => d.name === "delete_property")! as DestructiveDef;
      const preview = await def.preview(resolved.ctx, { id: args.id });
      if (!preview.ok) return toolError(preview.message);

      if (args.confirm !== true) {
        return toolOk({
          ...preview.data,
          confirmRequired: true,
          note: `Nothing was deleted. Re-call ${def.name} with confirm: true to proceed.`,
        });
      }

      const result = await def.commit(resolved.ctx, { id: args.id });
      if (!result.ok) return toolError(result.message);
      if (def.audit) {
        const entry = def.audit(resolved.ctx, { id: args.id }, result.data);
        await audit(resolved.ctx, { ...entry, summary: `${entry.summary} via MCP` });
      }
      return toolOk(result.data);
    },
  );

  // ── record_maintenance ────────────────────────────────────────────────────────
  // An example of an intent-shaped write: "log a maintenance issue for a property".
  // Delegates to VALGATE_TOOLS; audited like every other write.
  server.registerTool(
    "record_maintenance",
    {
      title: "Record maintenance",
      description:
        "Log a maintenance issue against a property (its severity, title, and status). Requires member access or higher.",
      inputSchema: z.object({
        orgId: orgIdArg,
        item: NewMaintenanceItemSchema.describe(
          "The maintenance item: which property, severity, title, and status.",
        ),
      }),
    },
    async (args, extra) => {
      const resolved = await resolveWriteCtx(getCtx, extra, args.orgId, "record maintenance");
      if ("error" in resolved) return resolved.error;
      const def = VALGATE_TOOLS.find((d) => d.name === "record_maintenance")! as ReadOrWriteDef;
      const result = await def.run(resolved.ctx, { item: args.item });
      if (!result.ok) return toolError(result.message);
      if (def.audit) {
        const entry = def.audit(resolved.ctx, { item: args.item }, result.data);
        await audit(resolved.ctx, { ...entry, summary: `${entry.summary} via MCP` });
      }
      return toolOk(result.data);
    },
  );

}
