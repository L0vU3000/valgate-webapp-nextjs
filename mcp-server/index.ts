// Valgate MCP server. A standalone (non-Next.js) process that exposes Valgate data and actions
// to an MCP client over stdio. It reuses the transport-pure services in lib/services/* unchanged;
// the only new seam is ctxFor(), which supplies the identity (a hardcoded demo owner for now).
//
// Safety posture (see docs/MCP implementation/03-authorization-plan.md):
//   - Reads are always available.
//   - Writes are OFF unless MCP_ALLOW_WRITES=true (Phase B). This is separate from the web app's
//     DEMO_ALLOW_WRITES so the server can be left connected read-only.
//   - Deleting a property is a two-step confirm (Phase A2): preview first, then confirm with a token.
//   - Archiving (reversible) is preferred over deleting.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createHmac, randomBytes } from "node:crypto";
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
import { ctxFor } from "./ctxFor";

const server = new McpServer({
  name: "valgate",
  version: "0.2.0",
});

// ── Phase B: read-only by default ──────────────────────────────────────────────────────────
// The whole write surface is gated behind one env flag. Unset (default) = read-only.
const MCP_ALLOW_WRITES = process.env.MCP_ALLOW_WRITES === "true";

// Every mutating tool calls this first. Returns an error result when writes are off (so the tool
// stops), or null when writes are allowed (so the tool proceeds).
function refuseIfReadOnly() {
  if (!MCP_ALLOW_WRITES) {
    return {
      content: [
        {
          type: "text" as const,
          text: "This Valgate MCP server is running in read-only mode. Set MCP_ALLOW_WRITES=true to enable edits.",
        },
      ],
      isError: true,
    };
  }
  return null;
}

// ── Phase A2: stateless delete-confirm token ───────────────────────────────────────────────
// A delete needs a token the caller can only obtain by first previewing the delete (which reads
// the property). The token is an HMAC over the property's id + updatedAt using a secret generated
// fresh at each boot. Consequences: the token can't be guessed without previewing, and it stops
// matching if the property is edited after the preview (updatedAt changes), forcing a re-preview.
const CONFIRM_SECRET = randomBytes(16);
function confirmTokenFor(id: string, updatedAt: number): string {
  return createHmac("sha256", CONFIRM_SECRET).update(`${id}:${updatedAt}`).digest("hex").slice(0, 12);
}

// ── Read tools ─────────────────────────────────────────────────────────────────────────────

// List every property in this workspace with its full details.
server.registerTool(
  "search_properties",
  {
    title: "Search properties",
    description:
      "Find the properties in this Valgate workspace. Returns each property's id, address, status, and key fields.",
    inputSchema: {},
  },
  async () => {
    try {
      const ctx = ctxFor();
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

// Show one property in full, plus a count of everything linked to it (leases, payments, documents,
// and so on). Read-only — handy before an edit or a delete.
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
  async ({ id }) => {
    try {
      const ctx = ctxFor();
      const property = await getProperty(ctx, id);
      if (!property) {
        return {
          content: [{ type: "text" as const, text: `No property found with id ${id}.` }],
          isError: true,
        };
      }
      const linked = await countPropertyCascade(ctx, id);
      return {
        content: [
          { type: "text" as const, text: JSON.stringify({ property, linked }, null, 2) },
        ],
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
  async ({ propertyId }) => {
    try {
      const ctx = ctxFor();
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

// ── Write tools (gated by MCP_ALLOW_WRITES) ────────────────────────────────────────────────

// Edit an existing property. Takes the id plus a `patch` object holding only the fields to change.
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
  async ({ id, patch }) => {
    const blocked = refuseIfReadOnly();
    if (blocked) return blocked;
    try {
      const ctx = ctxFor();
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

// Phase A1: archive (reversible soft-delete). Flips the isArchived flag via the normal update path,
// so the property drops out of the active list but can be restored. Prefer this over delete.
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
  async ({ id, archived }) => {
    const blocked = refuseIfReadOnly();
    if (blocked) return blocked;
    try {
      const ctx = ctxFor();
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

// Phase A2: permanent delete, two-step. Call with just `id` for a preview (nothing is deleted) —
// the response includes what will be removed and a confirmToken. Call again with that confirmToken
// to actually delete. This forces a real read of the property before an irreversible cascade.
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
  async ({ id, confirmToken }) => {
    const blocked = refuseIfReadOnly();
    if (blocked) return blocked;
    try {
      const ctx = ctxFor();

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
  async ({ item }) => {
    const blocked = refuseIfReadOnly();
    if (blocked) return blocked;
    try {
      const ctx = ctxFor();
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

// ── Boot ───────────────────────────────────────────────────────────────────────────────────
// tsx compiles these .ts files as CommonJS, which forbids top-level await, so connect() lives in
// an async main(). A boot failure logs and exits non-zero.
async function main() {
  // Phase C: refuse to run over a network transport while identity is still hardcoded. ctxFor()
  // returns a fixed demo owner; that is only safe for a local stdio process. When you wire real
  // per-caller auth into ctxFor(), flip IDENTITY_IS_REAL to true.
  const IDENTITY_IS_REAL = false;
  if (!IDENTITY_IS_REAL && process.env.MCP_TRANSPORT === "http") {
    console.error(
      "[valgate-mcp] refusing to start over HTTP: ctxFor() still returns a hardcoded owner. Wire real auth first.",
    );
    process.exit(1);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("[valgate-mcp] failed to start:", err);
  process.exit(1);
});
