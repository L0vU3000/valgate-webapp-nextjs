import { clerkMiddleware } from "@clerk/nextjs/server";
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
const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

async function siteGateOnly(request: NextRequest): Promise<NextResponse> {
  return (await siteGate(request)) ?? NextResponse.next();
}

const middleware = hasClerk
  ? clerkMiddleware(async (_auth, request) => {
      const gated = await siteGate(request);
      if (gated) return gated;
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
