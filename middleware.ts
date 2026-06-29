import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SITE_ACCESS_COOKIE_NAME,
  SITE_GATE_PATH,
  getExpectedSiteAccessToken,
  isSiteGateEnabled,
} from "@/lib/site-gate";

// The frontend's site-gate, factored out so it can run on its own (DEMO_MODE) or wrapped by Clerk.
// Returns a response when the request should be short-circuited (redirect to the gate), else null.
async function siteGate(request: NextRequest): Promise<NextResponse | null> {
  // Future: pro.valgate.com subdomain routing — see git history for the rewrite sketch.

  if (!isSiteGateEnabled()) {
    return null;
  }

  const { pathname } = request.nextUrl;

  if (pathname === SITE_GATE_PATH) {
    return null;
  }

  const expectedToken = await getExpectedSiteAccessToken();
  const cookieValue = request.cookies.get(SITE_ACCESS_COOKIE_NAME)?.value;

  if (expectedToken && cookieValue === expectedToken) {
    return null;
  }

  const gateUrl = request.nextUrl.clone();
  gateUrl.pathname = SITE_GATE_PATH;
  gateUrl.searchParams.set("from", pathname);
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
  "/forgot-password(.*)",
  "/contact(.*)",
  "/api/webhooks/clerk(.*)",
  `${SITE_GATE_PATH}(.*)`,
  "/__clerk(.*)",
]);

async function siteGateOnly(request: NextRequest): Promise<NextResponse> {
  return (await siteGate(request)) ?? NextResponse.next();
}

const middleware = hasClerk
  ? clerkMiddleware(async (auth, request) => {
      const gated = await siteGate(request);
      if (gated) return gated;
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
