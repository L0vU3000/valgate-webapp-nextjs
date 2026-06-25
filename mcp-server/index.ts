// Phase 1 read spike: ONE tool, demo Ctx, stdio transport.
// Proves a non-Next.js process can import lib/services/* and return real Neon data.
// Nothing here touches Clerk or the web layer — the Ctx comes from ctxFor().
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { listProperties } from "@/lib/services/properties";
import { ctxFor } from "./ctxFor";

const server = new McpServer({
  name: "valgate",
  version: "0.1.0",
});

// Phase 2 note: when we add resources (valgate://property/{id}), this tool becomes a
// search/entry-point only. For now it returns the full list.
server.registerTool(
  "search_properties",
  {
    title: "Search properties",
    description:
      "Find the properties in this Valgate workspace. Returns each property's id, address, status, and key fields.",
    inputSchema: z.object({}),
  },
  async () => {
    try {
      const ctx = ctxFor(); // the new auth seam — Phase 3 replaces this with real token validation
      const data = await listProperties(ctx); // existing service, unchanged

      return {
        content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
        structuredContent: { data },
      };
    } catch (err) {
      // Never return err.message to the client — log internally, return a generic string (security rule).
      console.error("[valgate-mcp] search_properties failed:", err);
      return {
        content: [{ type: "text" as const, text: "Could not load properties." }],
        isError: true,
      };
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
