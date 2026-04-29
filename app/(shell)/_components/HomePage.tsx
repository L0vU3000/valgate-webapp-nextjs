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
import { healthClass, healthBgClass } from "@/lib/property-helpers";
import type { Property, StatusVariant, TitleVariant, PortfolioStats } from "@/app/(shell)/queries";
import { CommandPalette } from "@/components/home/CommandPalette";
import { PropertyTable } from "@/components/portfolio/PropertyTable";
import type { TableAnimationConfig } from "@/components/portfolio/PropertyTable";
import { PortfolioLegend } from "./PortfolioLegend";
import { MapControls } from "@/components/map/MapControls";
import type mapboxgl from "mapbox-gl";

const MapView = dynamic(
  () => import("@/components/map/MapView").then((m) => m.MapView),
  { ssr: false },
);

const statusClasses: Record<StatusVariant, string> = {
  rented:
    "text-status-success-text bg-status-success-bg border border-status-success-border",
  vacant:
    "text-status-warning-text bg-status-warning-bg border border-status-warning-border",
};

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
  healthBarDelay: 80,
  healthBarStagger: 20,
};

const triggerPlaceholders = [
  "Search properties, documents, tenants...",
  "Find: Phnom Penh land plots",
  "Find: Q1 2026 valuation report",
  "Find: Hard title properties",
  "Find: Vacant properties in Siem Reap",
];


export function HomePage({ initialProperties, portfolioStats }: { initialProperties: Property[]; portfolioStats: PortfolioStats }) {

  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [closingKey, setClosingKey] = useState<string | null>(null);
  const [hoveredProperty, setHoveredProperty] = useState<string | null>(null);
  const [tableOpen, setTableOpen] = useState(false);
  const [tableOpenCount, setTableOpenCount] = useState(0);
  const [commandOpen, setCommandOpen] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [placeholderVisible, setPlaceholderVisible] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const router = useRouter();

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
          className="absolute inset-0"
        />

        {/* Command Palette Trigger */}
        <div data-no-drag className="absolute top-6 z-10 flex justify-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ left: 0, right: selectedProperty ? "20rem" : 0 }}>
          <div className={cn(
            "flex flex-col items-center gap-3 w-[700px] max-w-[calc(100%-3rem)]",
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
          <div className="flex items-center gap-3">
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
                  "flex items-center gap-2 bg-surface-base border border-border-default rounded-full px-4 py-2 text-sm font-medium text-secondary hover:bg-surface-tint hover:text-foreground hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 transition-all duration-150",
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
          navigate={(path) => runCommand(() => router.push(path))}
        />

        {/* Portfolio legend — centered, bottom of map */}
        <PortfolioLegend stats={portfolioStats} mapLoaded={mapLoaded} drawerOpen={!!drawerProperty} />

        {/* Map controls */}
        <MapControls mapRef={mapRef} drawerOpen={!!selectedProperty} />

        {/* Property info panel — full-height floating sidebar */}
        {drawerProperty && (
          <div
            key={selectedPin ?? closingKey}
            className={cn(
              "absolute right-4 top-4 bottom-4 w-80 bg-glass-panel-fill backdrop-blur-md border border-glass-panel-border rounded-xl shadow-sm z-20 flex flex-col overflow-hidden",
              isDrawerClosing
                ? "[animation:slide-out-right_0.22s_cubic-bezier(0.16,1,0.3,1)_both]"
                : "[animation:slide-in-right_0.3s_cubic-bezier(0.16,1,0.3,1)_both]",
            )}
            data-no-drag
          >

            {/* Hero image with overlay info */}
            <div className="relative shrink-0 overflow-hidden">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1665691964802-956fc06b93cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBob3VzZSUyMGRyaXZld2F5JTIwbmlnaHR8ZW58MXx8fHwxNzczNzM0NjE4fDA&ixlib=rb-4.1.0&q=80&w=1080"
                alt={drawerProperty.name}
                className="w-full h-48 object-cover [animation:card-image-reveal_0.5s_cubic-bezier(0.16,1,0.3,1)_0.15s_both]"
              />
              {/* Scrim gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              {/* Close */}
              <button
                onClick={closeDrawer}
                className="absolute top-3 right-3 size-7 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-black/50 transition-colors"
              >
                <X className="size-3.5 text-white" />
              </button>
              {/* Status pill on image */}
              <div className="absolute top-3 left-3 [animation:pill-in_0.3s_cubic-bezier(0.16,1,0.3,1)_0.1s_both]">
                <span className={cn(
                  "px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase",
                  drawerProperty.statusVariant === "rented"
                    ? "bg-emerald-500/90 text-white"
                    : "bg-amber-400/90 text-amber-950",
                )}>
                  {drawerProperty.status}
                </span>
              </div>
              {/* Title overlay at bottom of image */}
              <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
                <p className="text-[11px] font-medium text-white/60 tracking-wide uppercase">{drawerProperty.code}</p>
                <h3 className="text-lg font-display font-semibold text-white leading-tight mt-0.5">{drawerProperty.name}</h3>
                <div className="flex items-center gap-1 mt-1">
                  <MapPin className="size-3 text-white/50" />
                  <span className="text-xs text-white/70">{drawerProperty.province}</span>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="px-5 pt-5 pb-4 space-y-3.5 text-sm">
              {[
                { label: "Buy Price", value: <span className="text-base font-display font-bold text-foreground">{drawerProperty.buy}</span> },
                { label: "Size", value: <span className="font-medium text-foreground">{drawerProperty.size} m&sup2;</span> },
                { label: "Type", value: <span className="font-medium text-foreground">{drawerProperty.type}</span> },
                { label: "Title", value: <span className={cn("font-medium", titleClasses[drawerProperty.titleVariant])}>{drawerProperty.title}</span> },
              ].map((row, i) => (
                <div
                  key={row.label}
                  className="flex items-baseline justify-between [animation:card-row-in_0.35s_cubic-bezier(0.16,1,0.3,1)_both]"
                  style={{ animationDelay: `${250 + i * 50}ms` }}
                >
                  <span className="text-secondary">{row.label}</span>
                  {row.value}
                </div>
              ))}
              <div
                className="flex items-center justify-between [animation:card-row-in_0.35s_cubic-bezier(0.16,1,0.3,1)_both]"
                style={{ animationDelay: "450ms" }}
              >
                <span className="text-secondary">Health</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 rounded-full bg-surface-sunken overflow-hidden">
                    <div
                      className={cn("h-full rounded-full origin-left [animation:health-bar-fill_0.6s_cubic-bezier(0.16,1,0.3,1)_0.5s_both]", healthBgClass(drawerProperty.health))}
                      style={{ width: `${drawerProperty.health}%` }}
                    />
                  </div>
                  <span className={cn("font-medium tabular-nums", healthClass(drawerProperty.health))}>
                    {drawerProperty.health}%
                  </span>
                </div>
              </div>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* CTA */}
            <div className="px-5 py-4 shrink-0 [animation:card-row-in_0.35s_cubic-bezier(0.16,1,0.3,1)_0.5s_both]">
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
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
