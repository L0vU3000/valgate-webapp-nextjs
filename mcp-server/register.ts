// Shared MCP wiring used by BOTH front doors:
//   - the stdio server (mcp-server/index.ts) — demo Ctx, local dev
//   - the authenticated HTTP route (app/mcp/route.ts) — real Clerk-authenticated Ctx
//
// The only thing that differs between them is *who is asking*. That is injected as `getCtx`:
// stdio passes a function that returns the demo Ctx; HTTP passes one that resolves the Clerk
// OAuth token to a real Ctx (see ./ctxFor:ctxFromMcpAuth). Everything else — the one tool and
// all the resources — is identical, so the two transports can never drift apart.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Ctx } from "@/lib/services/_mapping";
import { listProperties } from "@/lib/services/properties";
import { registerResources } from "./resources";

// The per-call context resolver. It receives the MCP request's `extra` object (which carries
// `authInfo` on the authenticated HTTP path) and returns the Valgate Ctx to run the read as.
// We only read `authInfo.extra` here, so the type is kept deliberately small and transport-agnostic.
export type McpCallExtra = {
  authInfo?: {
    extra?: Record<string, unknown>;
  };
};

export type GetCtx = (extra: McpCallExtra) => Promise<Ctx>;

export function registerValgateMcp(server: McpServer, getCtx: GetCtx): void {
  // The one tool: an entry point. The AI calls this to get property ids, then pulls the full
  // record (and everything under it) from the valgate://property/{id} resource — not more tools.
  server.registerTool(
    "search_properties",
    {
      title: "Search properties",
      description:
        "Find the properties in this Valgate workspace. Returns each property's id, address, status, and key fields.",
      inputSchema: z.object({}),
    },
    async (_args, extra) => {
      try {
        const ctx = await getCtx(extra);
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

  // All reading beyond the search entry point is served by resources (keeps the tool list short).
  registerResources(server, getCtx);
}
