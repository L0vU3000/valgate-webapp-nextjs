// Valgate MCP server over HTTP, deployed as part of the Next.js app on Vercel.
//
// Auth is real Clerk OAuth: the MCP client sends the user through Clerk login, attaches the
// resulting bearer token to each request, and verifyClerkToken() validates it and hands us the
// Clerk user id. ctxForClerkUser() then resolves that user's Valgate org, so the tools act as the
// real signed-in user — not a demo owner. See docs/MCP implementation/05-vercel-deploy-plan.md.
import { auth } from "@clerk/nextjs/server";
import { verifyClerkToken } from "@clerk/mcp-tools/next";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { registerValgateTools } from "@/mcp-server/tools";
import { ctxForClerkUser } from "@/lib/auth/mcp-ctx";

// Neon + Clerk + node:crypto need the Node runtime, not Edge (same as
// app/api/documents/[id]/summarize/route.ts).
export const runtime = "nodejs";
export const maxDuration = 60;

// Build the MCP server and register the shared tools. Identity is resolved per request from the
// authenticated Clerk user carried on authInfo.
const handler = createMcpHandler(
  (server) => {
    registerValgateTools(server, {
      ctxFor: (authInfo) => {
        const clerkUserId = authInfo?.extra?.userId as string | undefined;
        if (!clerkUserId) throw new Error("unauthenticated");
        return ctxForClerkUser(clerkUserId);
      },
      // Read-only until this is deliberately turned on in Vercel (see the deploy plan).
      allowWrites: process.env.MCP_ALLOW_WRITES === "true",
      // MUST be a stable env value on Vercel so delete preview/confirm agree across instances.
      confirmSecret: process.env.MCP_CONFIRM_SECRET ?? "",
    });
  },
  {},
  { basePath: "/api" },
);

// Verify the incoming bearer token against Clerk. verifyClerkToken returns AuthInfo (with
// extra.userId) for a valid token, or undefined to reject the request with 401.
const authHandler = withMcpAuth(
  handler,
  async (_req, token) => {
    const clerkAuth = await auth({ acceptsToken: "oauth_token" });
    return verifyClerkToken(clerkAuth, token);
  },
  {
    required: true,
    resourceMetadataPath: "/.well-known/oauth-protected-resource/api/mcp",
  },
);

export { authHandler as GET, authHandler as POST, authHandler as DELETE };
