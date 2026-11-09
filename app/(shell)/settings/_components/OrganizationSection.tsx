"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { formatDate } from "@/lib/format";
import type { ActionResult } from "@/app/actions/_result";
import type { OrgMember, OrgMemberRole, OrgMembersData } from "../queries";
import { inviteOrgMemberAction, removeMemberAction } from "../actions";

const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb]";
const FIELD =
  "h-[38px] w-full bg-[#f5f6f7] border border-[#d1d5db] rounded-[8px] px-4 font-sans text-[14px] text-foreground placeholder:text-[#9ca3af] outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] focus:bg-white hover:border-[#b0b8c4] transition-all duration-150";
const ROW_BUTTON =
  "inline-flex h-[30px] items-center gap-1 rounded-[6px] border border-[#d1d5db] bg-white px-3 text-[12px] font-medium hover:bg-[#f5f6f7] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150";

function RoleBadge({ role }: { role: OrgMemberRole }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
        role === "owner" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"
      }`}
    >
      {role}
    </span>
  );
}

function memberDate({ joinedAt, invitedAt }: OrgMember): string {
  if (joinedAt) return `Joined ${formatDate(new Date(joinedAt).getTime())}`;
  if (invitedAt) return `Invited ${formatDate(new Date(invitedAt).getTime())}`;
  return "—";
}

// The settings actions return { ok, error? }; ConfirmAction expects an ActionResult.
function toResult(result: { ok: boolean; error?: string }): ActionResult<void> {
  return result.ok ? { ok: true, data: undefined } : { ok: false, error: result.error ?? "" };
}

function MemberRow({ member, isSelf }: { member: OrgMember; isSelf: boolean }) {
  const name = member.name ?? member.email;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_90px_140px_100px] items-center gap-2 sm:gap-3 px-5 py-3.5">
      <div className="flex min-w-0 flex-col">
        <span className="font-sans font-medium text-[14px] text-val-heading leading-tight break-words">
          {name}
          {isSelf && <span className="ml-1.5 font-normal text-[12px] text-tertiary">(you)</span>}
        </span>
        {member.name && <span className="font-sans text-[12px] text-tertiary break-all">{member.email}</span>}
      </div>
      <div>
        <RoleBadge role={member.role} />
      </div>
      <span className="font-sans text-[12px] text-tertiary">{memberDate(member)}</span>
      {/* The service independently refuses self-removal and removing the last owner. */}
      {!isSelf && (
        <div className="flex items-center justify-start sm:justify-end gap-2">
          <ConfirmAction
            tier="confirm"
            title={`Revoke access for ${name}?`}
            description="They will lose access to this organization immediately. You can invite them again later."
            confirmLabel="Revoke access"
            successMessage={`${name} removed`}
            failureMessage="Could not remove this member."
            onConfirm={async () => toResult(await removeMemberAction(member.id))}
          >
            <button type="button" aria-label={`Revoke access for ${name}`} className={`${ROW_BUTTON} text-[#e11d48] ${FOCUS_RING}`}>
              Revoke
            </button>
          </ConfirmAction>
        </div>
      )}
    </div>
  );
}

// No local copy of the members list: revalidatePath in the actions re-renders these props.
export function OrganizationSection({ data }: { data: OrgMembersData }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();
  const emailRef = useRef<HTMLInputElement>(null);

  function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      // A rejected action (e.g. offline) would otherwise throw into the error boundary.
      const result = await inviteOrgMemberAction(email).catch(() => ({ ok: false, error: undefined }));
      if (result.ok) {
        // The list only holds active members, so a new invite won't show up until it's accepted.
        toast.success(`Invitation sent to ${email}. They'll appear here once they accept.`);
        setEmail("");
      } else {
        setError(result.error ?? "Could not send the invitation.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="font-display font-bold text-[20px] sm:text-[24px] leading-tight text-foreground break-words">
          Sharing
        </h2>
        <p className="font-sans text-[14px] leading-[20px] text-tertiary">
          Share {data.orgName} with your household. Invited members can view the portfolio; only owners can make changes.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* ── Invite ──────────────────────────────────────────────────── */}
        <form
          onSubmit={handleInvite}
          aria-busy={isSubmitting}
          className="bg-white border border-[#d1d5db] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] p-4 sm:p-[25px] flex flex-col gap-4"
        >
          <div className="flex flex-col gap-0.5">
            <h3 className="font-display font-semibold text-[15px] sm:text-[18px] text-val-heading">Invite member</h3>
            <p className="font-sans text-[13px] text-tertiary">
              Invite as a viewer. They&apos;ll receive an email and appear below after accepting.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end gap-3">
            <div className="flex flex-col gap-[6px]">
              <label htmlFor="org-invite-email" className="font-sans font-medium text-[14px] leading-[20px] text-foreground">
                Email
              </label>
              <input
                ref={emailRef}
                id="org-invite-email"
                type="email"
                required
                maxLength={254}
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "org-invite-error" : undefined}
                className={FIELD}
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`inline-flex h-[38px] items-center justify-center gap-1.5 rounded-[8px] bg-[#2563eb] px-4 text-[13px] font-medium text-white hover:bg-blue-700 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 ${FOCUS_RING}`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              {isSubmitting ? "Sending…" : "Send invite"}
            </button>
          </div>
          {error && (
            <p id="org-invite-error" role="alert" className="font-sans text-[13px] text-[#e11d48]">
              {error}
            </p>
          )}
        </form>

        {/* ── Members ─────────────────────────────────────────────────── */}
        <div className="bg-white border border-[#d1d5db] rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="border-b border-[#e8eaed] bg-[#f5f6f7] px-5 py-3">
            <h3 className="font-sans font-semibold text-[13px] text-val-heading">Members</h3>
          </div>
          <div className="divide-y divide-[#e8eaed]">
            <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_90px_140px_100px] items-center gap-3 bg-[#fafbff] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">
              <span>Member</span>
              <span>Role</span>
              <span>Joined</span>
              <span className="text-right">Actions</span>
            </div>
            {data.members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                isSelf={member.userId === data.currentUserId}
              />
            ))}
          </div>
          {data.members.length <= 1 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-dashed border-[#d1d5db] bg-[#fafbff] px-5 py-4">
              <p className="font-sans text-[13px] text-tertiary">
                No other members yet. Invite someone to view this portfolio.
              </p>
              <button
                type="button"
                onClick={() => emailRef.current?.focus()}
                className={`inline-flex h-[34px] shrink-0 items-center justify-center gap-1.5 rounded-[8px] bg-[#2563eb] px-4 text-[13px] font-medium text-white hover:bg-blue-700 active:scale-[0.97] transition-all duration-150 ${FOCUS_RING}`}
              >
                Invite a member
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
