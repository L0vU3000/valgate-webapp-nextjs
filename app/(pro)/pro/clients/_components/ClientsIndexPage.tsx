"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Plus, RotateCcw } from "lucide-react";
import { ClientsTable } from "@/app/(pro)/pro/dashboard/_components/ClientsTable";
import { AddClientModal } from "./AddClientModal";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { setClientStatus } from "@/app/(pro)/pro/clients.actions";
import type { ClientRollup } from "@/app/(pro)/pro/queries";
import { cn } from "@/components/ui/utils";
// Must match MAX_UNCONFIRMED_CLIENTS in lib/services/client-onboarding.ts.
const MAX_UNCONFIRMED_CLIENTS = 20;

type RequestRow = {
  id: string;
  ownerOrgName: string;
  requestedLevel: "view" | "full";
  status: "pending" | "approved" | "denied";
  createdAt: number;
};

export function ClientsIndexPage({
  clients,
  inactiveClients,
  unassignedProperties,
  unconfirmedCount,
  managerName,
  managerEmail,
  requests,
}: {
  clients: ClientRollup[];
  inactiveClients: Array<{
    id: string;
    name: string;
    initials: string;
    avatarBg: string;
    clientType: "Individual" | "Corporate";
  }>;
  unassignedProperties: Array<{ id: string; name: string }>;
  unconfirmedCount: number;
  managerName: string;
  managerEmail: string;
  requests: RequestRow[];
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<"choose" | "new" | "connect">("choose");
  const router = useRouter();
  const searchParams = useSearchParams();

  // Deep links open the modal on the right branch, then clean the URL.
  useEffect(() => {
    const add = searchParams.get("add");
    const onboard = searchParams.get("onboard");
    if (add === "connect") { setAddMode("connect"); setAddOpen(true); }
    else if (onboard === "1") { setAddMode("new"); setAddOpen(true); }
    else if (add) { setAddMode("choose"); setAddOpen(true); }
    else return;
    router.replace("/pro/clients", { scroll: false });
  }, [searchParams, router]);

  // Calls the setClientStatus server action and refreshes so the UI reflects
  // the new state immediately.
  async function handleArchive(clientId: string): Promise<void> {
    await setClientStatus({ clientId, status: "Inactive" });
    router.refresh();
  }

  // Active clients minus the synthetic "My Portfolio" entry.
  const realClientCount = clients.filter((r) => r.client.id !== "OWN").length;
  const atQuota = unconfirmedCount >= MAX_UNCONFIRMED_CLIENTS;

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
            <div className="flex items-center gap-3">
              <p className="text-[13px] text-slate-500 dark:text-slate-400">
                {realClientCount} owner{" "}
                {realClientCount === 1 ? "engagement" : "engagements"} under
                management
              </p>
              {/* Quota hint — shows how many pending invitations are outstanding */}
              {unconfirmedCount > 0 && (
                <span
                  className={cn(
                    "text-[11.5px] font-medium px-2 py-0.5 rounded-full",
                    atQuota
                      ? "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800"
                      : "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
                  )}
                >
                  {unconfirmedCount}/{MAX_UNCONFIRMED_CLIENTS} pending
                  {atQuota ? " — at limit" : ""}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setAddMode("choose"); setAddOpen(true); }}
            disabled={atQuota}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium text-white transition-[background-color,transform]",
              atQuota
                ? "bg-slate-300 cursor-not-allowed dark:bg-slate-700"
                : "bg-blue-600 hover:bg-blue-700 active:scale-[0.97]",
            )}
            title={atQuota ? `Limit of ${MAX_UNCONFIRMED_CLIENTS} pending clients reached` : undefined}
          >
            <Plus className="h-4 w-4" />
            Add Client
          </button>
        </header>

        <AddClientModal
          open={addOpen}
          onOpenChange={setAddOpen}
          initialMode={addMode}
          unassignedProperties={unassignedProperties}
          managerName={managerName}
          managerEmail={managerEmail}
          requests={requests}
        />

        {/* Unified clients table — Status column + Manage members drawer built in */}
        <ClientsTable clients={clients} onArchive={handleArchive} />

        {/* Archived clients — only shown when at least one client is inactive */}
        {inactiveClients.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
              Archived clients ({inactiveClients.length})
            </h2>
            <ul className="flex flex-col gap-2">
              {inactiveClients.map((client) => (
                <li
                  key={client.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold opacity-60",
                        client.avatarBg,
                      )}
                    >
                      {client.initials}
                    </span>
                    <div className="flex flex-col leading-tight">
                      <span className="text-[13px] font-medium text-slate-600 dark:text-slate-300">
                        {client.name}
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        {client.clientType} · Archived
                      </span>
                    </div>
                  </div>
                  <ConfirmAction
                    tier="confirm"
                    title={`Reactivate ${client.name}?`}
                    description="This client will be restored to your active book and appear in rollups and alerts."
                    confirmLabel="Reactivate"
                    successMessage={`${client.name} reactivated`}
                    onConfirm={async () => {
                      await setClientStatus({ clientId: client.id, status: "Active" });
                      router.refresh();
                    }}
                  >
                    <button
                      type="button"
                      className="inline-flex h-7 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 text-[11.5px] font-medium text-slate-600 transition-colors hover:bg-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reactivate
                    </button>
                  </ConfirmAction>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
