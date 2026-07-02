"use client";

// EditClientDrawer — right-side slide-in to edit one client's core details.
// Same shell as ManageMembersDrawer (backdrop + fixed panel + header / scroll /
// footer). Two sections:
//   1. Details — name, contact email, and Individual/Corporate type. This is the
//      only editable part; it writes the manager's own `clients` record.
//   2. Linked account — reflects the client's real portfolio account read-only
//      and links out to it (View as client, Manage members). It never mutates
//      the client's login identity.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X, Eye, Users } from "lucide-react";
import { toast } from "sonner";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { toActionResult } from "@/lib/client/action-result";
import { cn } from "@/components/ui/utils";
import { proInputClass } from "@/app/(pro)/pro/_components/pro-modal";
import { updateClient, setClientStatus } from "@/app/(pro)/pro/actions";
import { ManageMembersDrawer } from "@/app/(pro)/pro/clients/_components/ManageMembersDrawer";

type ClientType = "Individual" | "Corporate";

// Live initials preview (client-safe copy of the server derivation — kept local
// so this client component never imports the service layer).
function previewInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return ((parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")).toUpperCase();
}

export function EditClientDrawer({
  open,
  onOpenChange,
  client,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: {
    id: string;
    name: string;
    email?: string;
    clientType: ClientType;
    avatarBg: string;
    // Internal portfolio org id — present only for manager-led (invited) clients.
    orgId?: string;
  };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(client.name);
  const [email, setEmail] = useState(client.email ?? "");
  const [clientType, setClientType] = useState<ClientType>(client.clientType);
  const [error, setError] = useState<string | null>(null);

  // Second-level drawer: member management for the linked portfolio.
  const [membersOpen, setMembersOpen] = useState(false);

  const hasOrg = Boolean(client.orgId);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateClient({
        clientId: client.id,
        name: name.trim(),
        email: email.trim(),
        clientType,
      });
      if (result.ok) {
        toast.success("Client updated");
        onOpenChange(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl dark:bg-slate-900">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
              Edit details
            </h2>
            <p className="text-[12px] text-slate-500 dark:text-slate-400">{client.name}</p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 py-5">
          {/* Details section */}
          <section className="flex flex-col gap-4">
            <h3 className="text-[11.5px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Details
            </h3>

            {/* Live avatar preview */}
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "inline-flex h-11 w-11 items-center justify-center rounded-full text-[13px] font-semibold",
                  client.avatarBg,
                )}
              >
                {previewInitials(name)}
              </span>
              <span className="text-[12px] text-slate-500 dark:text-slate-400">
                Initials follow the name
              </span>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium text-slate-700 dark:text-slate-200">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Client name"
                className={cn(proInputClass, "text-[13px]")}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium text-slate-700 dark:text-slate-200">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Optional contact email"
                className={cn(proInputClass, "text-[13px]")}
              />
              <span className="text-[11.5px] text-slate-400 dark:text-slate-500">
                Your contact label for this client — not their account login.
              </span>
            </label>

            <div className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium text-slate-700 dark:text-slate-200">Client type</span>
              <div className="inline-flex w-fit rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
                {(["Individual", "Corporate"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setClientType(t)}
                    className={cn(
                      "rounded-md px-3.5 py-1.5 text-[12.5px] font-medium transition-colors",
                      clientType === t
                        ? "bg-blue-600 text-white"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Linked account section */}
          <section className="flex flex-col gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
            <h3 className="text-[11.5px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Linked account
            </h3>

            {hasOrg ? (
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3.5 dark:border-slate-800">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-slate-800 dark:text-slate-100">
                    Portfolio account
                  </span>
                  <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                    Linked
                  </span>
                </div>
                <p className="text-[12px] leading-[17px] text-slate-500 dark:text-slate-400">
                  The client controls their own login email and profile from their account
                  settings. Editing here only changes your label for them.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setMembersOpen(true)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-3 text-[12.5px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Users className="h-3.5 w-3.5" />
                    Manage members
                  </button>
                  <Link
                    href={`/pro/clients/${client.id}/as-client`}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 text-[12.5px] font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View as client
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 rounded-xl border border-dashed border-slate-200 p-3.5 dark:border-slate-800">
                <span className="text-[13px] font-medium text-slate-700 dark:text-slate-200">
                  No account yet
                </span>
                <p className="text-[12px] leading-[17px] text-slate-500 dark:text-slate-400">
                  This client has not been invited to a portfolio account. Until then, this
                  record is a private label only you can see. Invite them from the clients
                  list to give them their own account.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
          <ConfirmAction
            tier="confirm"
            title={`Archive ${client.name}?`}
            description="This client will be removed from your active book. You can reactivate them at any time."
            confirmLabel="Archive"
            successMessage={`${client.name} archived`}
            onConfirm={async () => {
              const result = await setClientStatus({ clientId: client.id, status: "Inactive" });
              if (result.ok) {
                onOpenChange(false);
                router.refresh();
              }
              // Return an ActionResult so ConfirmAction reports success/failure correctly.
              return toActionResult(result);
            }}
          >
            <button
              type="button"
              className="text-[12.5px] font-medium text-red-600 transition-colors hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              Archive client
            </button>
          </ConfirmAction>

          <div className="flex items-center gap-2">
            {error && (
              <span className="text-[11.5px] text-red-600 dark:text-red-400">{error}</span>
            )}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex h-9 items-center rounded-md border border-slate-200 px-3.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isPending || name.trim().length === 0}
              onClick={handleSave}
              className="inline-flex h-9 items-center rounded-md bg-blue-600 px-4 text-[13px] font-medium text-white transition-[background-color,transform] hover:bg-blue-700 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save changes
            </button>
          </div>
        </div>
      </div>

      {/* Second-level members drawer — only reachable for linked clients. */}
      {client.orgId && (
        <ManageMembersDrawer
          open={membersOpen}
          onOpenChange={setMembersOpen}
          orgId={client.orgId}
          portfolioName={client.name}
        />
      )}
    </>
  );
}
