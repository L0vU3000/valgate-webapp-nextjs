// Phase 3 — the authenticated, multi-tenant MCP front door (HTTP transport).
//
// Flow: an AI client (Claude, Cursor, …) authenticates with Clerk via OAuth, gets a machine
// token, and sends it as a Bearer token to POST /mcp. `withMcpAuth` + `verifyClerkToken`
// validate that token; the resulting Clerk user id is turned into a real Valgate Ctx by
// ctxFromMcpAuth(). From there the SAME tool + resources as the stdio server run — org-scoping
// and role checks come for free from the service layer.
//
// Clerk OAuth tokens are "machine tokens" (free during Clerk's public beta, priced later).
// Discovery metadata lives at /.well-known/oauth-protected-resource/mcp (see that route).
import { auth } from "@clerk/nextjs/server";
import { verifyClerkToken } from "@clerk/mcp-tools/next";
import { createMcpHandler, experimental_withMcpAuth as withMcpAuth } from "mcp-handler";
import { registerValgateMcp } from "@/mcp-server/register";
import { ctxFromMcpAuth } from "@/mcp-server/ctxFor";
import { env } from "@/lib/env";

// This route hits the database per request and reads request auth — never statically prerender.
export const dynamic = "force-dynamic";

// M1 — audience binding via an OAuth client allowlist.
//
// Important reality about Clerk OAuth tokens: they are bound to the Clerk *instance*, NOT to this
// specific /mcp resource. `verifyClerkToken` (and Clerk's token verification underneath it) only
// confirm the token is a valid OAuth token in our instance and hand back its clientId, scopes, and
// userId — they do NOT check that the token was minted for THIS server (there is no audience/
// resource claim to match). So without this check, any OAuth client registered in our Clerk
// instance could call /mcp. Since Clerk gives us the token's `clientId`, the way to bind explicitly
// is to allowlist the client ids we trust.
//
// Behaviour:
//   - MCP_ALLOWED_OAUTH_CLIENT_IDS set   → only those client ids are accepted; others get 401.
//   - MCP_ALLOWED_OAUTH_CLIENT_IDS unset → accept any valid client (needed for Dynamic Client
//     Registration, which mints a fresh client id per client we can't know ahead of time), and log
//     a warning so we never *silently* ship an unbound endpoint.
function isOAuthClientAllowed(clientId: string | undefined): boolean {
  const raw = env.MCP_ALLOWED_OAUTH_CLIENT_IDS;
  if (!raw) {
    console.warn(
      "[valgate-mcp] MCP_ALLOWED_OAUTH_CLIENT_IDS is not set — /mcp accepts any Clerk OAuth client in this instance. Set it to bind /mcp to specific clients.",
    );
    return true;
  }
  const allowed = raw
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
  return clientId !== undefined && allowed.includes(clientId);
}

// Build the MCP server for each request, wiring the shared tool/resources to the AUTHENTICATED
// caller. The Clerk user id rides in extra.authInfo.extra.userId (set by verifyClerkToken below).
const handler = createMcpHandler((server) => {
  registerValgateMcp(server, async (extra) => {
    const userId = extra.authInfo?.extra?.userId as string | undefined;
    if (!userId) {
      // Should never happen when withMcpAuth requires a valid token, but fail closed.
      throw new Error("unauthenticated");
    }
    return ctxFromMcpAuth(userId);
  });
});

// Wrap the handler so only requests carrying a valid Clerk OAuth token reach the tools.
// `auth({ acceptsToken: 'oauth_token' })` parses the incoming Bearer token as a Clerk OAuth
// (machine) token; verifyClerkToken confirms it is a valid OAuth token in our Clerk instance and
// extracts the clientId, scopes, and user id. It does NOT verify the token was issued for THIS
// specific server (Clerk tokens carry no audience/resource claim) — so we add an explicit client
// allowlist check below (see isOAuthClientAllowed). Returning undefined from this verifier yields
// 401 + a WWW-Authenticate header that points clients at the protected-resource metadata to start
// the OAuth flow.
const authHandler = withMcpAuth(
  handler,
  async (_req, token) => {
    const clerkAuth = await auth({ acceptsToken: "oauth_token" });
    const authInfo = await verifyClerkToken(clerkAuth, token);
    // Invalid / missing token → verifyClerkToken returns undefined → 401.
    if (!authInfo) {
      return undefined;
    }
    // Valid token, but from an OAuth client we don't trust for this resource → reject (401).
    if (!isOAuthClientAllowed(authInfo.clientId)) {
      console.error(
        "[valgate-mcp] rejecting token from non-allowlisted OAuth client:",
        authInfo.clientId,
      );
      return undefined;
    }
    return authInfo;
  },
  {
    required: true,
    resourceMetadataPath: "/.well-known/oauth-protected-resource/mcp",
  },
);

export { authHandler as GET, authHandler as POST };
