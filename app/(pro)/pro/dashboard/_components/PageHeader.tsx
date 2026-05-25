"use client";

import { useState } from "react";
import {
  Plus,
  LayoutGrid,
  Share2,
  FileDown,
  MoreHorizontal,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/components/ui/utils";

// Dashboard page header — title + breadcrumb + subtitle on the left,
// action buttons on the right, view tabs (Overview / Board / List / Reports)
// below the title row.

const TABS = ["Overview", "Board", "List", "Reports"] as const;
type Tab = (typeof TABS)[number];

export function PageHeader() {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");

  return (
    <header className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-6">
        <div className="flex flex-col gap-1.5">
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
            Overview of all clients and assets — updated 2 minutes ago
          </p>
        </div>

        <div className="flex items-center gap-2 pt-1 shrink-0">
          <HeaderButton icon={<Plus className="w-4 h-4" />} label="Add Widget" />
          <HeaderButton
            icon={<LayoutGrid className="w-4 h-4" />}
            label="Change Layout"
          />
          <HeaderButton icon={<Share2 className="w-4 h-4" />} label="Share" />
          <HeaderButton
            icon={<FileDown className="w-4 h-4" />}
            label="Export PDF"
          />
          <button
            type="button"
            aria-label="More actions"
            className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-1">
        {TABS.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "relative px-3 py-2.5 text-[13px] font-medium transition-colors",
                isActive
                  ? "text-slate-900 dark:text-slate-100"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200",
              )}
            >
              {tab}
              {isActive && (
                <span className="absolute inset-x-3 -bottom-px h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
}

// Small helper for the outlined header action buttons.
// Pulled out so the markup stays readable above.
function HeaderButton({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      className="h-9 inline-flex items-center gap-1.5 px-3 rounded-md border border-slate-200 dark:border-slate-800 text-[13px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
    >
      {icon}
      {label}
    </button>
  );
}
