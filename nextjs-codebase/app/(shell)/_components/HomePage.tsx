"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useShellContext } from "@/components/layout/shell-context";
import {
  RefreshCw,
  ZoomIn,
  ZoomOut,
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
import { formatCurrency } from "@/lib/format";
import type { Property, StatusVariant, TitleVariant } from "@/lib/mock-data";
import { CommandPalette } from "@/components/home/CommandPalette";
import { MapIconButton } from "@/components/home/QuickStats";

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

function healthClass(health: number) {
  if (health >= 75) return "text-status-success-text";
  if (health >= 40) return "text-status-warning-text";
  return "text-status-danger-text";
}

function healthBgClass(health: number) {
  if (health >= 75) return "bg-status-success";
  if (health >= 40) return "bg-status-warning";
  return "bg-status-danger";
}

const triggerPlaceholders = [
  "Search properties, documents, tenants...",
  "Find: Phnom Penh land plots",
  "Find: Q1 2026 valuation report",
  "Find: Hard title properties",
  "Find: Vacant properties in Siem Reap",
];


export function HomePage({ initialProperties }: { initialProperties: Property[] }) {
  const portfolioStats = useMemo(
    () => ({
      totalProperties: initialProperties.length,
      totalValue: initialProperties.reduce((sum, p) => sum + p.buyNumeric, 0),
      rentedCount: initialProperties.filter((p) => p.statusVariant === "rented").length,
      vacantCount: initialProperties.filter((p) => p.statusVariant === "vacant").length,
      avgHealth: Math.round(
        initialProperties.reduce((sum, p) => sum + p.health, 0) / initialProperties.length,
      ),
    }),
    [initialProperties],
  );

  const [selectedPin, setSelectedPin] = useState<number | null>(null);
  const [hoveredProperty, setHoveredProperty] = useState<number | null>(null);
  const [tableOpen, setTableOpen] = useState(false);
  const [tableOpenCount, setTableOpenCount] = useState(0);
  const [commandOpen, setCommandOpen] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [placeholderVisible, setPlaceholderVisible] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const router = useRouter();
  const { isDark } = useShellContext();

  // Zoom & pan state
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 3;
  const ZOOM_STEP = 0.15;
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ active: boolean; startX: number; startY: number; startPanX: number; startPanY: number }>({
    active: false, startX: 0, startY: 0, startPanX: 0, startPanY: 0,
  });
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const clampPan = useCallback((x: number, y: number, z: number) => {
    // Allow panning proportional to zoom level
    const maxPan = ((z - 1) / (MAX_ZOOM - 1)) * 300;
    return {
      x: Math.max(-maxPan, Math.min(maxPan, x)),
      y: Math.max(-maxPan, Math.min(maxPan, y)),
    };
  }, []);

  const handleZoom = useCallback((delta: number) => {
    setZoom((prev) => {
      const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta));
      // Clamp pan for the new zoom level
      if (next === MIN_ZOOM) {
        setPan({ x: 0, y: 0 });
      } else {
        setPan((p) => clampPan(p.x, p.y, next));
      }
      return next;
    });
  }, [clampPan]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    handleZoom(delta);
  }, [handleZoom]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    // Don't start drag if clicking on a pin or UI element
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("[data-no-drag]")) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [pan]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPan(clampPan(dragRef.current.startPanX + dx, dragRef.current.startPanY + dy, zoom));
  }, [zoom, clampPan]);

  const handlePointerUp = useCallback(() => {
    dragRef.current.active = false;
  }, []);

  // Reset loading state when theme changes (different map image)
  useEffect(() => {
    setMapLoaded(false);
  }, [isDark]);

  // Reset zoom/pan when theme changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [isDark]);

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

  const mapSrc = isDark ? "/map-dark.png" : "/map-light.png";

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
      <div
        ref={mapContainerRef}
        className="relative flex-1 overflow-hidden select-none"
        style={{ cursor: zoom > 1 ? (dragRef.current.active ? "grabbing" : "grab") : "default" }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Zoomable/pannable layer — contains map image + pins */}
        <div
          className="absolute inset-0 origin-center transition-transform duration-200 ease-out"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        >
          {/* Map background */}
          <img
            src={mapSrc}
            alt="Map"
            className={cn(
              "w-full h-full object-cover object-center pointer-events-none transition-opacity duration-500",
              mapLoaded ? "opacity-100" : "opacity-0",
            )}
            onLoad={() => setMapLoaded(true)}
          />
          {/* Map pins — inside zoomable layer so they stick to the map */}
          {initialProperties.map((p, i) => (
            <button
              key={p.id}
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2 group"
              style={{ left: `${p.pinX}%`, top: `${p.pinY}%` }}
              onClick={() =>
                setSelectedPin(selectedPin === p.id ? null : p.id)
              }
              onMouseEnter={() => setHoveredProperty(p.id)}
              onMouseLeave={() => setHoveredProperty(null)}
            >
              <div
                className={cn(
                  "w-4 h-4 rounded-full border-2 border-surface-base bg-interactive-primary shadow-lg transition-all duration-200",
                  (selectedPin === p.id || hoveredProperty === p.id) && "scale-150 ring-2 ring-interactive-primary",
                )}
                style={{
                  // Counter-scale so pins stay the same visual size when zoomed
                  transform: `scale(${1 / zoom})`,
                  animation: (selectedPin === p.id || hoveredProperty === p.id)
                    ? "pin-beacon 1.8s ease-out infinite"
                    : mapLoaded
                      ? `scale-in 0.35s cubic-bezier(0.22,1,0.36,1) ${300 + i * 35}ms both`
                      : "none",
                  opacity: mapLoaded ? undefined : 0,
                }}
              />
              {/* Hover tooltip */}
              <div
                className="absolute left-1/2 -translate-x-1/2 -top-8 opacity-0 group-hover:opacity-100 pointer-events-none bg-glass-panel-fill backdrop-blur-md border border-glass-panel-border rounded px-2 py-1 text-xs text-foreground whitespace-nowrap shadow-sm transition-opacity duration-150"
                style={{ transform: `translateX(-50%) scale(${1 / zoom})` }}
              >
                {p.name}
              </div>
            </button>
          ))}
        </div>{/* end zoomable layer */}

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
        <div data-no-drag className="absolute bottom-4 z-10 flex justify-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ left: 0, right: selectedProperty ? "20rem" : 0 }}>
          <div className={cn(
            mapLoaded ? "[animation:fade-slide-up_0.5s_cubic-bezier(0.16,1,0.3,1)_300ms_both]" : "opacity-0",
          )}>
          <div className="flex items-center bg-glass-panel-fill backdrop-blur-md border border-glass-panel-border rounded-full shadow-sm px-5 py-2.5 gap-4 whitespace-nowrap">
            {/* Total value */}
            <div className="flex items-baseline gap-2">
              <span className="text-[10px] uppercase tracking-wider text-secondary font-medium">Portfolio</span>
              <span className="text-sm font-bold font-display text-foreground">{formatCurrency(portfolioStats.totalValue)}</span>
            </div>

            <div className="w-px h-4 bg-border-subtle shrink-0" />

            {/* Property count */}
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-interactive-primary shrink-0" />
              <span className="text-sm font-medium text-foreground">{portfolioStats.totalProperties}</span>
              <span className="text-xs text-secondary">Properties</span>
            </div>

            {/* Rented */}
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-status-success shrink-0" />
              <span className="text-sm font-medium text-foreground">{portfolioStats.rentedCount}</span>
              <span className="text-xs text-secondary">Rented</span>
            </div>

            {/* Vacant */}
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-status-warning shrink-0" />
              <span className="text-sm font-medium text-foreground">{portfolioStats.vacantCount}</span>
              <span className="text-xs text-secondary">Vacant</span>
            </div>

            <div className="w-px h-4 bg-border-subtle shrink-0" />

            {/* Avg health */}
            <div className="flex items-center gap-1.5">
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", healthBgClass(portfolioStats.avgHealth))} />
              <span className="text-xs text-secondary">Avg Health</span>
              <span className={cn("text-sm font-medium", healthClass(portfolioStats.avgHealth))}>{portfolioStats.avgHealth}%</span>
            </div>
          </div>
          </div>
        </div>

        {/* Pins moved into zoomable layer above */}

        {/* Map controls */}
        <div className={cn(
          "absolute bottom-4 flex flex-col gap-2 z-10 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          selectedProperty ? "right-[22rem]" : "right-4",
        )} data-no-drag>
          <MapIconButton onClick={() => handleZoom(ZOOM_STEP)}>
            <ZoomIn className="size-4" />
          </MapIconButton>
          <MapIconButton onClick={() => handleZoom(-ZOOM_STEP)}>
            <ZoomOut className="size-4" />
          </MapIconButton>
          <MapIconButton spin onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
            <RefreshCw className="size-4" />
          </MapIconButton>
        </div>

        {/* Property info panel — full-height floating sidebar */}
        {selectedProperty && (
          <div key={selectedPin} className="absolute right-4 top-4 bottom-4 w-80 bg-glass-panel-fill backdrop-blur-md border border-glass-panel-border rounded-xl shadow-sm z-20 flex flex-col overflow-hidden [animation:slide-in-right_0.3s_cubic-bezier(0.16,1,0.3,1)_both]" data-no-drag>

            {/* Hero image with overlay info */}
            <div className="relative shrink-0 overflow-hidden">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1665691964802-956fc06b93cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBob3VzZSUyMGRyaXZld2F5JTIwbmlnaHR8ZW58MXx8fHwxNzczNzM0NjE4fDA&ixlib=rb-4.1.0&q=80&w=1080"
                alt={selectedProperty.name}
                className="w-full h-48 object-cover [animation:card-image-reveal_0.5s_cubic-bezier(0.16,1,0.3,1)_0.15s_both]"
              />
              {/* Scrim gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              {/* Close */}
              <button
                onClick={() => setSelectedPin(null)}
                className="absolute top-3 right-3 size-7 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center hover:bg-black/50 transition-colors"
              >
                <X className="size-3.5 text-white" />
              </button>
              {/* Status pill on image */}
              <div className="absolute top-3 left-3">
                <span className={cn(
                  "px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase",
                  selectedProperty.statusVariant === "rented"
                    ? "bg-emerald-500/90 text-white"
                    : "bg-amber-400/90 text-amber-950",
                )}>
                  {selectedProperty.status}
                </span>
              </div>
              {/* Title overlay at bottom of image */}
              <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
                <p className="text-[11px] font-medium text-white/60 tracking-wide uppercase">{selectedProperty.code}</p>
                <h3 className="text-lg font-display font-semibold text-white leading-tight mt-0.5">{selectedProperty.name}</h3>
                <div className="flex items-center gap-1 mt-1">
                  <MapPin className="size-3 text-white/50" />
                  <span className="text-xs text-white/70">{selectedProperty.province}</span>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="px-5 pt-5 pb-4 space-y-3.5 text-sm">
              {[
                { label: "Buy Price", value: <span className="text-base font-display font-bold text-foreground">{selectedProperty.buy}</span> },
                { label: "Size", value: <span className="font-medium text-foreground">{selectedProperty.size} m&sup2;</span> },
                { label: "Type", value: <span className="font-medium text-foreground">{selectedProperty.type}</span> },
                { label: "Title", value: <span className={cn("font-medium", titleClasses[selectedProperty.titleVariant])}>{selectedProperty.title}</span> },
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
                      className={cn("h-full rounded-full origin-left [animation:health-bar-fill_0.6s_cubic-bezier(0.16,1,0.3,1)_0.5s_both]", healthBgClass(selectedProperty.health))}
                      style={{ width: `${selectedProperty.health}%` }}
                    />
                  </div>
                  <span className={cn("font-medium tabular-nums", healthClass(selectedProperty.health))}>
                    {selectedProperty.health}%
                  </span>
                </div>
              </div>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* CTA */}
            <div className="px-5 py-4 shrink-0 [animation:card-row-in_0.35s_cubic-bezier(0.16,1,0.3,1)_0.5s_both]">
              <button
                onClick={() => router.push(`/property/${selectedProperty.id}`)}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-interactive-primary text-white text-sm font-medium hover:brightness-110 active:scale-[0.98] transition-all duration-150"
              >
                View Property
                <ArrowUpRight className="size-4" />
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
            "grid transition-[grid-template-rows] duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]",
            tableOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden">
            <table className="w-full text-sm px-6" style={{ margin: "0 0 1rem" }}>
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left py-3 px-4 w-8">
                    <input type="checkbox" className="rounded" />
                  </th>
                  {[
                    "#",
                    "Property",
                    "Type",
                    "Province",
                    "Status",
                    "Size",
                    "Buy",
                    "Title",
                    "Health",
                  ].map((col) => (
                    <th
                      key={col}
                      className="text-left py-3 px-4 text-xs font-medium text-secondary tracking-wide"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody key={tableOpenCount}>
                {initialProperties.map((p, i) => (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/property/${p.id}`)}
                    onMouseEnter={() => setHoveredProperty(p.id)}
                    onMouseLeave={() => setHoveredProperty(null)}
                    style={{ animationDelay: `${i * 40}ms` }}
                    className={cn(
                      "border-b border-border-subtle transition-colors cursor-pointer [animation:fade-slide-up_0.3s_cubic-bezier(0.16,1,0.3,1)_both]",
                      hoveredProperty === p.id
                        ? "bg-surface-tint"
                        : "hover:bg-surface-tint",
                    )}
                  >
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        className="rounded"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="py-3 px-4 text-secondary">{i + 1}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-surface-sunken rounded-xl shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {p.name}
                          </p>
                          <p className="text-xs text-secondary">{p.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-xs font-medium text-interactive-primary bg-brand-subtle">
                        {p.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-secondary text-sm">
                      {p.province}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-xs font-medium",
                          statusClasses[p.statusVariant],
                        )}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-secondary text-sm">
                      {p.size} m<sup>2</sup>
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-foreground">
                      {p.buy}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          "text-xs font-medium",
                          titleClasses[p.titleVariant],
                        )}
                      >
                        {p.title}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          "flex items-center gap-1",
                          healthClass(p.health),
                        )}
                      >
                        <span className="w-2 h-2 rounded-full bg-current" />
                        <span className="text-sm">{p.health}%</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
