"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Copy, RotateCcw, ShieldOff, XCircle } from "lucide-react";
import {
  revokeClientInvitationAction,
  resendClientInvitationAction,
  removeManagerAccessAction,
  copyInvitationLinkAction,
} from "@/app/(pro)/pro/actions";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { cn } from "@/components/ui/utils";
import type { HandoffRow } from "@/app/(pro)/pro/queries";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  revoked: "bg-slate-100 text-slate-500 border-slate-200",
  bounced: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  revoked: "Revoked",
  bounced: "Bounced",
};

const ROLE_BADGE: Record<string, string> = {
  view: "border-slate-200 text-slate-600",
  full: "border-blue-200 text-blue-700",
};

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PendingHandoffsSection({
  handoffs,
}: {
  handoffs: HandoffRow[];
}) {
  const router = useRouter();

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  if (handoffs.length === 0) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-4 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
        Pending invitations ({handoffs.length})
      </h2>
      <div className="overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <Th>Client</Th>
              <Th>Status</Th>
              <Th>Role</Th>
              <Th>Sent</Th>
              <Th className="w-[1%]" />
            </tr>
          </thead>
          <tbody>
            {handoffs.map((h) => (
              <tr
                key={h.id}
                className="border-b border-slate-100 last:border-0"
              >
                <td className="py-3 pr-3">
                  <div className="flex flex-col leading-tight">
                    <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                      {h.clientName}
                    </span>
                    <span className="text-[11.5px] text-slate-500 dark:text-slate-400">
                      {h.clientEmail}
                    </span>
                  </div>
                </td>
                <td className="py-3 pr-3">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md border px-2 py-0.5 text-[11.5px] font-medium",
                      STATUS_STYLES[h.status],
                    )}
                  >
                    {STATUS_LABEL[h.status]}
                  </span>
                </td>
                <td className="py-3 pr-3">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md border px-2 py-0.5 text-[11.5px] font-medium capitalize",
                      ROLE_BADGE[h.role],
                    )}
                  >
                    {h.role}
                  </span>
                </td>
                <td className="py-3 pr-3 text-[12px] text-slate-500 dark:text-slate-400">
                  {formatDate(h.createdAt)}
                </td>
                <td className="py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    {(h.status === "pending" || h.status === "bounced") && (
                      <>
                        <button
                          type="button"
                          onClick={async () => {
                            const result = await copyInvitationLinkAction({
                              handoffId: h.id,
                            });
                            if (result.ok && result.invitationUrl) {
                              try {
                                await navigator.clipboard.writeText(
                                  result.invitationUrl,
                                );
                              } catch {
                                // Clipboard access denied — silently ignore.
                              }
                            }
                            refresh();
                          }}
                          className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 px-2 text-[11.5px] font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <Copy className="h-3 w-3" />
                          Copy link
                        </button>
                        <ConfirmAction
                          tier="confirm"
                          title="Resend invitation?"
                          description="A new invitation will be sent to this client. The previous invitation will be revoked."
                          confirmLabel="Resend"
                          successMessage="Invitation resent"
                          onConfirm={async () => {
                            await resendClientInvitationAction({
                              handoffId: h.id,
                            });
                            refresh();
                          }}
                        >
                          <button
                            type="button"
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 px-2 text-[11.5px] font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Resend
                          </button>
                        </ConfirmAction>
                        <ConfirmAction
                          tier="destructive"
                          title="Revoke invitation?"
                          description="This client will no longer be able to accept the invitation."
                          confirmLabel="Revoke"
                          successMessage="Invitation revoked"
                          onConfirm={async () => {
                            await revokeClientInvitationAction({
                              handoffId: h.id,
                            });
                            refresh();
                          }}
                        >
                          <button
                            type="button"
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-red-200 px-2 text-[11.5px] font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                          >
                            <XCircle className="h-3 w-3" />
                            Revoke
                          </button>
                        </ConfirmAction>
                      </>
                    )}
                    {h.status === "accepted" &&
                      h.managerAccess === "granted" && (
                        <ConfirmAction
                          tier="destructive"
                          title="Remove your access?"
                          description="You will be removed from this client's portfolio organisation. This action cannot be undone."
                          confirmLabel="Remove access"
                          successMessage="Access removed"
                          onConfirm={async () => {
                            await removeManagerAccessAction({
                              handoffId: h.id,
                            });
                            refresh();
                          }}
                        >
                          <button
                            type="button"
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 px-2 text-[11.5px] font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            <ShieldOff className="h-3 w-3" />
                            Remove your access
                          </button>
                        </ConfirmAction>
                      )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "py-2 pr-3 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400",
        className,
      )}
    >
      {children}
    </th>
  );
}
