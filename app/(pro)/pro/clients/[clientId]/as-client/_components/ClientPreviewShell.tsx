"use client";
// Full-screen "View as client" takeover chrome (Pro-3.0). Lives in the as-client
// layout so it persists across section navigation: the exit bar, preview Sidebar,
// blue-glow frame, and Propose-changes panel stay mounted while {children} swaps
// per section (Home, Portfolio, Rental, …). The blue-glow frame signals the
// manager is previewing this client's view.
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, Pencil } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import type { Property } from "@/lib/data/types/property";
import type { Lease } from "@/lib/data/types/lease";
import type { Tenant } from "@/lib/data/types/tenant";
import type { Payment } from "@/lib/data/types/payment";
import { ProposeChangePanel } from "./ProposeChangePanel";

export function ClientPreviewShell({
  clientId,
  clientName,
  clientInitials,
  previewBasePath,
  canWrite,
  properties,
  leases,
  tenants,
  payments,
  children,
}: {
  clientId: string;
  clientName: string;
  clientInitials: string;
  previewBasePath: string;
  // Full (admin/owner) grant → the manager acts directly (changes auto-apply). Otherwise
  // the panel only proposes changes for the client to approve. Server-derived; see _ctx.ts.
  canWrite: boolean;
  properties: Property[];
  leases: Lease[];
  tenants: Tenant[];
  payments: Payment[];
  children: React.ReactNode;
}) {
  const [isDark, setIsDark] = useState(false);
  const [proposeOpen, setProposeOpen] = useState(false);

  // Show "Propose changes" only if the portfolio has at least one entity to work with.
  const hasAnyEntities = properties.length > 0 || leases.length > 0 || tenants.length > 0 || payments.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface-base">
      {/* Exit bar — tells the manager whose view this is and how to leave. */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-blue-200 bg-blue-50 px-4 py-2 dark:border-blue-900 dark:bg-blue-950/40">
        <span className="inline-flex items-center gap-2 text-[13px] text-blue-800 dark:text-blue-200">
          <Eye className="h-4 w-4 shrink-0" />
          Viewing as <strong className="font-semibold">{clientName}</strong>
          <span className="hidden text-blue-700/70 dark:text-blue-300/70 sm:inline">
            — the portfolio exactly as this client sees it
          </span>
        </span>

        <div className="flex items-center gap-2 shrink-0">
          {hasAnyEntities && (
            <button
              type="button"
              onClick={() => setProposeOpen(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-blue-300 bg-white px-3 text-[13px] font-medium text-blue-700 transition-[background-color,transform] hover:bg-blue-50 active:scale-[0.97] dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
            >
              <Pencil className="h-3.5 w-3.5" />
              {canWrite ? "Edit portfolio" : "Propose changes"}
            </button>
          )}

          <Link
            href={`/pro/clients/${clientId}`}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-blue-200 bg-white px-3 text-[13px] font-medium text-blue-700 transition-[background-color,transform] hover:bg-blue-50 active:scale-[0.97] dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/50"
          >
            <ArrowLeft className="h-4 w-4" />
            Exit client view
          </Link>
        </div>
      </div>

      {/* Owner shell (rail sidebar + content) scoped to the client. */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden bg-surface-page">
        <div className="hidden h-full sm:flex">
          <Sidebar
            isDark={isDark}
            onToggleDark={() => setIsDark((d) => !d)}
            onOpenAI={() => {}}
            isPreview
            previewBasePath={previewBasePath}
            identity={{
              displayName: clientName,
              initials: clientInitials,
              roleText: "Owner",
            }}
          />
        </div>

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-surface-page">
          {children}
        </main>

        {/* Inset blue glow framing the whole client view. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-40 ring-4 ring-inset ring-blue-500/40 shadow-[inset_0_0_60px_rgba(37,99,235,0.18)]"
        />
      </div>

      {/* Propose-changes side panel (renders on top of everything). */}
      {proposeOpen && (
        <ProposeChangePanel
          clientId={clientId}
          canWrite={canWrite}
          properties={properties}
          leases={leases}
          tenants={tenants}
          payments={payments}
          onClose={() => setProposeOpen(false)}
        />
      )}
    </div>
  );
}
