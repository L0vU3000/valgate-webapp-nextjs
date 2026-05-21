"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Property } from "@/lib/data/types/property";
import type { CoOwner } from "@/lib/data/types/co-owner";
import type { OwnershipDocument } from "@/lib/data/types/ownership-document";
import type { OwnershipRecord } from "@/lib/data/types/ownership-record";
import type { OwnershipHistory } from "@/lib/data/types/ownership-history";
import type { Document as CentralDocument } from "@/lib/data/types/document";
import type { PropertyFinancials } from "@/app/(shell)/property/[id]/ownership/queries";
import { PropertyLayout } from "@/components/property/PropertyLayout";
import { UnlockButton } from "@/components/feature-unlock/UnlockButton";
import { OwnershipUnlockMount } from "@/components/feature-unlock/pillars/OwnershipUnlock";
import type { UnlockState } from "@/components/feature-unlock/types";
import { revokeOwnershipVerification } from "@/lib/actions/ownership-records.actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Check,
  CheckCircle2,
  Mail,
  Phone,
  MapPin,
  FileText,
  Upload,
  Users,
  DollarSign,
  Clock,
  Scale,
  History,
  ShieldCheck,
  MoreHorizontal,
  AlertTriangle,
} from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrencyFull, formatDate } from "@/lib/format";

function fade(mounted: boolean, delay: number, reduced = false) {
  if (reduced) return { opacity: 1 };
  return {
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(-8px)",
    transition:
      "opacity 400ms cubic-bezier(0.25,1,0.5,1), transform 400ms cubic-bezier(0.25,1,0.5,1)",
    transitionDelay: `${delay}ms`,
  };
}

const OWNER_COLORS = [
  "var(--val-primary-dark)",
  "#38bdf8",
  "#818cf8",
  "#a3e635",
];

function buildKpis(
  record: OwnershipRecord | null,
  coOwners: { id: string }[],
  financials: PropertyFinancials,
) {
  const ownerCount = coOwners.length;
  return [
    {
      label: "Ownership Type",
      value: record?.holdingType ?? "—",
      sub: "Joint ownership",
      Icon: Scale,
    },
    {
      label: "Total Owners",
      value: ownerCount > 0 ? String(ownerCount) : "—",
      sub: ownerCount === 1 ? "Co-owner" : "Co-owners",
      Icon: Users,
    },
    {
      label: "Acquisition Price",
      value: financials.acquisitionPrice,
      sub: "Purchase price",
      Icon: DollarSign,
    },
    {
      label: "Holding Period",
      value: financials.holdingPeriod,
      sub: "Since acquisition",
      Icon: Clock,
    },
  ];
}

function ownerInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface Props {
  property: Property;
  ownershipDocuments: OwnershipDocument[];
  verificationDocs: CentralDocument[];
  ownershipRecord: OwnershipRecord | null;
  ownershipHistory: OwnershipHistory[];
  coOwners: CoOwner[];
  monthlyRentIncome: number;
  propertyFinancials: PropertyFinancials;
}

export function PropertyOwnershipPage({
  property,
  ownershipDocuments = [],
  verificationDocs = [],
  ownershipRecord = null,
  ownershipHistory = [],
  coOwners = [],
  monthlyRentIncome = 0,
  propertyFinancials,
}: Props) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStartAt, setWizardStartAt] = useState<"data" | "verification">(
    "data",
  );
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [demoUploadOpen, setDemoUploadOpen] = useState(false);
  const [demoUploadedDocs, setDemoUploadedDocs] = useState<OwnershipDocument[]>([]);

  useEffect(() => {
    setReducedMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const allOwnershipDocs = [...demoUploadedDocs, ...ownershipDocuments];

  const sortedOwners = [...coOwners].sort(
    (a, b) => b.sharePercent - a.sharePercent,
  );
  const displayedOwners = sortedOwners.slice(0, 2);
  const hiddenCount = sortedOwners.length - displayedOwners.length;
  const propertyValue = property.currentMarketValue ?? 0;
  const orecMap = new Map(
    ownershipRecord ? [[ownershipRecord.id, ownershipRecord]] : [],
  );

  // Compute unlock state
  const unlockState: UnlockState = !ownershipRecord
    ? { kind: "unlock" }
    : ownershipRecord.verified
      ? { kind: "edit", entityId: ownershipRecord.id }
      : { kind: "verify", entityId: ownershipRecord.id };

  function openWizard() {
    if (unlockState.kind === "verify") {
      setWizardStartAt("verification");
    } else {
      setWizardStartAt("data");
    }
    setWizardOpen(true);
  }

  async function handleRevoke() {
    if (!ownershipRecord) return;
    setRevoking(true);
    const result = await revokeOwnershipVerification(ownershipRecord.id);
    setRevoking(false);
    setRevokeOpen(false);
    if (result.ok) {
      toast.success("Verification revoked");
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to revoke verification");
    }
  }

  return (
    <>
      <PropertyLayout
        activeTab="ownership"
        property={property}
      >
        <div className="bg-val-bg-page-alt min-h-full pb-10">

          {/* Page Header */}
          <div
            className="pt-8 pb-6"
            style={fade(mounted, 0, reducedMotion)}
          >
            <div className="max-w-[1200px] mx-auto px-8">
              {/* Breadcrumb */}
              <div className="flex items-center gap-1.5 mb-3">
                <span className="text-xs font-semibold tracking-widest uppercase text-[--val-primary-dark]">
                  Valgate
                </span>
                <span className="text-xs text-slate-300">/</span>
                <span className="text-xs font-semibold tracking-widest uppercase text-slate-400">
                  {property.code}
                </span>
                <span className="text-xs text-slate-300">/</span>
                <span className="text-xs font-semibold tracking-widest uppercase text-slate-400">
                  Ownership
                </span>
              </div>

              {/* Title row */}
              <div className="flex items-end justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-4xl font-extrabold text-val-heading tracking-tight leading-10">
                      Ownership
                    </h1>
                    {ownershipRecord?.verified && (
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-[12px] font-semibold rounded-full border border-emerald-200 select-none mb-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Verified
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 text-base mt-2">
                    Co-owners, equity position, and legal structure for{" "}
                    {property.name}.
                  </p>
                </div>
                <UnlockButton state={unlockState} onClick={openWizard} />
              </div>
            </div>
          </div>

          <div className="max-w-[1200px] mx-auto px-8 pt-6 flex flex-col gap-5">

            {/* KPI Row */}
            <div
              className="grid grid-cols-4 gap-4"
              style={fade(mounted, 60, reducedMotion)}
            >
              {buildKpis(ownershipRecord, coOwners, propertyFinancials).map(
                (kpi, i) => (
                  <div
                    key={kpi.label}
                    className="bg-white rounded-lg border border-slate-200 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                    style={{ transitionDelay: `${100 + i * 80}ms` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                        {kpi.label}
                      </span>
                      <div className="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center">
                        <kpi.Icon className="size-4 text-blue-500" />
                      </div>
                    </div>
                    <div className="text-[20px] font-bold text-val-heading leading-none">
                      {kpi.value}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{kpi.sub}</div>
                  </div>
                ),
              )}
            </div>

            {/* Equity & Financial + Ownership Split */}
            <div
              className="grid grid-cols-12 gap-5"
              style={fade(mounted, 160, reducedMotion)}
            >
              <div className="col-span-7 bg-white rounded-xl border border-slate-200 p-6 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)]">
                <h3 className="text-base font-bold text-val-heading mb-5">
                  Equity &amp; Financial Position
                </h3>
                <div className="flex gap-12 mb-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-1">
                      Current Estimated Value
                    </p>
                    <p className="text-[28px] font-bold text-val-heading leading-none">
                      {propertyFinancials.currentMarketValue}
                    </p>
                    {propertyFinancials.appreciationPct !== "—" && (
                      <p className="text-xs text-emerald-600 mt-1">
                        ▲ {propertyFinancials.appreciationPct} since purchase
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-1">
                      Remaining Mortgage
                    </p>
                    <p className="text-[28px] font-bold text-val-heading leading-none">
                      {propertyFinancials.outstandingMortgage}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {ownershipRecord?.loanType &&
                      ownershipRecord?.loanTermYears != null &&
                      ownershipRecord?.interestRate != null
                        ? `${ownershipRecord.loanType} ${ownershipRecord.loanTermYears}yr @ ${ownershipRecord.interestRate}%`
                        : "—"}
                    </p>
                  </div>
                </div>

                <div className="mb-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                      Equity
                    </span>
                    <span className="text-[13px] font-bold text-val-heading">
                      {propertyFinancials.equityAmount}
                      {propertyFinancials.equityPct != null &&
                        ` (${propertyFinancials.equityPct.toFixed(1)}%)`}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[--val-primary-dark]"
                      style={{
                        width: mounted
                          ? `${propertyFinancials.equityPct ?? 0}%`
                          : "0%",
                        transition:
                          "width 800ms cubic-bezier(0.25,1,0.5,1) 200ms",
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                  {[
                    { label: "LTV Ratio", value: propertyFinancials.ltv },
                    {
                      label: "Monthly P/I",
                      value:
                        propertyFinancials.monthlyPayment !== "—"
                          ? `${propertyFinancials.monthlyPayment}/mo`
                          : "—",
                    },
                    {
                      label: "Next Payment Due",
                      value:
                        ownershipRecord?.nextPaymentDue != null
                          ? formatDate(ownershipRecord.nextPaymentDue)
                          : "—",
                    },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-0.5">
                        {label}
                      </p>
                      <p className="text-[14px] font-semibold text-val-heading">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ownership Split */}
              <div className="col-span-5 bg-white rounded-xl border border-slate-200 p-6 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)]">
                <h3 className="text-base font-bold text-val-heading mb-5">
                  Ownership Split
                </h3>
                <div className="flex items-center justify-center mb-5">
                  <div className="relative w-[140px] h-[140px]">
                    <svg
                      viewBox="0 0 100 100"
                      className="w-full h-full -rotate-90"
                    >
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="#e4efff"
                        strokeWidth="12"
                      />
                      {sortedOwners.map((owner, i) => {
                        const prevShare = sortedOwners
                          .slice(0, i)
                          .reduce((s, o) => s + o.sharePercent, 0);
                        return (
                          <circle
                            key={owner.id}
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke={OWNER_COLORS[i % OWNER_COLORS.length]}
                            strokeWidth="12"
                            strokeDasharray={
                              mounted
                                ? `${owner.sharePercent * 2.51} ${100 * 2.51}`
                                : `0 ${100 * 2.51}`
                            }
                            strokeDashoffset={`${-prevShare * 2.51}`}
                            style={{
                              transition: `stroke-dasharray ${0.9 - i * 0.15}s cubic-bezier(0.16,1,0.3,1) ${0.3 + i * 0.3}s`,
                            }}
                          />
                        );
                      })}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[13px] font-bold text-val-heading">
                        {sortedOwners.length === 0
                          ? "—"
                          : sortedOwners.map((o) => `${o.sharePercent}%`).join(" · ")}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2.5 mb-5">
                  {sortedOwners.length === 0 ? (
                    <p className="text-[14px] text-slate-400 text-center">
                      No co-owners yet
                    </p>
                  ) : (
                    sortedOwners.map((owner, i) => (
                      <div
                        key={owner.id}
                        className="flex items-center gap-2.5"
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            background: OWNER_COLORS[i % OWNER_COLORS.length],
                          }}
                        />
                        <span className="text-[14px] text-val-heading">
                          {ownerInitials(owner.name)}
                        </span>
                        <span className="text-[14px] font-semibold text-val-heading ml-auto">
                          {owner.sharePercent}%
                        </span>
                      </div>
                    ))
                  )}
                </div>
                <button
                  onClick={openWizard}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded text-sm font-semibold text-val-heading hover:bg-slate-50 active:scale-[0.98] transition-all duration-150"
                >
                  Edit Split
                </button>
              </div>
            </div>

            {/* Owner Cards */}
            <div
              className="grid grid-cols-2 gap-5"
              style={fade(mounted, 240, reducedMotion)}
            >
              {displayedOwners.length === 0 ? (
                <div className="col-span-2">
                  <EmptyState
                    icon={<Users className="size-6" />}
                    title="No co-owners yet"
                    description="Add owners to track equity and income splits for this property."
                  />
                </div>
              ) : (
                <>
                  {displayedOwners.map((owner) => (
                    <OwnerCard
                      key={owner.id}
                      initials={ownerInitials(owner.name)}
                      name={owner.name}
                      badge={
                        owner.role === "Primary" ? "Primary Owner" : "Minor Owner"
                      }
                      share={owner.sharePercent}
                      equity={
                        propertyValue > 0
                          ? formatCurrencyFull(
                              Math.round(
                                (owner.sharePercent * propertyValue) / 100,
                              ),
                            )
                          : "—"
                      }
                      email={owner.email ?? "—"}
                      phone={owner.phone ?? "—"}
                      address={owner.address ?? "—"}
                      ssn={owner.ssnMasked ?? "—"}
                      entity={owner.taxEntity ?? "—"}
                      status={owner.tax1099Status ?? "—"}
                      mounted={mounted}
                      onEdit={openWizard}
                    />
                  ))}
                  {hiddenCount > 0 && (
                    <div className="col-span-2 text-center text-[13px] text-slate-400 py-1">
                      +{hiddenCount} more co-owner{hiddenCount > 1 ? "s" : ""}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Acquisition Details + Income Distribution */}
            <div
              className="grid grid-cols-2 gap-5"
              style={fade(mounted, 300, reducedMotion)}
            >
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)]">
                <h3 className="text-base font-bold text-val-heading mb-4">
                  Acquisition Details
                </h3>
                <AcquisitionDetails
                  record={ownershipRecord}
                  property={property}
                />
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)]">
                <h3 className="text-base font-bold text-val-heading mb-4">
                  Income &amp; Expense Distribution
                </h3>
                <div className="mb-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-2.5">
                    Distribution Method
                  </p>
                  <div className="flex items-center gap-4 flex-wrap">
                    {(
                      ["Pro-Rata by Share", "Equal Split", "Custom"] as const
                    ).map((method) => {
                      const selected =
                        ownershipRecord?.distributionMethod === method;
                      return (
                        <label
                          key={method}
                          className={`flex items-center gap-2 text-[14px] cursor-pointer ${selected ? "text-val-heading" : "text-slate-400"}`}
                        >
                          <span
                            className={`w-4 h-4 border-2 rounded-full shrink-0 flex items-center justify-center ${selected ? "border-[--val-primary-dark]" : "border-slate-200"}`}
                          >
                            {selected && (
                              <span className="w-2 h-2 bg-[--val-primary-dark] rounded-full" />
                            )}
                          </span>
                          {method}
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-2">
                      Rent Income Split
                    </p>
                    <div className="space-y-1.5">
                      {sortedOwners.length === 0 ? (
                        <p className="text-[14px] text-slate-400">
                          No owners configured
                        </p>
                      ) : (
                        sortedOwners.map((owner) => (
                          <div
                            key={owner.id}
                            className="flex justify-between text-[14px]"
                          >
                            <span className="text-val-heading">
                              {ownerInitials(owner.name)} {owner.sharePercent}%
                            </span>
                            <span className="font-semibold text-val-heading">
                              {monthlyRentIncome > 0
                                ? `${formatCurrencyFull(Math.round((owner.sharePercent * monthlyRentIncome) / 100))}/mo`
                                : "—"}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-2">
                      Expense Responsibility
                    </p>
                    <div className="space-y-1.5">
                      {sortedOwners.length === 0 ? (
                        <p className="text-[14px] text-slate-400">
                          No owners configured
                        </p>
                      ) : (
                        sortedOwners.map((owner) => (
                          <div
                            key={owner.id}
                            className="flex justify-between text-[14px]"
                          >
                            <span className="text-val-heading">
                              {ownerInitials(owner.name)} {owner.sharePercent}%
                            </span>
                            <span className="text-slate-400">shared costs</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={openWizard}
                  className="text-[--val-primary-dark] text-[14px] font-semibold mt-5 hover:opacity-75 transition-opacity"
                >
                  Edit Distribution Rules
                </button>
              </div>
            </div>

            {/* Ownership Documents — legacy + verification merged */}
            <div style={fade(mounted, 360, reducedMotion)}>
              <div className="bg-white rounded-lg border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 bg-slate-50/80 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <h3 className="text-val-heading text-[15px] font-semibold">
                      Ownership Documents
                    </h3>
                    {ownershipRecord?.verified && (
                      <div className="flex items-center gap-1.5">
                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-semibold rounded-full border border-emerald-200">
                          <ShieldCheck className="w-3 h-3" />
                          Valgate Verified
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-52">
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                              onSelect={() => setRevokeOpen(true)}
                            >
                              <AlertTriangle className="w-4 h-4 mr-2" />
                              Revoke verification
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setDemoUploadOpen(true)}
                    className="px-4 py-2 text-white text-[13px] font-semibold rounded flex items-center gap-2 hover:opacity-90 active:scale-[0.97] transition-all duration-150"
                    style={{
                      background:
                        "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)",
                    }}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload Doc
                  </button>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200">
                      {["Name", "Type", "Date", "Owner", "Status"].map(
                        (col) => (
                          <th
                            key={col}
                            className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]"
                          >
                            {col}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {allOwnershipDocs.length === 0 &&
                    verificationDocs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6">
                          <EmptyState
                            icon={<FileText className="size-6" />}
                            title="No ownership documents yet"
                            description="Add a deed or title to start tracking ownership for this property."
                          />
                        </td>
                      </tr>
                    ) : (
                      <>
                        {allOwnershipDocs.map((doc, i) => (
                          <tr
                            key={doc.id}
                            className="border-t border-slate-100 hover:bg-blue-50/30 cursor-pointer transition-colors"
                            style={{ animationDelay: `${i * 25}ms` }}
                          >
                            <td className="px-4 py-3.5 text-[14px] text-val-heading">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                                {doc.name}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-[14px] text-slate-500">
                              {doc.type}
                            </td>
                            <td className="px-4 py-3.5 text-[14px] text-slate-500">
                              {formatDate(doc.documentDate)}
                            </td>
                            <td className="px-4 py-3.5 text-[14px] text-slate-500">
                              {orecMap.get(doc.ownershipRecordId)?.holdingType ??
                                "—"}
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold tracking-[1px] uppercase px-2.5 py-0.5 rounded-full">
                                {doc.status ?? "Current"}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {verificationDocs.map((doc, i) => (
                          <tr
                            key={doc.id}
                            className="border-t border-slate-100 hover:bg-emerald-50/30 cursor-pointer transition-colors"
                            style={{
                              animationDelay: `${(ownershipDocuments.length + i) * 25}ms`,
                            }}
                          >
                            <td className="px-4 py-3.5 text-[14px] text-val-heading">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                                {doc.name}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-[14px] text-slate-500">
                              Title Deed (Verified)
                            </td>
                            <td className="px-4 py-3.5 text-[14px] text-slate-500">
                              {formatDate(doc.uploadedAt)}
                            </td>
                            <td className="px-4 py-3.5 text-[14px] text-slate-500">
                              {ownershipRecord?.holdingType ?? "—"}
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold tracking-[1px] uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 w-fit">
                                <ShieldCheck className="w-3 h-3" />
                                Verified
                              </span>
                            </td>
                          </tr>
                        ))}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Ownership History */}
            <div
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)]"
              style={fade(mounted, 420, reducedMotion)}
            >
              <h3 className="text-base font-bold text-val-heading mb-4">
                Ownership History &amp; Activity
              </h3>
              {ownershipHistory.length === 0 ? (
                <EmptyState
                  icon={<History className="size-6" />}
                  title="No ownership history yet"
                  description="Title transfers and ownership changes will appear here."
                />
              ) : (
                <div className="flex flex-col gap-4 relative">
                  <div
                    className="absolute left-[107px] top-2 bottom-2 w-px bg-slate-100"
                    aria-hidden="true"
                  />
                  {ownershipHistory.map((item, i) => (
                    <div key={item.id ?? i} className="flex items-start gap-4">
                      <span className="text-[13px] text-slate-400 w-[100px] shrink-0 pt-0.5">
                        {formatDate(item.eventDate)}
                      </span>
                      <span
                        className="w-1.5 h-1.5 rounded-full mt-[5px] shrink-0 relative z-10"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-[14px] text-val-heading">
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </PropertyLayout>

      {/* Demo upload dialog */}
      <DemoUploadDialog
        open={demoUploadOpen}
        onOpenChange={setDemoUploadOpen}
        propertyId={property.id}
        ownershipRecordId={ownershipRecord?.id ?? ""}
        onUpload={(doc) => setDemoUploadedDocs((prev) => [doc, ...prev])}
      />

      {/* Ownership Unlock Wizard */}
      <OwnershipUnlockMount
        propertyId={property.id}
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        startAt={wizardStartAt}
        onSuccess={() => router.refresh()}
      />

      {/* Revoke verification confirmation dialog */}
      <Dialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mb-1">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <DialogTitle>Revoke verification?</DialogTitle>
            <DialogDescription>
              This will remove the Verified status from this ownership record.
              Your uploaded documents will not be deleted — you can re-verify
              at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setRevokeOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-val-heading border border-slate-200 rounded hover:bg-slate-50 transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              onClick={handleRevoke}
              disabled={revoking}
              className="px-4 py-2 text-sm font-semibold text-white rounded bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-colors duration-150"
            >
              {revoking ? "Revoking…" : "Revoke verification"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function OwnerCard({
  initials,
  name,
  badge,
  share,
  equity,
  email,
  phone,
  address,
  ssn,
  entity,
  status,
  mounted,
  onEdit,
}: {
  initials: string;
  name: string;
  badge: string;
  share: number;
  equity: string;
  email: string;
  phone: string;
  address: string;
  ssn: string;
  entity: string;
  status: string;
  mounted: boolean;
  onEdit: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)] hover:-translate-y-0.5 hover:shadow-[0px_6px_20px_0px_rgba(18,28,40,0.10)] transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[13px] font-bold shrink-0"
            style={{
              background:
                "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)",
            }}
          >
            {initials}
          </div>
          <p className="text-[17px] font-bold text-val-heading">{name}</p>
        </div>
        <span className="bg-blue-50 text-blue-700 text-[10px] font-semibold tracking-[1px] uppercase px-2.5 py-1 rounded-full shrink-0">
          {badge}
        </span>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">
            Ownership Share
          </span>
          <span className="text-[14px] font-bold text-val-heading">{share}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[--val-primary-dark] rounded-full"
            style={{
              width: mounted ? `${share}%` : "0%",
              transition: "width 800ms cubic-bezier(0.25,1,0.5,1) 300ms",
            }}
          />
        </div>
        <p className="text-[13px] font-semibold text-val-heading mt-2">
          Equity Value: {equity}
        </p>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-[14px] text-slate-500">
          <Mail className="w-4 h-4 shrink-0" />
          {email}
        </div>
        <div className="flex items-center gap-2 text-[14px] text-slate-500">
          <Phone className="w-4 h-4 shrink-0" />
          {phone}
        </div>
        <div className="flex items-center gap-2 text-[14px] text-slate-500">
          <MapPin className="w-4 h-4 shrink-0" />
          {address}
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4 space-y-2 text-[14px]">
        <div className="flex justify-between">
          <span className="text-slate-500">SSN / EIN</span>
          <span className="text-val-heading font-medium">{ssn}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Tax Entity</span>
          <span className="text-val-heading font-medium">{entity}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">1099 Status</span>
          {status !== "—" ? (
            <span className="text-emerald-600 flex items-center gap-1 font-medium">
              <Check className="w-3 h-3" /> {status}
            </span>
          ) : (
            <span className="text-slate-400 font-medium">{status}</span>
          )}
        </div>
      </div>

      <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100">
        <button
          onClick={onEdit}
          className="px-4 py-2 bg-white border border-slate-200 rounded text-sm font-semibold text-val-heading hover:bg-slate-50 active:scale-[0.98] transition-all duration-150"
        >
          Edit Owner
        </button>
        <button className="text-[--val-primary-dark] text-[14px] font-semibold hover:opacity-75 transition-opacity">
          View Documents
        </button>
      </div>
    </div>
  );
}

function DemoUploadDialog({
  open,
  onOpenChange,
  propertyId,
  ownershipRecordId,
  onUpload,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  ownershipRecordId: string;
  onUpload: (doc: OwnershipDocument) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState("Title Deed");
  const [stage, setStage] = useState<"idle" | "uploading" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setDocType("Title Deed");
      setStage("idle");
      setProgress(0);
    }
  }, [open]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  }

  function handleUpload() {
    if (!file) return;
    setStage("uploading");
    setProgress(0);

    let prog = 0;
    const interval = setInterval(() => {
      prog = Math.min(prog + Math.random() * 12 + 5, 92);
      setProgress(prog);
    }, 150);

    setTimeout(() => {
      clearInterval(interval);
      setProgress(100);
      setStage("done");
      const now = Date.now();
      onUpload({
        id: `DEMO-${now}`,
        propertyId,
        ownershipRecordId,
        name: file.name.replace(/\.[^.]+$/, ""),
        type: docType,
        documentDate: now,
        status: "Current",
        createdAt: now,
        updatedAt: now,
      });
    }, 1800);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Ownership Document</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wider shrink-0">
              Demo
            </span>
            Documents appear in the table but are not persisted.
          </DialogDescription>
        </DialogHeader>

        {stage === "done" ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            </div>
            <p className="text-[15px] font-semibold text-val-heading">Document uploaded</p>
            <p className="text-[13px] text-slate-400 text-center max-w-[240px]">
              {file?.name} has been added to the ownership documents table.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Drop zone */}
            <div
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all ${
                file
                  ? "border-[--val-primary-dark] bg-blue-50/30"
                  : "border-slate-200 hover:border-[--val-primary-dark] hover:bg-blue-50/10"
              }`}
            >
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Upload className="w-5 h-5 text-blue-500" />
              </div>
              {file ? (
                <div className="text-center">
                  <p className="text-[14px] font-semibold text-val-heading">{file.name}</p>
                  <p className="text-[12px] text-slate-400 mt-0.5">
                    {(file.size / 1024).toFixed(0)} KB
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-[14px] font-semibold text-val-heading">
                    Click to select a file
                  </p>
                  <p className="text-[12px] text-slate-400 mt-0.5">
                    PDF, JPG, or PNG — up to 10 MB
                  </p>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Document type */}
            <div>
              <label className="block text-[12px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Document Type
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-[14px] text-val-heading focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[--val-primary-dark] bg-white"
              >
                {[
                  "Title Deed",
                  "Purchase Agreement",
                  "Mortgage Document",
                  "Insurance Policy",
                  "Tax Assessment",
                  "Other",
                ].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Progress bar (only while uploading) */}
            {stage === "uploading" && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12px] text-slate-500">Uploading…</span>
                  <span className="text-[12px] font-semibold text-val-heading">
                    {Math.min(Math.round(progress), 100)}%
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[--val-primary-dark] transition-all duration-200"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {stage === "done" ? (
            <button
              onClick={() => onOpenChange(false)}
              className="px-5 py-2 text-sm font-semibold text-white rounded hover:opacity-90 active:scale-[0.97] transition-all"
              style={{
                background:
                  "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)",
              }}
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={() => onOpenChange(false)}
                disabled={stage === "uploading"}
                className="px-4 py-2 text-sm font-semibold text-val-heading border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || stage === "uploading"}
                className="px-5 py-2 text-sm font-semibold text-white rounded disabled:opacity-40 hover:opacity-90 active:scale-[0.97] transition-all"
                style={{
                  background:
                    "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)",
                }}
              >
                {stage === "uploading" ? "Uploading…" : "Upload"}
              </button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AcquisitionDetails({
  record,
  property,
}: {
  record: OwnershipRecord | null;
  property: Property;
}) {
  const _parsed = parseFloat(property.purchasePrice ?? "");
  const purchasePriceNum = isNaN(_parsed) ? null : _parsed;
  const totalAcquisition =
    record?.downPayment != null && record?.closingCosts != null
      ? record.downPayment + record.closingCosts
      : null;

  const rows: [string, string][] = [
    [
      "Purchase Price",
      purchasePriceNum != null ? formatCurrencyFull(purchasePriceNum) : "—",
    ],
    [
      "Down Payment",
      record?.downPayment != null ? formatCurrencyFull(record.downPayment) : "—",
    ],
    [
      "Closing Costs",
      record?.closingCosts != null ? formatCurrencyFull(record.closingCosts) : "—",
    ],
    [
      "Total Acquisition",
      totalAcquisition != null
        ? `${formatCurrencyFull(totalAcquisition)} cash deployed`
        : "—",
    ],
    ["Lender", record?.lenderName ?? "—"],
    [
      "Loan Amount",
      record?.loanAmount != null ? formatCurrencyFull(record.loanAmount) : "—",
    ],
    [
      "Interest Rate",
      record?.interestRate != null && record?.loanType
        ? `${record.interestRate}% ${record.loanType}`
        : "—",
    ],
    [
      "Loan Term",
      record?.loanTermYears != null ? `${record.loanTermYears} Years` : "—",
    ],
    [
      "Origination Date",
      record?.originationDate != null ? formatDate(record.originationDate) : "—",
    ],
    [
      "Maturity Date",
      record?.maturityDate != null ? formatDate(record.maturityDate) : "—",
    ],
  ];

  return (
    <div className="space-y-3">
      {rows.map(([label, val]) => (
        <div key={label} className="flex justify-between text-[14px]">
          <span className="text-slate-500">{label}</span>
          <span className="text-val-heading font-medium">{val}</span>
        </div>
      ))}
    </div>
  );
}
