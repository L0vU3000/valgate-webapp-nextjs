// OAuth "protected resource" metadata for the MCP endpoint at /api/mcp.
//
// MCP clients fetch this to discover that Clerk is the authorization server and which scopes to
// request, then run the Clerk login flow before calling the MCP endpoint. protectedResourceHandlerClerk
// fills in the Clerk-specific issuer details automatically.
import {
  protectedResourceHandlerClerk,
  metadataCorsOptionsRequestHandler,
} from "@clerk/mcp-tools/next";

// Keep the requested scopes minimal — just enough to identify the user.
const handler = protectedResourceHandlerClerk({ scopes_supported: ["email", "profile"] });
const corsHandler = metadataCorsOptionsRequestHandler();

export { handler as GET, corsHandler as OPTIONS };
