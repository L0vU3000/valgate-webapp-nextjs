import type { Metadata } from "next";
import { Suspense } from "react";
import { ConsentSkeleton, OAuthConsentCard } from "./_components/OAuthConsentPage";

// Clerk needs the real referrer to validate redirect_uri against the OAuth client's
// registered domain, but Next.js sends a stripped cross-origin referrer by default.
export const metadata: Metadata = {
  title: "Connect to Valgate",
  referrer: "strict-origin-when-cross-origin",
};

// useSearchParams (used by OAuthConsentCard to read client_id/redirect_uri/scope) requires
// a Suspense boundary in the App Router, so this route stays a server component that only
// wires up the boundary — everything else lives in the client component below it.
export default function OAuthConsentRoute() {
  return (
    <Suspense fallback={<ConsentSkeleton />}>
      <OAuthConsentCard />
    </Suspense>
  );
}
