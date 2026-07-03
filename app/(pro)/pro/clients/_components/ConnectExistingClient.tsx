"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Clock, Check, X } from "lucide-react";
import { requestAccessAction } from "@/app/(pro)/pro/clients.actions";
import {
  ProField,
  ProFormError,
  proInputClass,
  proPrimaryButtonClass,
} from "@/app/(pro)/pro/_components/pro-modal";
import { cn } from "@/components/ui/utils";

type AccessLevel = "view" | "full";

type RequestRow = {
  id: string;
  ownerOrgName: string;
  requestedLevel: AccessLevel;
  status: "pending" | "approved" | "denied";
  createdAt: number;
};

const LEVEL_EXPLANATION: Record<AccessLevel, string> = {
  view: "Read-only. You can review the portfolio and propose changes.",
  full: "Full access. You can manage the portfolio directly.",
};

export function ConnectExistingClient({
  onBack,
  managerName,
  managerEmail,
  requests,
}: {
  onBack: () => void;
  managerName: string;
  managerEmail: string;
  requests: RequestRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [inviteCode, setInviteCode] = useState("");
  const [level, setLevel] = useState<AccessLevel>("view");

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
        setInviteCode("");
        toast.success("Request sent. The owner will be notified to approve it.");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Back-to-chooser arrow */}
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to method chooser"
        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
      </button>

      <div className="flex flex-col gap-1">
        <h3 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">
          Connect to an existing client
        </h3>
        <p className="text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">
          Enter an owner&rsquo;s invite code to request access to their
          portfolio. They approve the request before you can open the account.
        </p>
        <p className="mt-1 text-[11.5px] text-slate-400 dark:text-slate-500">
          Signed in as{" "}
          <span className="font-medium text-slate-600 dark:text-slate-300">
            {managerName}
          </span>
          {managerEmail ? (
            <span className="text-slate-400 dark:text-slate-500">
              {" "}· {managerEmail}
            </span>
          ) : null}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-5 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
      >
        <ProField
          label="Invite code"
          htmlFor="connect-invite-code"
          hint="The 8-character code from the account owner."
        >
          <input
            id="connect-invite-code"
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
          <legend className="mb-0.5 text-[12px] font-medium text-slate-600 dark:text-slate-300">
            Access level
          </legend>
          <div
            role="radiogroup"
            aria-label="Access level"
            className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
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
                      ? "border border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
                  )}
                >
                  {value}
                </button>
              );
            })}
          </div>
          <p className="text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400">
            {LEVEL_EXPLANATION[level]}
          </p>
        </fieldset>

        <ProFormError message={error} />

        <button
          type="submit"
          disabled={isPending || !codeIsValid}
          className={proPrimaryButtonClass}
        >
          {isPending ? "Sending request…" : "Request access"}
        </button>
      </form>

      {requests.length > 0 && (
        <section>
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Your requests
          </h4>
          <ul className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-700 dark:bg-slate-900">
            {requests.map((request) => (
              <RequestListItem key={request.id} request={request} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function RequestListItem({ request }: { request: RequestRow }) {
  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-slate-800 dark:text-slate-100">
          {request.ownerOrgName}
        </p>
        <p className="mt-0.5 text-[11.5px] text-slate-500 dark:text-slate-400">
          {statusSubtext(request)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-medium capitalize text-slate-500 dark:border-slate-600 dark:text-slate-400">
          {request.requestedLevel}
        </span>
        <StatusBadge status={request.status} />
      </div>
    </li>
  );
}

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

function StatusBadge({ status }: { status: RequestRow["status"] }) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
        <Check className="h-3 w-3" strokeWidth={2.5} />
        Approved
      </span>
    );
  }
  if (status === "denied") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
        <X className="h-3 w-3" strokeWidth={2.5} />
        Declined
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
      <Clock className="h-3 w-3" strokeWidth={2.5} />
      Pending
    </span>
  );
}
