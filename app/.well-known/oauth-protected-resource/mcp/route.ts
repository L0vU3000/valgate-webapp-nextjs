// Phase 3 — OAuth 2.0 Protected Resource Metadata (RFC 9728) for the MCP server at /mcp.
//
// This public, unauthenticated document tells an MCP client which Clerk authorization server to
// use to obtain a token. `withMcpAuth` (in app/mcp/route.ts) points 401 responses here via its
// `resourceMetadataPath`, so the path below must match: /.well-known/oauth-protected-resource/mcp.
//
// protectedResourceHandlerClerk derives the Clerk auth server URL from NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.
// The OPTIONS handler answers CORS preflight for browser-based MCP clients.
import {
  protectedResourceHandlerClerk,
  metadataCorsOptionsRequestHandler,
} from "@clerk/mcp-tools/next";

export const dynamic = "force-dynamic";

const handler = protectedResourceHandlerClerk();

export { handler as GET };
export const OPTIONS = metadataCorsOptionsRequestHandler();
