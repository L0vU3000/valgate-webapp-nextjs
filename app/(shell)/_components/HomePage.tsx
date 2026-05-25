"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useShellContext } from "@/components/layout/shell-context";
import {
  X,
  ChevronUp,
  BarChart2,
  Map as MapIcon,
  Users,
  Search,
  Plus,
  FileText,
  Command as CommandIcon,
  ArrowUpRight,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageWithFallback } from "@/components/figma/ImageWithFallback";
import { cn } from "@/components/ui/utils";
import { useIsMobile } from "@/components/ui/use-mobile";
import { progressClass, progressBgClass, titleToVariant } from "@/lib/property-helpers";
import type { HomeProperty, TitleVariant, PortfolioStats } from "@/app/(shell)/queries";
import type { Document } from "@/lib/data/types/document";
import { formatCurrency, formatDate } from "@/lib/format";
import { CommandPalette } from "@/components/home/CommandPalette";
import { PropertyTable } from "@/components/portfolio/PropertyTable";
import type { TableAnimationConfig } from "@/components/portfolio/PropertyTable";
import { PortfolioLegend } from "./PortfolioLegend";
import type mapboxgl from "mapbox-gl";

const MapView = dynamic(
  () => import("@/components/map/MapView").then((m) => m.MapView),
  { ssr: false },
);

const MapControls = dynamic(
  () => import("@/components/map/MapControls").then((m) => ({ default: m.MapControls })),
  { ssr: false },
);

const titleClasses: Record<TitleVariant, string> = {
  hard: "text-interactive-primary",
  soft: "text-status-warning-text",
  none: "text-secondary",
};

const HOME_TABLE_ANIMATION: TableAnimationConfig = {
  containerDuration: 250,
  containerDelay: 0,
  rowDuration: 300,
  rowStagger: 15,
  progressBarDelay: 80,
  progressBarStagger: 20,
};

const triggerPlaceholders = [
  "Search properties, documents, tenants...",
  "Find: Phnom Penh land plots",
  "Find: Q1 2026 valuation report",
  "Find: Hard title properties",
  "Find: Vacant properties in Siem Reap",
];


export function HomePage({ initialProperties, portfolioStats, documents }: { initialProperties: HomeProperty[]; portfolioStats: PortfolioStats; documents: Document[] }) {

  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [closingKey, setClosingKey] = useState<string | null>(null);
  const [hoveredProperty, setHoveredProperty] = useState<string | null>(null);
  const [tableOpen, setTableOpen] = useState(false);
  const [tableOpenCount, setTableOpenCount] = useState(0);
  const [commandOpen, setCommandOpen] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [placeholderVisible, setPlaceholderVisible] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isSatellite, setIsSatellite] = useState(false);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const router = useRouter();

  // The selected-property drawer floats on the right edge on desktop but
  // pushes up from the bottom on mobile, so the search bar/legend's
  // `right: 20rem` offset is only meaningful at tablet+ widths. We use
  // this hook to gate the offset on mobile.
  const isMobile = useIsMobile();

  // Cmd+K / Ctrl+K to open command palette
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setPlaceholderVisible(false);
      setTimeout(() => {
        setPlaceholderIdx((i) => (i + 1) % triggerPlaceholders.length);
        setPlaceholderVisible(true);
      }, 220);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (tableOpen) setTableOpenCount((n) => n + 1);
  }, [tableOpen]);

  const runCommand = useCallback((command: () => void) => {
    setCommandOpen(false);
    command();
  }, []);

  const selectedProperty = selectedPin
    ? initialProperties.find((p) => p.id === selectedPin)
    : null;

  // Keep drawer visible during exit animation
  const drawerProperty =
    selectedProperty ??
    (closingKey ? initialProperties.find((p) => p.id === closingKey) : null);
  const isDrawerClosing = !selectedProperty && closingKey !== null;

  const closeDrawer = useCallback(() => {
    const pin = selectedPin;
    if (!pin) return;
    setClosingKey(pin);
    setSelectedPin(null);
    setTimeout(() => setClosingKey(null), 220);
  }, [selectedPin]);

  const handlePinClick = useCallback(
    (pinId: string | null) => {
      if (pinId === null) return;
      if (selectedPin === pinId) {
        closeDrawer();
      } else {
        setClosingKey(null);
        setSelectedPin(pinId);
      }
    },
    [selectedPin, closeDrawer],
  );

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full">

      {/* Loading screen */}
      <div
        className={cn(
          "absolute inset-0 z-50 flex flex-col items-center justify-center bg-surface-base gap-4 transition-opacity duration-500",
          mapLoaded ? "opacity-0 pointer-events-none" : "opacity-100",
        )}
        onTransitionEnd={(e) => {
          if (e.propertyName === "opacity" && mapLoaded) {
            (e.currentTarget as HTMLElement).style.display = "none";
          }
        }}
      >
        <div className="flex items-center gap-3">
          <MapIcon className="size-6 text-interactive-primary animate-pulse" />
          <span className="text-sm font-medium text-secondary">Loading map…</span>
        </div>
        <div className="w-48 h-1 rounded-full bg-surface-sunken overflow-hidden">
          <div className="h-full bg-interactive-primary rounded-full animate-[loading-bar_1.5s_ease-in-out_infinite]" />
        </div>
      </div>

      {/* Map area */}
      <div className="relative flex-1 overflow-hidden select-none">

        {/* Mapbox map */}
        <MapView
          properties={initialProperties}
          selectedId={selectedPin}
          onSelectProperty={handlePinClick}
          onMapLoaded={() => setMapLoaded(true)}
          onMapReady={(map) => { mapRef.current = map; }}
          isSatellite={isSatellite}
          className="absolute inset-0"
        />

        {/* Command Palette Trigger.
            Phone: container takes full width below the safe-area top (drawer pushes up from bottom, doesn't compete with this trigger).
            Tablet+: shrinks to make room for the right-anchored property sidebar when one is selected. */}
        <div
          data-no-drag
          className="absolute z-10 flex justify-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] px-4 sm:px-0"
          style={{
            top: "calc(env(safe-area-inset-top) + 24px)",
            left: 0,
            // On mobile the property drawer pushes up from the bottom (it
            // doesn't sit on the right edge), so the 20rem right offset
            // would just shrink the header for no reason — keep it at 0.
            right: !isMobile && selectedProperty ? "20rem" : 0,
          }}
        >
          <div className={cn(
            "flex flex-col items-center gap-3 w-full max-w-[700px] sm:max-w-[calc(100%-3rem)]",
            mapLoaded ? "[animation:fade-slide-down_0.5s_cubic-bezier(0.16,1,0.3,1)_both]" : "opacity-0",
          )}>
          <button
            onClick={() => setCommandOpen(true)}
            className={cn(
              "group w-full bg-surface-base border rounded-2xl shadow-lg flex items-center gap-3 px-5 h-14 text-left transition-all duration-200",
              commandOpen
                ? "border-interactive-primary/40 shadow-[0_0_0_4px_rgba(37,99,235,0.12)]"
                : "border-border-default hover:border-interactive-primary/30 hover:shadow-[0_0_0_4px_rgba(37,99,235,0.06)]",
            )}
          >
            <Search className="size-5 text-secondary shrink-0 group-hover:scale-110 group-hover:text-interactive-primary transition-all duration-200" />
            <span
              className={cn(
                "flex-1 text-sm text-secondary inline-block transition-all duration-200",
                placeholderVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1",
              )}
            >
              {triggerPlaceholders[placeholderIdx]}
            </span>
            <div className="flex items-center gap-1 bg-surface-sunken border border-border-default rounded-lg px-2 py-1 shrink-0 group-hover:bg-brand-subtle group-hover:border-interactive-primary/20 transition-all duration-200">
              <CommandIcon className="size-3 text-secondary" />
              <span className="text-xs font-medium text-text-disabled">K</span>
            </div>
          </button>

          {/* Quick actions */}
          {/*
            On mobile this becomes a horizontally-scrolling strip so all four
            chips remain reachable without wrapping. Each button shrinks-0
            and the parent allows overflow-x. On `sm:` and above the row
            returns to a static centered flex layout.
          */}
          <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto scrollbar-none -mx-4 sm:mx-0 px-4 sm:px-0">
            {[
              { label: "New Property", icon: Plus, action: () => router.push("/add-property") },
              { label: "Analytics", icon: BarChart2, action: () => router.push("/analytics") },
              { label: "Documents", icon: FileText, action: () => setCommandOpen(true) },
              { label: "Tenants", icon: Users, action: () => router.push("/estate-planning") },
            ].map(({ label, icon: Icon, action }, i) => (
              <button
                key={label}
                onClick={action}
                style={{ animationDelay: `${80 + i * 50}ms` }}
                className={cn(
                  "shrink-0 flex items-center gap-2 bg-surface-base border border-border-default rounded-full px-4 py-2 text-sm font-medium text-secondary hover:bg-surface-tint hover:text-foreground hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 transition-all duration-150",
                  mapLoaded ? "[animation:fade-slide-up_0.4s_cubic-bezier(0.16,1,0.3,1)_both]" : "opacity-0",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </button>
            ))}
          </div>
          </div>
        </div>

        {/* Command Palette Dialog */}
        <CommandPalette
          open={commandOpen}
          onOpenChange={setCommandOpen}
          properties={initialProperties}
          documents={documents}
          navigate={(path) => runCommand(() => router.push(path))}
        />

        {/* Portfolio legend — centered, bottom of map */}
        <PortfolioLegend stats={portfolioStats} mapLoaded={mapLoaded} drawerOpen={!!drawerProperty} />

        {/* Map controls */}
        <MapControls
          mapRef={mapRef}
          drawerOpen={!!selectedProperty}
          isSatellite={isSatellite}
          onToggleSatellite={() => setIsSatellite((s) => !s)}
        />

        {/* Property info panel.
            Phone (Apple Maps pattern): bottom-anchored sheet with rounded top,
            grab handle, ~55dvh height, slides up from below. Map stays visible
            above and remains pan-able.
            Tablet+: full-height floating sidebar pinned to the right (original). */}
        {drawerProperty && (
          <div
            key={selectedPin ?? closingKey}
            className={cn(
              "absolute z-20 flex flex-col overflow-hidden bg-glass-panel-fill backdrop-blur-md border border-glass-panel-border shadow-sm",
              // Phone — bottom sheet
              "inset-x-0 bottom-0 top-auto h-[58dvh] rounded-t-2xl pb-safe",
              // Tablet+ — restore floating right sidebar
              "sm:inset-x-auto sm:right-4 sm:top-4 sm:bottom-4 sm:w-80 sm:rounded-xl sm:h-auto sm:pb-0",
              isDrawerClosing
                ? "[animation:slide-out-down_0.22s_cubic-bezier(0.16,1,0.3,1)_both] sm:[animation:slide-out-right_0.22s_cubic-bezier(0.16,1,0.3,1)_both]"
                : "[animation:slide-in-up_0.3s_cubic-bezier(0.16,1,0.3,1)_both] sm:[animation:slide-in-right_0.3s_cubic-bezier(0.16,1,0.3,1)_both]",
            )}
            data-no-drag
          >
            {/* Phone-only grab handle */}
            <div className="flex shrink-0 justify-center pt-2 pb-1 sm:hidden" aria-hidden="true">
              <div className="h-1 w-9 rounded-full bg-white/60" />
            </div>

            {/* Hero image with overlay info */}
            <div className="relative shrink-0 overflow-hidden">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1665691964802-956fc06b93cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBob3VzZSUyMGRyaXZld2F5JTIwbmlnaHR8ZW58MXx8fHwxNzczNzM0NjE4fDA&ixlib=rb-4.1.0&q=80&w=1080"
                alt={drawerProperty.name}
                className="w-full h-44 object-cover [animation:card-image-reveal_0.5s_cubic-bezier(0.16,1,0.3,1)_0.15s_both]"
              />
              {/* Scrim gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
              {/* Close */}
              <button
                onClick={closeDrawer}
                className="absolute top-3 right-3 size-7 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-black/50 transition-colors"
              >
                <X className="size-3.5 text-white" />
              </button>
              {/* Status pill */}
              <div className="absolute top-3 left-3 [animation:pill-in_0.3s_cubic-bezier(0.16,1,0.3,1)_0.1s_both]">
                <span className={cn(
                  "px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase",
                  drawerProperty.status === "Rented"
                    ? "bg-emerald-500/90 text-white"
                    : drawerProperty.status === "Vacant"
                    ? "bg-amber-400/90 text-amber-950"
                    : "bg-white/20 text-white",
                )}>
                  {drawerProperty.status}
                </span>
              </div>
              {/* Title overlay */}
              <div className="absolute bottom-0 left-0 right-0 px-4 pb-3.5">
                <p className="text-[10px] font-medium text-white/55 tracking-widest uppercase">{drawerProperty.code}</p>
                <h3 className="text-base font-display font-semibold text-white leading-snug mt-0.5">{drawerProperty.name}</h3>
                <div className="flex items-center gap-1 mt-1">
                  <MapPin className="size-3 text-white/50 shrink-0" />
                  <span className="text-xs text-white/65 truncate">
                    {[drawerProperty.city, drawerProperty.province].filter(Boolean).join(", ")}
                  </span>
                </div>
              </div>
            </div>

            {/* Progress strip */}
            <div className="px-4 py-3 border-b border-border-default shrink-0 [animation:card-row-in_0.35s_cubic-bezier(0.16,1,0.3,1)_0.2s_both]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-secondary">Progress</span>
                <span className={cn("text-xs font-semibold tabular-nums", progressClass(drawerProperty.progress))}>
                  {drawerProperty.progress}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-surface-sunken overflow-hidden">
                <div
                  className={cn("h-full rounded-full origin-left [animation:health-bar-fill_0.6s_cubic-bezier(0.16,1,0.3,1)_0.5s_both]", progressBgClass(drawerProperty.progress))}
                  style={{ width: `${drawerProperty.progress}%` }}
                />
              </div>
            </div>

            {/* Scrollable sections */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-4 pt-4 pb-4 space-y-5 [animation:card-row-in_0.35s_cubic-bezier(0.16,1,0.3,1)_0.3s_both]">

                {/* Section: Property */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-text-disabled whitespace-nowrap">Property</span>
                    <div className="flex-1 h-px bg-border-subtle" />
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-secondary mb-0.5">Type</p>
                      <p className="text-sm font-medium text-foreground capitalize">{drawerProperty.type}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-secondary mb-0.5">Use</p>
                      <p className="text-sm font-medium text-foreground capitalize">{drawerProperty.propertyUse || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-secondary mb-0.5">Title</p>
                      <p className={cn("text-sm font-medium", titleClasses[titleToVariant(drawerProperty.title)])}>{drawerProperty.title}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-secondary mb-0.5">Year Built</p>
                      <p className="text-sm font-medium text-foreground">{drawerProperty.yearBuilt || "—"}</p>
                    </div>
                  </div>
                </section>

                {/* Section: Physical */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-text-disabled whitespace-nowrap">Physical</span>
                    <div className="flex-1 h-px bg-border-subtle" />
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-secondary mb-0.5">Total Area</p>
                      <p className="text-sm font-medium text-foreground">
                        {drawerProperty.totalArea ? `${Number(drawerProperty.totalArea).toLocaleString()} m²` : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-secondary mb-0.5">Parking</p>
                      <p className="text-sm font-medium text-foreground">{drawerProperty.parkingSpaces || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-secondary mb-0.5">Bedrooms</p>
                      <p className="text-sm font-medium text-foreground">{drawerProperty.bedrooms || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-secondary mb-0.5">Bathrooms</p>
                      <p className="text-sm font-medium text-foreground">{drawerProperty.bathrooms || "—"}</p>
                    </div>
                  </div>
                </section>

                {/* Section: Location */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-text-disabled whitespace-nowrap">Location</span>
                    <div className="flex-1 h-px bg-border-subtle" />
                  </div>
                  <div className="space-y-3">
                    {drawerProperty.addressLine && (
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-secondary mb-0.5">Address</p>
                        <p className="text-sm font-medium text-foreground">
                          {drawerProperty.addressLine}{drawerProperty.addressLine2 ? `, ${drawerProperty.addressLine2}` : ""}
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-secondary mb-0.5">City</p>
                        <p className="text-sm font-medium text-foreground">{drawerProperty.city || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-secondary mb-0.5">Province</p>
                        <p className="text-sm font-medium text-foreground">{drawerProperty.province || "—"}</p>
                      </div>
                      {drawerProperty.country && (
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wide text-secondary mb-0.5">Country</p>
                          <p className="text-sm font-medium text-foreground">{drawerProperty.country}</p>
                        </div>
                      )}
                      {drawerProperty.zip && (
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wide text-secondary mb-0.5">ZIP</p>
                          <p className="text-sm font-medium text-foreground">{drawerProperty.zip}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* Section: Financials */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-text-disabled whitespace-nowrap">Financials</span>
                    <div className="flex-1 h-px bg-border-subtle" />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-secondary mb-0.5">Purchase Price</p>
                      <p className="text-base font-bold font-display text-foreground">{drawerProperty.buy}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-secondary mb-0.5">Market Value</p>
                        <p className="text-sm font-medium text-foreground">
                          {drawerProperty.currentMarketValue ? formatCurrency(drawerProperty.currentMarketValue) : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-secondary mb-0.5">Mortgage</p>
                        <p className="text-sm font-medium text-foreground">
                          {drawerProperty.outstandingMortgage ? formatCurrency(drawerProperty.outstandingMortgage) : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-secondary mb-0.5">Monthly</p>
                        <p className="text-sm font-medium text-foreground">
                          {drawerProperty.monthlyPayment ? `$${drawerProperty.monthlyPayment.toLocaleString()}` : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-secondary mb-0.5">Annual Tax</p>
                        <p className="text-sm font-medium text-foreground">
                          {drawerProperty.annualPropertyTax ? `$${drawerProperty.annualPropertyTax.toLocaleString()}` : "—"}
                        </p>
                      </div>
                    </div>
                    {drawerProperty.purchaseDate ? (
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-secondary mb-0.5">Purchased</p>
                        <p className="text-sm font-medium text-foreground">{formatDate(drawerProperty.purchaseDate)}</p>
                      </div>
                    ) : null}
                  </div>
                </section>

              </div>
            </div>

            {/* CTA */}
            <div className="px-4 py-3 shrink-0 border-t border-border-default [animation:card-row-in_0.35s_cubic-bezier(0.16,1,0.3,1)_0.5s_both]">
              <button
                onClick={() => router.push(`/property/${drawerProperty.id}`)}
                className="group w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-interactive-primary text-white text-sm font-medium hover:brightness-110 active:scale-[0.98] transition-all duration-150"
              >
                View Property
                <ArrowUpRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Properties table */}
      <div className="bg-surface-base border-t border-border-default shrink-0">
        <div
          className="flex items-center justify-between px-6 py-2.5 cursor-pointer group hover:bg-surface-tint transition-colors duration-150"
          onClick={() => setTableOpen(!tableOpen)}
        >
          <h2 className="text-xl font-semibold font-display text-foreground">
            Properties
          </h2>
          <ChevronUp
            className={cn(
              "size-5 text-secondary group-hover:text-foreground transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
              tableOpen ? "rotate-180" : "rotate-0",
            )}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => { e.stopPropagation(); router.push("/portfolio"); }}
          >
            Full List
          </Button>
        </div>

        {/* Accordion wrapper — grid-rows trick for smooth open/close */}
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
            tableOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden">
            <div className="mx-auto w-full max-w-[1200px]">
              <PropertyTable
                pageRows={initialProperties}
                pageStart={0}
                filtered={initialProperties}
                properties={initialProperties}
                mounted={tableOpen}
                navigate={(path) => router.push(path)}
                totalPages={1}
                safePage={1}
                goToPage={() => {}}
                onClearFilters={() => {}}
                animationConfig={HOME_TABLE_ANIMATION}
                showProgressExplainer={false}
                sortKey={null}
                sortDir="asc"
                onSort={() => {}}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
