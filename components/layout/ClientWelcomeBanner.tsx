"use client";

import { useState, useTransition } from "react";
import { Home, X } from "lucide-react";
import { dismissWelcomeMessageAction } from "@/app/(shell)/actions";

// One-time banner shown to a client the first time they land in a portfolio their
// manager created for them via the invite flow. Read-only — the portfolio name
// itself lives on organizations.name (Clerk's org name, mirrored into Neon), so
// there's nothing to sync back: if the client later renames it elsewhere, the
// manager sees the same update because it's the same field, not a copy.
//
// Shown once: dismissing calls dismissWelcomeMessageAction to stamp
// client_handoffs.welcome_seen_at, so it never reappears on a later visit.
export function ClientWelcomeBanner({
  handoffId,
  portfolioName,
  managerName,
}: {
  handoffId: string;
  portfolioName: string;
  managerName: string;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (dismissed) return null;

  function handleDismiss() {
    setDismissed(true);
    startTransition(() => {
      void dismissWelcomeMessageAction(handoffId);
    });
  }

  return (
    <div className="flex w-full items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-4 py-2 text-[13px] text-slate-700">
      <div className="flex items-center gap-2">
        <Home className="h-4 w-4 shrink-0 text-slate-500" />
        <span>
          Welcome! <strong>{managerName}</strong> created the &ldquo;{portfolioName}&rdquo; portfolio for you.
        </span>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        disabled={isPending}
        aria-label="Dismiss welcome message"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[12px] font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/50 disabled:opacity-60"
      >
        <X className="h-3.5 w-3.5" />
        Got it
      </button>
    </div>
  );
}
