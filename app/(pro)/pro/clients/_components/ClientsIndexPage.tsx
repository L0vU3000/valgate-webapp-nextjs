"use client";

import { useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { ClientsTable } from "@/app/(pro)/pro/dashboard/_components/ClientsTable";
import { OnboardClientModal } from "./OnboardClientModal";
import type { ClientRollup } from "@/app/(pro)/pro/queries";

// Clients index — the full book of business. Reuses the dashboard's
// ClientsTable (real rollups) and hosts the onboarding form.

export function ClientsIndexPage({
  clients,
  unassignedProperties,
}: {
  clients: ClientRollup[];
  unassignedProperties: Array<{ id: string; name: string }>;
}) {
  const [onboardOpen, setOnboardOpen] = useState(false);

  return (
    <main className="h-full overflow-y-auto bg-slate-50/50">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
        <header className="flex items-start justify-between gap-6">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1 text-[12px] text-slate-500 dark:text-slate-400">
              <span>Valgate Professional</span>
              <ChevronRight className="h-3 w-3 text-slate-400 dark:text-slate-500" />
              <span className="font-medium text-slate-700 dark:text-slate-200">
                Clients
              </span>
            </div>
            <h1 className="text-[28px] font-semibold leading-tight text-slate-900 dark:text-slate-100">
              Clients
            </h1>
            <p className="text-[13px] text-slate-500 dark:text-slate-400">
              {clients.length} owner{" "}
              {clients.length === 1 ? "engagement" : "engagements"} under
              management
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOnboardOpen(true)}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-[13px] font-medium text-white transition-[background-color,transform] hover:bg-blue-700 active:scale-[0.97]"
          >
            <Plus className="h-4 w-4" />
            Onboard Client
          </button>
        </header>

        <OnboardClientModal
          open={onboardOpen}
          onOpenChange={setOnboardOpen}
          unassignedProperties={unassignedProperties}
        />

        <ClientsTable clients={clients} />
      </div>
    </main>
  );
}
