"use client";

import { useEffect, useState } from "react";
import type { Property } from "@/lib/data/types/property";
import type { CoOwner } from "@/lib/data/types/co-owner";
import type { OwnershipDocument } from "@/lib/data/types/ownership-document";
import type { OwnershipRecord } from "@/lib/data/types/ownership-record";
import type { OwnershipHistory } from "@/lib/data/types/ownership-history";
import type { PropertyFinancials } from "@/app/(shell)/property/[id]/ownership/queries";
import { PropertyLayout } from "@/components/property/PropertyLayout";
import {
  ChevronDown, Download, FileText, History, Mail, Phone, Upload, UserPlus, Users,
} from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrencyFull } from "@/lib/format";

function fade(mounted: boolean, delay: number, reduced = false) {
  if (reduced) return { opacity: 1 };
  return {
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(-8px)",
    transition: "opacity 400ms cubic-bezier(0.25,1,0.5,1), transform 400ms cubic-bezier(0.25,1,0.5,1)",
    transitionDelay: `${delay}ms`,
  };
}

const OWNER_COLORS = ["var(--val-primary-dark)", "#38bdf8", "#818cf8", "#a3e635"];

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function ownerInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function daysUntil(ts?: number): number | null {
  if (!ts) return null;
  return Math.ceil((ts - Date.now()) / 86_400_000);
}

const STATUS_STYLE: Record<string, string> = {
  "Current":           "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Expiring Soon":     "bg-amber-50 text-amber-700 border-amber-200",
  "Pending Signature": "bg-blue-50 text-blue-700 border-blue-200",
  "Superseded":        "bg-slate-50 text-slate-500 border-slate-200",
  "Archived":          "bg-slate-50 text-slate-400 border-slate-200",
};

type Section = "details" | "documents" | "history";

interface Props {
  property: Property;
  ownershipDocuments: OwnershipDocument[];
  ownershipRecord: OwnershipRecord | null;
  ownershipHistory: OwnershipHistory[];
  coOwners: CoOwner[];
  monthlyRentIncome: number;
  propertyFinancials: PropertyFinancials;
}

export function PropertyOwnershipPage2({
  property,
  ownershipDocuments = [],
  ownershipRecord = null,
  ownershipHistory = [],
  coOwners = [],
  monthlyRentIncome = 0,
  propertyFinancials,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [section, setSection] = useState<Section>("details");
  const [acquisitionOpen, setAcquisitionOpen] = useState(false);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const sortedOwners = [...coOwners].sort((a, b) => b.sharePercent - a.sharePercent);
  const propertyValue = property.currentMarketValue ?? 0;
  const topOwner = sortedOwners[0];
  const orecMap = new Map(ownershipRecord ? [[ownershipRecord.id, ownershipRecord]] : []);

  // Summary bar values
  const topOwnerEquity = topOwner && propertyValue > 0
    ? formatCurrencyFull(Math.round(topOwner.sharePercent * propertyValue / 100))
    : "—";

  const nextPaymentDays = daysUntil(ownershipRecord?.nextPaymentDue);
  const nextPaymentLabel = ownershipRecord?.nextPaymentDue
    ? formatDate(ownershipRecord.nextPaymentDue)
    : "—";

  // History grouped by year
  const byYear = ownershipHistory.reduce<Record<string, OwnershipHistory[]>>((acc, item) => {
    const year = new Date(item.eventDate).getFullYear().toString();
    (acc[year] ??= []).push(item);
    return acc;
  }, {});
  const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a));

  // Acquisition rows (top 4 always visible, rest in accordion)
  const _parsed = parseFloat(property.purchasePrice ?? "");
  const purchasePriceNum = isNaN(_parsed) ? null : _parsed;
  const totalCashDeployed =
    ownershipRecord?.downPayment != null && ownershipRecord?.closingCosts != null
      ? ownershipRecord.downPayment + ownershipRecord.closingCosts
      : null;

  const acqRowsTop: [string, string][] = [
    ["Purchase Price", purchasePriceNum != null ? formatCurrencyFull(purchasePriceNum) : "—"],
    ["Down Payment", ownershipRecord?.downPayment != null ? formatCurrencyFull(ownershipRecord.downPayment) : "—"],
    ["Loan Amount", ownershipRecord?.loanAmount != null ? formatCurrencyFull(ownershipRecord.loanAmount) : "—"],
    ["Total Cash Deployed", totalCashDeployed != null ? formatCurrencyFull(totalCashDeployed) : "—"],
  ];
  const acqRowsRest: [string, string][] = [
    ["Closing Costs", ownershipRecord?.closingCosts != null ? formatCurrencyFull(ownershipRecord.closingCosts) : "—"],
    ["Lender", ownershipRecord?.lenderName ?? "—"],
    ["Interest Rate", ownershipRecord?.interestRate != null && ownershipRecord?.loanType ? `${ownershipRecord.interestRate}% ${ownershipRecord.loanType}` : "—"],
    ["Loan Term", ownershipRecord?.loanTermYears != null ? `${ownershipRecord.loanTermYears} Years` : "—"],
    ["Origination Date", ownershipRecord?.originationDate != null ? formatDate(ownershipRecord.originationDate) : "—"],
    ["Maturity Date", ownershipRecord?.maturityDate != null ? formatDate(ownershipRecord.maturityDate) : "—"],
  ];

  return (
    <PropertyLayout activeTab="ownership" property={property}>
      <div className="bg-val-bg-page-alt min-h-full pb-10">

        {/* Page Header */}
        <div className="pt-8 pb-6" style={fade(mounted, 0, reducedMotion)}>
          <div className="max-w-[1200px] mx-auto px-8">
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-xs font-semibold tracking-widest uppercase text-[--val-primary-dark]">Valgate</span>
              <span className="text-xs text-slate-300">/</span>
              <span className="text-xs font-semibold tracking-widest uppercase text-slate-400">{property.code}</span>
              <span className="text-xs text-slate-300">/</span>
              <span className="text-xs font-semibold tracking-widest uppercase text-slate-400">Ownership</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <h1 className="text-4xl font-extrabold text-val-heading tracking-tight leading-10">Ownership</h1>
                <p className="text-slate-500 text-base mt-2">
                  Co-owners, equity position, and legal structure for {property.name}.
                </p>
              </div>
              <button
                className="px-5 py-2.5 text-white text-[14px] font-semibold rounded flex items-center gap-2 hover:opacity-90 active:scale-[0.97] transition-all duration-150"
                style={{
                  background: "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)",
                  boxShadow: "0 4px 6px -1px rgba(0,74,198,0.25), 0 2px 4px -2px rgba(0,74,198,0.15)",
                }}
              >
                <UserPlus className="w-4 h-4" />
                Add Owner
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-[1200px] mx-auto px-8 pt-2 flex flex-col gap-5">

          {/* Summary Bar */}
          <div className="grid grid-cols-3 gap-4" style={fade(mounted, 60, reducedMotion)}>
            {/* Card 1 — Primary Share */}
            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-2">Primary Share</p>
              <p className="text-[20px] font-bold text-val-heading leading-none">
                {topOwner ? `${topOwner.name} · ${topOwner.sharePercent}%` : "—"}
              </p>
              <p className="text-xs text-slate-400 mt-1.5">= {topOwnerEquity} equity</p>
            </div>

            {/* Card 2 — Net Equity */}
            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-2">Net Equity</p>
              <p className="text-[20px] font-bold text-val-heading leading-none">{propertyFinancials.equityAmount}</p>
              {propertyFinancials.appreciationPct !== "—" && (
                <p className="text-xs text-emerald-600 font-semibold mt-1.5">▲ {propertyFinancials.appreciationPct} since purchase</p>
              )}
            </div>

            {/* Card 3 — Next Payment */}
            <div className={`bg-white rounded-lg border p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ${nextPaymentDays != null && nextPaymentDays <= 14 ? "border-amber-200 bg-amber-50/30" : "border-slate-200"}`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-2">Next Payment</p>
              <p className="text-[20px] font-bold text-val-heading leading-none">{nextPaymentLabel}</p>
              {nextPaymentDays != null && (
                <p className={`text-xs font-semibold mt-1.5 ${nextPaymentDays <= 14 ? "text-amber-600" : "text-slate-400"}`}>
                  in {nextPaymentDays} day{nextPaymentDays !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>

          {/* Equity & Financial Position + Ownership Split */}
          <div className="grid grid-cols-12 gap-5" style={fade(mounted, 140, reducedMotion)}>

            {/* Equity card */}
            <div className="col-span-7 bg-white rounded-xl border border-slate-200 p-6 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)]">
              <h3 className="text-base font-bold text-val-heading mb-5">Equity &amp; Financial Position</h3>
              <div className="flex gap-12 mb-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-1">
                    Current Estimated Value
                  </p>
                  <p className="text-[28px] font-bold text-val-heading leading-none">{propertyFinancials.currentMarketValue}</p>
                  {propertyFinancials.appreciationPct !== "—" && (
                    <p className="text-sm font-semibold text-emerald-600 mt-1">▲ {propertyFinancials.appreciationPct} since purchase</p>
                  )}
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-1">
                    Remaining Mortgage
                  </p>
                  <p className="text-[28px] font-bold text-val-heading leading-none">{propertyFinancials.outstandingMortgage}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {ownershipRecord?.loanType && ownershipRecord?.loanTermYears != null && ownershipRecord?.interestRate != null
                      ? `${ownershipRecord.loanType} ${ownershipRecord.loanTermYears}yr @ ${ownershipRecord.interestRate}%`
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="mb-5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">Equity</span>
                  <span className="text-[13px] font-bold text-val-heading">
                    {propertyFinancials.equityAmount}
                    {propertyFinancials.equityPct != null && ` (${propertyFinancials.equityPct.toFixed(1)}%)`}
                  </span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[--val-primary-dark]"
                    style={{
                      width: mounted ? `${propertyFinancials.equityPct ?? 0}%` : "0%",
                      transition: "width 800ms cubic-bezier(0.25,1,0.5,1) 200ms",
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                {[
                  { label: "LTV Ratio", value: propertyFinancials.ltv },
                  { label: "Monthly P/I", value: propertyFinancials.monthlyPayment !== "—" ? `${propertyFinancials.monthlyPayment}/mo` : "—" },
                  { label: "Next Payment Due", value: nextPaymentLabel },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-0.5">{label}</p>
                    <p className="text-[14px] font-semibold text-val-heading">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Ownership Split — stacked bar */}
            <div className="col-span-5 bg-white rounded-xl border border-slate-200 p-6 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)]">
              <h3 className="text-base font-bold text-val-heading mb-5">Ownership Split</h3>

              {sortedOwners.length === 0 ? (
                <p className="text-[14px] text-slate-400 text-center py-8">No co-owners yet</p>
              ) : (
                <>
                  {/* Stacked bar */}
                  <div className="h-5 rounded-full overflow-hidden flex w-full mb-5">
                    {sortedOwners.map((o, i) => (
                      <div
                        key={o.id}
                        style={{
                          width: mounted ? `${o.sharePercent}%` : "0%",
                          background: OWNER_COLORS[i % OWNER_COLORS.length],
                          transition: `width 700ms cubic-bezier(0.25,1,0.5,1) ${200 + i * 150}ms`,
                        }}
                      />
                    ))}
                  </div>

                  {/* Legend */}
                  <div className="space-y-3 mb-6">
                    {sortedOwners.map((o, i) => (
                      <div key={o.id} className="flex items-center gap-2.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: OWNER_COLORS[i % OWNER_COLORS.length] }}
                        />
                        <span className="text-sm text-val-heading flex-1">{o.name}</span>
                        <span className="text-sm font-semibold text-val-heading">{o.sharePercent}%</span>
                        <span className="text-xs text-slate-400 w-24 text-right">
                          {propertyValue > 0 ? formatCurrencyFull(Math.round(o.sharePercent * propertyValue / 100)) : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <button className="w-full px-4 py-2 bg-white border border-slate-200 rounded text-sm font-semibold text-val-heading hover:bg-slate-50 active:scale-[0.98] transition-all duration-150">
                Edit Split
              </button>
            </div>
          </div>

          {/* Owner Cards */}
          <div className="grid grid-cols-2 gap-5" style={fade(mounted, 220, reducedMotion)}>
            {sortedOwners.length === 0 ? (
              <div className="col-span-2">
                <EmptyState
                  icon={<Users className="size-6" />}
                  title="No co-owners yet"
                  description="Add owners to track equity and income splits for this property."
                />
              </div>
            ) : (
              sortedOwners.map((owner, i) => (
                <OwnerCard2
                  key={owner.id}
                  owner={owner}
                  ownerIndex={i}
                  equity={
                    propertyValue > 0
                      ? formatCurrencyFull(Math.round(owner.sharePercent * propertyValue / 100))
                      : "—"
                  }
                  mounted={mounted}
                />
              ))
            )}
          </div>

          {/* In-page tab strip */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)] overflow-hidden" style={fade(mounted, 300, reducedMotion)}>
            {/* Tab strip */}
            <div className="flex border-b border-slate-200">
              {(["details", "documents", "history"] as Section[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSection(tab)}
                  className={`px-6 py-3.5 text-sm font-semibold capitalize transition-colors border-b-2 ${
                    section === tab
                      ? "border-[--val-primary-dark] text-[--val-primary-dark]"
                      : "border-transparent text-slate-500 hover:text-val-heading"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Details tab */}
            {section === "details" && (
              <div className="grid grid-cols-2 gap-0 divide-x divide-slate-100">
                {/* Acquisition Details */}
                <div className="p-6">
                  <h3 className="text-base font-bold text-val-heading mb-4">Acquisition Details</h3>
                  <div className="space-y-3">
                    {acqRowsTop.map(([label, val]) => (
                      <div key={label} className="flex justify-between text-[14px]">
                        <span className="text-slate-500">{label}</span>
                        <span className="text-val-heading font-medium">{val}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setAcquisitionOpen((v) => !v)}
                    className="flex items-center gap-1 text-[13px] font-semibold text-[--val-primary-dark] mt-4 hover:opacity-75 transition-opacity"
                  >
                    {acquisitionOpen ? "Show less" : "Show more"}
                    <ChevronDown className={`w-4 h-4 transition-transform ${acquisitionOpen ? "rotate-180" : ""}`} />
                  </button>
                  {acquisitionOpen && (
                    <div className="space-y-3 mt-3 pt-3 border-t border-slate-100">
                      {acqRowsRest.map(([label, val]) => (
                        <div key={label} className="flex justify-between text-[14px]">
                          <span className="text-slate-500">{label}</span>
                          <span className="text-val-heading font-medium">{val}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Income & Expense Distribution */}
                <div className="p-6">
                  <h3 className="text-base font-bold text-val-heading mb-4">Income &amp; Expense Distribution</h3>

                  {/* Distribution method as static pill */}
                  <div className="mb-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-2">Distribution Method</p>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[13px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      {ownershipRecord?.distributionMethod ?? "Pro-Rata by Share"}
                    </span>
                  </div>

                  <div className="space-y-5">
                    {/* Rent income split */}
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-2">Rent Income Split</p>
                      <div className="space-y-1.5">
                        {sortedOwners.length === 0 ? (
                          <p className="text-[14px] text-slate-400">No owners configured</p>
                        ) : (
                          sortedOwners.map((owner) => (
                            <div key={owner.id} className="flex justify-between text-[14px]">
                              <span className="text-val-heading">{owner.name}</span>
                              <span className="font-semibold text-val-heading">
                                {monthlyRentIncome > 0
                                  ? `${formatCurrencyFull(Math.round(owner.sharePercent * monthlyRentIncome / 100))}/mo`
                                  : "—"}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Expense responsibility */}
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-2">Expense Responsibility</p>
                      <div className="space-y-1.5">
                        {sortedOwners.length === 0 ? (
                          <p className="text-[14px] text-slate-400">No owners configured</p>
                        ) : (
                          sortedOwners.map((owner) => (
                            <div key={owner.id} className="flex justify-between text-[14px]">
                              <span className="text-val-heading">{owner.name}</span>
                              <span className="font-semibold text-val-heading">
                                {monthlyRentIncome > 0
                                  ? `${formatCurrencyFull(Math.round(owner.sharePercent * monthlyRentIncome / 100))}/mo`
                                  : `${owner.sharePercent}% of costs`}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <button className="text-[--val-primary-dark] text-[14px] font-semibold mt-5 hover:opacity-75 transition-opacity">
                    Edit Distribution Rules
                  </button>
                </div>
              </div>
            )}

            {/* Documents tab */}
            {section === "documents" && (
              <div>
                <div className="flex items-center justify-between px-5 py-3 bg-slate-50/80 border-b border-slate-200">
                  <span className="text-[13px] font-semibold text-val-heading">{ownershipDocuments.length} document{ownershipDocuments.length !== 1 ? "s" : ""}</span>
                  <button
                    className="px-4 py-2 text-white text-[13px] font-semibold rounded flex items-center gap-2 hover:opacity-90 active:scale-[0.97] transition-all duration-150"
                    style={{ background: "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)" }}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload Doc
                  </button>
                </div>

                {ownershipDocuments.length === 0 ? (
                  <div className="p-6">
                    <EmptyState
                      icon={<FileText className="size-6" />}
                      title="No ownership documents yet"
                      description="Add a deed or title to start tracking ownership for this property."
                    />
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50/60 border-b border-slate-200">
                        {["Name", "Type", "Issued", "Expires", "Owner", "Status", ""].map((col) => (
                          <th
                            key={col}
                            className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ownershipDocuments.map((doc, i) => {
                        const statusStyle = STATUS_STYLE[doc.status ?? "Current"] ?? STATUS_STYLE["Current"];
                        return (
                          <tr
                            key={doc.id}
                            className="border-t border-slate-100 hover:bg-blue-50/30 transition-colors group cursor-pointer"
                            style={{ animationDelay: `${i * 25}ms` }}
                          >
                            <td className="px-4 py-3.5 text-[14px] text-val-heading">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                                {doc.name}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-[14px] text-slate-500">{doc.type}</td>
                            <td className="px-4 py-3.5 text-[14px] text-slate-500">{formatDate(doc.documentDate)}</td>
                            <td className="px-4 py-3.5 text-[14px] text-slate-500">{doc.expiryDate ? formatDate(doc.expiryDate) : "—"}</td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                                  style={{ background: "var(--val-primary-dark)" }}
                                >
                                  {ownerInitials(orecMap.get(doc.ownershipRecordId)?.holdingType ?? "—")}
                                </span>
                                <span className="text-[14px] text-slate-500">{orecMap.get(doc.ownershipRecordId)?.holdingType ?? "—"}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className={`text-[10px] font-semibold tracking-[1px] uppercase px-2.5 py-0.5 rounded-full border ${statusStyle}`}>
                                {doc.status ?? "Current"}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <button className="opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-100">
                                <Download className="w-4 h-4 text-slate-400" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* History tab */}
            {section === "history" && (
              <div className="p-6">
                {ownershipHistory.length === 0 ? (
                  <EmptyState
                    icon={<History className="size-6" />}
                    title="No ownership history yet"
                    description="Title transfers and ownership changes will appear here."
                  />
                ) : (
                  <div className="space-y-8">
                    {years.map((year) => (
                      <div key={year}>
                        {/* Year divider */}
                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-px flex-1 bg-slate-200" />
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{year}</span>
                          <div className="h-px flex-1 bg-slate-200" />
                        </div>

                        {/* Events */}
                        <div className="flex gap-4">
                          {/* Timeline line column */}
                          <div className="flex flex-col items-center pt-1" style={{ width: 12 }}>
                            <div className="border-l border-slate-200 flex-1 w-0" />
                          </div>

                          <div className="flex-1 space-y-4">
                            {byYear[year].map((item, i) => (
                              <div key={item.id ?? i} className="flex items-start gap-3">
                                <span
                                  className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                                  style={{ backgroundColor: item.color }}
                                />
                                <div className="flex-1">
                                  <span className="text-[14px] text-val-heading">{item.text}</span>
                                  <span className="block text-[12px] text-slate-400 mt-0.5">{formatDate(item.eventDate)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </PropertyLayout>
  );
}

function OwnerCard2({
  owner,
  ownerIndex,
  equity,
  mounted,
}: {
  owner: CoOwner;
  ownerIndex: number;
  equity: string;
  mounted: boolean;
}) {
  const [taxOpen, setTaxOpen] = useState(false);
  const color = OWNER_COLORS[ownerIndex % OWNER_COLORS.length];
  const badge = owner.role === "Primary" ? "Primary Owner" : "Minor Owner";

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)] hover:-translate-y-0.5 hover:shadow-[0px_6px_20px_0px_rgba(18,28,40,0.10)] transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[13px] font-bold shrink-0"
            style={{ background: color === "var(--val-primary-dark)" ? "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)" : color }}
          >
            {ownerInitials(owner.name)}
          </div>
          <p className="text-[17px] font-bold text-val-heading">{owner.name}</p>
        </div>
        <span className="bg-blue-50 text-blue-700 text-[10px] font-semibold tracking-[1px] uppercase px-2.5 py-1 rounded-full shrink-0">
          {badge}
        </span>
      </div>

      {/* Share bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">Ownership Share</span>
          <span className="text-[14px] font-bold text-val-heading">{owner.sharePercent}%</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: mounted ? `${owner.sharePercent}%` : "0%",
              background: color,
              transition: "width 800ms cubic-bezier(0.25,1,0.5,1) 300ms",
            }}
          />
        </div>
        <p className="text-[13px] font-semibold text-val-heading mt-2">Equity Value: {equity}</p>
      </div>

      {/* Contact */}
      <div className="space-y-2 mb-4">
        {owner.email && (
          <div className="flex items-center gap-2 text-[14px] text-slate-500">
            <Mail className="w-4 h-4 shrink-0" />
            {owner.email}
          </div>
        )}
        {owner.phone && (
          <div className="flex items-center gap-2 text-[14px] text-slate-500">
            <Phone className="w-4 h-4 shrink-0" />
            {owner.phone}
          </div>
        )}
      </div>

      {/* Tax & Legal collapsible */}
      <div className="border-t border-slate-100 pt-3">
        <button
          onClick={() => setTaxOpen((v) => !v)}
          className="flex items-center justify-between w-full text-[13px] font-semibold text-slate-500 hover:text-val-heading transition-colors"
        >
          Tax &amp; Legal Details
          <ChevronDown className={`w-4 h-4 transition-transform ${taxOpen ? "rotate-180" : ""}`} />
        </button>

        {taxOpen && (
          <div className="mt-3 space-y-2 text-[14px]">
            {owner.address && (
              <div className="flex justify-between">
                <span className="text-slate-500">Address</span>
                <span className="text-val-heading font-medium text-right max-w-[60%]">{owner.address}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">SSN / EIN</span>
              <span className="text-val-heading font-medium">{owner.ssnMasked ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tax Entity</span>
              <span className="text-val-heading font-medium">{owner.taxEntity ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">1099 Status</span>
              <span className="text-val-heading font-medium">{owner.tax1099Status ?? "—"}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100">
        <button className="px-4 py-2 bg-white border border-slate-200 rounded text-sm font-semibold text-val-heading hover:bg-slate-50 active:scale-[0.98] transition-all duration-150">
          Edit Owner
        </button>
        <button className="text-[--val-primary-dark] text-[14px] font-semibold hover:opacity-75 transition-opacity">
          View Documents
        </button>
      </div>
    </div>
  );
}
