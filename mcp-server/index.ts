// Valgate MCP server — stdio transport, demo Ctx (local dev / MCP Inspector / Claude Desktop).
// Proves a non-Next.js process can import lib/services/* and return real Neon data.
// Nothing here touches Clerk or the web layer — the Ctx comes from ctxFor() (the demo identity).
//
// The authenticated, multi-tenant front door is the HTTP route at app/mcp/route.ts (Phase 3).
// Both register the SAME tool + resources via registerValgateMcp() — the only difference is how
// the Ctx is resolved: demo here, Clerk-authenticated over HTTP.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ctxFor } from "./ctxFor";
import { registerValgateMcp } from "./register";

const server = new McpServer({
  name: "valgate",
  version: "0.3.0",
});

// Demo identity for local dev — the stdio server ignores the request's auth and always runs as
// the ORG-0001 owner. Writes are still refused at the service layer under DEMO_MODE.
registerValgateMcp(server, async () => ctxFor());

// Start the server. This is wrapped in an async function (instead of a top-level `await`)
// because tsx transforms this file as CommonJS — and CommonJS does not support top-level
// await. Making the whole Next.js app ESM ("type": "module") would be a far bigger change,
// so the server entry point keeps its startup inside main() instead.
async function main() {
  // Refuse to run over a network transport from this local entry point while identity is hardcoded.
  // The real network surface is the Clerk-authenticated Vercel route, not this file.
  const IDENTITY_IS_REAL = false;
  if (!IDENTITY_IS_REAL && process.env.MCP_TRANSPORT === "http") {
    console.error(
      "[valgate-mcp] refusing to start over HTTP: this stdio entry point uses a hardcoded owner. Use the Clerk-authenticated app/[transport] route instead.",
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
