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
import {
  createProperty,
  updateProperty,
  deleteProperty,
  getProperty,
  countPropertyCascade,
} from "@/lib/services/properties";
import { createMaintenanceItem } from "@/lib/services/maintenance-items";
import { logActivity, type LogActivityInput } from "@/lib/services/activity";
import type { Ctx } from "@/lib/services/_mapping";
import type { GetCtx, McpCallExtra } from "./register";

// A tool result the MCP SDK understands. `structuredContent` is the typed payload; `content` is the
// human-readable mirror. `isError: true` marks a tool-level failure (not a protocol error).
type ToolResult = {
  content: { type: "text"; text: string }[];
  structuredContent?: { data: unknown };
  isError?: boolean;
};

function toolOk(data: unknown): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    structuredContent: { data },
  };
}

function toolError(message: string): ToolResult {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

// The `orgId` argument every write tool accepts. Reused so the description (and the fact it is
// optional-but-required-for-multi-org) is stated identically everywhere.
const orgIdArg = z
  .string()
  .optional()
  .describe(
    "The workspace (organization) id to act in, e.g. ORG-0001. Optional if you belong to only one workspace; REQUIRED if you belong to several. Use list_workspaces to find it.",
  );

// Resolve the Ctx for a write. Writes never fall back to a guessed org, so we always pass
// requireExplicitOrg=true. Returns either a ready Ctx or a ToolResult to send straight back:
//   - "org_required" (multi-org caller gave no orgId) → actionable guidance, not a bare error.
//   - anything else (unknown user, org they're not in, …) → generic "not authorized".
async function resolveWriteCtx(
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
async function audit(ctx: Ctx, input: LogActivityInput): Promise<void> {
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
      if ("error" in resolved) {
        return resolved.error;
      }
      try {
        const created = await createProperty(resolved.ctx, args.property);
        await audit(resolved.ctx, {
          entity: "property",
          action: "created",
          entityId: created.id,
          propertyId: created.id,
          summary: `Created property "${created.name}" via MCP`,
        });
        return toolOk(created);
      } catch (err) {
        console.error("[valgate-mcp] create_property failed:", err);
        return toolError("Could not create the property.");
      }
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
      if ("error" in resolved) {
        return resolved.error;
      }
      try {
        const updated = await updateProperty(resolved.ctx, args.id, args.patch);
        if (!updated) {
          return toolError(`No property ${args.id} exists in this workspace.`);
        }
        await audit(resolved.ctx, {
          entity: "property",
          action: "updated",
          entityId: updated.id,
          propertyId: updated.id,
          summary: `Updated property ${updated.id} ("${updated.name}") via MCP`,
        });
        return toolOk(updated);
      } catch (err) {
        console.error("[valgate-mcp] update_property failed:", err);
        return toolError("Could not update the property.");
      }
    },
  );

  // ── preview_property_delete ────────────────────────────────────────────────────
  // The blast-radius preview. Read-only: it counts every child row a delete would destroy so a
  // human can see the consequences before confirming. This is the "look before you leap" half of
  // the destructive-delete flow (§G rule 7).
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
      if ("error" in resolved) {
        return resolved.error;
      }
      try {
        const property = await getProperty(resolved.ctx, args.id);
        if (!property) {
          return toolError(`No property ${args.id} exists in this workspace.`);
        }
        const cascade = await countPropertyCascade(resolved.ctx, args.id);
        return toolOk({
          property: { id: property.id, name: property.name },
          cascade,
          note: "Nothing was deleted. To delete, call delete_property with confirm: true.",
        });
      } catch (err) {
        console.error("[valgate-mcp] preview_property_delete failed:", err);
        return toolError("Could not preview that delete.");
      }
    },
  );

  // ── delete_property ────────────────────────────────────────────────────────────
  // Permanent, irreversible, admin-only (enforced in the service). Two safety gates layered on top:
  //   1. confirm must be explicitly true. When it is false/omitted we DELETE NOTHING and instead
  //      return the blast-radius preview — so a delete can never happen on a single accidental call.
  //   2. the service's scopedDelete requires admin role and org-scope, so a member/viewer or a
  //      wrong-org caller is refused regardless of what they pass here.
  // (We can't track "did they call preview first?" because the HTTP server is stateless per request,
  // so the confirm flag IS the human-in-the-loop gate, and the false-path shows the preview.)
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
      if ("error" in resolved) {
        return resolved.error;
      }
      try {
        const property = await getProperty(resolved.ctx, args.id);
        if (!property) {
          return toolError(`No property ${args.id} exists in this workspace.`);
        }

        // Gate 1: no explicit confirmation → show the preview, delete nothing.
        if (args.confirm !== true) {
          const cascade = await countPropertyCascade(resolved.ctx, args.id);
          return toolOk({
            property: { id: property.id, name: property.name },
            cascade,
            confirmRequired: true,
            note: "Nothing was deleted. This is permanent and irreversible. Re-call delete_property with confirm: true to proceed.",
          });
        }

        // Confirmed. The service enforces admin-only + org-scope; a non-admin throws here.
        await deleteProperty(resolved.ctx, args.id);
        await audit(resolved.ctx, {
          entity: "property",
          action: "deleted",
          entityId: args.id,
          // No propertyId: the property row is gone, so we must not FK-reference it.
          summary: `Deleted property ${args.id} ("${property.name}") and all linked records via MCP`,
        });
        return toolOk({ deleted: args.id, name: property.name });
      } catch (err) {
        console.error("[valgate-mcp] delete_property failed:", err);
        return toolError("Could not delete that property.");
      }
    },
  );

  // ── record_maintenance ────────────────────────────────────────────────────────
  // An example of an intent-shaped write: "log a maintenance issue for a property". Requires
  // member access; audited like every other write.
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
      if ("error" in resolved) {
        return resolved.error;
      }
      try {
        const created = await createMaintenanceItem(resolved.ctx, args.item);
        await audit(resolved.ctx, {
          entity: "maintenance",
          action: "created",
          entityId: created.id,
          propertyId: created.propertyId,
          summary: `Logged maintenance "${created.title}" via MCP`,
        });
        return toolOk(created);
      } catch (err) {
        console.error("[valgate-mcp] record_maintenance failed:", err);
        return toolError("Could not record that maintenance item.");
      }
    },
  );
}
