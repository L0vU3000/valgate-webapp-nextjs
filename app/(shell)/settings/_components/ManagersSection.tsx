"use client";

import { useState, useTransition } from "react";
import { Copy, Check, RefreshCw, Users, KeyRound } from "lucide-react";
import { toast } from "sonner";
import type { ManagersData } from "../queries";
import {
  generateInviteCodeAction,
  regenerateInviteCodeAction,
  approveRequestAction,
  denyRequestAction,
} from "../actions";

// Level badge: maps the requested access level to a human label + colour.
function LevelBadge({ level }: { level: "view" | "full" }) {
  const isView = level === "view";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
        isView
          ? "bg-slate-100 text-slate-600"
          : "bg-blue-50 text-blue-700"
      }`}
    >
      {isView ? "View" : "Full"}
    </span>
  );
}

// Format a date as "Jan 15, 2025" — used in the tables.
function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function ManagersSection({ initialData }: { initialData: ManagersData }) {
  // Local state — optimistic updates so the UI reacts without a page reload.
  const [data, setData] = useState<ManagersData>(initialData);
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();

  // Track which request IDs are currently being actioned to disable their buttons.
  const [pendingActionIds, setPendingActionIds] = useState<Set<string>>(new Set());

  // ── Invite code actions ─────────────────────────────────────────────────

  function handleCopyCode() {
    if (!data.inviteCode) return;
    navigator.clipboard.writeText(data.inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  function handleGenerateCode() {
    startTransition(async () => {
      const result = await generateInviteCodeAction();
      if (result.ok) {
        // The page will revalidate — but to show the new code instantly we
        // need to reload; revalidatePath triggers a server re-render which
        // the client picks up on next navigation or refresh. For now, a
        // window.location.reload() gives immediate feedback without a full page flash.
        window.location.reload();
      } else {
        toast.error(result.error ?? "Could not generate invite code.");
      }
    });
  }

  function handleRegenerateCode() {
    startTransition(async () => {
      const result = await regenerateInviteCodeAction();
      if (result.ok) {
        window.location.reload();
      } else {
        toast.error(result.error ?? "Could not regenerate invite code.");
      }
    });
  }

  // ── Request actions ──────────────────────────────────────────────────────

  function handleApprove(requestId: string) {
    setPendingActionIds((prev) => new Set(prev).add(requestId));
    startTransition(async () => {
      const result = await approveRequestAction(requestId);
      setPendingActionIds((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
      if (result.ok) {
        // Optimistically remove the approved request from the pending list.
        setData((prev) => ({
          ...prev,
          pendingRequests: prev.pendingRequests.filter((r) => r.id !== requestId),
        }));
        toast.success("Access approved. The manager can now switch into your account.");
      } else {
        toast.error(result.error ?? "Could not approve request.");
      }
    });
  }

  function handleDeny(requestId: string) {
    setPendingActionIds((prev) => new Set(prev).add(requestId));
    startTransition(async () => {
      const result = await denyRequestAction(requestId);
      setPendingActionIds((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
      if (result.ok) {
        // Optimistically remove the denied request from the pending list.
        setData((prev) => ({
          ...prev,
          pendingRequests: prev.pendingRequests.filter((r) => r.id !== requestId),
        }));
        toast.success("Request denied.");
      } else {
        toast.error(result.error ?? "Could not deny request.");
      }
    });
  }

  return (
    <section
      className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 pb-6 sm:pb-8 border-b border-[#e8eaed]"
      style={{ animation: "fade-slide-up 0.45s ease-out both", animationDelay: "630ms" }}
    >
      {/* Section label column */}
      <div className="flex flex-col gap-2">
        <h2 className="font-display font-bold text-[18px] sm:text-[24px] leading-tight text-foreground">
          Managers
        </h2>
        <p className="font-sans text-[14px] leading-[20px] text-tertiary">
          Control which portfolio managers can access your account and at what
          level.
        </p>
      </div>

      {/* Content column */}
      <div className="col-span-1 sm:col-span-2 flex flex-col gap-4">

        {/* ── Invite code ─────────────────────────────────────────────── */}
        <div className="bg-white border border-[#d1d5db] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-4 sm:p-[25px] flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100">
              <KeyRound className="h-4 w-4 text-slate-500" />
            </div>
            <div className="flex flex-col gap-0.5">
              <h3 className="font-display font-semibold text-[15px] sm:text-[18px] text-val-heading">
                Invite code
              </h3>
              <p className="font-sans text-[13px] text-tertiary">
                Share this code with a manager so they can request access to
                your account via their Professional cockpit.
              </p>
            </div>
          </div>

          {data.inviteCode ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              {/* Code display */}
              <div className="flex-1 flex items-center gap-2 rounded-[8px] border border-[#d1d5db] bg-[#f5f6f7] px-4 py-2.5">
                <span className="flex-1 font-mono text-[16px] font-semibold tracking-[0.12em] text-val-heading select-all">
                  {data.inviteCode}
                </span>
              </div>
              {/* Copy */}
              <button
                type="button"
                onClick={handleCopyCode}
                aria-label="Copy invite code"
                className="inline-flex h-[38px] items-center gap-1.5 rounded-[8px] border border-[#d1d5db] bg-white px-4 text-[13px] font-medium text-val-heading hover:bg-[#f5f6f7] hover:border-[#b0b8c4] active:scale-[0.97] transition-all duration-150 shrink-0"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
              {/* Regenerate */}
              <button
                type="button"
                onClick={handleRegenerateCode}
                aria-label="Regenerate invite code"
                className="inline-flex h-[38px] items-center gap-1.5 rounded-[8px] border border-[#d1d5db] bg-white px-4 text-[13px] font-medium text-slate-500 hover:bg-[#f5f6f7] hover:border-[#b0b8c4] active:scale-[0.97] transition-all duration-150 shrink-0"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Regenerate
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-[8px] border border-dashed border-[#d1d5db] bg-[#fafbff] px-4 py-3">
              <p className="font-sans text-[13px] text-tertiary">
                No invite code yet. Generate one to start accepting manager
                requests.
              </p>
              <button
                type="button"
                onClick={handleGenerateCode}
                className="ml-4 inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-[8px] bg-[#2563eb] px-4 text-[13px] font-medium text-white hover:bg-blue-700 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb] transition-all duration-150"
              >
                Generate code
              </button>
            </div>
          )}
        </div>

        {/* ── Pending requests ─────────────────────────────────────────── */}
        <div className="bg-white border border-[#d1d5db] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#e8eaed] bg-[#f5f6f7] px-5 py-3">
            <h3 className="font-sans font-semibold text-[13px] text-val-heading">
              Pending requests
            </h3>
            {data.pendingRequests.length > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#2563eb] px-1.5 text-[10px] font-semibold text-white">
                {data.pendingRequests.length}
              </span>
            )}
          </div>

          {data.pendingRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1 py-8 text-center">
              <Users className="h-8 w-8 text-slate-200" />
              <p className="mt-1 font-sans text-[13px] text-tertiary">
                No pending requests
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#e8eaed]">
              {/* Table header */}
              <div className="hidden sm:grid sm:grid-cols-[1fr_100px_120px_160px] items-center gap-3 bg-[#fafbff] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">
                <span>Manager</span>
                <span>Access</span>
                <span>Requested</span>
                <span className="text-right">Actions</span>
              </div>
              {data.pendingRequests.map((req) => {
                const isPending = pendingActionIds.has(req.id);
                return (
                  <div
                    key={req.id}
                    className="grid grid-cols-1 sm:grid-cols-[1fr_100px_120px_160px] items-center gap-2 sm:gap-3 px-5 py-3.5"
                  >
                    {/* Manager identity */}
                    <div className="flex flex-col">
                      <span className="font-sans font-medium text-[14px] text-val-heading leading-tight">
                        {req.managerName}
                      </span>
                      <span className="font-sans text-[12px] text-tertiary">
                        {req.managerEmail}
                      </span>
                    </div>
                    {/* Requested level */}
                    <div className="sm:block">
                      <LevelBadge level={req.requestedLevel} />
                    </div>
                    {/* Date */}
                    <span className="font-sans text-[12px] text-tertiary">
                      {formatDate(req.createdAt)}
                    </span>
                    {/* Actions */}
                    <div className="flex items-center justify-start sm:justify-end gap-2">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleApprove(req.id)}
                        className="inline-flex h-[30px] items-center gap-1 rounded-[6px] bg-[#2563eb] px-3 text-[12px] font-medium text-white hover:bg-blue-700 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
                      >
                        {isPending ? "…" : "Approve"}
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleDeny(req.id)}
                        className="inline-flex h-[30px] items-center gap-1 rounded-[6px] border border-[#d1d5db] bg-white px-3 text-[12px] font-medium text-slate-600 hover:bg-[#f5f6f7] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
                      >
                        Deny
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Managers with access ──────────────────────────────────────── */}
        <div className="bg-white border border-[#d1d5db] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="border-b border-[#e8eaed] bg-[#f5f6f7] px-5 py-3">
            <h3 className="font-sans font-semibold text-[13px] text-val-heading">
              Managers with access
            </h3>
          </div>

          {data.managersWithAccess.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1 py-8 text-center">
              <Users className="h-8 w-8 text-slate-200" />
              <p className="mt-1 font-sans text-[13px] text-tertiary">
                No managers have access yet
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#e8eaed]">
              {/* Table header */}
              <div className="hidden sm:grid sm:grid-cols-[1fr_100px_140px] items-center gap-3 bg-[#fafbff] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">
                <span>Manager</span>
                <span>Access</span>
                <span>Granted</span>
              </div>
              {data.managersWithAccess.map((mgr) => (
                <div
                  key={mgr.userId}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_100px_140px] items-center gap-2 sm:gap-3 px-5 py-3.5"
                >
                  {/* Identity */}
                  <div className="flex flex-col">
                    <span className="font-sans font-medium text-[14px] text-val-heading leading-tight">
                      {mgr.name}
                    </span>
                    <span className="font-sans text-[12px] text-tertiary">
                      {mgr.email}
                    </span>
                  </div>
                  {/* Level */}
                  <div>
                    <LevelBadge level={mgr.level} />
                  </div>
                  {/* Granted date */}
                  <span className="font-sans text-[12px] text-tertiary">
                    {formatDate(mgr.grantedAt)}
                  </span>
                  {/* Revoke arrives in Pro-2.4 — nothing actionable here yet */}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
