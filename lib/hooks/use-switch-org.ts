"use client";

import { useOrganizationList } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

// Shared hook owning the manager → cockpit org switch.
// backToCockpit: find the manager's home org (NOT in grantedClerkOrgIds) → switch back → "/pro/dashboard".
//
// Used by: ManagerContextBanner.
// What could go wrong: setActive is undefined until Clerk's org list loads — the
// function returns early in that case. If a membership was revoked, Clerk rejects
// setActive silently; the navigation does not happen.
export function useSwitchOrg() {
  const { userMemberships, setActive } = useOrganizationList({
    userMemberships: { infinite: true },
  });
  const router = useRouter();

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

  return { backToCockpit };
}
