"use client";

import { useSwitchOrg } from "@/lib/hooks/use-switch-org";
import { proSecondaryButtonClass } from "./pro-modal";

// Switches the active Clerk org to clerkOrgId and loads the owner portfolio at "/".
// Delegates to useSwitchOrg().openAccount — the shared hook for all org switching.
export function OpenAccountButton({ clerkOrgId }: { clerkOrgId: string }) {
  const { openAccount } = useSwitchOrg();

  return (
    <button
      type="button"
      onClick={() => openAccount(clerkOrgId)}
      className={proSecondaryButtonClass}
    >
      Open
    </button>
  );
}
