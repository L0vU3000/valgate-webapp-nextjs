"use client";

import { ChevronRight } from "lucide-react";

// Dashboard page header — breadcrumb, title, and a one-line summary of
// the real book of business (client + property counts from the rollup).
// Action buttons and extra view tabs were removed: every control on the
// Pro surface must be backed by a real flow.

export function PageHeader({
  clientCount,
  propertyCount,
}: {
  clientCount: number;
  propertyCount: number;
}) {
  return (
    <header className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1 text-[12px] text-slate-500 dark:text-slate-400">
        <span>Valgate Professional</span>
        <ChevronRight className="w-3 h-3 text-slate-400 dark:text-slate-500" />
        <span className="text-slate-700 dark:text-slate-200 font-medium">
          Dashboard
        </span>
      </div>
      <h1 className="text-[28px] leading-tight font-semibold text-slate-900 dark:text-slate-100">
        Dashboard
      </h1>
      <p className="text-[13px] text-slate-500 dark:text-slate-400">
        Overview of {clientCount} clients and {propertyCount} active
        properties under management
      </p>
    </header>
  );
}
