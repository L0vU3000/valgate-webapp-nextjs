"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clock, Check, X } from "lucide-react";
import { requestAccessAction } from "@/app/(pro)/pro/actions";
import {
  ProField,
  ProFormError,
  proInputClass,
  proPrimaryButtonClass,
} from "@/app/(pro)/pro/_components/pro-modal";
import { cn } from "@/components/ui/utils";

// Manager "Add account" surface. The manager is already signed in inside the Pro
// cockpit, so this is an in-app panel (not an auth page): a single invite-code
// field + a View/Full access-level choice, wired to the real requestAccessAction.
// Their existing requests render below from real data (listMyAccessRequests).

type AccessLevel = "view" | "full";

type RequestRow = {
  id: string;
  ownerOrgName: string;
  requestedLevel: AccessLevel;
  status: "pending" | "approved" | "denied";
  createdAt: number;
};

// One-line explanation of each access level, shown under the segmented control.
const LEVEL_EXPLANATION: Record<AccessLevel, string> = {
  view: "Read-only. You can review the portfolio and propose changes.",
  full: "Full access. You can manage the portfolio directly.",
};

export function AddAccountPage({
  managerName,
  managerEmail,
  requests,
}: {
  managerName: string;
  managerEmail: string;
  requests: RequestRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [inviteCode, setInviteCode] = useState("");
  const [level, setLevel] = useState<AccessLevel>("view");

  // Mirror the server's rule (code must be non-empty) so the primary button only
  // enables once the request can actually be made.
  const codeIsValid = inviteCode.trim().length > 0;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await requestAccessAction({
        inviteCode: inviteCode.trim(),
        level,
      });

      if (result.ok) {
        // The new pending request now exists server-side; refresh so it appears
        // in the list below, then clear the field for the next code.
        setInviteCode("");
        toast.success("Request sent. The owner will be notified to approve it.");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="h-full overflow-y-auto bg-surface-base">
      <div className="mx-auto w-full max-w-xl px-6 py-12">
        <header>
          <h1 className="text-[20px] font-semibold tracking-tight text-slate-900">
            Add an account
          </h1>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-500">
            Enter an owner&rsquo;s invite code to request access to their
            portfolio. They approve the request before you can open the account.
          </p>
          <p className="mt-3 text-[12.5px] text-slate-500">
            Signed in as{" "}
            <span className="font-medium text-slate-700">{managerName}</span>
            {managerEmail ? (
              <span className="text-slate-400"> · {managerEmail}</span>
            ) : null}
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="mt-7 flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6"
        >
          <ProField
            label="Invite code"
            htmlFor="invite-code"
            hint="The 8-character code from the account owner."
          >
            <input
              id="invite-code"
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={inviteCode}
              onChange={(event) =>
                setInviteCode(event.target.value.toUpperCase())
              }
              placeholder="e.g. 7K4P9XQ2"
              className={cn(
                proInputClass,
                "font-mono text-[14px] uppercase tracking-[0.18em] placeholder:tracking-normal placeholder:normal-case",
              )}
            />
          </ProField>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-[12px] font-medium text-slate-600">
              Access level
            </legend>
            {/* Neutral segmented control — blue stays reserved for the one primary
                action on this view (Request access). */}
            <div
              role="radiogroup"
              aria-label="Access level"
              className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1"
            >
              {(["view", "full"] as AccessLevel[]).map((value) => {
                const selected = level === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setLevel(value)}
                    className={cn(
                      "h-8 rounded-md text-[13px] font-medium capitalize transition-colors",
                      selected
                        ? "border border-slate-200 bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700",
                    )}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
            <p className="text-[12px] leading-relaxed text-slate-500">
              {LEVEL_EXPLANATION[level]}
            </p>
          </fieldset>

          <ProFormError message={error} />

          <button
            type="submit"
            disabled={isPending || !codeIsValid}
            className={cn(proPrimaryButtonClass, "w-full")}
          >
            {isPending ? "Sending request…" : "Request access"}
          </button>
        </form>

        {requests.length > 0 ? (
          <section className="mt-9">
            <h2 className="text-[12px] font-semibold uppercase tracking-wide text-slate-400">
              Your requests
            </h2>
            <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {requests.map((request) => (
                <RequestListItem key={request.id} request={request} />
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}

// One request row: account name + when it was requested on the left, the
// requested level and current status as inline badges (metadata) on the right.
function RequestListItem({ request }: { request: RequestRow }) {
  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3.5">
      <div className="min-w-0">
        <p className="truncate text-[13.5px] font-medium text-slate-800">
          {request.ownerOrgName}
        </p>
        <p className="mt-0.5 text-[12px] text-slate-500">
          {statusSubtext(request)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-medium capitalize text-slate-500">
          {request.requestedLevel}
        </span>
        <StatusBadge status={request.status} />
      </div>
    </li>
  );
}

// Subtext that teaches what's true now and what happens next — no vague filler.
function statusSubtext(request: RequestRow): string {
  const requestedOn = new Date(request.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  if (request.status === "pending") {
    return `Waiting for ${request.ownerOrgName} to approve · sent ${requestedOn}`;
  }
  if (request.status === "approved") {
    return `Approved · open it from your dashboard`;
  }
  return `Declined · requested ${requestedOn}`;
}

// Status as a tinted badge with an icon (never a side-stripe). Colours stay off
// blue, which is reserved for the primary action.
function StatusBadge({ status }: { status: RequestRow["status"] }) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
        <Check className="h-3 w-3" strokeWidth={2.5} />
        Approved
      </span>
    );
  }
  if (status === "denied") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
        <X className="h-3 w-3" strokeWidth={2.5} />
        Declined
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
      <Clock className="h-3 w-3" strokeWidth={2.5} />
      Pending
    </span>
  );
}
