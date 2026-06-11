"use client";

import { Mail, Phone } from "lucide-react";
import { WidgetCard } from "@/app/(pro)/pro/_components/WidgetCard";
import { cn } from "@/components/ui/utils";
import type { Client } from "@/lib/data/types/client";

// Client contact card — renders the real Client record's contact
// fields, each falling back to "—" when not on file.

export function ClientContactCard({ client }: { client: Client }) {
  return (
    <WidgetCard title="Client Contact">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold",
            client.avatarBg,
          )}
        >
          {client.initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">
            {client.name}
          </div>
          <div className="mt-2 flex flex-col gap-1.5 text-[12.5px] text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              {client.email ?? "—"}
            </span>
            <span className="inline-flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              {client.phone ?? "—"}
            </span>
          </div>
          <div className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">
            Preferred contact: {client.preferredContact ?? "—"}
          </div>
          {client.managementFeePct !== undefined && (
            <div className="text-[12px] text-slate-500 dark:text-slate-400">
              Management fee: {client.managementFeePct}% of collected rent
            </div>
          )}
        </div>
      </div>
    </WidgetCard>
  );
}
