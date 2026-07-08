"use client";

import { WidgetCard } from "@/app/(pro)/pro/_components/WidgetCard";
import { EnterLi } from "@/app/(pro)/pro/_components/motion-primitives";
import { STATUS_PILL } from "@/app/(pro)/pro/dashboard/_components/ComplianceTable";
import { cn } from "@/components/ui/utils";
import type { ProComplianceRow } from "@/app/(pro)/pro/queries";

// Certification Expiry — an agenda-style timeline grouped by how far off
// each certificate's expiry is. We group on daysLeft (server-computed at
// request time, so no hydration mismatch) rather than a month grid,
// because most certs sit far in the future and a calendar would look empty.
//
// Buckets, in reading order:
//   Overdue          daysLeft < 0
//   Due in 30 days   0 ≤ daysLeft ≤ 30
//   31–90 days       30 < daysLeft ≤ 90
//   Later            daysLeft > 90
//
// The incoming rows are already sorted by expiry (soonest first) in the
// query layer, so each bucket stays in expiry order automatically.

type HorizonGroup = {
  key: string;
  heading: string;
  // A row belongs to this group when matches(daysLeft) is true.
  matches: (daysLeft: number) => boolean;
  // Tailwind classes for the small heading + count, tuned to urgency.
  headingClass: string;
};

const HORIZON_GROUPS: HorizonGroup[] = [
  {
    key: "overdue",
    heading: "Overdue",
    matches: (daysLeft) => daysLeft < 0,
    headingClass: "text-red-600 dark:text-red-400",
  },
  {
    key: "due-30",
    heading: "Due in 30 days",
    matches: (daysLeft) => daysLeft >= 0 && daysLeft <= 30,
    headingClass: "text-amber-600 dark:text-amber-400",
  },
  {
    key: "due-90",
    heading: "31–90 days",
    matches: (daysLeft) => daysLeft > 30 && daysLeft <= 90,
    headingClass: "text-slate-600 dark:text-slate-300",
  },
  {
    key: "later",
    heading: "Later",
    matches: (daysLeft) => daysLeft > 90,
    headingClass: "text-slate-500 dark:text-slate-400",
  },
];

export function CertTimeline({
  certifications,
  // On a single-client tab the client name repeats down every row, so the
  // client Compliance tab hides it. The global page leaves it visible.
  hideClient = false,
}: {
  certifications: ProComplianceRow[];
  hideClient?: boolean;
}) {
  // Partition the rows into the four horizon buckets. A running counter
  // gives every visible row a continuous index so the entrance stagger
  // reads straight down the card, across group boundaries.
  let runningIndex = 0;
  const groups = HORIZON_GROUPS.map((group) => {
    const rows = certifications.filter((cert) => group.matches(cert.daysLeft));
    return { ...group, rows };
  }).filter((group) => group.rows.length > 0);

  return (
    <WidgetCard title="Certification Expiry">
      {certifications.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-slate-500 dark:text-slate-400">
          No certifications on file.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((group) => (
            <div key={group.key} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <h3
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-wide",
                    group.headingClass,
                  )}
                >
                  {group.heading}
                </h3>
                <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-1.5 text-[10.5px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {group.rows.length}
                </span>
              </div>
              <ul className="flex flex-col">
                {group.rows.map((cert) => {
                  const index = runningIndex;
                  runningIndex += 1;
                  return (
                    <EnterLi
                      key={cert.id}
                      index={index}
                      className="flex items-center gap-3 border-b border-slate-100 py-2.5 last:border-0 dark:border-slate-800"
                    >
                      <div className="flex min-w-0 flex-1 flex-col leading-tight">
                        <span className="truncate text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                          {cert.name}
                        </span>
                        <span className="truncate text-[11.5px] text-slate-500 dark:text-slate-400">
                          {cert.propertyName}
                          {hideClient ? "" : ` · ${cert.clientName}`}
                        </span>
                      </div>
                      <span className="shrink-0 text-[12px] tabular-nums text-slate-600 dark:text-slate-300">
                        {cert.dueLabel}
                      </span>
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                          STATUS_PILL[cert.status],
                        )}
                      >
                        {cert.status}
                      </span>
                    </EnterLi>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}
