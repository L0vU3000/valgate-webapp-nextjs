"use client";

import { cn } from "@/components/ui/utils";

// Shared chrome for every widget on the manager dashboard.
//
// Every widget on the page sits inside this card so the visual rhythm
// (border, padding, header row) is identical across the dashboard.
//
// Props:
//   title       — the bold label in the top-left of the card header.
//   headerRight — optional content in the top-right of the header — e.g.
//                 a "View All" link, a search input, filter dropdowns,
//                 or a small count badge.
//   children    — the actual widget content (table, chart, list, etc.).
//   className   — extra classes for the outer card (e.g. to override padding).

type Props = {
  title: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function WidgetCard({ title, headerRight, children, className }: Props) {
  return (
    <section
      className={cn(
        "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 flex flex-col gap-4",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-4">
        <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h2>
        {headerRight ? (
          <div className="flex items-center gap-2">{headerRight}</div>
        ) : null}
      </header>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}
