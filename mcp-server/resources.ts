// Phase 2 + 3: register the read-only resources on the MCP server.
//
// Resources are addressable *data* (not actions), so they do not crowd the tool list — which
// is exactly the design law from 02-ideal-mcp-design.md §C/§D. All reading beyond the
// search_properties entry tool is served here.
//
//   valgate://property/{id}            → the property + every child list, nested
//   valgate://property/{id}/progress   → pillar-by-pillar completeness score
//   valgate://portfolio/snapshot       → per-property list + portfolio stats + KPIs
//
// Phase 3: the caller's identity is no longer hardcoded. Each read resolves a Ctx through the
// injected `getCtx` — demo Ctx on stdio, a real Clerk-authenticated Ctx over HTTP. Every read
// still reuses the ctx services via the builders in ./context, with the same error rule as the
// Phase 1 tool: log internally, surface a generic message (never a raw err.message).
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listProperties } from "@/lib/services/properties";
import type { GetCtx } from "./register";
import {
  buildPropertyResource,
  buildPropertyProgress,
  buildPortfolioSnapshot,
} from "./context";

// Small helper: a resource read that returns one JSON document at the given URI.
// Keeping the shape in one place makes every resource below read the same way.
function jsonContents(uri: URL, data: unknown) {
  return {
    contents: [
      {
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

// The template variable can arrive as a string or string[]; normalise to a single string.
function firstValue(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export function registerResources(server: McpServer, getCtx: GetCtx): void {
  // ── valgate://property/{id} ──────────────────────────────────────────────
  // The list callback enumerates every property as a concrete resource, so a client (or the
  // MCP Inspector) can browse them without guessing ids.
  server.registerResource(
    "property",
    new ResourceTemplate("valgate://property/{id}", {
      list: async (extra) => {
        try {
          const ctx = await getCtx(extra);
          const properties = await listProperties(ctx);
          return {
            resources: properties.map((property) => ({
              uri: `valgate://property/${property.id}`,
              name: property.name,
              description: `${property.type} · ${property.status}`,
              mimeType: "application/json",
            })),
          };
        } catch (err) {
          console.error("[valgate-mcp] listing property resources failed:", err);
          return { resources: [] };
        }
      },
    }),
    {
      title: "Property (full record)",
      description:
        "A single Valgate property with all of its children nested: leases, tenants, payments, valuations, ownership, safety, certifications, maintenance, documents, and more.",
      mimeType: "application/json",
    },
    async (uri, variables, extra) => {
      try {
        const id = firstValue(variables.id);
        const ctx = await getCtx(extra);
        const data = await buildPropertyResource(ctx, id);
        if (!data) {
          throw new Error(`Property ${id} not found in this workspace.`);
        }
        return jsonContents(uri, data);
      } catch (err) {
        console.error("[valgate-mcp] reading property resource failed:", err);
        throw new Error("Could not load that property.");
      }
    },
  );

  // ── valgate://property/{id}/progress ───────────────────────────────────────
  server.registerResource(
    "property-progress",
    new ResourceTemplate("valgate://property/{id}/progress", { list: undefined }),
    {
      title: "Property progress",
      description:
        "The completeness score for one property, broken down by pillar (Location, Financials, Rental, Ownership, Safety, Estate, Documents) with each check marked done or not.",
      mimeType: "application/json",
    },
    async (uri, variables, extra) => {
      try {
        const id = firstValue(variables.id);
        const ctx = await getCtx(extra);
        const data = await buildPropertyProgress(ctx, id);
        if (!data) {
          throw new Error(`Property ${id} not found in this workspace.`);
        }
        return jsonContents(uri, data);
      } catch (err) {
        console.error("[valgate-mcp] reading property progress failed:", err);
        throw new Error("Could not load that property's progress.");
      }
    },
  );

  // ── valgate://portfolio/snapshot ───────────────────────────────────────────
  // A static (non-templated) resource — there is one snapshot per workspace.
  server.registerResource(
    "portfolio-snapshot",
    "valgate://portfolio/snapshot",
    {
      title: "Portfolio snapshot",
      description:
        "A one-call overview of the whole workspace: every active property with its progress score, plus portfolio stats (occupancy, total value) and this month's rent KPIs.",
      mimeType: "application/json",
    },
    async (uri, extra) => {
      try {
        const ctx = await getCtx(extra);
        const data = await buildPortfolioSnapshot(ctx);
        return jsonContents(uri, data);
      } catch (err) {
        console.error("[valgate-mcp] reading portfolio snapshot failed:", err);
        throw new Error("Could not load the portfolio snapshot.");
      }
    },
  );
}
