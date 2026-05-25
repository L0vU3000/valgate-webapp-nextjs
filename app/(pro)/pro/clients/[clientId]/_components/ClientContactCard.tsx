"use client";

import { ArrowRight, Mail, Phone } from "lucide-react";
import { WidgetCard } from "@/app/(pro)/pro/_components/WidgetCard";
import type { ClientContact } from "@/app/(pro)/pro/_data/mock";

type Props = {
  contact: ClientContact;
};

export function ClientContactCard({ contact }: Props) {
  return (
    <WidgetCard title="Client Contact">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[12px] font-semibold text-slate-600">
          {contact.name
            .split(" ")
            .map((part) => part[0])
            .join("")}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-slate-900">
            {contact.name}
          </div>
          <div className="mt-2 flex flex-col gap-1.5 text-[12.5px] text-slate-600">
            <span className="inline-flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              {contact.email}
            </span>
            <span className="inline-flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-slate-400" />
              {contact.phone}
            </span>
          </div>
          <div className="mt-2 text-[12px] text-slate-500">
            Preferred contact: {contact.preferredContact}
          </div>
        </div>
      </div>
      <button
        type="button"
        className="inline-flex h-9 w-full items-center justify-center rounded-md border border-slate-200 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
      >
        Message Client
      </button>
      <a
        href="#"
        className="inline-flex items-center gap-1 text-[12.5px] font-medium text-blue-600 hover:text-blue-700"
      >
        View Full Profile
        <ArrowRight className="h-3.5 w-3.5" />
      </a>
    </WidgetCard>
  );
}
