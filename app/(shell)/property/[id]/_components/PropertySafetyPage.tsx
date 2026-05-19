"use client";

import { useEffect, useState } from "react";
import type { Property } from "@/lib/data/types/property";
import type { Inspection } from "@/lib/data/types/inspection";
import type { Certification } from "@/lib/data/types/certification";
import type { SafetyRisk } from "@/lib/data/types/safety-risk";
import type { EmergencyContact } from "@/lib/data/types/emergency-contact";
import { PropertyLayout } from "@/components/property/PropertyLayout";
import { Check, AlertTriangle, Shield, Phone, ClipboardCheck, FileCheck, AlertOctagon } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";

interface Props {
  property: Property;
  inspections: Inspection[];
  certifications: Certification[];
  risks: SafetyRisk[];
  emergencyContacts: EmergencyContact[];
}

export function PropertySafetyPage({
  property,
  inspections = [],
  certifications = [],
  risks = [],
  emergencyContacts = [],
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  function fade(delay: number) {
    return {
      opacity: mounted ? 1 : 0,
      transform: mounted ? "none" : "translateY(8px)",
      transition: `opacity 400ms cubic-bezier(0.25,1,0.5,1) ${delay}ms, transform 400ms cubic-bezier(0.25,1,0.5,1) ${delay}ms`,
    };
  }

  return (
    <PropertyLayout activeTab="safety" property={property}>
      <div className="min-h-full bg-val-bg-page-alt">
        <div className="max-w-[1200px] mx-auto px-8">

          {/* Page header */}
          <div className="pt-8 pb-0" style={fade(0)}>
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-xs font-semibold tracking-widest uppercase text-[--val-primary-dark]">
                {property.code}
              </span>
              <span className="text-xs text-slate-300">/</span>
              <span className="text-xs font-semibold tracking-widest uppercase text-slate-400">Safety</span>
            </div>
            <div className="flex items-end justify-between mb-6">
              <div>
                <h1 className="text-4xl font-extrabold tracking-tight leading-10 text-[--val-heading]">
                  Safety
                </h1>
                <p className="text-slate-500 text-base mt-2">
                  78.6% compliant · Next inspection Apr 29, 2026
                </p>
              </div>
              <button
                className="px-5 py-2.5 text-white text-[14px] font-semibold rounded hover:opacity-90 active:scale-[0.97] transition-all duration-150"
                style={{
                  background: "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)",
                  boxShadow: "0 4px 6px -1px rgba(0,74,198,0.25), 0 2px 4px -2px rgba(0,74,198,0.15)",
                }}
              >
                Add Certificate
              </button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="pb-8 flex flex-col gap-5">

            {/* KPI Row */}
            <div className="grid grid-cols-4 gap-4 mb-1">
              {/* Certifications */}
              <div
                className="bg-white rounded-lg border border-slate-200 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                style={fade(80)}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">Certifications</span>
                  <div className="w-7 h-7 rounded-md bg-emerald-50 flex items-center justify-center">
                    <Check className="size-4 text-emerald-600" />
                  </div>
                </div>
                <div className="flex items-center justify-center py-2">
                  <div className="relative w-[64px] h-[64px]">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="40" fill="none" className="stroke-slate-200" strokeWidth="8" />
                      <circle cx="50" cy="50" r="40" fill="none" className="stroke-emerald-500" strokeWidth="8"
                        strokeDasharray={`${78.6 * 2.51} ${100 * 2.51}`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[15px] font-bold text-emerald-600">78.6%</span>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-400 mt-1 text-center">5 of 6 current</div>
              </div>

              {/* Compliance */}
              <div
                className="bg-white rounded-lg border border-slate-200 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                style={fade(160)}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">Compliance</span>
                  <div className="w-7 h-7 rounded-md bg-emerald-50 flex items-center justify-center">
                    <Check className="size-4 text-emerald-600" />
                  </div>
                </div>
                <div className="text-[24px] font-bold text-[--val-heading] leading-none">Compliant</div>
                <div className="text-xs text-slate-400 mt-1">All obligations met</div>
              </div>

              {/* Next Inspection */}
              <div
                className="bg-white rounded-lg border border-slate-200 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                style={fade(240)}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">Next Inspection</span>
                  <div className="w-7 h-7 rounded-md bg-amber-50 flex items-center justify-center">
                    <AlertTriangle className="size-4 text-amber-600" />
                  </div>
                </div>
                <div className="text-[24px] font-bold text-[--val-heading] leading-none">18 days</div>
                <div className="text-xs text-slate-400 mt-1">Fire safety · Apr 29, 2026</div>
              </div>

              {/* Open Issues */}
              <div
                className="bg-white rounded-lg border border-slate-200 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                style={fade(320)}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">Open Issues</span>
                  <div className="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center">
                    <Shield className="size-4 text-blue-600" />
                  </div>
                </div>
                <div className="text-[24px] font-bold text-[--val-heading] leading-none">2</div>
                <div className="text-xs text-slate-400 mt-1">1 medium · 1 low</div>
              </div>
            </div>

            {/* Safety Certifications — flat list */}
            <div
              className="bg-white rounded-xl p-6 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)] hover:-translate-y-0.5 hover:shadow-[0px_6px_20px_0px_rgba(18,28,40,0.10)] transition-all duration-200"
              style={fade(180)}
            >
              <h3 className="text-base font-bold text-[--val-heading] mb-4">Safety Certifications</h3>
              {certifications.length === 0 ? (
                <EmptyState
                  icon={<FileCheck className="size-6" />}
                  title="No certifications yet"
                  description="Upload a fire, electrical, or plumbing certificate to get started."
                />
              ) : certifications.map((c, i) => (
                <div
                  key={c.id}
                  className={`flex items-start justify-between py-4 ${i > 0 ? "border-t border-slate-100" : ""}`}
                >
                  <div>
                    <p className="text-[14px] font-semibold text-[--val-heading]">{c.name}</p>
                    <p className="text-[12px] text-slate-400 mt-0.5">{c.inspector}</p>
                  </div>
                  <div className="flex items-center gap-6 text-right shrink-0">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">Issued</span>
                      <p className="text-[13px] font-medium text-[--val-heading]">{formatDate(c.issuedAt)}</p>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">Expires</span>
                      <p className="text-[13px] font-medium text-[--val-heading]">{formatDate(c.expiresAt)}</p>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                      c.status === "Valid" ? "text-emerald-700 bg-emerald-50" : "text-amber-700 bg-amber-50"
                    }`}>
                      {c.status === "Valid" && <Check className="inline w-3 h-3" />}
                      {c.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Inspection History */}
            <div
              className="bg-white rounded-xl shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)] hover:-translate-y-0.5 hover:shadow-[0px_6px_20px_0px_rgba(18,28,40,0.10)] transition-all duration-200 overflow-hidden"
              style={fade(220)}
            >
              <div className="flex items-center justify-between px-6 pt-6 pb-4">
                <h3 className="text-base font-bold text-[--val-heading]">Inspection History</h3>
                <button className="px-4 py-2 bg-white border border-slate-200 rounded text-sm font-semibold text-[--val-heading] hover:bg-slate-50 active:scale-[0.98] transition-all duration-150">
                  Schedule Inspection
                </button>
              </div>
              <div className="border border-slate-200 rounded-lg mx-6 mb-6 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                {inspections.length === 0 ? (
                  <EmptyState
                    icon={<ClipboardCheck className="size-6" />}
                    title="No inspections yet"
                    description="Schedule an inspection to start building inspection history."
                  />
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200">
                        <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Date</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Type</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Inspector</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Status</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Issues Found</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Report</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inspections.map((insp, i) => {
                        const statusClass = insp.status === "Passed" ? "text-emerald-700"
                          : insp.status === "Satisfactory" ? "text-amber-700"
                          : "text-rose-700";
                        return (
                          <tr
                            key={insp.id}
                            className="border-t border-slate-100 hover:bg-blue-50/30 cursor-pointer transition-colors"
                            style={{
                              animationName: mounted ? "analytics-fade-up" : "none",
                              animationDuration: "0.5s",
                              animationTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
                              animationFillMode: "forwards",
                              animationDelay: `${i * 25}ms`,
                              opacity: mounted ? undefined : 0,
                            }}
                          >
                            <td className="px-4 py-3.5 text-[14px] text-[--val-heading]">{formatDate(insp.inspectedAt)}</td>
                            <td className="px-4 py-3.5 text-[14px] text-[--val-heading]">{insp.type}</td>
                            <td className="px-4 py-3.5 text-[14px] text-slate-500">{insp.inspector}</td>
                            <td className="px-4 py-3.5 text-[14px]"><span className={`font-semibold ${statusClass}`}>{insp.status}</span></td>
                            <td className="px-4 py-3.5 text-[14px] text-[--val-heading]">{insp.issues}</td>
                            <td className="px-4 py-3.5">
                              <button className="text-[14px] font-medium text-[--val-primary-dark] hover:opacity-75 transition-opacity">
                                View report
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Risk Assessment + Emergency Contacts — 2-col grid */}
            <div className="grid grid-cols-12 gap-5">

              {/* Risk Assessment — col-span-7 */}
              <div
                className="col-span-7 bg-white rounded-xl p-6 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)] hover:-translate-y-0.5 hover:shadow-[0px_6px_20px_0px_rgba(18,28,40,0.10)] transition-all duration-200"
                style={fade(260)}
              >
                <h3 className="text-base font-bold text-[--val-heading] mb-2">Risk Assessment</h3>
                {risks.length === 0 ? (
                  <EmptyState
                    icon={<AlertOctagon className="size-6" />}
                    title="No risks recorded"
                    description="Identified safety risks for this property will appear here."
                  />
                ) : risks.map((r, i) => {
                  const severityBadgeClass = r.severity === "Critical" || r.severity === "High"
                    ? "text-rose-700 bg-rose-50"
                    : r.severity === "Low"
                    ? "text-emerald-700 bg-emerald-50"
                    : "text-amber-700 bg-amber-50";
                  return (
                    <div
                      key={r.id}
                      className={`flex items-start gap-4 py-4 ${i > 0 ? "border-t border-slate-100" : ""}`}
                    >
                      <span className={`text-[11px] font-semibold uppercase tracking-[0.05em] px-2 py-0.5 rounded shrink-0 mt-0.5 ${severityBadgeClass}`}>
                        {r.severity}
                      </span>
                      <div>
                        <p className="text-[15px] font-semibold text-[--val-heading]">{r.title}</p>
                        <p className="text-[14px] text-slate-500 mt-0.5">{r.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Emergency Contacts — col-span-5 */}
              <div
                className="col-span-5 bg-white rounded-xl p-6 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)] hover:-translate-y-0.5 hover:shadow-[0px_6px_20px_0px_rgba(18,28,40,0.10)] transition-all duration-200"
                style={fade(300)}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-[--val-heading]">Emergency Contacts</h3>
                  <button className="px-4 py-2 bg-white border border-slate-200 rounded text-sm font-semibold text-[--val-heading] hover:bg-slate-50 active:scale-[0.98] transition-all duration-150">
                    Edit Contacts
                  </button>
                </div>
                {emergencyContacts.length === 0 ? (
                  <EmptyState
                    icon={<Phone className="size-6" />}
                    title="No emergency contacts"
                    description="Add 24/7 contacts so they're one tap away during an incident."
                  />
                ) : (
                  <div className="flex flex-col">
                    {Array.from({ length: Math.ceil(emergencyContacts.length / 2) }, (_, row) => (
                      <div key={row} className={`flex divide-x divide-slate-100 ${row > 0 ? "border-t border-slate-100" : ""}`}>
                        {emergencyContacts.slice(row * 2, row * 2 + 2).map((ec, col) => (
                          <div key={ec.id} className={`flex items-start gap-3 py-4 flex-1 ${col === 1 ? "pl-6" : ""}`}>
                            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                              <Phone className="w-4 h-4 text-blue-700" />
                            </div>
                            <div>
                              <p className="text-[14px] font-semibold text-[--val-heading]">{ec.name}</p>
                              <p className="text-[14px] text-[--val-primary-dark]">{ec.phone}</p>
                              {ec.sub && <p className="text-[12px] text-slate-400">{ec.sub}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      </div>
    </PropertyLayout>
  );
}
