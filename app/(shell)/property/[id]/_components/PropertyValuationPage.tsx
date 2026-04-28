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
import type { Property } from "@/lib/mock-data";
import { PropertyLayout } from "@/components/property/PropertyLayout";

const valueHistory = [
  { month: "Jan", price: 380000 },
  { month: "Feb", price: 400000 },
  { month: "Mar", price: 420000 },
  { month: "Apr", price: 410000 },
  { month: "May", price: 440000 },
  { month: "Jun", price: 460000 },
  { month: "Jul", price: 485000 },
  { month: "Aug", price: 470000 },
  { month: "Sep", price: 465000 },
  { month: "Oct", price: 475000 },
  { month: "Nov", price: 480000 },
  { month: "Dec", price: 485000 },
];

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

export function PropertyValuationPage({ property }: { property: Property }) {
  const [mounted, setMounted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

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
              value="$485,000"
              sub="▲ +$18,500 since last quarter"
              subColor="#059669"
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
              value="$112,500"
              sub="30.2% gain since purchase (Dec 2019)"
              subColor="#059669"
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
                    tickFormatter={(v) => `$${v / 1000}k`}
                    axisLine={false}
                    tickLine={false}
                    domain={[340000, 520000]}
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
            </div>

            {/* Market Insight */}
            <div className="col-span-5 bg-white rounded-lg border border-slate-200 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-col gap-5">
              <div>
                <h3 className="text-base font-bold text-val-heading mb-1.5">Market Insight</h3>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <p className="text-[13px] font-semibold text-val-heading">Phnom Penh, Cambodia</p>
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
                <button className="px-4 py-2 bg-white border border-slate-200 rounded text-sm font-semibold text-val-heading hover:bg-slate-50 active:scale-[0.98] transition-all duration-150">
                  View Full Report
                </button>
              </div>
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
              <div className="bg-slate-50/60 border-t border-slate-200 px-5 py-3">
                <p className="text-[12px] text-slate-500">
                  Average comp price: <span className="text-val-heading font-semibold">$492,000</span>
                  <span className="mx-2 text-slate-300">·</span>
                  Your estimate: <span className="text-val-heading font-semibold">$485,000</span>
                  <span className="mx-2 text-slate-300">·</span>
                  <span className="text-amber-600 font-semibold">1.4% below comps</span>
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
