import { redirect } from "next/navigation";
import { resolveRedirectUrl } from "@/app/(auth)/_lib/resolve-redirect-url";

// Post-authentication landing route.
//
// Every auth flow (sign-in, sign-up, invitation accept, OAuth consent) and the
// middleware bounce for an already-signed-in user hitting /login send the user
// here. Its only job now is to forward them to where they were actually headed
// (the `redirect_url` query param) or, failing that, the owner home ("/").
//
// The old /launch decided manager-cockpit vs owner-portfolio by reading the DB.
// That role split was removed with the Pro cut — this is a single-owner app —
// so there is no decision left to make and no Pro/manager services to call.
//
// Middleware already gates /launch behind auth (it is not in isPublicRoute), so
// only signed-in users reach this. resolveRedirectUrl() keeps the redirect safe:
// same-origin relative paths only, and never back to /login or /register (which
// would loop the user straight back into the redirect that landed them here).
export default async function LaunchPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const { redirect_url: rawRedirectUrl } = await searchParams;
  redirect(resolveRedirectUrl(rawRedirectUrl, "/"));
}
