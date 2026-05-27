"use client";

import { useState } from "react";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/components/ui/utils";
import type { Alert, Severity } from "@/app/(pro)/pro/_data/mock";

const SEVERITY_STYLES: Record<
  Severity,
  { chip: string; icon: LucideIcon; iconColor: string }
> = {
  urgent: {
    chip: "bg-red-50 border-red-200 text-red-700",
    icon: AlertCircle,
    iconColor: "text-red-500",
  },
  warning: {
    chip: "bg-amber-50 border-amber-200 text-amber-800",
    icon: AlertTriangle,
    iconColor: "text-amber-500",
  },
  info: {
    chip: "bg-blue-50 border-blue-200 text-blue-700",
    icon: Info,
    iconColor: "text-blue-500",
  },
  ok: {
    chip: "bg-emerald-50 border-emerald-200 text-emerald-700",
    icon: Info,
    iconColor: "text-emerald-500",
  },
  neutral: {
    chip: "bg-slate-50 border-slate-200 text-slate-700",
    icon: Info,
    iconColor: "text-slate-500",
  },
};

type Props = {
  alerts: Alert[];
};

export function ClientAlertsStrip({ alerts }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const visibleAlerts = alerts.filter((alert) => !dismissed.has(alert.id));

  if (visibleAlerts.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
      {visibleAlerts.map((alert) => {
        const style = SEVERITY_STYLES[alert.severity];
        const Icon = style.icon;

        return (
          <div
            key={alert.id}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-2 rounded-full border pl-2.5 pr-2 text-[12.5px] font-medium",
              style.chip,
            )}
          >
            <Icon className={cn("h-3.5 w-3.5", style.iconColor)} />
            <span>{alert.label}</span>
            <button
              type="button"
              aria-label={`Dismiss alert: ${alert.label}`}
              onClick={() =>
                setDismissed((prev) => new Set(prev).add(alert.id))
              }
              className="rounded-full p-0.5 hover:bg-black/5"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
