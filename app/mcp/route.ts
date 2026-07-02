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

// This route hits the database per request and reads request auth — never statically prerender.
export const dynamic = "force-dynamic";

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
// (machine) token; verifyClerkToken confirms it was issued for THIS server (audience) and
// extracts the user id. A missing/invalid token yields 401 + a WWW-Authenticate header that
// points clients at the protected-resource metadata to start the OAuth flow.
const authHandler = withMcpAuth(
  handler,
  async (_req, token) => {
    const clerkAuth = await auth({ acceptsToken: "oauth_token" });
    return verifyClerkToken(clerkAuth, token);
  },
  {
    required: true,
    resourceMetadataPath: "/.well-known/oauth-protected-resource/mcp",
  },
);

export { authHandler as GET, authHandler as POST };
