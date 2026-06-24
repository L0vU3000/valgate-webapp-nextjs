"use client";

import { useOrganizationList } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

// Shared hook owning all active-org switching for the manager ↔ owner flow.
// openAccount: switch into a granted owner org → land on the owner shell at "/".
// backToCockpit: find the manager's home org (NOT in grantedClerkOrgIds) → switch back → "/pro/dashboard".
//
// Used by: OpenAccountButton, AccountSwitcher, ManagerContextBanner.
// What could go wrong: setActive is undefined until Clerk's org list loads — both
// functions return early in that case. If a membership was revoked, Clerk rejects
// setActive silently; the navigation does not happen.
export function useSwitchOrg() {
  const { userMemberships, setActive } = useOrganizationList({
    userMemberships: { infinite: true },
  });
  const router = useRouter();

  // Switches the active Clerk org to clerkOrgId and navigates to the owner portfolio root.
  // The manager has a real Clerk membership in the owner org (created by approveAccessRequest),
  // so setActive() succeeds. router.refresh() forces server components to re-fetch with the
  // new org context.
  async function openAccount(clerkOrgId: string) {
    if (!setActive) return;
    await setActive({ organization: clerkOrgId });
    router.push("/");
    router.refresh();
  }

  // Finds the manager's home org — the membership whose org.id is NOT in grantedClerkOrgIds
  // (i.e. the manager's own org, not any of the owner orgs they were granted into) — switches
  // into it, then navigates to /pro/dashboard.
  async function backToCockpit(grantedClerkOrgIds: Set<string>) {
    if (!setActive || !userMemberships.data) return;
    const homeMembership = userMemberships.data.find(
      (m) => !grantedClerkOrgIds.has(m.organization.id),
    );
    if (!homeMembership) return;
    await setActive({ organization: homeMembership.organization.id });
    router.push("/pro/dashboard");
    router.refresh();
  }

  return { openAccount, backToCockpit };
}
