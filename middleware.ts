import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SITE_ACCESS_COOKIE_NAME,
  SITE_GATE_PATH,
  getExpectedSiteAccessToken,
  isSiteGateEnabled,
} from "@/lib/site-gate";

export async function middleware(request: NextRequest) {
  // Future: pro.valgate.com subdomain routing
  // When Professional ships on its own host, map the subdomain to /pro/* routes:
  //
  // if (request.nextUrl.hostname.startsWith('pro.')) {
  //   const url = request.nextUrl.clone()
  //   if (!url.pathname.startsWith('/pro')) {
  //     url.pathname = `/pro${url.pathname === '/' ? '/dashboard' : url.pathname}`
  //     return NextResponse.rewrite(url)
  //   }
  // }

  if (!isSiteGateEnabled()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (pathname === SITE_GATE_PATH) {
    return NextResponse.next();
  }

  const expectedToken = await getExpectedSiteAccessToken();
  const cookieValue = request.cookies.get(SITE_ACCESS_COOKIE_NAME)?.value;

  if (expectedToken && cookieValue === expectedToken) {
    return NextResponse.next();
  }

  const gateUrl = request.nextUrl.clone();
  gateUrl.pathname = SITE_GATE_PATH;
  gateUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(gateUrl);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
