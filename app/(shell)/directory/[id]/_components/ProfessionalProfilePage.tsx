"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  Star,
  BadgeCheck,
  Building2,
  Users,
} from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { cn } from "@/components/ui/utils";
import type { ProfessionalProfileData } from "../queries";

const CATEGORY_BADGE: Record<string, string> = {
  Agent:       "bg-blue-50 text-blue-700",
  Lawyer:      "bg-purple-50 text-purple-700",
  Notary:      "bg-indigo-50 text-indigo-700",
  Maintenance: "bg-green-50 text-green-700",
  Accountant:  "bg-emerald-50 text-emerald-700",
  Electrician: "bg-amber-50 text-amber-700",
  Inspector:   "bg-rose-50 text-rose-700",
  Plumber:     "bg-teal-50 text-teal-700",
};

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "size-4",
            i <= Math.floor(rating)
              ? "fill-amber-400 text-amber-400"
              : "fill-slate-200 text-slate-200",
          )}
        />
      ))}
      <span className="text-sm font-semibold text-slate-500 pl-1">
        {rating.toFixed(1)}
      </span>
      <span className="text-sm text-slate-400">({count} reviews)</span>
    </div>
  );
}

export function ProfessionalProfilePage({
  data,
}: {
  data: ProfessionalProfileData;
}) {
  const badgeClass = CATEGORY_BADGE[data.category] ?? "bg-slate-50 text-slate-600";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AppHeader />

      <div className="flex-1 overflow-y-auto bg-val-bg-page-alt">
        <div className="max-w-3xl mx-auto px-8 py-8">
          {/* Back link */}
          <Link
            href="/directory"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-[--val-primary-dark] transition-colors duration-150 mb-8"
          >
            <ArrowLeft className="size-4" />
            Back to Directory
          </Link>

          {/* Profile card */}
          <div className="bg-white rounded-2xl shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)] overflow-hidden animate-[fade-slide-up_0.4s_cubic-bezier(0.22,1,0.36,1)_both]">

            {/* Header band */}
            <div className="h-24 bg-gradient-to-r from-[--val-primary-dark] to-blue-500" />

            {/* Avatar + identity */}
            <div className="px-8 pb-8">
              <div className="flex items-end justify-between -mt-10 mb-6">
                <div className="relative">
                  <div
                    className={cn(
                      "size-20 rounded-full border-4 border-white flex items-center justify-center text-white font-bold text-2xl shadow-md",
                      data.avatarBg,
                    )}
                  >
                    {data.initials}
                  </div>
                  {data.available && (
                    <div className="absolute bottom-1 right-1 size-5 rounded-full bg-green-500 border-2 border-white" />
                  )}
                  {data.verified && (
                    <div
                      className="absolute -top-1 -right-1 size-6 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center"
                      title="Valgate Verified"
                    >
                      <BadgeCheck className="size-3.5 text-white" />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-12">
                  <a
                    href={data.email ? `mailto:${data.email}` : undefined}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150",
                      data.email
                        ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed pointer-events-none",
                    )}
                    title={data.email ?? "No email on record"}
                  >
                    <Mail className="size-4" />
                    Email
                  </a>
                  <a
                    href={data.phone ? `tel:${data.phone}` : undefined}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150",
                      data.phone
                        ? "bg-green-50 text-green-700 hover:bg-green-100"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed pointer-events-none",
                    )}
                    title={data.phone ?? "No phone on record"}
                  >
                    <Phone className="size-4" />
                    Call
                  </a>
                </div>
              </div>

              {/* Name + category */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-extrabold text-val-heading tracking-tight">
                      {data.name}
                    </h1>
                    {data.verified && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        <BadgeCheck className="size-2.5" />
                        Valgate Verified
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 text-sm">{data.company}</p>
                </div>
                <span
                  className={cn(
                    "text-[10px] font-semibold tracking-[1px] uppercase px-3 py-1 rounded-full shrink-0",
                    badgeClass,
                  )}
                >
                  {data.category}
                </span>
              </div>

              {/* Rating */}
              <div className="mb-6">
                <StarRating rating={data.rating} count={data.reviewCount} />
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-val-bg-tint rounded-xl p-4 flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</span>
                  <div className="flex items-center gap-1.5">
                    <div
                      className={cn(
                        "size-2 rounded-full",
                        data.available ? "bg-green-500" : "bg-slate-300",
                      )}
                    />
                    <span className="text-sm font-semibold text-val-heading">
                      {data.available ? "Available" : "Unavailable"}
                    </span>
                  </div>
                </div>
                <div className="bg-val-bg-tint rounded-xl p-4 flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Properties</span>
                  <div className="flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-slate-400" />
                    <span className="text-sm font-semibold text-val-heading">{data.linkedProperties} linked</span>
                  </div>
                </div>
                <div className="bg-val-bg-tint rounded-xl p-4 flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Reviews</span>
                  <div className="flex items-center gap-1.5">
                    <Users className="size-3.5 text-slate-400" />
                    <span className="text-sm font-semibold text-val-heading">{data.reviewCount} clients</span>
                  </div>
                </div>
              </div>

              {/* Contact details */}
              {(data.email || data.phone) && (
                <div className="border-t border-slate-100 pt-6">
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Contact
                  </h2>
                  <div className="flex flex-col gap-2">
                    {data.email && (
                      <a
                        href={`mailto:${data.email}`}
                        className="flex items-center gap-3 text-sm text-slate-600 hover:text-[--val-primary-dark] transition-colors duration-150"
                      >
                        <Mail className="size-4 text-slate-400 shrink-0" />
                        {data.email}
                      </a>
                    )}
                    {data.phone && (
                      <a
                        href={`tel:${data.phone}`}
                        className="flex items-center gap-3 text-sm text-slate-600 hover:text-[--val-primary-dark] transition-colors duration-150"
                      >
                        <Phone className="size-4 text-slate-400 shrink-0" />
                        {data.phone}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
