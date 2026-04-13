"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  Lock,
  CheckCircle2,
  MoreHorizontal,
  FileText,
  Download,
  UserPlus,
  BarChart2,
  Shield,
  TrendingUp,
  Filter,
} from "lucide-react";
import { cn } from "@/components/ui/utils";
import { AppHeader } from "@/components/layout/AppHeader";
import type {
  EstatePlanningPageData,
  EstateStat,
  EstateProperty,
  PropertyStatus,
  SuccessorRole,
} from "../queries";

// -- Config --

const propertyStatusConfig: Record<
  PropertyStatus,
  { label: string; className: string }
> = {
  complete: {
    label: "100% Complete",
    className: "bg-[#ecfdf5] text-[#065f46]",
  },
  pending: {
    label: "45% Pending",
    className: "bg-[#fffbeb] text-[#92400e]",
  },
  action: {
    label: "Action Required",
    className: "bg-[#fff1f2] text-[#881337]",
  },
  draft: {
    label: "Drafted",
    className: "bg-[#f0f9ff] text-[#0369a1]",
  },
};

// -- Components --

function StatCard({
  stat,
  style,
}: {
  stat: EstateStat;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn(
        "relative bg-white border border-[#e8eaed] rounded-xl p-6 flex flex-col gap-2 shadow-sm overflow-hidden anim-enter",
        stat.accent && "bg-gradient-to-br from-[rgba(0,74,198,0.05)] to-white",
      )}
      style={style}
    >
      {stat.accent && (
        <div className="absolute top-[-32px] right-[-32px] size-24 rounded-full bg-[rgba(0,74,198,0.05)]" />
      )}
      <p className="text-sm font-medium text-[#434655]">{stat.label}</p>
      <p className="text-2xl font-semibold text-val-heading">{stat.value}</p>

      {stat.progress !== null && (
        <div className="bg-[#d8e3f4] h-1.5 rounded-full w-full overflow-hidden">
          <div
            className="bg-[--val-primary-dark] h-1.5 rounded-full anim-progress"
            style={{ width: `${stat.progress}%` }}
          />
        </div>
      )}

      {stat.sub && (
        <div className="flex items-center gap-1">
          {stat.subVariant === "danger" && (
            <>
              <AlertTriangle className="size-3 text-[#ba1a1a] shrink-0" />
              <span className="text-xs font-semibold text-[#ba1a1a]">
                {stat.sub}
              </span>
            </>
          )}
          {stat.subVariant === "neutral" && (
            <span className="text-xs text-[#434655]">{stat.sub}</span>
          )}
          {stat.subVariant === "primary" && (
            <>
              <Lock className="size-3 text-[--val-primary-dark] shrink-0" />
              <span className="text-xs font-semibold text-[--val-primary-dark]">
                {stat.sub}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function PropertyCard({
  property,
  isActive,
  onClick,
}: {
  property: EstateProperty;
  isActive: boolean;
  onClick: () => void;
}) {
  const statusCfg = propertyStatusConfig[property.status];
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left border border-[#e8eaed] rounded-xl p-4 flex gap-4 items-start transition-all duration-200",
        isActive
          ? "bg-white shadow-md -translate-y-px"
          : "bg-white/50 hover:bg-white/80 hover:-translate-y-px hover:shadow-sm",
      )}
    >
      {/* Property thumbnail */}
      <div
        className={cn(
          "size-16 rounded-lg shrink-0 flex items-center justify-center text-sm font-semibold text-[--val-primary-dark]",
          !isActive && "opacity-80",
        )}
        style={{ backgroundColor: property.color }}
      >
        {property.initials}
      </div>

      <div className="flex flex-col items-start min-w-0">
        <p className="text-sm font-semibold text-val-heading truncate w-full">
          {property.name}
        </p>
        <p className="text-xs text-[#434655] mt-0.5">{property.address}</p>
        <div className="mt-2">
          <span
            className={cn(
              "text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full",
              statusCfg.className,
            )}
          >
            {statusCfg.label}
          </span>
        </div>
      </div>
    </button>
  );
}

function RoleBadge({ role }: { role: SuccessorRole }) {
  if (role === "primary") {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase bg-[rgba(0,74,198,0.1)] border border-[rgba(0,74,198,0.2)] text-[--val-primary-dark]">
        Primary Beneficiary
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase bg-[#e1e3e4] border border-[rgba(195,198,215,0.3)] text-[#626566]">
      Contingent Beneficiary
    </span>
  );
}

// -- Page --

export function SuccessionPage({ data }: { data: EstatePlanningPageData }) {
  const [selectedProperty, setSelectedProperty] = useState(0);

  const { stats, properties, successors, documents, timeline } = data;
  const property = properties[selectedProperty];

  return (
    <div className="h-full flex flex-col bg-val-bg-page-alt">
      <AppHeader />
      <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-[1200px] mx-auto flex flex-col gap-8">

        {/* -- Header -- */}
        <div className="flex items-end justify-between anim-enter" style={{ animationDelay: '0ms' }}>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold tracking-widest uppercase text-[--val-primary-dark]">Valgate</span>
              <span className="text-xs text-slate-300">/</span>
              <span className="text-xs font-semibold tracking-widest uppercase text-slate-400">Estate Planning</span>
            </div>
            <h1 className="text-4xl font-extrabold text-val-heading tracking-tight leading-10">
              Estate Planning
            </h1>
            <p className="text-slate-500 text-base mt-2">
              Protect what matters most — plan how your properties pass to the people you love.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#c3c6d7] bg-val-bg-page-alt text-sm font-medium text-val-heading hover:bg-white transition-colors">
              <BarChart2 className="size-4" />
              View Analytics
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2563eb] text-sm font-medium text-white hover:bg-[#1d4ed8] shadow-sm transition-colors">
              <TrendingUp className="size-4" />
              Generate Portfolio Report
            </button>
          </div>
        </div>

        {/* -- Stats Grid -- */}
        <div className="grid grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <StatCard
              key={stat.label}
              stat={stat}
              style={{ animationDelay: `${80 + i * 55}ms` }}
            />
          ))}
        </div>

        {/* -- Two Column Layout -- */}
        <div className="grid grid-cols-12 gap-8 items-start">

          {/* Left: Property List */}
          <div className="col-span-4 flex flex-col gap-4 anim-enter" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-semibold uppercase tracking-[0.7px] text-[#737686]">
                Properties
              </span>
              <button className="flex items-center gap-1 text-xs font-semibold text-[--val-primary-dark] hover:underline">
                <Filter className="size-3" />
                Filter
              </button>
            </div>
            {properties.map((p, i) => (
              <PropertyCard
                key={p.id}
                property={p}
                isActive={i === selectedProperty}
                onClick={() => setSelectedProperty(i)}
              />
            ))}
          </div>

          {/* Right: Detail Panel */}
          <div className="col-span-8 anim-enter-right" style={{ animationDelay: '360ms' }}>
            <div className="bg-white border border-[#e8eaed] rounded-2xl shadow-xl overflow-hidden">

              {/* Panel Header */}
              <div key={`ph-${selectedProperty}`} className="border-b border-[#e8eaed] px-8 py-6 flex flex-col gap-4 anim-enter">
                <div>
                  <h2 className="text-2xl font-bold font-display text-val-heading">
                    {property.name}{" "}
                    <span className="font-semibold text-[#c3c6d7]">Estate Plan</span>
                  </h2>
                  <p className="text-sm text-[#434655] mt-1">Last updated: Oct 14, 2023</p>
                </div>
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#c3c6d7] text-sm font-medium text-val-heading hover:bg-val-bg-page-alt transition-all duration-150 hover:scale-[1.02] active:scale-[0.97]">
                    <Download className="size-3.5" />
                    Download Summary
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#c3c6d7] text-sm font-medium text-val-heading hover:bg-val-bg-page-alt transition-all duration-150 hover:scale-[1.02] active:scale-[0.97]">
                    <UserPlus className="size-3.5" />
                    Add Beneficiary
                  </button>
                  <button className="px-4 py-2 rounded-lg bg-[--val-primary-dark] text-sm font-medium text-white hover:bg-[#003a9e] shadow-sm transition-all duration-150 hover:scale-[1.02] active:scale-[0.97] hover:shadow-md">
                    Review All
                  </button>
                </div>
              </div>

              {/* Panel Body */}
              <div key={`pb-${selectedProperty}`} className="p-8 flex flex-col gap-8 anim-enter" style={{ animationDelay: '40ms' }}>

                {/* Status Bar */}
                <div className="bg-val-bg-tint border border-[rgba(195,198,215,0.3)] rounded-xl p-6 flex flex-col gap-4">
                  <div className="flex items-end justify-between">
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-semibold uppercase tracking-[1.2px] text-[#434655]">Status</p>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-5 text-[#059669]" />
                        <span className="text-lg font-semibold text-[#059669]">Plan Finalized</span>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-val-heading">100% Finalized</span>
                  </div>
                  <div className="bg-[#e8eaed] h-3 rounded-full w-full overflow-hidden">
                    <div className="bg-[#059669] h-full rounded-full w-full anim-progress" style={{ animationDelay: '120ms' }} />
                  </div>
                </div>

                {/* Successors Table */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold font-display text-val-heading">
                      Designated Beneficiaries
                    </h3>
                    <span className="text-xs text-[#434655]">3 total entries</span>
                  </div>

                  <div className="border border-[#e8eaed] rounded-xl overflow-hidden">
                    {/* Table Header */}
                    <div className="bg-val-bg-tint grid grid-cols-[2fr_2fr_1fr_1.2fr_auto] items-center px-6 py-4">
                      {["Name", "Role", "Share", "Status", ""].map((col) => (
                        <span
                          key={col}
                          className="text-xs font-semibold uppercase tracking-[0.6px] text-[#737686]"
                        >
                          {col}
                        </span>
                      ))}
                    </div>

                    {/* Table Rows */}
                    {successors.map((s, i) => (
                      <div
                        key={s.initials}
                        className={cn(
                          "grid grid-cols-[2fr_2fr_1fr_1.2fr_auto] items-center px-6 py-4",
                          i > 0 && "border-t border-[#e8eaed]",
                        )}
                      >
                        {/* Name */}
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-full bg-[#d8e3f4] flex items-center justify-center text-sm font-semibold text-[--val-primary-dark] shrink-0">
                            {s.initials}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-val-heading">{s.name}</p>
                            <p className="text-xs text-[#434655]">{s.relation}</p>
                          </div>
                        </div>

                        {/* Role */}
                        <div className="pr-4">
                          <RoleBadge role={s.role} />
                        </div>

                        {/* Share */}
                        <span className="text-sm font-semibold text-val-heading">{s.share}</span>

                        {/* Status */}
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="size-3.5 text-[#059669] shrink-0" />
                          <span className="text-xs font-semibold text-[#059669]">Verified</span>
                        </div>

                        {/* Actions */}
                        <button className="p-1 rounded hover:bg-val-bg-page-alt text-[#737686]">
                          <MoreHorizontal className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Required Documents */}
                <div className="flex flex-col gap-4">
                  <h3 className="text-lg font-bold font-display text-val-heading">
                    Estate Documents
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {documents.map((doc) => (
                      <div
                        key={doc.name}
                        className="flex items-center justify-between bg-white border border-[#e8eaed] rounded-xl p-4"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className="size-10 rounded flex items-center justify-center shrink-0"
                            style={{ backgroundColor: doc.iconBg }}
                          >
                            <FileText className="size-5 text-val-heading/70" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-val-heading">{doc.name}</p>
                            <p className="text-[10px] font-semibold uppercase text-[#434655] mt-0.5">
                              {doc.meta}
                            </p>
                          </div>
                        </div>
                        <button className="p-1 rounded hover:bg-val-bg-page-alt text-[#737686]">
                          <Download className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Activities */}
                <div className="flex flex-col gap-6 pt-4">
                  <h3 className="text-lg font-bold font-display text-val-heading">
                    Recent Activity
                  </h3>

                  <div className="relative flex flex-col gap-6">
                    {/* Vertical line */}
                    <div className="absolute left-[10px] top-2 bottom-2 w-0.5 bg-[#c3c6d7]" />

                    {timeline.map((item) => (
                      <div key={item.title} className="relative pl-10">
                        {/* Dot */}
                        <div
                          className={cn(
                            "absolute left-0 top-1.5 size-5 rounded-full bg-white border-4 shadow-sm",
                            item.active ? "border-[--val-primary-dark] anim-dot-glow" : "border-[#c3c6d7]",
                          )}
                        />
                        <p className="text-xs font-semibold uppercase tracking-[0.6px] text-[#737686]">
                          {item.time}
                        </p>
                        <p className="text-sm font-semibold text-val-heading mt-0.5">
                          {item.title}
                        </p>
                        <p className="text-sm text-[#434655] mt-0.5">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Panel Footer */}
              <div className="bg-val-bg-tint border-t border-[#e8eaed] px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#434655]">
                  <Shield className="size-3.5 shrink-0" />
                  <span className="text-xs font-medium">End-to-end encrypted estate planning data.</span>
                </div>
                <div className="flex items-center gap-4">
                  <button className="text-xs font-semibold uppercase tracking-wide text-[#737686] hover:text-[#434655]">
                    View full history
                  </button>
                  <button className="text-xs font-semibold uppercase tracking-wide text-[--val-primary-dark] hover:text-[#003a9e]">
                    Download all documents
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
