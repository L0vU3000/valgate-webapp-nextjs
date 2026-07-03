"use client";

// RoleSelect — compact dropdown with Admin/Member/Viewer + one-line descriptions.
// Admin uses the precious blue accent; other roles are neutral.
// Used in the ManageMembersDrawer and the OnboardClientWizard People step.

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/components/ui/utils";
import type { PortfolioRole } from "@/lib/services/client-onboarding";

const ROLE_OPTIONS: Array<{
  value: PortfolioRole;
  label: string;
  description: string;
}> = [
  { value: "admin", label: "Admin", description: "Can manage members and all content" },
  { value: "member", label: "Member", description: "Can view and edit content" },
  { value: "viewer", label: "Viewer", description: "Read-only access" },
];

export function RoleSelect({
  value,
  onChange,
  disabled,
}: {
  value: PortfolioRole;
  onChange: (role: PortfolioRole) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when the user clicks outside the dropdown.
  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  const current = ROLE_OPTIONS.find((o) => o.value === value) ?? ROLE_OPTIONS[2];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[12px] font-medium transition-colors",
          value === "admin"
            ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/60"
            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        {current.label}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
          {ROLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className="flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/60"
            >
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                {value === opt.value && (
                  <Check
                    className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400"
                    strokeWidth={2.5}
                  />
                )}
              </span>
              <span className="flex flex-col">
                <span
                  className={cn(
                    "text-[12.5px] font-medium",
                    opt.value === "admin"
                      ? "text-blue-700 dark:text-blue-300"
                      : "text-slate-800 dark:text-slate-100",
                  )}
                >
                  {opt.label}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {opt.description}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
