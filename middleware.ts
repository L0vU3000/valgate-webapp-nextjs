import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// The MCP HTTP server (/mcp) and ALL of its OAuth discovery metadata under /.well-known/*
// (protected-resource, authorization-server, openid-configuration) are public: /mcp validates its
// own Clerk OAuth bearer token, and the well-known docs are unauthenticated discovery data. They
// must NEVER be redirected to the login page or the site-gate — a gate redirect turns an expected
// JSON/404 into HTML and breaks the MCP OAuth handshake (the client can't discover the auth server).
const isMcpRoute = createRouteMatcher([
  "/mcp(.*)",
  "/.well-known/(.*)",
]);

// Phase 5 (M3) — edge-safe IP rate limiter for /mcp. In-memory sliding window; effective only
// within a single process (serverless = per-instance). The authoritative per-user limiter runs
// in the route handler via Upstash (lib/ratelimit.ts). This is a cheap outer guard against
// unauthenticated abuse. 200 req/min/IP is generous — legitimate AI clients rarely exceed this.
const MCP_IP_LIMIT = 200;
const MCP_IP_WINDOW_MS = 60_000;
const mcpIpHits = new Map<string, number[]>();

function checkMcpIpRateLimit(request: NextRequest): NextResponse | null {
  if (!isMcpRoute(request)) return null;
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const recent = (mcpIpHits.get(ip) ?? []).filter((t) => now - t < MCP_IP_WINDOW_MS);
  mcpIpHits.set(ip, recent);
  if (recent.length >= MCP_IP_LIMIT) {
    return NextResponse.json(
      { error: "rate_limit_exceeded", retry_after_seconds: 60 },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }
  recent.push(now);
  return null;
}

// DEMO_MODE-aware. clerkMiddleware() throws at request time without a publishable key, and
// requireCtx() skips Clerk entirely in DEMO_MODE — so when no Clerk key is configured we skip
// Clerk auth entirely and only apply the MCP IP rate limit.
//
// WHY CLERK_SECRET_KEY instead of NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
// Turbopack can compile NEXT_PUBLIC_* values into the Edge middleware bundle at startup
// by reading .env.local from disk, bypassing any process.env override set by the launch
// script (e.g. dev:e2e-auth). CLERK_SECRET_KEY is a server-only var read from live
// process.env, so it correctly reflects the runtime mode.
// DEMO_MODE: sk_test_placeholder → hasClerk=false. Real Clerk: sk_test_/sk_live_ → true.
const hasClerk =
  Boolean(process.env.CLERK_SECRET_KEY) &&
  process.env.CLERK_SECRET_KEY !== "sk_test_placeholder";

// Routes reachable WITHOUT being signed in: the auth pages, the Clerk webhook, and
// Clerk's own frontend API routes. Everything else requires a session (auth.protect → /login).
const isPublicRoute = createRouteMatcher([
  "/login(.*)",
  "/register(.*)",
  "/accept-invitation(.*)",
  "/forgot-password(.*)",
  // The OAuth consent screen self-gates on the Clerk session via hooks; it must NOT go through
  // auth.protect(), which on a Clerk dev instance rewrites a mid-OAuth (dev-browser-missing)
  // visitor to /404 instead of sign-in — 404'ing the page and breaking the MCP grant.
  "/oauth-consent(.*)",
  "/contact(.*)",
  "/api/webhooks/clerk(.*)",
  // MCP server: authenticates callers itself via Clerk OAuth bearer tokens (withMcpAuth), NOT the
  // session cookie auth.protect() checks. It must bypass the session gate, plus its public OAuth
  // discovery metadata under /.well-known.
  "/api/mcp(.*)",
  "/.well-known/oauth-protected-resource(.*)",
  "/__clerk(.*)",
  // MCP server + all its OAuth discovery metadata: no Clerk session redirect; /mcp validates its
  // own OAuth bearer token, and everything under /.well-known/* is public discovery data.
  "/mcp(.*)",
  "/.well-known/(.*)",
  // User manual — public documentation, accessible without signing in
  "/docs(.*)",
]);

// The bare sign-in/sign-up entry points only — NOT "/login(.*)" wildcard, which would also
// catch /login/tasks (the manager onboarding step that /launch itself redirects signed-in
// users to). A signed-in user landing on these two exact routes already has a session, so
// send them to /launch to resolve where they left off instead of showing the form again.
const isAuthEntryRoute = createRouteMatcher(["/login", "/register"]);

async function mcpRateLimitOnly(request: NextRequest): Promise<NextResponse> {
  const rl = checkMcpIpRateLimit(request);
  if (rl) return rl;
  return NextResponse.next();
}

const middleware = hasClerk
  ? clerkMiddleware(async (auth, request) => {
      const rl = checkMcpIpRateLimit(request);
      if (rl) return rl;
      const { userId } = await auth();
      const hasInviteTicket = request.nextUrl.searchParams.has("__clerk_ticket");
      if (userId && isAuthEntryRoute(request) && !hasInviteTicket) {
        // Forward redirect_url so /launch can send the user on to where they
        // were actually headed instead of always landing on the role default.
        const launchUrl = new URL("/launch", request.url);
        const redirectUrl = request.nextUrl.searchParams.get("redirect_url");
        if (redirectUrl) launchUrl.searchParams.set("redirect_url", redirectUrl);
        return NextResponse.redirect(launchUrl);
      }
      // Redirect signed-out users hitting a protected route to /login (set via ClerkProvider signInUrl).
      if (!isPublicRoute(request)) await auth.protect();
    })
  : mcpRateLimitOnly;

export default middleware;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)", // v7: always run for Clerk frontend API routes
  ],
};
