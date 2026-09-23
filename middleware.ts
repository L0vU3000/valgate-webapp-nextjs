import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { resolveAuthEntryRedirect } from "@/app/(auth)/_lib/resolve-redirect-url";
import { isRealClerkKey } from "@/lib/auth/clerk-check";

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

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

function checkMcpIpRateLimit(request: NextRequest): NextResponse | null {
  if (!isMcpRoute(request)) return null;
  const ip = clientIp(request);
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

// Unauthenticated edges (login, register, password reset, accept-invitation) previously had NO
// edge limit: only /mcp was guarded (AGENTS.md §86 flagged this as an open gap). A single IP
// could loop /register or credential-stuff /login unthrottled; Clerk's own lockout (100
// attempts/hour) is far looser than a scripted loop.
//
// Two layers, deliberately:
//   1. mcpIpHits-style in-memory window — free, no network hop. Catches a single-instance hammer.
//   2. Upstash sliding window (`authIpLimiter`) — shared across serverless instances, so an
//      attacker spreading requests can't multiply the limit by the instance count.
// Layer 2 is best-effort: if Redis is unreachable we still allow (layer 1 already applied).
// Fail-OPEN is correct here and is NOT the same stance as lib/ratelimit.allowed() — that one
// guards paid mutations and fails closed; this one guards a public login page, where failing
// closed would lock every real user out during an Upstash blip.
const AUTH_IP_LIMIT = 20;
const AUTH_IP_WINDOW_MS = 60_000;
const authIpHits = new Map<string, number[]>();

// Routes worth throttling per-IP: the unauthenticated entry points that trigger Clerk Backend
// API calls or emails. Deliberately NOT applied to /api/v1 (its handlers authenticate first and
// rate-limit per userId in lib/ratelimit.ts) or to webhooks (third-party senders, signed).
const isAuthAbuseRoute = createRouteMatcher([
  "/login(.*)",
  "/register(.*)",
  "/forgot-password(.*)",
  "/accept-invitation(.*)",
  "/oauth-consent(.*)",
]);

export function checkAuthIpRateLimit(request: NextRequest): NextResponse | null {
  if (!isAuthAbuseRoute(request)) return null;
  const ip = clientIp(request);
  const now = Date.now();
  const recent = (authIpHits.get(ip) ?? []).filter((t) => now - t < AUTH_IP_WINDOW_MS);
  authIpHits.set(ip, recent);
  if (recent.length >= AUTH_IP_LIMIT) {
    return NextResponse.json(
      { error: "rate_limit_exceeded", retry_after_seconds: 60 },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }
  recent.push(now);
  return null;
}

// Upstash-backed shared counter for the same auth routes. Kept separate from checkAuthIpRateLimit
// so middleware.ts never imports lib/env (which validates the whole env at module load and would
// make the edge bundle depend on server-only vars it doesn't need).
// ponytail: no-op until UPSTASH_* are set (see lib/ratelimit.ts makeLimiter) — layer 1 still guards.
async function checkAuthIpRateLimitShared(request: NextRequest): Promise<NextResponse | null> {
  if (!isAuthAbuseRoute(request)) return null;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const { Ratelimit } = await import("@upstash/ratelimit");
    const { Redis } = await import("@upstash/redis");
    // ponytail: limiter built per request rather than module-scope — module init would throw at
    // cold start if the vars are absent. Cache it once we see real traffic; one Redis round-trip
    // per auth-page POST is acceptable at current volume.
    const limiter = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(AUTH_IP_LIMIT * 3, "1 m"),
      prefix: "rl:auth-ip",
      analytics: true,
    });
    const { success } = await limiter.limit(clientIp(request));
    if (!success) {
      return NextResponse.json(
        { error: "rate_limit_exceeded", retry_after_seconds: 60 },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }
    return null;
  } catch {
    // Redis unreachable → allow. Layer 1 already ran; see the fail-open note above.
    return null;
  }
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
// DEMO_MODE: demo-no-clerk → hasClerk=false. Real Clerk: sk_test_/sk_live_ → true.
const hasClerk = isRealClerkKey(process.env.CLERK_SECRET_KEY);

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
  // Resend bounce webhooks are Svix-signed, not Clerk-sessioned. auth.protect() would rewrite
  // Resend's POST to an HTML login/404 before the handler could verify the signature.
  "/api/webhooks/resend(.*)",
  // Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`, not a Clerk cookie. The handler
  // fail-closes on a missing/wrong secret; auth.protect() would block the job before that check.
  "/api/cron/cleanup-drafts(.*)",
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
  "/",
]);

// API v1 (/api/v1/*) is NOT publicly accessible — kept separate from isPublicRoute so "public"
// keeps meaning "no auth required". Every handler under lib/api/v1/auth.ts authenticates the
// caller itself via resolveApiV1Ctx() (an Authorization: Bearer session token) and returns its
// own JSON 401. These routes must bypass ONLY auth.protect()'s browser-session redirect/rewrite:
// left in place, auth.protect() rewrites an unauthenticated bearer request to an HTML 404
// (x-clerk-auth-reason: protect-rewrite) before the handler ever runs, breaking the documented
// JSON error contract.
export const isApiV1Route = createRouteMatcher(["/api/v1(.*)"]);

// True when a request must skip auth.protect()'s browser-session redirect: either a route that's
// genuinely public, or an API v1 route whose handler performs its own bearer-token auth.
export function shouldSkipAuthProtect(request: NextRequest): boolean {
  return isPublicRoute(request) || isApiV1Route(request);
}

// The bare sign-in/sign-up entry points only — NOT "/login(.*)" wildcard, which would also
// catch /login/tasks (a manager onboarding step reached via Clerk's taskUrls, not this
// redirect). A signed-in user landing on these two exact routes already has a session, so
// send them to /app (or their intended redirect_url) instead of showing the form again.
const isAuthEntryRoute = createRouteMatcher(["/login", "/register"]);

async function mcpRateLimitOnly(request: NextRequest): Promise<NextResponse> {
  const rl = checkMcpIpRateLimit(request);
  if (rl) return rl;
  const arl = checkAuthIpRateLimit(request) ?? (await checkAuthIpRateLimitShared(request));
  if (arl) return arl;
  return NextResponse.next();
}

const middleware = hasClerk
  ? clerkMiddleware(async (auth, request) => {
      const rl = checkMcpIpRateLimit(request);
      if (rl) return rl;
      const arl = checkAuthIpRateLimit(request) ?? (await checkAuthIpRateLimitShared(request));
      if (arl) return arl;
      const { userId } = await auth();
      const hasInviteTicket = request.nextUrl.searchParams.has("__clerk_ticket");
      if (userId && isAuthEntryRoute(request) && !hasInviteTicket) {
        // Resolve the intended destination ourselves — there is no separate post-auth
        // decider page anymore. Same same-origin-only validation as the client-side auth flows.
        const redirectUrl = request.nextUrl.searchParams.get("redirect_url");
        return NextResponse.redirect(resolveAuthEntryRedirect(request.url, redirectUrl));
      }
      if (userId && request.nextUrl.pathname === "/") {
        return NextResponse.redirect(new URL("/app", request.url));
      }
      // Redirect signed-out users hitting a protected route to /login (set via ClerkProvider signInUrl).
      if (!shouldSkipAuthProtect(request)) await auth.protect();
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
