"use client";

// ManageMembersDrawer — right-side slide-in panel for a portfolio's member list.
// Sections: accepted members (with role change + remove), pending invitees
// (with role change / resend / revoke), and an "Add people" form.

import { useState, useEffect, useTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, MoreHorizontal, UserMinus, RotateCcw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { RoleSelect } from "./RoleSelect";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { toActionResult } from "@/lib/client/action-result";
import { cn } from "@/components/ui/utils";
import {
  getPortfolioMembersAction,
  changeMemberRoleAction,
  changeInviteeRoleAction,
  removePortfolioMemberAction,
  addPortfolioInviteesAction,
  resendClientInvitationAction,
  revokeClientInvitationAction,
} from "@/app/(pro)/pro/actions";
import type { PortfolioMember, PortfolioInvitee } from "@/app/(pro)/pro/queries";
import type { PortfolioRole } from "@/lib/services/client-onboarding";
import type { ActionResult } from "@/app/actions/_result";
import { proInputClass } from "@/app/(pro)/pro/_components/pro-modal";

// A loose email check — server is the real authority.
function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

type AddRow = { email: string; role: PortfolioRole; name: string };

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  bounced: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending: "Pending",
  bounced: "Bounced",
};

function initials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || email[0].toUpperCase();
  }
  return email[0].toUpperCase();
}

export function ManageMembersDrawer({
  open,
  onOpenChange,
  orgId,
  portfolioName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  portfolioName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<PortfolioMember[]>([]);
  const [invitees, setInvitees] = useState<PortfolioInvitee[]>([]);
  const [addRows, setAddRows] = useState<AddRow[]>([{ email: "", role: "member", name: "" }]);
  const [addError, setAddError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Fetch the current member+invitee list whenever the drawer opens.
  const fetchMembers = useCallback(async () => {
    setLoading(true);
    const result = await getPortfolioMembersAction({ orgId });
    setLoading(false);
    if (result.ok) {
      setMembers(result.members);
      setInvitees(result.invitees);
    }
  }, [orgId]);

  useEffect(() => {
    if (!open) return;
    fetchMembers();
    setShowAddForm(false);
    setAddRows([{ email: "", role: "member", name: "" }]);
    setAddError(null);
  }, [open, fetchMembers]);

  function close() {
    onOpenChange(false);
  }

  // ── Member role change ──────────────────────────────────────────────────────

  async function handleMemberRoleChange(member: PortfolioMember, role: PortfolioRole) {
    startTransition(async () => {
      const result = await changeMemberRoleAction({
        orgId,
        memberClerkUserId: member.clerkUserId,
        role,
      });
      if (result.ok) {
        setMembers((prev) =>
          prev.map((m) => (m.clerkUserId === member.clerkUserId ? { ...m, role } : m)),
        );
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  // ── Member remove ───────────────────────────────────────────────────────────

  async function handleRemoveMember(member: PortfolioMember): Promise<ActionResult<void>> {
    const result = await removePortfolioMemberAction({
      orgId,
      memberClerkUserId: member.clerkUserId,
    });
    if (result.ok) {
      setMembers((prev) => prev.filter((m) => m.clerkUserId !== member.clerkUserId));
      router.refresh();
    }
    // Returned (not swallowed) so <ConfirmAction>'s onConfirm can tell success from
    // failure — otherwise it always shows its own success toast regardless of `result.ok`.
    return toActionResult(result);
  }

  // ── Invitee role change ─────────────────────────────────────────────────────

  async function handleInviteeRoleChange(invitee: PortfolioInvitee, role: PortfolioRole) {
    startTransition(async () => {
      const result = await changeInviteeRoleAction({ handoffId: invitee.handoffId, role });
      if (result.ok) {
        setInvitees((prev) =>
          prev.map((i) => (i.handoffId === invitee.handoffId ? { ...i, role } : i)),
        );
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  // ── Invitee resend ──────────────────────────────────────────────────────────

  async function handleResend(handoffId: string): Promise<ActionResult<void>> {
    const result = await resendClientInvitationAction({ handoffId });
    if (result.ok) {
      await fetchMembers();
      router.refresh();
    }
    // Returned (not swallowed) so <ConfirmAction>'s onConfirm can tell success from
    // failure — otherwise it always shows its own success toast regardless of `result.ok`.
    return toActionResult(result);
  }

  // ── Invitee revoke ──────────────────────────────────────────────────────────

  async function handleRevoke(handoffId: string): Promise<ActionResult<void>> {
    const result = await revokeClientInvitationAction({ handoffId });
    if (result.ok) {
      setInvitees((prev) => prev.filter((i) => i.handoffId !== handoffId));
      router.refresh();
    }
    return toActionResult(result);
  }

  // ── Add people ──────────────────────────────────────────────────────────────

  function addInviteeRow() {
    setAddRows((prev) => [...prev, { email: "", role: "member", name: "" }]);
  }

  function updateAddRow(index: number, patch: Partial<AddRow>) {
    setAddRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function removeAddRow(index: number) {
    setAddRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleAddPeople(sendNow: boolean) {
    setAddError(null);
    const valid = addRows.filter((r) => isValidEmail(r.email));
    if (valid.length === 0) {
      setAddError("Enter at least one valid email address.");
      return;
    }
    startTransition(async () => {
      const result = await addPortfolioInviteesAction({
        orgId,
        invitees: valid.map((r) => ({
          email: r.email.trim(),
          role: r.role,
          name: r.name.trim() || undefined,
        })),
        sendNow,
      });
      if (result.ok) {
        toast.success(
          sendNow
            ? `${result.count} invitation${result.count === 1 ? "" : "s"} sent`
            : `${result.count} draft${result.count === 1 ? "" : "s"} saved`,
        );
        setAddRows([{ email: "", role: "member", name: "" }]);
        setShowAddForm(false);
        await fetchMembers();
        router.refresh();
      } else {
        setAddError(result.error);
      }
    });
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
        onClick={close}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl dark:bg-slate-900">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
              Manage members
            </h2>
            <p className="text-[12px] text-slate-500 dark:text-slate-400">{portfolioName}</p>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
          {loading ? (
            <p className="text-center text-[13px] text-slate-400 dark:text-slate-500">Loading…</p>
          ) : (
            <>
              {/* Members section */}
              {members.length > 0 && (
                <section>
                  <h3 className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Members ({members.length})
                  </h3>
                  <ul className="flex flex-col gap-1">
                    {members.map((member) => (
                      <MemberRow
                        key={member.clerkUserId}
                        member={member}
                        isPending={isPending}
                        onRoleChange={handleMemberRoleChange}
                        onRemove={handleRemoveMember}
                      />
                    ))}
                  </ul>
                </section>
              )}

              {/* Pending invites section */}
              {invitees.length > 0 && (
                <section>
                  <h3 className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Pending invites ({invitees.length})
                  </h3>
                  <ul className="flex flex-col gap-1">
                    {invitees.map((invitee) => (
                      <InviteeRow
                        key={invitee.handoffId}
                        invitee={invitee}
                        isPending={isPending}
                        onRoleChange={handleInviteeRoleChange}
                        onResend={handleResend}
                        onRevoke={handleRevoke}
                      />
                    ))}
                  </ul>
                </section>
              )}

              {/* Add people section */}
              {showAddForm ? (
                <section>
                  <h3 className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Add people
                  </h3>
                  <div className="flex flex-col gap-2">
                    {addRows.map((row, index) => (
                      <AddInviteeRow
                        key={index}
                        row={row}
                        onChange={(patch) => updateAddRow(index, patch)}
                        onRemove={addRows.length > 1 ? () => removeAddRow(index) : undefined}
                      />
                    ))}

                    <button
                      type="button"
                      onClick={addInviteeRow}
                      className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add another
                    </button>

                    {addError && (
                      <p className="text-[12px] text-red-600 dark:text-red-400">{addError}</p>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="text-[12.5px] font-medium text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      >
                        Cancel
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleAddPeople(false)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-3 text-[12.5px] font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          Save draft
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleAddPeople(true)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-[12.5px] font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                        >
                          Send invitation
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-slate-300 px-3 py-2 text-[13px] font-medium text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" />
                  Add people
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Member row ───────────────────────────────────────────────────────────────

function MemberRow({
  member,
  isPending,
  onRoleChange,
  onRemove,
}: {
  member: PortfolioMember;
  isPending: boolean;
  onRoleChange: (member: PortfolioMember, role: PortfolioRole) => void;
  onRemove: (member: PortfolioMember) => Promise<ActionResult<void>>;
}) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-2.5 py-2 dark:border-slate-800">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
          {initials(member.name, member.email)}
        </span>
        <div className="flex flex-col leading-tight">
          <span className="text-[12.5px] font-medium text-slate-800 dark:text-slate-100">
            {member.name ?? member.email}
            {member.isYou && (
              <span className="ml-1.5 text-[11px] font-normal text-slate-400 dark:text-slate-500">
                (You)
              </span>
            )}
          </span>
          {member.name && (
            <span className="text-[11px] text-slate-500 dark:text-slate-400">{member.email}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {member.isYou ? (
          // No controls for your own row.
          <span className="text-[11.5px] font-medium capitalize text-slate-400 dark:text-slate-500">
            {member.role}
          </span>
        ) : (
          <>
            <RoleSelect
              value={member.role}
              onChange={(role) => onRoleChange(member, role)}
              disabled={isPending}
            />
            <ConfirmAction
              tier="confirm"
              title="Remove member?"
              description={`${member.name ?? member.email} will be removed from this portfolio.`}
              confirmLabel="Remove"
              successMessage="Member removed"
              onConfirm={() => onRemove(member)}
            >
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:hover:border-red-800 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              >
                <UserMinus className="h-3.5 w-3.5" />
              </button>
            </ConfirmAction>
          </>
        )}
      </div>
    </li>
  );
}

// ── Invitee row ──────────────────────────────────────────────────────────────

function InviteeRow({
  invitee,
  isPending,
  onRoleChange,
  onResend,
  onRevoke,
}: {
  invitee: PortfolioInvitee;
  isPending: boolean;
  onRoleChange: (invitee: PortfolioInvitee, role: PortfolioRole) => void;
  onResend: (handoffId: string) => Promise<ActionResult<void>>;
  onRevoke: (handoffId: string) => Promise<ActionResult<void>>;
}) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-2.5 py-2 dark:border-slate-800">
      <div className="flex flex-col leading-tight">
        <div className="flex items-center gap-1.5">
          <span className="text-[12.5px] font-medium text-slate-800 dark:text-slate-100">
            {invitee.name ?? invitee.email}
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded border px-1.5 py-0.5 text-[10.5px] font-medium",
              STATUS_STYLES[invitee.status],
            )}
          >
            {STATUS_LABEL[invitee.status]}
          </span>
        </div>
        {invitee.name && (
          <span className="text-[11px] text-slate-500 dark:text-slate-400">{invitee.email}</span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <RoleSelect
          value={invitee.role}
          onChange={(role) => onRoleChange(invitee, role)}
          disabled={isPending}
        />
        <OverflowMenu>
          {invitee.status !== "draft" && (
            <ConfirmAction
              tier="confirm"
              title="Resend invitation?"
              description="A new invitation will be sent. The previous link will stop working."
              confirmLabel="Resend"
              successMessage="Invitation resent"
              onConfirm={() => onResend(invitee.handoffId)}
            >
              <OverflowItem icon={<RotateCcw className="h-3.5 w-3.5" />} label="Resend" />
            </ConfirmAction>
          )}
          <ConfirmAction
            tier="confirm"
            title="Revoke invitation?"
            description="This person will no longer be able to accept the invitation."
            confirmLabel="Revoke"
            successMessage="Invitation revoked"
            onConfirm={() => onRevoke(invitee.handoffId)}
          >
            <OverflowItem
              icon={<XCircle className="h-3.5 w-3.5" />}
              label="Revoke"
              destructive
            />
          </ConfirmAction>
        </OverflowMenu>
      </div>
    </li>
  );
}

// ── Add invitee row ──────────────────────────────────────────────────────────

function AddInviteeRow({
  row,
  onChange,
  onRemove,
}: {
  row: AddRow;
  onChange: (patch: Partial<AddRow>) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <input
          type="email"
          value={row.email}
          onChange={(e) => onChange({ email: e.target.value })}
          placeholder="Email address"
          className={cn(proInputClass, "text-[12.5px]")}
        />
      </div>
      <RoleSelect value={row.role} onChange={(role) => onChange({ role })} />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ── Overflow "···" menu ──────────────────────────────────────────────────────

function OverflowMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      const target = e.target as Element | null;
      // A ConfirmAction opened from this menu portals its AlertDialog to <body>,
      // outside ref.current. Clicking inside that dialog must NOT close the menu —
      // closing unmounts the dialog mid-click, so Confirm/Cancel never fires.
      if (target?.closest?.("[role='alertdialog'],[role='dialog']")) return;
      if (ref.current && !ref.current.contains(target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[140px] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
          {children}
        </div>
      )}
    </div>
  );
}

function OverflowItem({
  icon,
  label,
  destructive,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  destructive?: boolean;
  // <ConfirmAction> clones its trigger with onClick/disabled — both must be
  // forwarded to the rendered <span> or the item is inert (no click ever fires).
  onClick?: (e: React.MouseEvent<HTMLSpanElement>) => void;
  disabled?: boolean;
}) {
  return (
    <span
      onClick={disabled ? undefined : onClick}
      className={cn(
        "flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-[12.5px] font-medium transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/60",
        destructive
          ? "text-red-600 dark:text-red-400"
          : "text-slate-700 dark:text-slate-200",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      {icon}
      {label}
    </span>
  );
}
