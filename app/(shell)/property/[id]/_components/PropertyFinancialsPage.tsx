"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp, BarChart2, CheckCircle2, AlertCircle,
  ExternalLink, MapPin, Calendar,
  BadgeCheck, MoreHorizontal, Coins,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Property } from "@/lib/data/types/property";
import type { PropertyValuation } from "@/lib/data/types/property-valuation";
import { PropertyLayout } from "@/components/property/PropertyLayout";
import { MobileCardTable } from "@/components/property/MobileCardTable";
import { UnlockButton } from "@/components/feature-unlock/UnlockButton";
import { FinancialsUnlockMount } from "@/components/feature-unlock/pillars/FinancialsUnlock";
import type { UnlockState } from "@/components/feature-unlock/types";
import { revokeFinancialsVerification } from "@/lib/actions/properties.actions";
import { buildPropertyFinancials } from "@/lib/data/derivations/property-financials";
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

const comparables = [
  { address: "1847 Oak Street", dist: "0.3 mi", sold: "Feb 2026", type: "House", builtYear: "'18", beds: "3", baths: "2", sqft: "1,850", price: "$492,000", psqft: "$266" },
  { address: "212 Maple Avenue", dist: "0.5 mi", sold: "Jan 2026", type: "House", builtYear: "'16", beds: "3", baths: "2", sqft: "1,920", price: "$488,000", psqft: "$254" },
  { address: "56 Birch Lane", dist: "0.7 mi", sold: "Dec 2025", type: "House", builtYear: "'20", beds: "4", baths: "2", sqft: "2,100", price: "$510,000", psqft: "$243" },
  { address: "98 Cedar Road", dist: "0.9 mi", sold: "Dec 2025", type: "House", builtYear: "'17", beds: "3", baths: "3", sqft: "1,780", price: "$478,000", psqft: "$269" },
];

const investmentMetrics = [
  { label: "Cash-on-Cash Return", value: "8.4%" },
  { label: "Cap Rate", value: "6.2%" },
  { label: "Total ROI (Since Purchase)", value: "42.7%" },
  { label: "Equity Gained", value: "$137,800" },
];

const positiveFactors = [
  "Recent kitchen renovation",
  "Low crime area",
  "Top-rated schools nearby",
  "New transit line opening",
];

const opportunities = [
  "Outdated bathrooms",
  "Aging HVAC system",
  "Limited curb appeal",
];

function useCountUp(raw: string, duration: number, active: boolean): string {
  const stripped = raw.replace(/[+$,%\s]/g, "").replace(/,/g, "");
  const num = parseFloat(stripped);
  const isPercent = raw.includes("%");
  const hasDollar = raw.includes("$");
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!active) { setDisplay(raw); return; }
    const start = performance.now();
    function tick(now: number) {
      const p = Math.min((now - start) / duration, 1);
      const v = (1 - Math.pow(1 - p, 3)) * num;
      let formatted: string;
      if (isPercent) formatted = v.toFixed(1) + "%";
      else if (hasDollar) formatted = "$" + Math.round(v).toLocaleString("en-US");
      else formatted = Math.round(v).toLocaleString("en-US");
      setDisplay(formatted);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return display;
}

function fade(mounted: boolean, delay: number, reduced = false) {
  if (reduced) return { opacity: 1 };
  return {
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(-8px)",
    transition: "opacity 400ms cubic-bezier(0.25,1,0.5,1), transform 400ms cubic-bezier(0.25,1,0.5,1)",
    transitionDelay: `${delay}ms`,
  };
}

function KpiCard({
  label, value, sub, subColor, cta, ctaLabel, onCtaClick,
  duration, active, mounted, reducedMotion, delay,
}: {
  label: string; value: string; sub?: string; subColor?: string;
  cta?: string; ctaLabel?: string; onCtaClick?: () => void;
  duration: number; active: boolean;
  mounted: boolean; reducedMotion: boolean; delay: number;
}) {
  const display = useCountUp(value, duration, active);
  return (
    <div
      className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-col gap-2"
      style={fade(mounted, delay, reducedMotion)}
    >
      <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">{label}</p>
      <p className="text-[22px] sm:text-[26px] font-bold text-val-heading leading-none">{display}</p>
      {sub && <p className="text-[13px]" style={{ color: subColor ?? "#64748b" }}>{sub}</p>}
      {cta && (
        <button
          onClick={onCtaClick}
          className="text-[--val-primary-dark] text-[12px] font-semibold hover:opacity-75 transition-opacity mt-1 text-left"
          aria-label={ctaLabel}
        >
          {cta} →
        </button>
      )}
    </div>
  );
}

interface Props {
  property: Property;
  valuations: PropertyValuation[];
}

export function PropertyFinancialsPage({ property, valuations = [] }: Props) {
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStartAt, setWizardStartAt] = useState<"data" | "verification">("data");
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const sorted = [...valuations].sort((a, b) => a.recordedAt - b.recordedAt);
  const latest = sorted.at(-1) ?? null;
  const prev = sorted.at(-2) ?? null;
  const valueHistory = sorted.map((v) => ({ month: v.month, price: v.price }));

  const currentValueStr = latest
    ? "$" + latest.price.toLocaleString("en-US")
    : property.currentMarketValue
      ? "$" + property.currentMarketValue.toLocaleString("en-US")
      : "$0";

  const qoqDelta = latest && prev ? latest.price - prev.price : null;
  const qoqStr =
    qoqDelta !== null
      ? qoqDelta >= 0
        ? `▲ +$${qoqDelta.toLocaleString("en-US")} since last quarter`
        : `▼ −$${Math.abs(qoqDelta).toLocaleString("en-US")} since last quarter`
      : "No prior record";
  const qoqColor =
    qoqDelta !== null ? (qoqDelta >= 0 ? "#059669" : "#dc2626") : "#64748b";

  const purchaseDateLabel = property.purchaseDate
    ? new Date(property.purchaseDate).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : null;

  const annualHoldingCost =
    (property.annualPropertyTax ?? 0) + (property.annualInsurance ?? 0);
  const annualHoldingCostStr = annualHoldingCost > 0
    ? "$" + annualHoldingCost.toLocaleString("en-US")
    : "—";

  const mortgageStr = property.outstandingMortgage != null
    ? "$" + property.outstandingMortgage.toLocaleString("en-US")
    : "—";

  const purchasePriceStr = property.buyNumeric > 0
    ? "$" + property.buyNumeric.toLocaleString("en-US")
    : "—";

  const yourEstimateStr = latest ? "$" + latest.price.toLocaleString("en-US") : "—";

  const chartPrices = valueHistory.map((v) => v.price);
  const chartPriceMin = chartPrices.length > 0 ? Math.min(...chartPrices) : 0;
  const chartPriceMax = chartPrices.length > 0 ? Math.max(...chartPrices) : 1_000_000;
  const chartPad = Math.max((chartPriceMax - chartPriceMin) * 0.2, chartPriceMin * 0.03);
  const chartDomain: [number, number] = [
    Math.floor((chartPriceMin - chartPad) / 10_000) * 10_000,
    Math.ceil((chartPriceMax + chartPad) / 10_000) * 10_000,
  ];

  const unlockState: UnlockState = property.financialsVerified
    ? { kind: "edit", entityId: property.id }
    : property.currentMarketValue || property.outstandingMortgage
      ? { kind: "verify", entityId: property.id }
      : { kind: "unlock" };

  function openWizard() {
    setWizardStartAt(unlockState.kind === "verify" ? "verification" : "data");
    setWizardOpen(true);
  }

  const propertyFinancials = buildPropertyFinancials(property);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const active = mounted && !reducedMotion;

  async function handleRevoke() {
    setRevoking(true);
    const result = await revokeFinancialsVerification(property.id);
    setRevoking(false);
    setRevokeOpen(false);
    if (result.ok) {
      toast.success("Verification revoked. Financial data is preserved.");
    } else {
      toast.error("Couldn't revoke verification — your data is unchanged. Try again or contact support.");
    }
  }

  return (
    <PropertyLayout
      activeTab="financials"
      property={property}
    >
      <div className="bg-val-bg-page-alt min-h-full pb-10">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-8 pt-5 sm:pt-6 flex flex-col gap-4 sm:gap-5">

          {/* Page Header */}
          <div style={fade(mounted, 0, reducedMotion)}>
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-xs font-semibold tracking-widest uppercase text-[--val-primary-dark]">Valgate</span>
              <span className="text-xs text-slate-300">/</span>
              <span className="text-xs font-semibold tracking-widest uppercase text-slate-400">{property.name}</span>
              <span className="text-xs text-slate-300">/</span>
              <span className="text-xs font-semibold tracking-widest uppercase text-slate-400">Financials</span>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-[28px] sm:text-[40px] font-extrabold text-val-heading tracking-tight leading-tight sm:leading-10">Financials</h1>
                  {property.financialsVerified && (
                    <div className="flex items-center gap-1.5">
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[12px] font-semibold">
                        <BadgeCheck className="w-3.5 h-3.5" />
                        Valgate Verified
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-48">
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                            onSelect={() => setRevokeOpen(true)}
                          >
                            Revoke verification
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
                <p className="text-slate-500 text-base mt-2">
                  Financials for <span className="font-medium text-val-heading">{property.name}</span>
                  {property.addressLine
                    ? <> — {property.addressLine}{property.city ? `, ${property.city}` : ""}</>
                    : property.city
                      ? <>, {property.city}{property.country ? `, ${property.country}` : ""}</>
                      : null}
                  .
                </p>
              </div>
              {/* Edit/Verify pill — top-right on desktop, below the title on
                  mobile. Standardized wrapper across all 4 property pages
                  that use UnlockButton (Financials, Ownership, Rental,
                  Location): always inline with the page title row, always
                  wrapped in `shrink-0` so it never wraps under the title. */}
              <div className="shrink-0">
                <UnlockButton state={unlockState} onClick={openWizard} editLabel="Edit financials" />
              </div>
            </div>
          </div>

          {/* 5-KPI Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <KpiCard
              label="Purchase Price"
              value={purchasePriceStr}
              sub={
                purchaseDateLabel
                  ? `Acquired ${purchaseDateLabel}`
                  : "Enter purchase date in the wizard"
              }
              cta={property.buyNumeric === 0 ? "Add purchase price" : undefined}
              ctaLabel="Add purchase price in Financials wizard"
              onCtaClick={openWizard}
              duration={1100}
              active={active}
              mounted={mounted}
              reducedMotion={reducedMotion}
              delay={60}
            />
            <KpiCard
              label="Current Value"
              value={currentValueStr}
              sub={qoqStr}
              subColor={qoqColor}
              cta="Update estimate"
              ctaLabel="Update current market value estimate"
              onCtaClick={openWizard}
              duration={1400}
              active={active}
              mounted={mounted}
              reducedMotion={reducedMotion}
              delay={120}
            />
            <KpiCard
              label="Outstanding Mortgage"
              value={mortgageStr}
              sub={
                property.outstandingMortgage != null
                  ? "Principal remaining"
                  : "Required to calculate equity"
              }
              subColor={property.outstandingMortgage == null ? "#f59e0b" : undefined}
              cta={property.outstandingMortgage == null ? "Add mortgage balance" : undefined}
              ctaLabel="Add mortgage balance in Financials wizard"
              onCtaClick={openWizard}
              duration={1100}
              active={active}
              mounted={mounted}
              reducedMotion={reducedMotion}
              delay={180}
            />
            <KpiCard
              label="Equity"
              value={propertyFinancials.equityAmount}
              sub={
                propertyFinancials.equityPct != null
                  ? `${propertyFinancials.equityPct.toFixed(1)}% of property value`
                  : "Add market value + mortgage to calculate"
              }
              subColor={propertyFinancials.equityPct != null ? "#059669" : "#f59e0b"}
              cta={propertyFinancials.equityAmount === "—" ? "Set up financials" : undefined}
              ctaLabel="Open Financials wizard to calculate equity"
              onCtaClick={openWizard}
              duration={1200}
              active={active}
              mounted={mounted}
              reducedMotion={reducedMotion}
              delay={240}
            />
            <KpiCard
              label="Annual Holding Cost"
              value={annualHoldingCostStr}
              sub={
                annualHoldingCost > 0
                  ? "Property tax + insurance"
                  : "Add tax & insurance in the wizard"
              }
              subColor={annualHoldingCost === 0 ? "#f59e0b" : undefined}
              cta={annualHoldingCost === 0 ? "Add costs" : undefined}
              ctaLabel="Add annual property tax and insurance"
              onCtaClick={openWizard}
              duration={900}
              active={active}
              mounted={mounted}
              reducedMotion={reducedMotion}
              delay={300}
            />
          </div>

          {/* Equity & Financial Position card */}
          <div style={fade(mounted, 200, reducedMotion)}>
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)]">
              <div className="mb-5">
                <h3 className="text-base font-bold text-val-heading">
                  Equity &amp; Financial Position
                </h3>
                {propertyFinancials.equityPct != null ? (
                  <p className="text-[13px] text-slate-500 mt-0.5">
                    You own{" "}
                    <span className="font-semibold text-emerald-600">
                      {propertyFinancials.equityPct.toFixed(1)}%
                    </span>{" "}
                    of this property outright
                  </p>
                ) : (
                  <p className="text-[13px] text-amber-600 mt-0.5">
                    Add your current market value and mortgage balance to calculate equity —{" "}
                    <button onClick={openWizard} className="underline underline-offset-2 font-medium hover:opacity-75 transition-opacity">
                      open the Financials wizard
                    </button>
                  </p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-12 mb-5">
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
                    {property.interestRate != null
                      ? `${property.interestRate}% interest rate`
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-1">
                    Holding Period
                  </p>
                  <p className="text-[28px] font-bold text-val-heading leading-none">
                    {propertyFinancials.holdingPeriod}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {purchaseDateLabel ? `Since ${purchaseDateLabel}` : "—"}
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
                {propertyFinancials.equityPct != null ? (
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[--val-primary-dark]"
                      style={{
                        width: mounted
                          ? `${Math.max(0, Math.min(100, propertyFinancials.equityPct))}%`
                          : "0%",
                        transition: "width 800ms cubic-bezier(0.25,1,0.5,1) 200ms",
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden relative">
                    <div className="h-full w-full bg-amber-100 rounded-full" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-4 border-t border-slate-100">
                {[
                  { label: "LTV Ratio", value: propertyFinancials.ltv },
                  {
                    label: "Monthly P/I",
                    value: propertyFinancials.monthlyPayment !== "—"
                      ? `${propertyFinancials.monthlyPayment}/mo`
                      : "—",
                  },
                  {
                    label: "Annual Property Tax",
                    value: property.annualPropertyTax != null
                      ? "$" + property.annualPropertyTax.toLocaleString("en-US")
                      : "—",
                  },
                  {
                    label: "Annual Insurance",
                    value: property.annualInsurance != null
                      ? "$" + property.annualInsurance.toLocaleString("en-US")
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
          </div>

          {/* Value History + Market Insight */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5" style={fade(mounted, 300, reducedMotion)}>

            {/* Chart */}
            <div className="col-span-7 bg-white rounded-lg border border-slate-200 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-bold text-val-heading">Value History</h3>
                <button className="px-3 py-1.5 bg-white border border-slate-200 rounded text-[12px] font-semibold text-val-heading hover:bg-slate-50 active:scale-[0.98] transition-all duration-150 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  2025
                </button>
              </div>
              <p className="text-[12px] text-slate-400 mb-5">12-month valuation trend</p>
              {valueHistory.length === 0 ? (
                <div className="h-[220px] flex flex-col items-center justify-center gap-2">
                  <p className="text-[13px] font-medium text-slate-500">No valuation history</p>
                  <p className="text-[12px] text-slate-400">Record a current market value to start tracking this property&apos;s appreciation over time.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={valueHistory} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="valGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.10} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      tickFormatter={(v: number) =>
                        v >= 1_000_000
                          ? `$${(v / 1_000_000).toFixed(1)}M`
                          : `$${Math.round(v / 1000)}k`
                      }
                      axisLine={false}
                      tickLine={false}
                      domain={chartDomain}
                    />
                    <Tooltip
                      formatter={(v: number) => [`$${v.toLocaleString()}`, "Value"]}
                      contentStyle={{
                        background: "#fff",
                        border: "1px solid #e2e8f0",
                        borderRadius: 8,
                        fontSize: 12,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      }}
                      cursor={{ stroke: "#e2e8f0", strokeWidth: 1 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke="#2563EB"
                      strokeWidth={2}
                      fill="url(#valGradient)"
                      dot={false}
                      activeDot={{ r: 4, fill: "#2563EB", strokeWidth: 2, stroke: "#fff" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Market Insight */}
            <div className="col-span-5 bg-white rounded-lg border border-slate-200 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-col gap-5">
              <div>
                <h3 className="text-base font-bold text-val-heading mb-1.5">Market Insight</h3>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <p className="text-[13px] font-semibold text-val-heading">
                    {[property.city, property.country].filter(Boolean).join(", ") || property.province}
                  </p>
                </div>
              </div>

              <div className="bg-val-bg-tint rounded-lg px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-0.5">Market Trend</p>
                <p className="text-[14px] font-bold text-[--val-primary-dark]">Seller&apos;s Market</p>
                <p className="text-[12px] text-slate-500 mt-0.5">Properties selling 12% above list price on average</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">Avg. Days on Market</p>
                  <p className="text-[18px] font-bold text-val-heading leading-none">
                    42 <span className="text-[12px] font-normal text-slate-400">days</span>
                  </p>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-400"
                    style={{
                      width: mounted ? "42%" : "0%",
                      transition: "width 800ms cubic-bezier(0.25,1,0.5,1) 400ms",
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">Inventory Level</p>
                  <p className="text-[13px] font-semibold text-rose-600">Low</p>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`flex-1 h-2 rounded-sm transition-all duration-500 ${i <= 2 ? "bg-rose-400" : "bg-slate-100"}`}
                      style={{ transitionDelay: `${350 + i * 50}ms` }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">Buyer Demand</p>
                  <p className="text-[13px] font-semibold text-emerald-600">High</p>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`flex-1 h-2 rounded-sm transition-all duration-500 ${i <= 4 ? "bg-emerald-400" : "bg-slate-100"}`}
                      style={{ transitionDelay: `${430 + i * 50}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Comparable Sales */}
          <div style={fade(mounted, 380, reducedMotion)}>
            <div className="bg-white rounded-lg border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50/80 border-b border-slate-200">
                <div>
                  <h3 className="text-base font-bold text-val-heading">Comparable Sales</h3>
                  <p className="text-[12px] text-slate-400">Similar properties that sold recently in your area</p>
                </div>
                <button className="px-4 py-2 bg-white border border-slate-200 rounded text-sm font-semibold text-val-heading hover:bg-slate-50 active:scale-[0.98] transition-[background-color,transform] duration-150">
                  View Full Report
                </button>
              </div>
              {/*
                Comparable Sales — desktop 7-column table, mobile stacked
                cards. Cards put the most decision-relevant fields (address,
                price, price/sqft) up top and tuck the rest (beds/bath, sqft,
                type, distance) into a secondary stat row.
              */}
              <MobileCardTable
                desktop={
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200">
                        <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Address</th>
                        <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Type</th>
                        <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Beds / Bath</th>
                        <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Sq Ft</th>
                        <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Sold Price</th>
                        <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Price / sqft</th>
                        <th className="px-5 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {comparables.map((c, i) => (
                        <tr
                          key={c.address}
                          className="border-t border-slate-100 hover:bg-blue-50/30 cursor-pointer transition-colors"
                          style={{ animationDelay: `${i * 25}ms` }}
                        >
                          <td className="px-5 py-3.5">
                            <p className="text-[14px] text-val-heading font-semibold">{c.address}</p>
                            <p className="text-[12px] text-slate-400">{c.dist} · Sold {c.sold}</p>
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="text-[14px] text-val-heading">{c.type}</p>
                            <p className="text-[12px] text-slate-400">Built {c.builtYear}</p>
                          </td>
                          <td className="px-5 py-3.5 text-[14px] text-val-heading">{c.beds} / {c.baths}</td>
                          <td className="px-5 py-3.5 text-[14px] text-val-heading">{c.sqft}</td>
                          <td className="px-5 py-3.5 text-[14px] font-semibold text-val-heading">{c.price}</td>
                          <td className="px-5 py-3.5 text-[14px] text-slate-500">{c.psqft}/sqft</td>
                          <td className="px-5 py-3.5">
                            <button className="text-[--val-primary-dark] text-[12px] font-semibold hover:opacity-75 transition-opacity flex items-center gap-1">
                              Contract <ExternalLink className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                }
                mobile={
                  <div className="flex flex-col divide-y divide-slate-100">
                    {comparables.map((c) => (
                      <div
                        key={c.address}
                        className="px-4 py-4 hover:bg-blue-50/30 active:bg-blue-50/60 transition-colors cursor-pointer"
                      >
                        {/* Row 1 — address + sold price headline */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-[14px] text-val-heading font-semibold truncate">{c.address}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{c.dist} · Sold {c.sold}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[15px] font-bold text-val-heading tabular-nums">{c.price}</p>
                            <p className="text-[11px] text-slate-500 tabular-nums">{c.psqft}/sqft</p>
                          </div>
                        </div>

                        {/* Row 2 — secondary stats (type, beds/baths, sqft) */}
                        <div className="flex items-center gap-3 mt-2 text-[12px] text-slate-500">
                          <span>{c.type}</span>
                          <span className="text-slate-300">·</span>
                          <span>{c.beds} bd / {c.baths} ba</span>
                          <span className="text-slate-300">·</span>
                          <span>{c.sqft} sqft</span>
                        </div>

                        {/* Row 3 — contract link */}
                        <button className="mt-3 text-[--val-primary-dark] text-[12px] font-semibold hover:opacity-75 transition-opacity flex items-center gap-1">
                          View contract <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                }
              />
              <div className="bg-slate-50/60 border-t border-slate-200 px-5 py-3">
                <p className="text-[12px] text-slate-500">
                  Average comp price: <span className="text-val-heading font-semibold">$492,000</span>
                  <span className="mx-2 text-slate-300">·</span>
                  Your estimate: <span className="text-val-heading font-semibold">{yourEstimateStr}</span>
                  <span className="mx-2 text-slate-300">·</span>
                  <span className="text-amber-600 font-semibold">1.4% below comps</span>
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5" style={fade(mounted, 460, reducedMotion)}>

            {/* Investment Performance */}
            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-val-heading">Investment Performance</h3>
                <BarChart2 className="w-4 h-4 text-slate-300" />
              </div>
              <div className="flex flex-col divide-y divide-slate-100">
                {investmentMetrics.map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2.5">
                    <span className="text-[13px] text-slate-500">{label}</span>
                    <span className="text-[14px] font-semibold text-val-heading">{value}</span>
                  </div>
                ))}
              </div>
              <button className="text-[--val-primary-dark] text-[12px] font-semibold hover:opacity-75 transition-opacity text-left">
                View Detailed Report →
              </button>
            </div>

            {/* Value Drivers */}
            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-col gap-3">
              <h3 className="text-base font-bold text-val-heading">Value Drivers</h3>
              <div className="flex flex-col">
                <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-emerald-600 mb-2">Positive</p>
                {positiveFactors.map((f) => (
                  <div key={f} className="flex items-center gap-2.5 py-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="text-[13px] text-val-heading">{f}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col pt-3 border-t border-slate-100">
                <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-amber-600 mb-2">Opportunities</p>
                {opportunities.map((f) => (
                  <div key={f} className="flex items-center gap-2.5 py-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="text-[13px] text-val-heading">{f}</span>
                  </div>
                ))}
              </div>
              <button className="text-[--val-primary-dark] text-[12px] font-semibold hover:opacity-75 transition-opacity text-left pt-1">
                Get Improvement Estimates →
              </button>
            </div>

            {/* Professional Appraisal */}
            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-val-heading">Professional Appraisal</h3>
                <TrendingUp className="w-4 h-4 text-slate-300" />
              </div>
              <p className="text-[13px] text-slate-500 leading-relaxed">
                Our estimates use public data. For refinancing or selling, a licensed appraisal is required.
              </p>
              <div className="flex flex-col divide-y divide-slate-100">
                {[
                  ["Licensed appraiser", "Verified"],
                  ["Report type", "Bank-acceptable"],
                  ["Turnaround", "3–5 business days"],
                  ["Starting at", "$350"],
                ].map(([label, val]) => (
                  <div key={label} className="flex items-center justify-between py-2.5">
                    <span className="text-[13px] text-slate-500">{label}</span>
                    <span className="text-[13px] font-semibold text-val-heading">{val}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <button
                  className="w-full py-2.5 text-white text-[14px] font-semibold rounded hover:opacity-90 active:scale-[0.97] transition-[opacity,transform] duration-150"
                  style={{
                    background: "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)",
                    boxShadow: "0 4px 6px -1px rgba(0,74,198,0.25), 0 2px 4px -2px rgba(0,74,198,0.15)",
                  }}
                >
                  Request Appraisal
                </button>
                <button className="w-full py-2 text-[13px] font-semibold text-slate-500 hover:text-val-heading transition-colors">
                  Learn More
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Financials Wizard */}
      <FinancialsUnlockMount
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        propertyId={property.id}
        startAt={wizardStartAt}
      />

      {/* Revoke confirmation dialog */}
      <Dialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mb-1">
              <Coins className="w-5 h-5 text-red-500" />
            </div>
            <DialogTitle>Revoke financials verification?</DialogTitle>
            <DialogDescription>
              The verified status will be cleared and linked documents will be unlinked. Your financial data is preserved and can be re-verified at any time.
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
    </PropertyLayout>
  );
}
