"use client";

import { useState } from "react";
import type { Property } from "@/lib/data/types/property";
import { PropertyLayout } from "@/components/property/PropertyLayout";
import {
  ZoomIn,
  ZoomOut,
  Minus,
  Plus,
  Box,
  Ruler,
  Maximize2,
  Compass,
  Scan,
  MapPin,
  Download,
  ArrowUp,
} from "lucide-react";

type ViewMode = "default" | "expanded" | "full";

export function PropertyLocationPage({ property }: { property: Property }) {
  const activeTab = "location";
  const [viewMode, setViewMode] = useState<ViewMode>("full");
  const [activeInfoTab, setActiveInfoTab] = useState("Zoning");
  const [satelliteView, setSatelliteView] = useState(true);
  const [terrain, setTerrain] = useState(true);
  const [boundaries, setBoundaries] = useState(true);
  const [labels, setLabels] = useState(true);
  const [showLegend, setShowLegend] = useState(true);

  return (
    <PropertyLayout activeTab={activeTab} property={property}>
      <div className={`bg-val-bg-page-alt ${viewMode === "full" ? "min-h-full" : "h-full"}`}>
      <div className={`max-w-[1200px] mx-auto w-full flex flex-col ${viewMode === "full" ? "min-h-full" : "h-full"}`}>
        {viewMode === "full" ? (
          <FullView
            viewMode={viewMode}
            setViewMode={setViewMode}
            showLegend={showLegend}
            setShowLegend={setShowLegend}
            property={property}
          />
        ) : viewMode === "expanded" ? (
          <ExpandedView
            viewMode={viewMode}
            setViewMode={setViewMode}
            showLegend={showLegend}
            setShowLegend={setShowLegend}
            activeInfoTab={activeInfoTab}
            setActiveInfoTab={setActiveInfoTab}
          />
        ) : (
          <DefaultView
            viewMode={viewMode}
            setViewMode={setViewMode}
            showLegend={showLegend}
            setShowLegend={setShowLegend}
            satelliteView={satelliteView}
            setSatelliteView={setSatelliteView}
            terrain={terrain}
            setTerrain={setTerrain}
            boundaries={boundaries}
            setBoundaries={setBoundaries}
            labels={labels}
            setLabels={setLabels}
          />
        )}
      </div>
      </div>
    </PropertyLayout>
  );
}

function MapPlaceholder() {
  return (
    <div className="w-full h-full bg-[#1a1d2e] flex flex-col items-center justify-center relative">
      <Box className="w-14 h-14 text-[#515D66] mb-3" />
      <p className="text-[18px] font-semibold text-[#8591A0]">3D Aerial View</p>
      <p className="text-[13px] text-[#515D66] mt-1">Interactive terrain scan — Full immersive mode</p>
    </div>
  );
}

function BorderLegend({
  showLegend,
  setShowLegend,
  compact = false,
}: {
  showLegend: boolean;
  setShowLegend: (v: boolean) => void;
  compact?: boolean;
}) {
  if (!showLegend && compact) {
    return (
      <button
        onClick={() => setShowLegend(true)}
        className="bg-white rounded-xl p-2.5 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.08)] hover:shadow-md transition-all duration-200"
      >
        <Plus className="w-4 h-4 text-slate-500" />
      </button>
    );
  }
  return (
    <div className="bg-white rounded-xl p-4 w-[192px] shadow-[0px_1px_4px_0px_rgba(18,28,40,0.08)]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[--val-primary-dark]">
          Border Legend
        </span>
        <button
          onClick={() => setShowLegend(!showLegend)}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-0.5 rounded-full bg-[--val-primary-dark]" />
          <span className="text-[13px] text-val-heading">Property Line</span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-0.5 rounded-full bg-rose-500" />
          <span className="text-[13px] text-val-heading">Easement</span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-0.5 rounded-full bg-amber-400" />
          <span className="text-[13px] text-val-heading">Setback Zone</span>
        </div>
      </div>
    </div>
  );
}

function ZoomControls() {
  return (
    <div className="flex flex-col gap-1.5">
      <button className="bg-white rounded-xl p-2 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.08)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
        <ZoomIn className="w-5 h-5 text-slate-500" />
      </button>
      <button className="bg-white rounded-xl p-2 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.08)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
        <ZoomOut className="w-5 h-5 text-slate-500" />
      </button>
    </div>
  );
}

function LayerToggle({
  label,
  enabled,
  onChange,
}: {
  label: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-val-heading">{label}</span>
      <button
        onClick={() => onChange(!enabled)}
        className={`w-9 h-5 rounded-full transition-colors duration-200 relative ${
          enabled ? "bg-[--val-primary-dark]" : "bg-slate-200"
        }`}
      >
        <div
          className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform duration-200 shadow-sm ${
            enabled ? "translate-x-[18px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

const kpiData = [
  {
    label: "Total Land Size",
    value: (
      <>
        2,450 m<sup>2</sup>
      </>
    ),
    sub: "0.245 hectares",
    extras: [
      { label: "Width", value: "45.2m" },
      { label: "Length", value: "54.3m" },
    ],
  },
  {
    label: "Current Zoning",
    value: "Agricultural Zone",
    sub: null,
    badge: { text: "A-2 Classification", color: "bg-emerald-50 text-emerald-700" },
    bullets: ["Development Potential", "Residential Subdivision", "Up to 6 units"],
  },
  {
    label: "Elevation Range",
    value: "125m",
    sub: "Above sea level",
    extras: [
      { label: "Slope", value: "2.5°" },
      { label: "Terrain", value: "Flat" },
    ],
  },
];

const comparables = [
  { corner: "Northeast", lat: "11.5564°N", lng: "104.9282°E", bearing: "45°" },
  { corner: "Southeast", lat: "11.5512°N", lng: "104.9301°E", bearing: "135°" },
  { corner: "Southwest", lat: "11.5488°N", lng: "104.9256°E", bearing: "225°" },
  { corner: "Northwest", lat: "11.5540°N", lng: "104.9238°E", bearing: "315°" },
];

const compSales = [
  { area: "2,380 m² nearby", dist: "0.3 km away", time: "2 months ago", price: "$238/m²" },
  { area: "2,650 m² nearby", dist: "0.5 km away", time: "4 months ago", price: "$252/m²" },
  { area: "2,100 m² nearby", dist: "0.8 km away", time: "5 months ago", price: "$229/m²" },
];

function FullView({
  viewMode,
  setViewMode,
  showLegend,
  setShowLegend,
  property,
}: {
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  showLegend: boolean;
  setShowLegend: (v: boolean) => void;
  property: import("@/lib/data/types/property").Property;
}) {
  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-8 pt-8 pb-0 animate-[fade-slide-up_0.4s_cubic-bezier(0.22,1,0.36,1)_both]">
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-xs font-semibold tracking-widest uppercase text-[--val-primary-dark]">Valgate</span>
          <span className="text-xs text-slate-300">/</span>
          <span className="text-xs font-semibold tracking-widest uppercase text-slate-400">Location</span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-4xl font-extrabold text-val-heading tracking-tight leading-10">
              Location &amp; Boundaries{" "}
              <span className="text-[--val-primary-dark]">{property.code}</span>
            </h1>
            <p className="text-slate-500 text-base mt-2">{property.type} · {property.province}, Cambodia</p>
          </div>
          <button
            onClick={() => setViewMode("expanded")}
            className="px-5 py-2.5 text-white text-[14px] font-semibold rounded hover:opacity-90 active:scale-[0.97] transition-all duration-150"
            style={{
              background: "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)",
              boxShadow: "0 4px 6px -1px rgba(0,74,198,0.25), 0 2px 4px -2px rgba(0,74,198,0.15)",
            }}
          >
            Full Screen View
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="px-8 py-6 flex flex-col gap-5">
        {/* Map */}
        <div
          className="h-[340px] rounded-xl overflow-hidden relative shrink-0 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)] animate-[fade-slide-up_0.45s_cubic-bezier(0.22,1,0.36,1)_both]"
          style={{ animationDelay: "60ms" }}
        >
          <MapPlaceholder />
          <div className="absolute top-4 right-4 flex gap-3">
            <ZoomControls />
            <BorderLegend showLegend={showLegend} setShowLegend={setShowLegend} compact />
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-3 gap-4">
          {kpiData.map((kpi, i) => (
            <div
              key={kpi.label}
              className="bg-white rounded-lg border border-slate-200 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 animate-[fade-slide-up_0.45s_cubic-bezier(0.22,1,0.36,1)_both]"
              style={{ animationDelay: `${100 + i * 80}ms` }}
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                {kpi.label}
              </span>
              <p className="text-[24px] font-bold text-val-heading leading-none mt-2 mb-1">{kpi.value}</p>
              {kpi.sub && <p className="text-xs text-slate-400">{kpi.sub}</p>}
              {"badge" in kpi && kpi.badge && (
                <span
                  className={`inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${kpi.badge.color}`}
                >
                  {kpi.badge.text}
                </span>
              )}
              {"bullets" in kpi && kpi.bullets && (
                <div className="mt-2 space-y-0.5">
                  {kpi.bullets.map((b) => (
                    <p key={b} className="text-xs text-slate-500">{b}</p>
                  ))}
                </div>
              )}
              {"extras" in kpi && kpi.extras && (
                <div className="flex gap-6 mt-3 pt-3 border-t border-slate-100">
                  {kpi.extras.map((e) => (
                    <div key={e.label}>
                      <p className="text-[11px] text-slate-400">{e.label}</p>
                      <p className="text-[15px] font-semibold text-val-heading">{e.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom section: comparables + investment */}
        <div
          className="grid grid-cols-12 gap-4 animate-[fade-slide-up_0.45s_cubic-bezier(0.22,1,0.36,1)_both]"
          style={{ animationDelay: "340ms" }}
        >
          {/* Comparable Properties table */}
          <div className="col-span-7 bg-white rounded-lg border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="px-5 py-4 flex items-start justify-between border-b border-slate-100">
              <div>
                <p className="text-base font-bold text-val-heading">Comparable Properties</p>
                <p className="text-xs text-slate-400 mt-0.5">Properties similar to yours sold recently</p>
              </div>
              <button className="flex items-center gap-1.5 text-[13px] font-medium text-[--val-primary-dark] hover:opacity-80 transition-opacity">
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  {["Corner", "Latitude", "Longitude", "Bearing"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparables.map((row, i) => (
                  <tr
                    key={i}
                    className="border-t border-slate-100 hover:bg-blue-50/30 transition-colors"
                    style={{ animationDelay: `${i * 25}ms` }}
                  >
                    <td className="px-4 py-3.5 text-[14px] text-val-heading font-medium">{row.corner}</td>
                    <td className="px-4 py-3.5 text-[14px] text-val-heading">{row.lat}</td>
                    <td className="px-4 py-3.5 text-[14px] text-val-heading">{row.lng}</td>
                    <td className="px-4 py-3.5 text-[14px] text-val-heading">{row.bearing}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="bg-slate-50/60 border-t border-slate-200 px-4 py-3 flex items-center gap-4 text-[13px] text-slate-500">
              <span>
                Avg comp price:{" "}
                <span className="font-semibold text-val-heading">$492,100</span>
              </span>
              <span className="text-slate-300">·</span>
              <span>
                Estimated value:{" "}
                <span className="font-semibold text-val-heading">$485,000</span>
              </span>
            </div>
          </div>

          {/* Investment Metrics card */}
          <div className="col-span-5 bg-white rounded-lg border border-slate-200 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <p className="text-base font-bold text-val-heading mb-4">Investment Metrics</p>

            <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">
              Price per m²
            </span>
            <p className="text-[30px] font-bold text-val-heading leading-none mt-1">$245</p>
            <div className="flex items-center gap-2 mt-2 mb-5">
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[12px] font-semibold px-2.5 py-0.5 rounded-full">
                <ArrowUp className="w-3 h-3" />
                +12%
              </span>
              <span className="text-[12px] text-slate-400">vs. avg area price</span>
            </div>

            <div className="space-y-3 border-t border-slate-100 pt-4">
              {compSales.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-[13px]">
                  <div>
                    <p className="font-medium text-val-heading">{c.area}</p>
                    <p className="text-slate-400 text-[12px]">
                      {c.dist} · {c.time}
                    </p>
                  </div>
                  <span className="font-semibold text-val-heading">{c.price}</span>
                </div>
              ))}
            </div>

            <button className="text-[13px] font-medium text-[--val-primary-dark] mt-4 hover:opacity-80 transition-opacity">
              View all comparables →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExpandedView({
  viewMode,
  setViewMode,
  showLegend,
  setShowLegend,
  activeInfoTab,
  setActiveInfoTab,
}: {
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  showLegend: boolean;
  setShowLegend: (v: boolean) => void;
  activeInfoTab: string;
  setActiveInfoTab: (v: string) => void;
}) {
  const infoTabs = ["Measurements", "Zoning", "Boundaries", "Investment"];
  return (
    <div className="flex flex-col h-full">
      {/* Map */}
      <div className="relative flex-1 min-h-[400px]">
        <MapPlaceholder />
        <div className="absolute top-4 right-4 flex gap-3">
          <ZoomControls />
          <BorderLegend showLegend={showLegend} setShowLegend={setShowLegend} compact />
        </div>
      </div>

      {/* Bottom panel */}
      <div className="bg-white border-t border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-8">
            {[
              { label: "Total Area", value: <>2,450 m<sup>2</sup></> },
              { label: "Zoning", value: "Agricultural" },
              { label: "Elevation", value: "125m" },
              { label: "Price/m²", value: "$245" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">
                  {stat.label}
                </p>
                <p className="text-[22px] font-bold text-val-heading leading-tight">{stat.value}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => setViewMode("full")}
            className="text-slate-400 hover:text-val-heading transition-colors"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-6 border-b border-slate-200 mb-4">
          {infoTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveInfoTab(tab)}
              className={`pb-2.5 text-[14px] font-medium border-b-2 transition-colors ${
                activeInfoTab === tab
                  ? "border-[--val-primary-dark] text-val-heading"
                  : "border-transparent text-slate-500 hover:text-val-heading"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeInfoTab === "Zoning" && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-1">
                  Current Zoning
                </p>
                <p className="text-[18px] font-bold text-val-heading">Agricultural Zone</p>
              </div>
              <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[12px] font-semibold">
                A-2 Classification
              </span>
              <div className="text-[13px] text-slate-500 space-y-0.5">
                <p>Development Potential</p>
                <p>Residential Subdivision</p>
                <p>Up to 6 units permitted</p>
              </div>
            </div>
            <button
              onClick={() => setViewMode("full")}
              className="px-4 py-2 text-white text-[14px] font-semibold rounded hover:opacity-90 active:scale-[0.97] transition-all duration-150"
              style={{
                background: "linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)",
                boxShadow: "0 4px 6px -1px rgba(0,74,198,0.25), 0 2px 4px -2px rgba(0,74,198,0.15)",
              }}
            >
              Full Details
            </button>
          </div>
        )}
        {activeInfoTab === "Measurements" && (
          <div className="flex gap-10">
            {[
              { label: "Width", value: "45.2m" },
              { label: "Length", value: "54.3m" },
              { label: "Slope", value: "2.5°" },
              { label: "Terrain", value: "Flat" },
            ].map((m) => (
              <div key={m.label}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">{m.label}</p>
                <p className="text-[18px] font-bold text-val-heading">{m.value}</p>
              </div>
            ))}
          </div>
        )}
        {activeInfoTab === "Investment" && (
          <div className="flex items-center gap-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-1">Price per m²</p>
              <p className="text-[22px] font-bold text-val-heading">$245</p>
            </div>
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[12px] font-semibold px-2.5 py-1 rounded-full">
              <ArrowUp className="w-3 h-3" />
              +12% vs avg area
            </span>
          </div>
        )}
        {activeInfoTab === "Boundaries" && (
          <div className="flex gap-8">
            {[
              { label: "Property Line", color: "bg-[--val-primary-dark]" },
              { label: "Easement", color: "bg-rose-500" },
              { label: "Setback Zone", color: "bg-amber-400" },
            ].map((b) => (
              <div key={b.label} className="flex items-center gap-2.5">
                <div className={`w-6 h-0.5 rounded-full ${b.color}`} />
                <span className="text-[13px] font-medium text-val-heading">{b.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DefaultView({
  viewMode,
  setViewMode,
  showLegend,
  setShowLegend,
  satelliteView,
  setSatelliteView,
  terrain,
  setTerrain,
  boundaries,
  setBoundaries,
  labels,
  setLabels,
}: {
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  showLegend: boolean;
  setShowLegend: (v: boolean) => void;
  satelliteView: boolean;
  setSatelliteView: (v: boolean) => void;
  terrain: boolean;
  setTerrain: (v: boolean) => void;
  boundaries: boolean;
  setBoundaries: (v: boolean) => void;
  labels: boolean;
  setLabels: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Map */}
      <div className="relative flex-1">
        <MapPlaceholder />
        <div className="absolute top-4 right-4 flex gap-3">
          <ZoomControls />
          <div className="flex flex-col gap-3">
            <BorderLegend showLegend={showLegend} setShowLegend={setShowLegend} />
            <div className="bg-white rounded-xl p-4 w-[192px] shadow-[0px_1px_4px_0px_rgba(18,28,40,0.08)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[--val-primary-dark] mb-3">
                Layers
              </p>
              <div className="space-y-3">
                <LayerToggle label="Satellite View" enabled={satelliteView} onChange={setSatelliteView} />
                <LayerToggle label="Terrain" enabled={terrain} onChange={setTerrain} />
                <LayerToggle label="Boundaries" enabled={boundaries} onChange={setBoundaries} />
                <LayerToggle label="Labels" enabled={labels} onChange={setLabels} />
              </div>

              <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[--val-primary-dark] mt-4 mb-3">
                Tools
              </p>
              <div className="space-y-1.5">
                {[
                  { icon: Ruler, label: "Measure Distance" },
                  { icon: Scan, label: "Measure Area" },
                  { icon: MapPin, label: "Drop Pin" },
                  { icon: Compass, label: "Reset View" },
                ].map(({ icon: Icon, label }) => (
                  <button
                    key={label}
                    className="flex items-center gap-2 text-[13px] text-val-heading hover:bg-slate-50 w-full px-2 py-1.5 rounded-lg transition-colors duration-150"
                  >
                    <Icon className="w-3.5 h-3.5 text-[--val-primary-dark]" />
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100">
                <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[--val-primary-dark] mb-2">
                  Property
                </p>
                <p className="text-[14px] font-bold text-val-heading">SR00015 Land</p>
                <p className="text-[12px] text-slate-400">Siem Reap, Cambodia</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex gap-8">
          {[
            { label: "Total Area", value: <>2,450 m<sup>2</sup></> },
            { label: "Zoning", value: "Agricultural" },
            { label: "Elevation", value: "125m" },
            { label: "Price/m²", value: "$245" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">{stat.label}</p>
              <p className="text-[22px] font-bold text-val-heading leading-tight">{stat.value}</p>
            </div>
          ))}
        </div>
        <button
          onClick={() => setViewMode("expanded")}
          className="text-slate-400 hover:text-val-heading transition-colors"
        >
          <Maximize2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
