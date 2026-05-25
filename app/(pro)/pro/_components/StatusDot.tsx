import { cn } from "@/components/ui/utils";
import type { Severity } from "@/app/(pro)/pro/_data/mock";

// A small coloured dot used in lists and tables to indicate severity / status.
//
// Maps the shared Severity type to a consistent tailwind background colour
// so the same colour system is used everywhere on the dashboard:
//   urgent  → red    (overdue / critical / non-performing)
//   warning → amber  (due soon / needs attention / vacant)
//   info    → blue   (in progress / informational / pending review)
//   ok      → green  (on track / healthy / active)
//   neutral → grey   (scheduled / draft / unassigned)

const SEVERITY_COLOR: Record<Severity, string> = {
  urgent: "bg-red-500",
  warning: "bg-amber-500",
  info: "bg-blue-500",
  ok: "bg-emerald-500",
  neutral: "bg-slate-400",
};

type Props = {
  severity: Severity;
  size?: "sm" | "md";
  className?: string;
};

export function StatusDot({ severity, size = "md", className }: Props) {
  const sizeClass = size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2";
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block rounded-full shrink-0",
        sizeClass,
        SEVERITY_COLOR[severity],
        className,
      )}
    />
  );
}
