"use client";

import { ArrowLeft, Briefcase } from "lucide-react";
import { useSwitchOrg } from "@/lib/hooks/use-switch-org";

// Slim full-width amber-tinted banner rendered in the owner (shell) when a manager
// is viewing a granted account. Provides the only return path back to /pro/dashboard.
//
// Shown only when: isManager && ctx.orgId is one of the manager's granted owner orgs.
// Owners (isManager = false) never see this. (Surface 3, plan §6)
//
// Design: warm amber background + icon. No blue, no side-stripe border.
// "Back to my cockpit" button is neutral (no blue) per locked design decisions.
export function ManagerContextBanner({
  orgName,
  grantedClerkOrgIds,
}: {
  // Display name of the owner org the manager is currently viewing.
  orgName: string;
  // Clerk org IDs of all granted owner accounts — used to identify the manager's home org.
  grantedClerkOrgIds: string[];
}) {
  const { backToCockpit } = useSwitchOrg();

  // Build the granted set once on render. backToCockpit uses it to find the home org
  // (the membership whose org.id is NOT in this set).
  const grantedSet = new Set(grantedClerkOrgIds);

  return (
    <div className="flex w-full items-center justify-between gap-4 border-b border-amber-200 bg-amber-50 px-4 py-2 text-[13px] text-amber-900">
      <div className="flex items-center gap-2">
        <Briefcase className="h-4 w-4 shrink-0 text-amber-700" />
        <span>
          Viewing <strong>{orgName}</strong> as manager
        </span>
      </div>

      <button
        type="button"
        onClick={() => backToCockpit(grantedSet)}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-amber-300 bg-white px-2.5 py-1 text-[12px] font-medium text-amber-900 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to my cockpit
      </button>
    </div>
  );
}
