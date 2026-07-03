import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SITE_ACCESS_COOKIE_NAME,
  SITE_GATE_PATH,
  getExpectedSiteAccessToken,
  isSiteGateEnabled,
  isSiteGateExempt,
} from "@/lib/site-gate";

// The frontend's site-gate, factored out so it can run on its own (DEMO_MODE) or wrapped by Clerk.
// Returns a response when the request should be short-circuited (redirect to the gate), else null.
async function siteGate(request: NextRequest): Promise<NextResponse | null> {
  // Future: pro.valgate.com subdomain routing — see git history for the rewrite sketch.

  if (!isSiteGateEnabled()) {
    return null;
  }

  const { pathname, search } = request.nextUrl;

  if (isSiteGateExempt(pathname)) {
    return null;
  }

  if (pathname === SITE_GATE_PATH) {
    return null;
  }

  // The MCP server and its OAuth discovery metadata are machine endpoints authenticated by Clerk
  // bearer tokens, not the human site-gate. Never redirect them to the gate page.
  //
  // /oauth-consent is the MCP OAuth consent screen: Clerk redirects the user here from the
  // connecting app (e.g. claude.ai) mid-OAuth. That visitor has no site-gate cookie, so the gate
  // would bounce them to /gate and break the grant. Skip the gate here — the page still runs
  // auth.protect() (it requires a signed-in user), so it is not left unauthenticated.
  if (
    pathname.startsWith("/api/mcp") ||
    pathname.startsWith("/.well-known/oauth-protected-resource") ||
    pathname.startsWith("/oauth-consent")
  ) {
    return null;
  }

  const expectedToken = await getExpectedSiteAccessToken();
  const cookieValue = request.cookies.get(SITE_ACCESS_COOKIE_NAME)?.value;

  if (expectedToken && cookieValue === expectedToken) {
    return null;
  }

  const gateUrl = request.nextUrl.clone();
  gateUrl.pathname = SITE_GATE_PATH;
  gateUrl.search = "";
  gateUrl.searchParams.set("from", `${pathname}${search}`);
  return NextResponse.redirect(gateUrl);
}

// DEMO_MODE-aware. clerkMiddleware() throws at request time without a publishable key, and
// requireCtx() skips Clerk entirely in DEMO_MODE — so when no Clerk key is configured we run the
// site-gate alone. When a key is present, the site-gate runs first, then Clerk auth applies.
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

// Routes reachable WITHOUT being signed in: the auth pages, the Clerk webhook, the site-gate, and
// Clerk's own frontend API routes. Everything else requires a session (auth.protect → /login).
const isPublicRoute = createRouteMatcher([
  "/login(.*)",
  "/register(.*)",
  "/accept-invitation(.*)",
  "/forgot-password(.*)",
  "/contact(.*)",
  "/api/webhooks/clerk(.*)",
  // MCP server: authenticates callers itself via Clerk OAuth bearer tokens (withMcpAuth), NOT the
  // session cookie auth.protect() checks. It must bypass the session gate, plus its public OAuth
  // discovery metadata under /.well-known.
  "/api/mcp(.*)",
  "/.well-known/oauth-protected-resource(.*)",
  `${SITE_GATE_PATH}(.*)`,
  "/__clerk(.*)",
]);

// The bare sign-in/sign-up entry points only — NOT "/login(.*)" wildcard, which would also
// catch /login/tasks (the manager onboarding step that /launch itself redirects signed-in
// users to). A signed-in user landing on these two exact routes already has a session, so
// send them to /launch to resolve where they left off instead of showing the form again.
const isAuthEntryRoute = createRouteMatcher(["/login", "/register"]);

async function siteGateOnly(request: NextRequest): Promise<NextResponse> {
  return (await siteGate(request)) ?? NextResponse.next();
}

const middleware = hasClerk
  ? clerkMiddleware(async (auth, request) => {
      const gated = await siteGate(request);
      if (gated) return gated;
      const { userId } = await auth();
      const hasInviteTicket = request.nextUrl.searchParams.has("__clerk_ticket");
      if (userId && isAuthEntryRoute(request) && !hasInviteTicket) {
        return NextResponse.redirect(new URL("/launch", request.url));
      }
      // Redirect signed-out users hitting a protected route to /login (set via ClerkProvider signInUrl).
      if (!isPublicRoute(request)) await auth.protect();
    })
  : siteGateOnly;

export default middleware;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)", // v7: always run for Clerk frontend API routes
  ],
};
