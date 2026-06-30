"use client";

// PendingHandoffsSection — Phase 6 rewrite: now shows portfolios grouped by org.
// Each row displays portfolio name, member/pending counts, property count,
// and a "Manage members" button that opens the ManageMembersDrawer.

import { useState } from "react";
import { Users, Building2 } from "lucide-react";
import { ManageMembersDrawer } from "./ManageMembersDrawer";
import { cn } from "@/components/ui/utils";
import type { PortfolioRow } from "@/app/(pro)/pro/queries";

export function PendingHandoffsSection({
  portfolios,
}: {
  portfolios: PortfolioRow[];
}) {
  const [drawerOrgId, setDrawerOrgId] = useState<string | null>(null);

  if (portfolios.length === 0) return null;

  const activePortfolio = drawerOrgId
    ? portfolios.find((p) => p.orgId === drawerOrgId)
    : null;

  return (
    <>
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
          Client portfolios ({portfolios.length})
        </h2>

        <div className="flex flex-col gap-2">
          {portfolios.map((portfolio) => (
            <PortfolioRow
              key={portfolio.orgId}
              portfolio={portfolio}
              onManage={() => setDrawerOrgId(portfolio.orgId)}
            />
          ))}
        </div>
      </section>

      {activePortfolio && (
        <ManageMembersDrawer
          open={drawerOrgId !== null}
          onOpenChange={(open) => { if (!open) setDrawerOrgId(null); }}
          orgId={activePortfolio.orgId}
          portfolioName={activePortfolio.name}
        />
      )}
    </>
  );
}

function PortfolioRow({
  portfolio,
  onManage,
}: {
  portfolio: PortfolioRow;
  onManage: () => void;
}) {
  const memberText =
    portfolio.memberCount === 0
      ? "No members yet"
      : `${portfolio.memberCount} member${portfolio.memberCount === 1 ? "" : "s"}`;

  const pendingText =
    portfolio.pendingCount > 0
      ? ` · ${portfolio.pendingCount} pending`
      : "";

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2.5 dark:border-slate-800">
      <div className="flex flex-col gap-0.5">
        <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
          {portfolio.name}
        </span>
        <div className="flex items-center gap-3 text-[11.5px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3 opacity-70" />
            {memberText}{pendingText}
          </span>
          {portfolio.propertyCount > 0 && (
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3 opacity-70" />
              {portfolio.propertyCount}{" "}
              {portfolio.propertyCount === 1 ? "property" : "properties"}
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onManage}
        className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 text-[12px] font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        Manage members
      </button>
    </div>
  );
}
