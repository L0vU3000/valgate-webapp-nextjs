"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, Building2 } from "lucide-react";
import Link from "next/link";
import { useSwitchOrg } from "@/lib/hooks/use-switch-org";
import type { ShellManager } from "./pro-shell-types";

// One entry in the managed accounts list, shaped by ProShellData.managedAccounts.
type ManagedAccountEntry = {
  clerkOrgId: string;
  name: string;
  level: "view" | "full";
};

// Replaces the static manager chip in ProAppHeader with an org-switching dropdown.
// "My cockpit" is always shown as active (the Pro shell only renders when the manager
// is in their home org). Each account entry calls openAccount → setActive → owner shell.
// Empty accounts: "My cockpit" + a muted "Add account" link (no accounts group).
//
// Styling: neutral throughout — no blue (blue is precious, reserved for +Create button).
// Badges: Full = teal-50 tint; View = surface-tint (design §3, §4).
export function AccountSwitcher({
  manager,
  accounts,
}: {
  manager: ShellManager;
  accounts: ManagedAccountEntry[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { openAccount, backToCockpit } = useSwitchOrg();

  // Set of granted Clerk org IDs — used by backToCockpit to identify the home org.
  const grantedIds = new Set(accounts.map((a) => a.clerkOrgId));

  // Click-outside closes the dropdown, same pattern as the Create menu.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative ml-1">
      {/* Trigger: manager avatar + name + chevron */}
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-md py-1 pl-1 pr-2 transition-colors hover:bg-surface-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive-primary/30"
      >
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-[11px] font-semibold text-teal-700">
          {manager.initials}
        </span>
        <span className="hidden text-[13px] font-medium text-foreground sm:inline">
          {manager.name}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-secondary" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-md border border-border-default bg-surface-base py-1 shadow-lg">
          {/* My cockpit — checkmark indicates current active context */}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              // We're already in the home org when in the Pro shell.
              // backToCockpit handles the setActive + navigate in case the hook
              // is called from a partially-switched state.
              backToCockpit(grantedIds);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-foreground hover:bg-surface-tint"
          >
            <Check className="h-4 w-4 shrink-0 text-interactive-primary" />
            My cockpit
          </button>

          {accounts.length > 0 ? (
            <>
              {/* Separator + group header */}
              <div className="mx-3 my-1 border-t border-border-default" />
              <p className="px-3 pb-1 pt-0.5 text-[11px] font-semibold uppercase tracking-wider text-secondary">
                Managed accounts
              </p>

              {accounts.map((account) => (
                <button
                  key={account.clerkOrgId}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    openAccount(account.clerkOrgId);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-foreground hover:bg-surface-tint"
                >
                  <Building2 className="h-4 w-4 shrink-0 text-secondary" />
                  <span className="min-w-0 flex-1 truncate">{account.name}</span>
                  {/* Level badge: Full = subtle teal; View = neutral surface tint */}
                  <span
                    className={
                      account.level === "full"
                        ? "shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium bg-teal-50 text-teal-700"
                        : "shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium bg-surface-tint text-secondary"
                    }
                  >
                    {account.level === "full" ? "Full" : "View"}
                  </span>
                </button>
              ))}
            </>
          ) : (
            <>
              {/* Empty: separator + muted "Add account" link */}
              <div className="mx-3 my-1 border-t border-border-default" />
              <Link
                href="/pro/add-account"
                onClick={() => setOpen(false)}
                className="flex w-full items-center px-3 py-2 text-left text-[13px] text-secondary hover:bg-surface-tint hover:text-foreground"
              >
                Add account
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
