"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp, BarChart2, CheckCircle2, AlertCircle,
  ExternalLink, RefreshCw, MapPin, Calendar,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Property } from "@/lib/data/types/property";
import type { PropertyValuation } from "@/lib/data/types/property-valuation";
import type { PropertyComparable } from "@/lib/data/types/property-comparable";
import type { MarketSnapshot } from "@/lib/data/types/market-snapshot";
import { formatAcquiredLabel } from "@/lib/data/derivations/property-comparables";
import type { InvestmentPerformance } from "@/lib/data/derivations/property-financials";
import { PropertyLayout } from "@/components/property/PropertyLayout";

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
  label, value, sub, subColor, cta, ctaLabel,
  duration, active, mounted, reducedMotion, delay,
}: {
  label: string; value: string; sub?: string; subColor?: string;
  cta?: string; ctaLabel?: string; duration: number; active: boolean;
  mounted: boolean; reducedMotion: boolean; delay: number;
}) {
  const display = useCountUp(value, duration, active);
  return (
    <div
      className="bg-white rounded-lg border border-slate-200 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-col gap-2"
      style={fade(mounted, delay, reducedMotion)}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">{label}</p>
      <p className="text-[26px] font-bold text-val-heading leading-none">{display}</p>
      {sub && <p className="text-[13px]" style={{ color: subColor ?? "#64748b" }}>{sub}</p>}
      {cta && (
        <button
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
  comparables: PropertyComparable[];
  marketSnapshot: MarketSnapshot;
  investmentPerformance: InvestmentPerformance;
}

export function PropertyValuationPage({ property, valuations = [], comparables, marketSnapshot, investmentPerformance }: Props) {
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const sorted = [...valuations].sort((a, b) => a.recordedAt - b.recordedAt);
  const latest = sorted.at(-1) ?? null;
  const prev = sorted.at(-2) ?? null;
  const valueHistory = sorted.map((v) => ({ month: v.month, price: v.price }));

  const currentValueStr = latest ? "$" + latest.price.toLocaleString("en-US") : "$0";

  const qoqDelta = latest && prev ? latest.price - prev.price : null;
  const qoqStr =
    qoqDelta !== null
      ? qoqDelta >= 0
        ? `▲ +$${qoqDelta.toLocaleString("en-US")} since last quarter`
        : `▼ −$${Math.abs(qoqDelta).toLocaleString("en-US")} since last quarter`
      : "No prior record";
  const qoqColor =
    qoqDelta !== null ? (qoqDelta >= 0 ? "#059669" : "#dc2626") : "#64748b";

  const appreciation =
    latest && property.buyNumeric ? latest.price - property.buyNumeric : null;
  const appreciationStr =
    appreciation !== null ? "$" + Math.abs(appreciation).toLocaleString("en-US") : "$0";

  const appreciationPct =
    appreciation !== null && property.buyNumeric > 0
      ? (appreciation / property.buyNumeric) * 100
      : null;
  const purchaseDateLabel = property.purchaseDate
    ? new Date(property.purchaseDate).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : null;
  const appreciationLabel =
    appreciationPct !== null
      ? appreciationPct >= 0
        ? `${appreciationPct.toFixed(1)}% gain`
        : `${Math.abs(appreciationPct).toFixed(1)}% loss`
      : null;
  const appreciationSubStr =
    appreciationLabel !== null
      ? `${appreciationLabel}${purchaseDateLabel ? ` since purchase (${purchaseDateLabel})` : ""}`
      : "—";
  const appreciationSubColor =
    appreciation !== null ? (appreciation >= 0 ? "#059669" : "#dc2626") : "#64748b";

  const yourEstimateStr = latest ? "$" + latest.price.toLocaleString("en-US") : "—";

  const chartPrices = valueHistory.map((v) => v.price);
  const chartPriceMin = chartPrices.length > 0 ? Math.min(...chartPrices) : 0;
  const chartPriceMax = chartPrices.length > 0 ? Math.max(...chartPrices) : 1_000_000;
  const chartPad = Math.max((chartPriceMax - chartPriceMin) * 0.2, chartPriceMin * 0.03);
  const chartDomain: [number, number] = [
    Math.floor((chartPriceMin - chartPad) / 10_000) * 10_000,
    Math.ceil((chartPriceMax + chartPad) / 10_000) * 10_000,
  ];

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const active = mounted && !reducedMotion;

  return (
    <PropertyLayout activeTab="valuation" property={property}>
      <div className="bg-val-bg-page-alt min-h-full pb-10">
        <div className="max-w-[1200px] mx-auto px-8 pt-6 flex flex-col gap-5">

          {/* Page Header */}
          <div style={fade(mounted, 0, reducedMotion)}>
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-xs font-semibold tracking-widest uppercase text-[--val-primary-dark]">Valgate</span>
              <span className="text-xs text-slate-300">/</span>
              <span className="text-xs font-semibold tracking-widest uppercase text-slate-400">{property.name}</span>
              <span className="text-xs text-slate-300">/</span>
              <span className="text-xs font-semibold tracking-widest uppercase text-slate-400">Valuation</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <h1 className="text-4xl font-extrabold text-val-heading tracking-tight leading-10">Valuation</h1>
                <p className="text-slate-500 text-base mt-2">
                  Property value estimates and market comparables for {property.name}.
                </p>
              </div>
              <button
                className="px-5 py-2.5 text-white text-[14px] font-semibold rounded hover:opacity-90 active:scale-[0.97] transition-all duration-150 flex items-center gap-2"
                style={{
                  background: "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)",
                  boxShadow: "0 4px 6px -1px rgba(0,74,198,0.25), 0 2px 4px -2px rgba(0,74,198,0.15)",
                }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh Estimates
              </button>
            </div>
          </div>

          {/* KPI Row */}
          <div className="grid grid-cols-3 gap-4">
            <KpiCard
              label="Current Market Value"
              value={currentValueStr}
              sub={qoqStr}
              subColor={qoqColor}
              cta="Update Estimates"
              ctaLabel="Update value estimates"
              duration={1400}
              active={active}
              mounted={mounted}
              reducedMotion={reducedMotion}
              delay={80}
            />
            <KpiCard
              label="Market Rent Estimate"
              value="$2,850"
              sub="Your current: $2,650/mo · $200 upside"
              subColor="#059669"
              cta="View Rental"
              ctaLabel="View rental details"
              duration={900}
              active={active}
              mounted={mounted}
              reducedMotion={reducedMotion}
              delay={160}
            />
            <KpiCard
              label="Total Appreciation"
              value={appreciationStr}
              sub={appreciationSubStr}
              subColor={appreciationSubColor}
              cta="View Full History"
              ctaLabel="View full appreciation history"
              duration={1100}
              active={active}
              mounted={mounted}
              reducedMotion={reducedMotion}
              delay={240}
            />
          </div>

          {/* Value History + Market Insight */}
          <div className="grid grid-cols-12 gap-5" style={fade(mounted, 300, reducedMotion)}>

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
                <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">
                  No valuation history yet
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
                  <p className="text-[13px] font-semibold text-val-heading">{marketSnapshot.city}, Cambodia</p>
                </div>
              </div>

              <div className="bg-val-bg-tint rounded-lg px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-0.5">Local Comparables</p>
                <p className="text-[14px] font-bold text-[--val-primary-dark]">
                  {marketSnapshot.comparableCount > 0
                    ? `${marketSnapshot.comparableCount} propert${marketSnapshot.comparableCount === 1 ? "y" : "ies"} found nearby`
                    : "No comparables found"}
                </p>
                <p className="text-[12px] text-slate-500 mt-0.5">
                  {marketSnapshot.comparableCount > 0
                    ? `Avg. price/m² across nearby properties: $${marketSnapshot.avgPricePerM2.toLocaleString()}`
                    : "No nearby properties to compare against"}
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">Avg. Days on Market</p>
                  <p className="text-[18px] font-bold text-slate-400 leading-none">
                    — <span className="text-[12px] font-normal text-slate-400">days</span>
                  </p>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-slate-100" style={{ width: "0%" }} />
                </div>
                <p className="text-[11px] text-slate-400">Market signal not available</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">Inventory Level</p>
                  <p className="text-[13px] font-semibold text-slate-400">—</p>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex-1 h-2 rounded-sm bg-slate-100" />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">Buyer Demand</p>
                  <p className="text-[13px] font-semibold text-slate-400">—</p>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex-1 h-2 rounded-sm bg-slate-100" />
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
                  <p className="text-[12px] text-slate-400">
                    {comparables.length > 0
                      ? `${comparables.length} nearby propert${comparables.length === 1 ? "y" : "ies"} in your area`
                      : "No nearby properties found"}
                  </p>
                </div>
                <button className="px-4 py-2 bg-white border border-slate-200 rounded text-sm font-semibold text-val-heading hover:bg-slate-50 active:scale-[0.98] transition-all duration-150">
                  View Full Report
                </button>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Property</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Type</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Beds / Bath</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Area</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Market Value</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">Price/m²</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {comparables.slice(0, 6).map((c, i) => (
                    <tr
                      key={c.id}
                      className="border-t border-slate-100 hover:bg-blue-50/30 cursor-pointer transition-colors"
                      style={{ animationDelay: `${i * 25}ms` }}
                    >
                      <td className="px-5 py-3.5">
                        <p className="text-[14px] text-val-heading font-semibold">{c.name}</p>
                        <p className="text-[12px] text-slate-400">
                          {c.distanceKm.toFixed(1)} km · {formatAcquiredLabel(c.purchaseDate)}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-[14px] text-val-heading capitalize">{c.type}</p>
                        <p className="text-[12px] text-slate-400">{c.yearBuilt ? `Built ${c.yearBuilt}` : "—"}</p>
                      </td>
                      <td className="px-5 py-3.5 text-[14px] text-val-heading">
                        {c.bedrooms ?? "—"} / {c.bathrooms ?? "—"}
                      </td>
                      <td className="px-5 py-3.5 text-[14px] text-val-heading">
                        {c.totalAreaM2.toLocaleString()} m²
                      </td>
                      <td className="px-5 py-3.5 text-[14px] font-semibold text-val-heading">
                        ${c.currentMarketValue.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-[14px] text-slate-500">
                        ${c.pricePerM2.toLocaleString()}/m²
                      </td>
                      <td className="px-5 py-3.5">
                        <button className="text-[--val-primary-dark] text-[12px] font-semibold hover:opacity-75 transition-opacity flex items-center gap-1">
                          Details <ExternalLink className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {comparables.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-[13px] text-slate-400 italic text-center">
                        No comparable properties found within range
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="bg-slate-50/60 border-t border-slate-200 px-5 py-3">
                <p className="text-[12px] text-slate-500">
                  Average comp price:{" "}
                  <span className="text-val-heading font-semibold">
                    {marketSnapshot.comparableCount > 0
                      ? `$${marketSnapshot.avgComparableValue.toLocaleString()}`
                      : "—"}
                  </span>
                  <span className="mx-2 text-slate-300">·</span>
                  Your estimate: <span className="text-val-heading font-semibold">{yourEstimateStr}</span>
                  {marketSnapshot.comparableCount > 0 && marketSnapshot.pctVsAvgPricePerM2 !== 0 && (
                    <>
                      <span className="mx-2 text-slate-300">·</span>
                      <span className={marketSnapshot.pctVsAvgPricePerM2 >= 0 ? "text-emerald-600 font-semibold" : "text-amber-600 font-semibold"}>
                        {marketSnapshot.pctVsAvgPricePerM2 >= 0
                          ? `+${marketSnapshot.pctVsAvgPricePerM2.toFixed(1)}% vs comps`
                          : `${marketSnapshot.pctVsAvgPricePerM2.toFixed(1)}% vs comps`}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-3 gap-5" style={fade(mounted, 460, reducedMotion)}>

            {/* Investment Performance */}
            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-val-heading">Investment Performance</h3>
                <BarChart2 className="w-4 h-4 text-slate-300" />
              </div>
              <div className="flex flex-col divide-y divide-slate-100">
                {[
                  { label: "Cash-on-Cash Return", value: investmentPerformance.cashOnCash },
                  { label: "Cap Rate", value: investmentPerformance.capRate },
                  { label: "Total ROI (Since Purchase)", value: investmentPerformance.totalRoiPct },
                  { label: "Equity Gained", value: investmentPerformance.equityGained },
                ].map(({ label, value }) => (
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
                  className="w-full py-2.5 text-white text-[14px] font-semibold rounded hover:opacity-90 active:scale-[0.97] transition-all duration-150"
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
    </PropertyLayout>
  );
}
