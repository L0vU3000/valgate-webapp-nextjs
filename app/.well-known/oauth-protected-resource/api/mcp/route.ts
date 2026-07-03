// OAuth "protected resource" metadata for the MCP endpoint at /api/mcp.
//
// MCP clients fetch this to discover that Clerk is the authorization server and which scopes to
// request, then run the Clerk login flow before calling the MCP endpoint. protectedResourceHandlerClerk
// fills in the Clerk-specific issuer details automatically.
import {
  protectedResourceHandlerClerk,
  metadataCorsOptionsRequestHandler,
} from "@clerk/mcp-tools/next";

// Scopes advertised for this MCP resource. Clerk's OAuth only permits a FIXED identity-scope set
// (verified against the live instance: openid, offline_access, user:org:read, profile,
// public_metadata, private_metadata, email) — custom app scopes like "valgate:delete" are rejected
// with form_param_value_invalid. So we advertise the identity scopes we rely on; the actual
// read/write/delete capability of each MCP tool is gated by the caller's org role, NOT by an OAuth
// scope. (This is why the consent UI can only show a "View"-style group — see
// docs/MCP implementation/05-vercel-deploy-plan.md.)
const handler = protectedResourceHandlerClerk({
  scopes_supported: ["openid", "profile", "email"],
});
const corsHandler = metadataCorsOptionsRequestHandler();

export { handler as GET, corsHandler as OPTIONS };
