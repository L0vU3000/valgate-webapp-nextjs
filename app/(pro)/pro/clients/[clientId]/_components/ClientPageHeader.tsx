"use client";

import Link from "next/link";
import { ChevronRight, ArrowRight } from "lucide-react";
import { cn } from "@/components/ui/utils";
import { progressDotColor } from "@/lib/property-helpers";
import { formatDate, formatRelativeTime } from "@/lib/format";
import type { ClientRollup } from "@/app/(pro)/pro/queries";
import { OWN_PORTFOLIO_ID } from "@/app/(pro)/pro/_components/pro-shell-types";
import { ViewAsClientButton } from "./ViewAsClientButton";

// Header for one client's portfolio page: breadcrumb, avatar, name,
// type badge, Progress stat, and a one-line summary built from the
// real rollup (property count, value, client-since, last activity).

export function ClientPageHeader({
  rollup,
  viewAsClerkOrgId,
}: {
  rollup: ClientRollup;
  viewAsClerkOrgId: string | null;
}) {
  const { client } = rollup;

  return (
    <header className="flex flex-col gap-3">
      <div className="flex items-center gap-1 text-[12px] text-slate-500 dark:text-slate-400">
        <span>Valgate Professional</span>
        <ChevronRight className="h-3 w-3 text-slate-400 dark:text-slate-500" />
        <Link
          href="/pro/clients"
          className="hover:text-slate-700 dark:hover:text-slate-200"
        >
          Clients
        </Link>
        <ChevronRight className="h-3 w-3 text-slate-400 dark:text-slate-500" />
        <span className="font-medium text-slate-700 dark:text-slate-200">
          {client.name}
        </span>
      </div>

      <div className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <span
            className={cn(
              "inline-flex h-12 w-12 items-center justify-center rounded-full text-[15px] font-semibold",
              client.avatarBg,
            )}
          >
            {client.initials}
          </span>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h1 className="text-[26px] font-semibold leading-tight text-slate-900 dark:text-slate-100">
                {client.name}
              </h1>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {client.clientType}
              </span>
              <span
                className="inline-flex items-center gap-1.5 text-[12px] text-slate-600 dark:text-slate-300"
                title="Progress score across properties"
              >
                <span
                  className={cn(
                    "inline-block h-2 w-2 rounded-full",
                    progressDotColor(rollup.avgProgress),
                  )}
                />
                {rollup.avgProgress}% Progress
              </span>
            </div>
            <p className="text-[13px] text-slate-500 dark:text-slate-400">
              {rollup.propertyCount}{" "}
              {rollup.propertyCount === 1 ? "property" : "properties"} ·{" "}
              {rollup.totalValueFormatted} total value · Client since{" "}
              {formatDate(client.clientSince)} · Last activity{" "}
              {formatRelativeTime(rollup.lastActivityAt)}
            </p>
          </div>
        </div>
        {/* Top-right: for the manager's own book, jump into the owner shell
            (this synthetic "client" has no org to view-as). For real clients,
            preview the owner view scoped to that client's org. */}
        {client.id === OWN_PORTFOLIO_ID ? (
          <Link
            href="/"
            title="Manage this portfolio in the owner view"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 text-[13px] font-medium text-blue-700 transition-[background-color,transform] hover:bg-blue-100 active:scale-[0.97] dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50"
          >
            My portfolio
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <ViewAsClientButton
            clientId={client.id}
            hasOrg={viewAsClerkOrgId !== null}
          />
        )}
      </div>
    </header>
  );
}
