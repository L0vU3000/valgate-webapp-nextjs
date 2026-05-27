"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type mapboxgl from "mapbox-gl";
import { PropertyDetailMap } from "@/components/map/PropertyDetailMap";
import type { Property } from "@/lib/data/types/property";
import type { LandParcel } from "@/lib/data/types/land-parcel";
import { PropertyLayout } from "@/components/property/PropertyLayout";
import { UnlockButton } from "@/components/feature-unlock/UnlockButton";
import { LocationUnlockMount } from "@/components/feature-unlock/pillars/LocationUnlock";
import type { UnlockState } from "@/components/feature-unlock/types";
import { revokeLocationVerification } from "@/lib/actions/properties.actions";
import { MapControls } from "@/components/map/MapControls";
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
  ArrowDown,
  ArrowUp,
  BadgeCheck,
  MoreHorizontal,
  Copy,
  Download,
  Map as MapIcon,
  MapPin,
  Maximize2,
} from "lucide-react";
import { cn } from "@/components/ui/utils";
import { PropertyMapExpandModal } from "@/components/map/PropertyMapExpandModal";
import type { PropertyComparable } from "@/lib/data/types/property-comparable";
import type { MarketSnapshot } from "@/lib/data/types/market-snapshot";
import { formatAcquiredLabel } from "@/lib/data/derivations/property-comparables";

export function PropertyLocationPage({
  property,
  landParcels,
  comparables,
  marketSnapshot,
}: {
  property: Property;
  landParcels: LandParcel[];
  comparables: PropertyComparable[];
  marketSnapshot: MarketSnapshot;
}) {
  const activeTab = "location";
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStartAt, setWizardStartAt] = useState<"data" | "verification">("data");
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const parcel = landParcels[0] ?? null;

  const unlockState: UnlockState = property.locationVerified
    ? { kind: "edit", entityId: property.id }
    : property.addressLine && property.city
      ? { kind: "verify", entityId: property.id }
      : { kind: "unlock" };

  function openWizard() {
    setWizardStartAt(unlockState.kind === "verify" ? "verification" : "data");
    setWizardOpen(true);
  }

  async function handleRevoke() {
    setRevoking(true);
    const result = await revokeLocationVerification(property.id);
    setRevoking(false);
    setRevokeOpen(false);
    if (result.ok) {
      toast.success("Location verification revoked");
    } else {
      toast.error(result.error ?? "Failed to revoke verification");
    }
  }

  return (
    <PropertyLayout
      activeTab={activeTab}
      property={property}
    >
      <div className="bg-val-bg-page-alt min-h-full">
        <div className="max-w-[1200px] mx-auto w-full flex flex-col min-h-full">
          <LocationContent
            property={property}
            parcel={parcel}
            unlockState={unlockState}
            openWizard={openWizard}
            onOpenRevoke={() => setRevokeOpen(true)}
            comparables={comparables}
            marketSnapshot={marketSnapshot}
          />
        </div>
      </div>

      {wizardOpen && (
        <LocationUnlockMount
          open
          onOpenChange={setWizardOpen}
          propertyId={property.id}
          startAt={wizardStartAt}
        />
      )}

      {revokeOpen && (
      <Dialog open onOpenChange={setRevokeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mb-1">
              <BadgeCheck className="w-5 h-5 text-red-500" />
            </div>
            <DialogTitle>Revoke location verification?</DialogTitle>
            <DialogDescription>
              The verified status will be removed from this property&apos;s location. Evidence documents will remain in your Documents tab. You can re-verify at any time.
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
      )}
    </PropertyLayout>
  );
}

// ── Address & Identity Card ───────────────────────────────────────────────────

function AddressIdentityCard({
  property,
  unlockState,
}: {
  property: Property;
  unlockState: UnlockState;
}) {
  const hasAddress = property.addressLine && property.city;

  function copyCoords() {
    navigator.clipboard.writeText(`${property.lat}, ${property.lng}`).then(() => {
      toast.success("Coordinates copied");
    });
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-4px_rgba(15,23,42,0.06)] animate-[fade-slide-up_0.45s_cubic-bezier(0.22,1,0.36,1)_both]"
      style={{ textWrap: "balance" }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--val-primary-dark)] via-blue-500 to-sky-400"
        aria-hidden
      />
      <div className="relative px-7 pb-6 pt-8">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 ring-1 ring-blue-100">
            <MapPin className="h-5 w-5 text-[var(--val-primary-dark)]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Street Address
            </p>
            {hasAddress ? (
              <div className="mt-2 space-y-1">
                <p className="text-[22px] font-bold leading-snug tracking-tight text-val-heading">
                  {property.addressLine}
                </p>
                {property.addressLine2 && (
                  <p className="text-[14px] text-slate-500">{property.addressLine2}</p>
                )}
                <p className="text-[15px] text-slate-600">
                  {[property.city, property.province, property.zip].filter(Boolean).join(", ")}
                </p>
                {property.country && (
                  <p className="text-[14px] text-slate-400">{property.country}</p>
                )}
              </div>
            ) : (
              <div className="mt-2">
                <p className="text-[15px] italic text-slate-400">No address on file</p>
                {unlockState.kind === "unlock" && (
                  <p className="mt-1 text-[12px] text-slate-400">
                    Use Unlock to add address data for this property.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px border-t border-slate-100 bg-slate-100 sm:grid-cols-4">
        <MetaCell label="Property" value={property.name || "—"} />
        <MetaCell label="Type">
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold capitalize text-[var(--val-primary-dark)]">
            {property.type || "—"}
          </span>
        </MetaCell>
        <MetaCell label="Title">
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
            {property.title || "—"}
          </span>
        </MetaCell>
        <MetaCell label="Coordinates" align="end">
          <button
            type="button"
            onClick={copyCoords}
            className="group inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-mono text-[11px] text-slate-600 tabular-nums transition-[color,box-shadow,border-color] duration-150 hover:border-slate-300 hover:text-val-heading hover:shadow-sm"
          >
            <span>
              {property.lat.toFixed(5)}, {property.lng.toFixed(5)}
            </span>
            <Copy className="h-3 w-3 opacity-40 transition-opacity group-hover:opacity-80" />
          </button>
        </MetaCell>
      </div>
    </div>
  );
}

function MetaCell({
  label,
  value,
  children,
  align = "start",
}: {
  label: string;
  value?: string;
  children?: ReactNode;
  align?: "start" | "end";
}) {
  return (
    <div
      className={`flex flex-col gap-1.5 bg-slate-50/80 px-5 py-4 ${align === "end" ? "items-end text-right" : ""}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{label}</p>
      {children ?? (
        <p className="text-[13px] font-semibold text-val-heading">{value}</p>
      )}
    </div>
  );
}

// ── Location page content ───────────────────────────────────────────────────────

function LocationContent({
  property,
  parcel,
  unlockState,
  openWizard,
  onOpenRevoke,
  comparables,
  marketSnapshot,
}: {
  property: Property;
  parcel: LandParcel | null;
  unlockState: UnlockState;
  openWizard: () => void;
  onOpenRevoke: () => void;
  comparables: PropertyComparable[];
  marketSnapshot: MarketSnapshot;
}) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapMounted, setMapMounted] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);

  useEffect(() => {
    setMapMounted(true);
  }, []);
  const propertyCenter: [number, number] = [property.lng, property.lat];
  const mapSubtitle = [property.addressLine, property.city].filter(Boolean).join(", ");

  return (
    <div className="flex flex-col">
      {/* Page header */}
      <div className="px-4 sm:px-8 pt-5 sm:pt-8 pb-0 animate-[fade-slide-up_0.4s_cubic-bezier(0.22,1,0.36,1)_both]">
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-xs font-semibold tracking-widest uppercase text-[--val-primary-dark]">Valgate</span>
          <span className="text-xs text-slate-300">/</span>
          <span className="text-xs font-semibold tracking-widest uppercase text-slate-400">Location</span>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[28px] sm:text-[40px] font-extrabold text-val-heading tracking-tight leading-tight sm:leading-10">
                Location &amp; Boundaries{" "}
                <span className="text-[--val-primary-dark]">{property.code}</span>
              </h1>
              {property.locationVerified && (
                <div className="mb-1 flex items-center gap-1">
                  <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[12px] font-semibold text-emerald-700">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Valgate Verified
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-52">
                      <DropdownMenuItem
                        className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-600"
                        onSelect={onOpenRevoke}
                      >
                        <BadgeCheck className="mr-2 h-4 w-4" />
                        Revoke verification
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
            <p className="mt-2 text-base text-slate-500">
              {property.type} · {property.province}, Cambodia
            </p>
          </div>
          <div className="shrink-0">
            <UnlockButton
              state={unlockState}
              onClick={openWizard}
              editLabel="Edit location"
            />
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="px-4 sm:px-8 py-5 sm:py-6 flex flex-col gap-4 sm:gap-5">
        {/* Address & Identity card */}
        <AddressIdentityCard
          property={property}
          unlockState={unlockState}
        />

        {/* Map */}
        {/* Mobile uses a shorter 240px map; tablet+ keeps the original 340px
            so the property's geographic context stays visible alongside the
            KPIs without dominating the fold on a phone. */}
        <div
          className="h-[240px] sm:h-[340px] rounded-xl overflow-hidden relative shrink-0 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)] animate-[fade-slide-up_0.45s_cubic-bezier(0.22,1,0.36,1)_both]"
          style={{ animationDelay: "60ms" }}
        >
          {mapMounted && (
            <PropertyDetailMap
              lat={property.lat}
              lng={property.lng}
              onLoad={() => setMapLoaded(true)}
              onMapReady={(map) => {
                mapRef.current = map;
              }}
              className="absolute inset-0"
            />
          )}

          {/* Map loading overlay */}
          <div
            className={cn(
              "absolute inset-0 z-50 flex flex-col items-center justify-center bg-white gap-3 transition-opacity duration-500",
              mapLoaded ? "opacity-0 pointer-events-none" : "opacity-100",
            )}
            onTransitionEnd={(e) => {
              if (e.propertyName === "opacity" && mapLoaded) {
                (e.currentTarget as HTMLElement).style.display = "none";
              }
            }}
          >
            <div className="flex items-center gap-2">
              <MapIcon className="size-5 text-[var(--val-primary-dark)] animate-pulse" />
              <span className="text-[13px] font-medium text-slate-500">Loading map…</span>
            </div>
            <div className="w-32 h-1 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-[var(--val-primary-dark)] rounded-full animate-[loading-bar_1.5s_ease-in-out_infinite]" />
            </div>
          </div>

          {mapLoaded && (
            <button
              type="button"
              onClick={() => setMapExpanded(true)}
              className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full border border-border/60 bg-background/90 px-3 py-1.5 text-[12px] font-semibold text-foreground shadow-sm backdrop-blur-md transition-[colors,transform] duration-150 hover:bg-background active:scale-95 animate-[fade-slide-down_0.35s_cubic-bezier(0.22,1,0.36,1)_both]"
              aria-label="Expand map"
            >
              <Maximize2 className="size-3" />
              Expand map
            </button>
          )}
          <MapControls
            mapRef={mapRef}
            resetCenter={propertyCenter}
            resetZoom={15}
          />
        </div>

        {mapExpanded && (
          <PropertyMapExpandModal
            lat={property.lat}
            lng={property.lng}
            title={`${property.name || property.code} — Location`}
            subtitle={mapSubtitle || undefined}
            onClose={() => setMapExpanded(false)}
          />
        )}

        {/* KPI row */}
        <div className="grid grid-cols-1 xs:grid-cols-3 gap-3 sm:gap-4">
          {/* Total Land Size */}
          <div
            className="bg-white rounded-lg border border-slate-200 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 animate-[fade-slide-up_0.45s_cubic-bezier(0.22,1,0.36,1)_both]"
            style={{ animationDelay: "100ms" }}
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">
              Total Land Size
            </span>
            <p className="text-[24px] font-bold text-val-heading leading-none mt-2 mb-1">
              {parcel != null ? <>{parcel.sizeM2.toLocaleString()} m<sup>2</sup></> : "—"}
            </p>
            {parcel != null && (
              <p className="text-xs text-slate-400">{(parcel.sizeM2 / 10000).toFixed(3)} hectares</p>
            )}
            {parcel != null && (
              <div className="flex gap-6 mt-3 pt-3 border-t border-slate-100">
                <div>
                  <p className="text-[11px] text-slate-400">Width</p>
                  <p className="text-[15px] font-semibold text-val-heading">
                    {parcel.widthM != null ? `${parcel.widthM}m` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">Length</p>
                  <p className="text-[15px] font-semibold text-val-heading">
                    {parcel.lengthM != null ? `${parcel.lengthM}m` : "—"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Current Zoning */}
          <div
            className="bg-white rounded-lg border border-slate-200 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 animate-[fade-slide-up_0.45s_cubic-bezier(0.22,1,0.36,1)_both]"
            style={{ animationDelay: "180ms" }}
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">
              Current Zoning
            </span>
            <p className="text-[24px] font-bold text-val-heading leading-none mt-2 mb-1">
              {parcel?.zoningClass ?? "—"}
            </p>
            {parcel?.zoningCode != null && (
              <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                {parcel.zoningCode} Classification
              </span>
            )}
            {parcel?.developmentPotential != null && parcel.developmentPotential.length > 0 && (
              <div className="mt-2 space-y-0.5">
                <p className="text-xs text-slate-500">Development Potential</p>
                {parcel.developmentPotential.map((b) => (
                  <p key={b} className="text-xs text-slate-500">{b}</p>
                ))}
              </div>
            )}
          </div>

          {/* Elevation Range */}
          <div
            className="bg-white rounded-lg border border-slate-200 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 animate-[fade-slide-up_0.45s_cubic-bezier(0.22,1,0.36,1)_both]"
            style={{ animationDelay: "260ms" }}
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">
              Elevation Range
            </span>
            <p className="text-[24px] font-bold text-val-heading leading-none mt-2 mb-1">
              {parcel?.elevationM != null ? `${parcel.elevationM}m` : "—"}
            </p>
            {parcel?.elevationM != null && (
              <p className="text-xs text-slate-400">Above sea level</p>
            )}
            {parcel != null && (
              <div className="flex gap-6 mt-3 pt-3 border-t border-slate-100">
                <div>
                  <p className="text-[11px] text-slate-400">Slope</p>
                  <p className="text-[15px] font-semibold text-val-heading">
                    {parcel.slopeAngleDeg != null ? `${parcel.slopeAngleDeg}°` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">Terrain</p>
                  <p className="text-[15px] font-semibold text-val-heading">
                    {parcel.terrainType ?? "—"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom section: comparables + investment */}
        <div
          className="grid grid-cols-1 lg:grid-cols-12 gap-4 animate-[fade-slide-up_0.45s_cubic-bezier(0.22,1,0.36,1)_both]"
          style={{ animationDelay: "340ms" }}
        >
          {/* Comparable Properties table */}
          <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="px-5 py-4 flex items-start justify-between border-b border-slate-100">
              <div>
                <p className="text-base font-bold text-val-heading">Comparable Properties</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {comparables.length > 0
                    ? `${comparables.length} nearby propert${comparables.length === 1 ? "y" : "ies"} in your area`
                    : "No nearby properties found"}
                </p>
              </div>
              <button className="flex items-center gap-1.5 text-[13px] font-medium text-[--val-primary-dark] hover:opacity-80 transition-opacity">
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  {["Property", "Distance", "Type", "Price/m²"].map((h) => (
                    <th
                      key={h}
                      className="px-2 sm:px-4 py-3 text-left text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparables.slice(0, 4).map((row, i) => (
                  <tr
                    key={row.id}
                    className="border-t border-slate-100 hover:bg-blue-50/30 transition-colors"
                    style={{ animationDelay: `${i * 25}ms` }}
                  >
                    <td className="px-2 sm:px-4 py-3 sm:py-3.5 text-[12px] sm:text-[14px] text-val-heading font-medium">{row.name}</td>
                    <td className="px-2 sm:px-4 py-3 sm:py-3.5 text-[12px] sm:text-[14px] text-val-heading">{row.distanceKm.toFixed(1)} km</td>
                    <td className="px-2 sm:px-4 py-3 sm:py-3.5 text-[12px] sm:text-[14px] text-val-heading capitalize">{row.type}</td>
                    <td className="px-2 sm:px-4 py-3 sm:py-3.5 text-[12px] sm:text-[14px] text-val-heading">${row.pricePerM2.toLocaleString()}/m²</td>
                  </tr>
                ))}
                {comparables.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-[13px] text-slate-400 italic text-center">
                      No comparable properties found within range
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="bg-slate-50/60 border-t border-slate-200 px-4 py-3 flex items-center gap-4 text-[13px] text-slate-500">
              <span>
                Avg comp price:{" "}
                <span className="font-semibold text-val-heading">
                  {marketSnapshot.comparableCount > 0
                    ? `$${marketSnapshot.avgComparableValue.toLocaleString()}`
                    : "—"}
                </span>
              </span>
              <span className="text-slate-300">·</span>
              <span>
                Estimated value:{" "}
                <span className="font-semibold text-val-heading">
                  {marketSnapshot.estimatedValue != null
                    ? `$${marketSnapshot.estimatedValue.toLocaleString()}`
                    : "—"}
                </span>
              </span>
            </div>
          </div>

          {/* Investment Metrics card */}
          <div className="lg:col-span-5 bg-white rounded-lg border border-slate-200 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <p className="text-base font-bold text-val-heading mb-4">Investment Metrics</p>

            <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">
              Price per m²
            </span>
            <p className="text-[30px] font-bold text-val-heading leading-none mt-1">
              {marketSnapshot.targetPricePerM2 > 0
                ? `$${marketSnapshot.targetPricePerM2.toLocaleString()}`
                : "—"}
            </p>
            <div className="flex items-center gap-2 mt-2 mb-5">
              {marketSnapshot.comparableCount > 0 && marketSnapshot.targetPricePerM2 > 0 ? (
                <>
                  <span
                    className={`inline-flex items-center gap-1 text-[12px] font-semibold px-2.5 py-0.5 rounded-full ${
                      marketSnapshot.pctVsAvgPricePerM2 >= 0
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {marketSnapshot.pctVsAvgPricePerM2 >= 0 ? (
                      <ArrowUp className="w-3 h-3" />
                    ) : (
                      <ArrowDown className="w-3 h-3" />
                    )}
                    {marketSnapshot.pctVsAvgPricePerM2 >= 0
                      ? `+${marketSnapshot.pctVsAvgPricePerM2.toFixed(1)}%`
                      : `${marketSnapshot.pctVsAvgPricePerM2.toFixed(1)}%`}
                  </span>
                  <span className="text-[12px] text-slate-400">vs. avg area price</span>
                </>
              ) : (
                <span className="text-[12px] text-slate-400">No area comparables</span>
              )}
            </div>

            <div className="space-y-3 border-t border-slate-100 pt-4">
              {comparables.slice(0, 3).map((c) => (
                <div key={c.id} className="flex items-center justify-between text-[13px]">
                  <div>
                    <p className="font-medium text-val-heading">{c.totalAreaM2.toLocaleString()} m²</p>
                    <p className="text-slate-400 text-[12px]">
                      {c.distanceKm.toFixed(1)} km away · {formatAcquiredLabel(c.purchaseDate)}
                    </p>
                  </div>
                  <span className="font-semibold text-val-heading">${c.pricePerM2.toLocaleString()}/m²</span>
                </div>
              ))}
              {comparables.length === 0 && (
                <p className="text-[13px] text-slate-400 italic">No nearby properties found</p>
              )}
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
