// The Valgate MCP tool definitions, in ONE place so both entry points share them:
//   - the local stdio server (mcp-server/index.ts), and
//   - the Vercel HTTP route (app/[transport]/route.ts).
//
// Each entry point passes its own `deps`: how to resolve identity (ctxFor), whether writes are
// allowed, and the secret used to sign delete-confirmation tokens. Nothing here imports Clerk or
// Next.js, so the file stays transport-neutral.
import { createHmac, randomBytes } from "node:crypto";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { z } from "zod";
import type { Ctx } from "@/lib/services/_mapping";
import {
  listProperties,
  getProperty,
  updateProperty,
  deleteProperty,
  countPropertyCascade,
} from "@/lib/services/properties";
import { PropertyPatchSchema } from "@/lib/data/types/property";
import { listMaintenanceItems, createMaintenanceItem } from "@/lib/services/maintenance-items";
import { NewMaintenanceItemSchema } from "@/lib/data/types/maintenance-item";

// What each caller must supply to wire up the tools.
export type ToolDeps = {
  // Resolve the acting identity for a request. On HTTP this reads the authenticated Clerk user
  // from `authInfo`; on local stdio it ignores `authInfo` and returns the demo owner.
  ctxFor: (authInfo: AuthInfo | undefined) => Ctx | Promise<Ctx>;
  // When false, every mutating tool refuses with a clear message (read-only surface).
  allowWrites: boolean;
  // Stable secret for signing delete-confirmation tokens. Empty string => fall back to a per-boot
  // random (fine for a single local process; NOT fine across serverless instances — pass a real
  // value there so preview and confirm agree).
  confirmSecret: string;
};

// Fallback secret for local dev when confirmSecret is empty. One per process.
const FALLBACK_CONFIRM_SECRET = randomBytes(16).toString("hex");

// Register all Valgate tools on the given MCP server instance.
export function registerValgateTools(server: McpServer, deps: ToolDeps): void {
  // Signs a delete-confirmation token bound to a property's id + updatedAt. The caller can only
  // produce the right token by first previewing the delete (which reads the property), and the
  // token stops matching if the property changes afterwards.
  const confirmTokenFor = (id: string, updatedAt: number): string => {
    const key = deps.confirmSecret.length > 0 ? deps.confirmSecret : FALLBACK_CONFIRM_SECRET;
    return createHmac("sha256", key).update(`${id}:${updatedAt}`).digest("hex").slice(0, 12);
  };

  // Returns an error result when writes are off (so a mutating tool stops), or null when allowed.
  const refuseIfReadOnly = () => {
    if (!deps.allowWrites) {
      return {
        content: [
          {
            type: "text" as const,
            text: "This Valgate MCP server is running in read-only mode. Writes are disabled.",
          },
        ],
        isError: true,
      };
    }
    return null;
  };

  // ── Read tools ─────────────────────────────────────────────────────────────────────────────

  // List every property this caller can see.
  server.registerTool(
    "search_properties",
    {
      title: "Search properties",
      description:
        "Find the properties in this Valgate workspace. Returns each property's id, address, status, and key fields.",
      inputSchema: {},
    },
    async (_args, extra) => {
      try {
        const ctx = await deps.ctxFor(extra.authInfo);
        const data = await listProperties(ctx);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
          structuredContent: { data },
        };
      } catch (err) {
        // Never return err.message to the client — log internally, return a generic string.
        console.error("[valgate-mcp] search_properties failed:", err);
        return {
          content: [{ type: "text" as const, text: "Could not load properties." }],
          isError: true,
        };
      }
    },
  );

  // Show one property in full, plus a count of everything linked to it. Read-only.
  server.registerTool(
    "preview_property",
    {
      title: "Preview property",
      description:
        "Show one property's full details plus a count of everything linked to it (leases, payments, documents, etc.). Read-only.",
      inputSchema: {
        id: z.string().describe("The property id to preview, e.g. PROP-0001."),
      },
    },
    async ({ id }, extra) => {
      try {
        const ctx = await deps.ctxFor(extra.authInfo);
        const property = await getProperty(ctx, id);
        if (!property) {
          return {
            content: [{ type: "text" as const, text: `No property found with id ${id}.` }],
            isError: true,
          };
        }
        const linked = await countPropertyCascade(ctx, id);
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ property, linked }, null, 2) }],
          structuredContent: { data: { property, linked } },
        };
      } catch (err) {
        console.error("[valgate-mcp] preview_property failed:", err);
        return {
          content: [{ type: "text" as const, text: "Could not load the property." }],
          isError: true,
        };
      }
    },
  );

  // List maintenance items, optionally for a single property.
  server.registerTool(
    "list_maintenance_items",
    {
      title: "List maintenance items",
      description:
        "List logged maintenance issues. Pass a propertyId to see only that property's items, or omit it for all of them.",
      inputSchema: {
        propertyId: z
          .string()
          .optional()
          .describe("Optional property id to filter by, e.g. PROP-0001."),
      },
    },
    async ({ propertyId }, extra) => {
      try {
        const ctx = await deps.ctxFor(extra.authInfo);
        const data = await listMaintenanceItems(ctx, propertyId);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
          structuredContent: { data },
        };
      } catch (err) {
        console.error("[valgate-mcp] list_maintenance_items failed:", err);
        return {
          content: [{ type: "text" as const, text: "Could not load maintenance items." }],
          isError: true,
        };
      }
    },
  );

  // ── Write tools (gated by deps.allowWrites) ────────────────────────────────────────────────

  // Edit an existing property with a partial patch.
  server.registerTool(
    "update_property",
    {
      title: "Update property",
      description:
        "Edit one of your properties. Provide the property's id and a `patch` object with just the fields to change (address, status, financials, etc.). Returns the updated property.",
      inputSchema: {
        id: z.string().describe("The property id to update, e.g. PROP-0001."),
        patch: PropertyPatchSchema.describe("Only the fields you want to change."),
      },
    },
    async ({ id, patch }, extra) => {
      const blocked = refuseIfReadOnly();
      if (blocked) return blocked;
      try {
        const ctx = await deps.ctxFor(extra.authInfo);
        const updated = await updateProperty(ctx, id, patch);
        // scopedUpdate returns null when no property with that id exists in this org.
        if (!updated) {
          return {
            content: [{ type: "text" as const, text: `No property found with id ${id}.` }],
            isError: true,
          };
        }
        return {
          content: [{ type: "text" as const, text: JSON.stringify(updated, null, 2) }],
          structuredContent: { data: updated },
        };
      } catch (err) {
        console.error("[valgate-mcp] update_property failed:", err);
        return {
          content: [{ type: "text" as const, text: "Could not update the property." }],
          isError: true,
        };
      }
    },
  );

  // Archive (reversible soft-delete) via the normal update path. Preferred over delete.
  server.registerTool(
    "archive_property",
    {
      title: "Archive property",
      description:
        "Hide a property from your active list without deleting it. Reversible — pass archived:false to restore. Prefer this over delete_property.",
      inputSchema: {
        id: z.string().describe("The property id to archive, e.g. PROP-0001."),
        archived: z
          .boolean()
          .default(true)
          .describe("true to archive (default), false to restore."),
      },
    },
    async ({ id, archived }, extra) => {
      const blocked = refuseIfReadOnly();
      if (blocked) return blocked;
      try {
        const ctx = await deps.ctxFor(extra.authInfo);
        const updated = await updateProperty(ctx, id, { isArchived: archived });
        if (!updated) {
          return {
            content: [{ type: "text" as const, text: `No property found with id ${id}.` }],
            isError: true,
          };
        }
        return {
          content: [
            {
              type: "text" as const,
              text: `Property ${id} is now ${archived ? "archived" : "restored"}.`,
            },
          ],
          structuredContent: { data: { id, isArchived: archived } },
        };
      } catch (err) {
        console.error("[valgate-mcp] archive_property failed:", err);
        return {
          content: [{ type: "text" as const, text: "Could not archive the property." }],
          isError: true,
        };
      }
    },
  );

  // Permanent delete, two-step. Call with just `id` for a preview (nothing deleted) that returns a
  // confirmToken; call again with that token to actually delete.
  server.registerTool(
    "delete_property",
    {
      title: "Delete property (permanent)",
      description:
        "PERMANENTLY delete a property and all its records. Cannot be undone (prefer archive_property). " +
        "Step 1: call with just `id` to preview and receive a confirmToken. " +
        "Step 2: call again with that confirmToken to delete.",
      inputSchema: {
        id: z.string().describe("The property id to delete, e.g. PROP-0001."),
        confirmToken: z
          .string()
          .optional()
          .describe("Omit for a preview; pass the token from the preview to confirm deletion."),
      },
    },
    async ({ id, confirmToken }, extra) => {
      const blocked = refuseIfReadOnly();
      if (blocked) return blocked;
      try {
        const ctx = await deps.ctxFor(extra.authInfo);

        // Read the property first: existence check + source of the confirm token.
        const property = await getProperty(ctx, id);
        if (!property) {
          return {
            content: [{ type: "text" as const, text: `No property found with id ${id}.` }],
            isError: true,
          };
        }

        const cascade = await countPropertyCascade(ctx, id);
        const expectedToken = confirmTokenFor(id, property.updatedAt);

        // Step 1 (no token) OR a wrong/stale token → preview, delete nothing.
        if (confirmToken !== expectedToken) {
          const reason =
            confirmToken === undefined
              ? "Preview — nothing deleted."
              : "confirmToken was missing, wrong, or stale (property changed) — nothing deleted.";
          return {
            content: [
              {
                type: "text" as const,
                text:
                  `${reason}\nTo permanently delete ${id}, call delete_property again with ` +
                  `confirmToken="${expectedToken}".\nThis will remove:\n${JSON.stringify(cascade, null, 2)}`,
              },
            ],
            structuredContent: {
              data: { id, deleted: false, confirmToken: expectedToken, cascade },
            },
          };
        }

        // Step 2: confirmed. Permanent cascade delete.
        await deleteProperty(ctx, id);
        return {
          content: [
            {
              type: "text" as const,
              text: `Permanently deleted ${id} and its related records:\n${JSON.stringify(cascade, null, 2)}`,
            },
          ],
          structuredContent: { data: { id, deleted: true, cascade } },
        };
      } catch (err) {
        console.error("[valgate-mcp] delete_property failed:", err);
        return {
          content: [{ type: "text" as const, text: "Could not delete the property." }],
          isError: true,
        };
      }
    },
  );

  // Log a new maintenance issue against a property.
  server.registerTool(
    "create_maintenance_item",
    {
      title: "Log maintenance issue",
      description:
        "Log a maintenance issue for a property. Requires the propertyId, a title, a severity (Emergency/Urgent/Standard), and a status (Open/InProgress/Resolved/Cancelled).",
      inputSchema: {
        item: NewMaintenanceItemSchema.describe("The maintenance issue to log."),
      },
    },
    async ({ item }, extra) => {
      const blocked = refuseIfReadOnly();
      if (blocked) return blocked;
      try {
        const ctx = await deps.ctxFor(extra.authInfo);
        const created = await createMaintenanceItem(ctx, item);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(created, null, 2) }],
          structuredContent: { data: created },
        };
      } catch (err) {
        console.error("[valgate-mcp] create_maintenance_item failed:", err);
        return {
          content: [{ type: "text" as const, text: "Could not log the maintenance issue." }],
          isError: true,
        };
      }
    },
  );
}
