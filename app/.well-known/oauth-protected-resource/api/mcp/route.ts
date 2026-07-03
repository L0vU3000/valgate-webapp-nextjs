// OAuth "protected resource" metadata for the MCP endpoint at /api/mcp.
//
// MCP clients fetch this to discover that Clerk is the authorization server and which scopes to
// request, then run the Clerk login flow before calling the MCP endpoint. protectedResourceHandlerClerk
// fills in the Clerk-specific issuer details automatically.
import {
  protectedResourceHandlerClerk,
  metadataCorsOptionsRequestHandler,
} from "@clerk/mcp-tools/next";

// The scopes this MCP server exposes, named so the consent screen's keyword classifier buckets
// them into View / Modify / Delete groups (see app/(auth)/oauth-consent). These describe the tool
// surface the user is granting Claude; the per-user org role still gates what they can actually do.
//
// IMPORTANT: these exact scope names MUST also be defined on the Clerk OAuth application in the
// Clerk Dashboard, or Clerk rejects the authorization request as an unknown scope. Recommended
// human descriptions to set there:
//   valgate:read   → "View your properties and their details"
//   valgate:write  → "Create and update properties and maintenance items"
//   valgate:delete → "Permanently delete properties"
const handler = protectedResourceHandlerClerk({
  scopes_supported: ["valgate:read", "valgate:write", "valgate:delete"],
});
const corsHandler = metadataCorsOptionsRequestHandler();

export { handler as GET, corsHandler as OPTIONS };
