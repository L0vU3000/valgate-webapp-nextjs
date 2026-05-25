"use client";

import {
  Plus,
  Share2,
  FileDown,
  MoreHorizontal,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/components/ui/utils";
import type { Client, ClientOverview } from "@/app/(pro)/pro/_data/mock";

const VIEW_TABS = [
  "Overview",
  "Assets",
  "Board",
  "Financials",
  "Activity",
] as const;

type Props = {
  client: Client;
  overview: ClientOverview;
};

export function ClientPageHeader({ client, overview }: Props) {
  return (
    <header className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-6">
        <div className="flex gap-4">
          <span
            className={cn(
              "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold",
              client.avatarColor,
            )}
          >
            {client.initials}
          </span>
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[28px] font-semibold leading-tight text-slate-900">
                {client.name}
              </h1>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                {client.clientType}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[12px] text-slate-500">
              <span>Valgate Professional</span>
              <ChevronRight className="h-3 w-3" />
              <span>Clients</span>
              <ChevronRight className="h-3 w-3" />
              <span className="font-medium text-slate-700">{client.name}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[13px] text-emerald-700">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              Healthy portfolio
            </div>
            <p className="text-[13px] text-slate-500">
              {client.assetCount} assets · {client.totalValue} total value ·
              Client since {overview.clientSince} · Last activity{" "}
              {client.lastActivity}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 pt-1">
          <HeaderButton primary icon={<Plus className="h-4 w-4" />} label="Add Asset" />
          <HeaderButton label="Create Work Order" />
          <HeaderButton label="Generate Report" />
          <HeaderButton icon={<Share2 className="h-4 w-4" />} label="Share" />
          <HeaderButton icon={<FileDown className="h-4 w-4" />} label="Export PDF" />
          <button
            type="button"
            aria-label="More actions"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Client portfolio views"
        className="flex items-center gap-1 border-b border-slate-200"
      >
        {VIEW_TABS.map((tab) => {
          const isActive = tab === "Overview";
          const isDisabled = tab !== "Overview";

          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={isDisabled}
              className={cn(
                "relative px-3 py-2 text-[13px] font-medium transition-colors",
                isActive
                  ? "text-slate-900"
                  : "cursor-not-allowed text-slate-400",
              )}
            >
              {tab}
              {isActive && (
                <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-blue-600" />
              )}
            </button>
          );
        })}
        <button
          type="button"
          disabled
          className="ml-auto px-2 py-2 text-[12px] text-slate-400"
        >
          + Add View
        </button>
      </div>
    </header>
  );
}

function HeaderButton({
  icon,
  label,
  primary = false,
}: {
  icon?: React.ReactNode;
  label: string;
  primary?: boolean;
}) {
  if (primary) {
    return (
      <button
        type="button"
        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-[13px] font-medium text-white hover:bg-blue-700"
      >
        {icon}
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
    >
      {icon}
      {label}
    </button>
  );
}
