"use client";

/**
 * Full Safety & compliance UI — preserved for a future release.
 * To re-enable: import `PropertySafetyPageFull` in `safety/page.tsx` and restore the data fetch.
 */

import { useEffect, useState, type ReactNode } from "react";
import { TableScroll } from "@/components/ui/table-scroll";
import type { Property } from "@/lib/data/types/property";
import type { Inspection } from "@/lib/data/types/inspection";
import type { Certification } from "@/lib/data/types/certification";
import type { SafetyRisk } from "@/lib/data/types/safety-risk";
import type { EmergencyContact } from "@/lib/data/types/emergency-contact";
import type { Professional } from "@/lib/data/types/professional";
import type { PropertySafetySummary, ComplianceLevel } from "@/lib/data/derivations/property-safety";
import { PropertyLayout } from "@/components/property/PropertyLayout";
import { MobileCardTable } from "@/components/property/MobileCardTable";
import {
  Calendar,
  Check,
  ChevronRight,
  ClipboardCheck,
  FileCheck,
  Phone,
  Plus,
  Shield,
} from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";
import { cn } from "@/components/ui/utils";

interface Props {
  property: Property;
  inspections: Inspection[];
  certifications: Certification[];
  risks: SafetyRisk[];
  emergencyContacts: EmergencyContact[];
  professionals: Professional[];
  summary: PropertySafetySummary;
}

function fadeIn(mounted: boolean, delayMs: number, reducedMotion: boolean) {
  if (reducedMotion) return {};
  return {
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(6px)",
    transition:
      "opacity 320ms cubic-bezier(0.22, 1, 0.36, 1), transform 320ms cubic-bezier(0.22, 1, 0.36, 1)",
    transitionDelay: `${delayMs}ms`,
  };
}

function complianceTone(level: ComplianceLevel) {
  if (level === "compliant") {
    return {
      dot: "bg-emerald-500",
      text: "text-emerald-800",
      bg: "bg-emerald-50",
      ring: "ring-emerald-100",
    };
  }
  if (level === "at-risk") {
    return {
      dot: "bg-rose-500",
      text: "text-rose-800",
      bg: "bg-rose-50",
      ring: "ring-rose-100",
    };
  }
  return {
    dot: "bg-amber-500",
    text: "text-amber-900",
    bg: "bg-amber-50",
    ring: "ring-amber-100",
  };
}

function certStatusStyles(status: Certification["status"]) {
  if (status === "Valid") return "text-emerald-800 bg-emerald-50 ring-emerald-100";
  if (status === "Expired") return "text-rose-800 bg-rose-50 ring-rose-100";
  return "text-amber-900 bg-amber-50 ring-amber-100";
}

function inspectionStatusClass(status: Inspection["status"]) {
  if (status === "Passed") return "text-emerald-700";
  if (status === "Satisfactory") return "text-amber-700";
  return "text-rose-700";
}

function riskSeverityStyles(severity: SafetyRisk["severity"]) {
  if (severity === "Critical" || severity === "High") {
    return "text-rose-800 bg-rose-50 ring-rose-100";
  }
  if (severity === "Low") return "text-emerald-800 bg-emerald-50 ring-emerald-100";
  return "text-amber-900 bg-amber-50 ring-amber-100";
}

export function PropertySafetyPageFull({
  property,
  inspections = [],
  certifications = [],
  risks = [],
  emergencyContacts = [],
  professionals = [],
  summary,
}: Props) {
  const profMap = new Map(professionals.map((p) => [p.id, p]));
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    const t = setTimeout(() => setMounted(true), 40);
    return () => {
      clearTimeout(t);
      mq.removeEventListener("change", onChange);
    };
  }, []);

  const tone = complianceTone(summary.complianceLevel);
  const sortedInspections = [...inspections].sort((a, b) => b.inspectedAt - a.inspectedAt);

  return (
    <PropertyLayout activeTab="safety" property={property}>
      <div className="min-h-full bg-val-bg-page-alt">
        <div className="mx-auto w-full max-w-[1120px] px-4 sm:px-6 pb-10 pt-6 sm:pt-7 lg:px-8">
          {/* Header */}
          <header className="mb-8" style={fadeIn(mounted, 0, reducedMotion)}>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              <span className="text-[var(--val-primary-dark)]">{property.code}</span>
              <span className="mx-1.5 text-slate-300">/</span>
              Safety
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-[28px] sm:text-[40px] font-extrabold leading-tight tracking-tight text-val-heading">
                  Safety & compliance
                </h1>
                <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-slate-600">
                  {summary.headerSubtitle}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--val-primary-dark)] px-4 text-[14px] font-semibold text-white transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--val-primary-dark)]/40 focus-visible:ring-offset-2"
              >
                <Plus className="size-4" aria-hidden />
                Add certificate
              </button>
            </div>
          </header>

          {/* Status strip */}
          <div
            className="mb-8 overflow-hidden rounded-xl border border-slate-200/90 bg-white"
            style={fadeIn(mounted, 60, reducedMotion)}
          >
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-6 py-4">
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-semibold ring-1 ring-inset",
                  tone.bg,
                  tone.text,
                  tone.ring,
                )}
              >
                <span className={cn("size-2 rounded-full", tone.dot)} aria-hidden />
                {summary.complianceLabel}
              </span>
              <p className="text-[13px] text-slate-500">{summary.complianceDetail}</p>
            </div>

            <dl className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-4 sm:divide-y-0">
              <MetricCell
                label="Certificates current"
                value={
                  summary.certCurrentPct != null
                    ? `${summary.certCurrentPct}%`
                    : "—"
                }
                detail={summary.certCurrentLabel}
              />
              <MetricCell
                label="Fully valid"
                value={
                  summary.certValidPct != null ? `${summary.certValidPct}%` : "—"
                }
                detail={
                  summary.certValidPct != null
                    ? "Valid status only"
                    : "No certificates"
                }
              />
              <MetricCell
                label="Next renewal"
                value={
                  summary.nextDueDays != null
                    ? `${summary.nextDueDays} days`
                    : "—"
                }
                detail={
                  summary.nextDueName && summary.nextDueAt
                    ? `${summary.nextDueName} · ${formatDate(summary.nextDueAt)}`
                    : "Nothing scheduled"
                }
              />
              <MetricCell
                label="Open issues"
                value={String(summary.openIssueCount)}
                detail={summary.issueBreakdown}
              />
            </dl>
          </div>

          <div className="flex flex-col gap-6">
            {/* Certifications */}
            <section
              className="rounded-xl border border-slate-200/90 bg-white"
              style={fadeIn(mounted, 100, reducedMotion)}
            >
              <div className="border-b border-slate-100 px-6 py-5">
                <h2 className="text-[15px] font-semibold tracking-tight text-val-heading">
                  Safety certifications
                </h2>
                <p className="mt-0.5 text-[13px] text-slate-500">
                  Fire, electrical, and plumbing compliance documents
                </p>
              </div>

              {certifications.length === 0 ? (
                <div className="px-6 py-8">
                  <EmptyState
                    icon={<FileCheck className="size-6" />}
                    title="No certifications yet"
                    description="Upload a fire, electrical, or plumbing certificate to track expiry and compliance."
                  />
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {certifications.map((cert) => (
                    <li
                      key={cert.id}
                      className="flex flex-col gap-4 px-6 py-4 transition-colors duration-150 hover:bg-slate-50/60 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-val-heading">{cert.name}</p>
                        <p className="mt-0.5 text-[13px] text-slate-500">
                          {profMap.get(cert.inspectorId)?.name ?? cert.inspectorId}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-6 sm:justify-end">
                        <DatePair label="Issued" value={formatDate(cert.issuedAt)} />
                        <DatePair label="Expires" value={formatDate(cert.expiresAt)} />
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                            certStatusStyles(cert.status),
                          )}
                        >
                          {cert.status === "Valid" && (
                            <Check className="size-3" aria-hidden />
                          )}
                          {cert.status}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Inspections */}
            <section
              className="rounded-xl border border-slate-200/90 bg-white"
              style={fadeIn(mounted, 140, reducedMotion)}
            >
              <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-[15px] font-semibold tracking-tight text-val-heading">
                    Inspection history
                  </h2>
                  <p className="mt-0.5 text-[13px] text-slate-500">
                    {inspections.length === 0
                      ? "Past inspections will appear here"
                      : `${inspections.length} record${inspections.length === 1 ? "" : "s"} on file`}
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-[13px] font-semibold text-val-heading transition-colors duration-150 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                >
                  <Calendar className="size-3.5 text-slate-500" aria-hidden />
                  Schedule inspection
                </button>
              </div>

              {sortedInspections.length === 0 ? (
                <div className="px-6 py-8">
                  <EmptyState
                    icon={<ClipboardCheck className="size-6" />}
                    title="No inspections yet"
                    description="Schedule an inspection to build a compliance history for this property."
                  />
                </div>
              ) : (
                <MobileCardTable
                  desktop={
                    <TableScroll stickyFirstColumn>
                      <table className="w-full min-w-[640px] text-left">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <Th className="data-sticky-col bg-white">Date</Th>
                            <Th>Type</Th>
                            <Th>Inspector</Th>
                            <Th>Status</Th>
                            <Th className="tabular-nums">Issues</Th>
                            <Th className="text-right">Report</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedInspections.map((insp) => (
                            <tr
                              key={insp.id}
                              className="border-t border-slate-50 transition-colors duration-150 hover:bg-slate-50/50"
                            >
                              <Td className="data-sticky-col bg-white">{formatDate(insp.inspectedAt)}</Td>
                              <Td className="font-medium text-val-heading">{insp.type}</Td>
                              <Td className="text-slate-600">
                                {profMap.get(insp.inspectorId)?.name ?? insp.inspectorId}
                              </Td>
                              <Td>
                                <span
                                  className={cn(
                                    "font-semibold",
                                    inspectionStatusClass(insp.status),
                                  )}
                                >
                                  {insp.status}
                                </span>
                              </Td>
                              <Td className="tabular-nums text-val-heading">{insp.issues}</Td>
                              <Td className="text-right">
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-[var(--val-primary-dark)] transition-opacity duration-150 hover:opacity-75 focus-visible:outline-none focus-visible:underline"
                                >
                                  View
                                  <ChevronRight className="size-3.5" aria-hidden />
                                </button>
                              </Td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </TableScroll>
                  }
                  mobile={
                    <div className="flex flex-col divide-y divide-slate-100">
                      {sortedInspections.map((insp) => {
                        const inspectorName = profMap.get(insp.inspectorId)?.name ?? insp.inspectorId;
                        return (
                          <div key={insp.id} className="px-5 py-4 flex flex-col gap-2">
                            {/* Row 1 — date + status pill */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[14px] font-semibold text-val-heading">
                                  {formatDate(insp.inspectedAt)}
                                </p>
                                <p className="text-[12px] text-slate-500 mt-0.5">{insp.type}</p>
                              </div>
                              <span
                                className={cn(
                                  "text-[12px] font-semibold shrink-0",
                                  inspectionStatusClass(insp.status),
                                )}
                              >
                                {insp.status}
                              </span>
                            </div>

                            {/* Row 2 — inspector + issue count */}
                            <div className="flex items-center gap-2 text-[12px] text-slate-500 flex-wrap">
                              <span>{inspectorName}</span>
                              <span className="text-slate-300">·</span>
                              <span className="tabular-nums">
                                {insp.issues} {insp.issues === 1 ? "issue" : "issues"}
                              </span>
                            </div>

                            {/* Row 3 — report link */}
                            <button
                              type="button"
                              className="self-start inline-flex items-center gap-0.5 text-[13px] font-semibold text-[var(--val-primary-dark)] transition-opacity duration-150 hover:opacity-75 focus-visible:outline-none focus-visible:underline mt-1"
                            >
                              View report
                              <ChevronRight className="size-3.5" aria-hidden />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  }
                />
              )}
            </section>

            {/* Risks + Emergency */}
            <div
              className="grid gap-6 lg:grid-cols-12"
              style={fadeIn(mounted, 180, reducedMotion)}
            >
              <section className="rounded-xl border border-slate-200/90 bg-white lg:col-span-7">
                <div className="border-b border-slate-100 px-6 py-5">
                  <h2 className="text-[15px] font-semibold tracking-tight text-val-heading">
                    Risk assessment
                  </h2>
                  <p className="mt-0.5 text-[13px] text-slate-500">
                    Identified hazards and recommended actions
                  </p>
                </div>

                {risks.length === 0 ? (
                  <div className="flex items-center gap-3 px-6 py-8 text-[13px] text-slate-500">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 ring-1 ring-emerald-100">
                      <Shield className="size-4 text-emerald-700" aria-hidden />
                    </div>
                    No open risks recorded for this property.
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100 p-3">
                    {risks.map((risk) => (
                      <li
                        key={risk.id}
                        className="rounded-lg p-4 transition-colors duration-150 hover:bg-slate-50/80"
                      >
                        <div className="flex flex-wrap items-start gap-3">
                          <span
                            className={cn(
                              "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset",
                              riskSeverityStyles(risk.severity),
                            )}
                          >
                            {risk.severity}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[14px] font-semibold text-val-heading">
                              {risk.title}
                            </p>
                            <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
                              {risk.description}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-xl border border-slate-200/90 bg-white lg:col-span-5">
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5">
                  <div>
                    <h2 className="text-[15px] font-semibold tracking-tight text-val-heading">
                      Emergency contacts
                    </h2>
                    <p className="mt-0.5 text-[13px] text-slate-500">
                      One tap away during an incident
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 text-[13px] font-semibold text-[var(--val-primary-dark)] transition-opacity duration-150 hover:opacity-75"
                  >
                    Edit
                  </button>
                </div>

                {emergencyContacts.length === 0 ? (
                  <div className="px-6 py-8">
                    <EmptyState
                      icon={<Phone className="size-6" />}
                      title="No emergency contacts"
                      description="Add 24/7 contacts so they're reachable during an incident."
                    />
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {emergencyContacts.map((contact) => (
                      <li key={contact.id} className="px-6 py-4">
                        <p className="text-[14px] font-semibold text-val-heading">
                          {contact.name}
                        </p>
                        {contact.sub && (
                          <p className="mt-0.5 text-[12px] text-slate-500">{contact.sub}</p>
                        )}
                        <a
                          href={`tel:${contact.phone.replace(/\s/g, "")}`}
                          className="mt-2 inline-flex items-center gap-2 text-[14px] font-medium text-[var(--val-primary-dark)] transition-opacity duration-150 hover:opacity-80 focus-visible:outline-none focus-visible:underline"
                        >
                          <Phone className="size-3.5" aria-hidden />
                          {contact.phone}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>
    </PropertyLayout>
  );
}

function MetricCell({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="px-5 py-4 sm:py-5">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
        {label}
      </dt>
      <dd className="mt-1.5 text-[22px] font-bold tabular-nums leading-none text-val-heading">
        {value}
      </dd>
      <dd className="mt-1.5 text-[12px] leading-snug text-slate-500">{detail}</dd>
    </div>
  );
}

function DatePair({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 text-[13px] font-medium tabular-nums text-val-heading">{value}</p>
    </div>
  );
}

function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn(
        "px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400",
        className,
      )}
    >
      {children}
    </th>
  );
}

function Td({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <td className={cn("px-6 py-3.5 text-[13px] text-slate-600", className)}>{children}</td>
  );
}
