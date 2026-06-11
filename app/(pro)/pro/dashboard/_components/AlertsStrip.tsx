"use client";

import { useState } from "react";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { cn } from "@/components/ui/utils";
import type { ProAlert, AlertSeverity } from "../../queries";

// Horizontal scrolling strip of alert chips between the KPI banner and
// the widget grid. Alerts are derived in the query layer from real
// records (overdue payments, expiring leases/certifications, open
// risks, emergency work orders). Dismissal is local UI state only.
//
// Motion: chips stagger in on load (urgent items register one by one
// instead of appearing as a wall), dismissed chips shrink out and the
// remaining chips slide over to close the gap. All of it collapses to
// the final state under `prefers-reduced-motion`.

const SEVERITY_STYLES: Record<
  AlertSeverity,
  { chip: string; icon: LucideIcon; iconColor: string }
> = {
  urgent: {
    chip: "bg-red-50 border-red-200 text-red-700 dark:bg-red-500/15 dark:border-red-500/30 dark:text-red-300",
    icon: AlertCircle,
    iconColor: "text-red-500 dark:text-red-400",
  },
  warning: {
    chip: "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-amber-300",
    icon: AlertTriangle,
    iconColor: "text-amber-500 dark:text-amber-400",
  },
  info: {
    chip: "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-500/15 dark:border-blue-500/30 dark:text-blue-300",
    icon: Info,
    iconColor: "text-blue-500 dark:text-blue-400",
  },
};

export function AlertsStrip({ alerts }: { alerts: ProAlert[] }) {
  const prefersReducedMotion = useReducedMotion();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visibleAlerts = alerts.filter((a) => !dismissed.has(a.id));

  return (
    // The outer AnimatePresence lets the whole strip fade away after the
    // last chip is dismissed, instead of vanishing in a single frame.
    <AnimatePresence>
      {visibleAlerts.length > 0 && (
        <motion.div
          exit={prefersReducedMotion ? undefined : { opacity: 0, height: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1 [scrollbar-width:thin]"
        >
          <AnimatePresence mode="popLayout">
            {visibleAlerts.map((alert, index) => {
              const style = SEVERITY_STYLES[alert.severity];
              const Icon = style.icon;
              return (
                <motion.div
                  key={alert.id}
                  layout
                  initial={
                    prefersReducedMotion
                      ? false
                      : { opacity: 0, y: 6, scale: 0.95 }
                  }
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: {
                      duration: 0.3,
                      ease: "easeOut",
                      delay: Math.min(index * 0.05, 0.4),
                    },
                  }}
                  exit={
                    prefersReducedMotion
                      ? { opacity: 0 }
                      : {
                          opacity: 0,
                          scale: 0.85,
                          transition: { duration: 0.18, ease: "easeIn" },
                        }
                  }
                  transition={{ layout: { duration: 0.25, ease: "easeOut" } }}
                  className={cn(
                    "shrink-0 inline-flex items-center gap-2 h-8 pl-2.5 pr-2 rounded-full border text-[12.5px] font-medium",
                    style.chip,
                  )}
                >
                  <Icon className={cn("w-3.5 h-3.5", style.iconColor)} />
                  <span>{alert.label}</span>
                  <button
                    type="button"
                    aria-label={`Dismiss alert: ${alert.label}`}
                    onClick={() =>
                      setDismissed((prev) => {
                        const next = new Set(prev);
                        next.add(alert.id);
                        return next;
                      })
                    }
                    className="p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
