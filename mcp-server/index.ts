// Local stdio entry point for the Valgate MCP server. Runs as a subprocess launched by an MCP
// client on your own machine (`npm run mcp:server`). The tool definitions live in ./tools.ts and
// are shared with the Vercel HTTP route; this file only wires them to stdio with the demo identity.
//
// Identity here is the hardcoded demo owner (ctxFor.ts). That is only safe for a local process —
// the HTTP route uses real Clerk auth instead. See docs/MCP implementation/05-vercel-deploy-plan.md.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerValgateTools } from "./tools";
import { ctxFor } from "./ctxFor";

const server = new McpServer({
  name: "valgate",
  version: "0.2.0",
});

registerValgateTools(server, {
  // Local stdio has no per-request auth — ignore authInfo, use the demo owner.
  ctxFor: () => ctxFor(),
  // Writes on/off via the same flag documented in .env.example.
  allowWrites: process.env.MCP_ALLOW_WRITES === "true",
  // Single long-lived process, so a per-boot random secret is fine here.
  confirmSecret: process.env.MCP_CONFIRM_SECRET ?? "",
});

// tsx compiles these .ts files as CommonJS, which forbids top-level await, so connect() lives in
// an async main(). A boot failure logs and exits non-zero.
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
