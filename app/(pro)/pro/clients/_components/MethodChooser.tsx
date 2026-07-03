"use client";

import { UserPlus, Link } from "lucide-react";
import { proSecondaryButtonClass } from "@/app/(pro)/pro/_components/pro-modal";

type Mode = "new" | "connect";

const OPTIONS: {
  mode: Mode;
  icon: React.ReactNode;
  title: string;
  description: string;
}[] = [
  {
    mode: "new",
    icon: <UserPlus className="h-5 w-5" strokeWidth={1.5} />,
    title: "Create a new client",
    description: "Set up a portfolio, add people, and seed properties.",
  },
  {
    mode: "connect",
    icon: <Link className="h-5 w-5" strokeWidth={1.5} />,
    title: "Connect to an existing client",
    description: "Use an invite code to request access to their portfolio.",
  },
];

export function MethodChooser({
  onPick,
  onCancel,
}: {
  onPick: (mode: Mode) => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-[13px] text-slate-500 dark:text-slate-400">
        How would you like to add a client?
      </p>

      <div className="flex flex-col gap-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.mode}
            type="button"
            onClick={() => onPick(opt.mode)}
            className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-blue-300 hover:shadow-sm active:scale-[0.99] dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500/40"
          >
            <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {opt.icon}
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">
                {opt.title}
              </span>
              <span className="text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">
                {opt.description}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onCancel}
          className={proSecondaryButtonClass}
        >
          Cancel
        </button>
        {/* Continue is intentionally disabled until a card is selected — but
            per the design spec blue is reserved for the primary action. */}
      </div>
    </div>
  );
}
