import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useOutletContext } from "react-router";
import {
  RefreshCw,
  ZoomIn,
  ZoomOut,
  X,
  ChevronUp,
  BarChart2,
  LayoutGrid,
  Map as MapIcon,
  Settings,
  Users,
  UserCircle,
  Search,
  Plus,
  FileText,
  Command as CommandIcon,
  Building,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { cn } from "../components/ui/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "../components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

type StatusVariant = "rented" | "vacant";
type TitleVariant = "hard" | "soft" | "none";

interface Property {
  id: number;
  name: string;
  code: string;
  type: "Land" | "House" | "Building";
  province: string;
  status: "Rented" | "Vacant";
  statusVariant: StatusVariant;
  size: string;
  buy: string;
  buyNumeric: number;
  title: string;
  titleVariant: TitleVariant;
  health: number;
  pinX: number;
  pinY: number;
}

const properties: Property[] = [
  { id: 1, name: "Land near river", code: "PP00016 PH", type: "House", province: "Phnom Penh", status: "Rented", statusVariant: "rented", size: "850", buy: "$1,278,000", buyNumeric: 1278000, title: "Hard title", titleVariant: "hard", health: 100, pinX: 28, pinY: 40 },
  { id: 2, name: "Siem Reap Land Plot", code: "SR00015 Land", type: "Land", province: "Siem Reap", status: "Vacant", statusVariant: "vacant", size: "1,200", buy: "$456,000", buyNumeric: 456000, title: "Soft title", titleVariant: "soft", health: 28, pinX: 60, pinY: 50 },
  { id: 3, name: "Kampong Chhnang Prop.", code: "KPC00013", type: "Land", province: "Kampong Chhnang", status: "Vacant", statusVariant: "vacant", size: "2,500", buy: "$125,000", buyNumeric: 125000, title: "Hard title", titleVariant: "hard", health: 43, pinX: 38, pinY: 63 },
  { id: 4, name: "Angkor Property", code: "SR00007 Land", type: "Land", province: "Siem Reap", status: "Vacant", statusVariant: "vacant", size: "900", buy: "$234,000", buyNumeric: 234000, title: "Soft title", titleVariant: "soft", health: 67, pinX: 55, pinY: 46 },
  { id: 5, name: "Temple View Land", code: "SR00006 Land", type: "Land", province: "Siem Reap", status: "Vacant", statusVariant: "vacant", size: "1,100", buy: "$345,000", buyNumeric: 345000, title: "Hard title", titleVariant: "hard", health: 82, pinX: 68, pinY: 36 },
  { id: 6, name: "Central Siem Reap", code: "SR00005 Land", type: "Land", province: "Siem Reap", status: "Rented", statusVariant: "rented", size: "750", buy: "$567,000", buyNumeric: 567000, title: "Hard title", titleVariant: "hard", health: 95, pinX: 52, pinY: 68 },
  { id: 7, name: "Commercial Building", code: "SR00004 Building", type: "Building", province: "Siem Reap", status: "Rented", statusVariant: "rented", size: "450", buy: "$890,000", buyNumeric: 890000, title: "Hard title", titleVariant: "hard", health: 88, pinX: 45, pinY: 33 },
  { id: 8, name: "Prey Veng Agricultural", code: "PV00002 Land", type: "Land", province: "Prey Veng", status: "Vacant", statusVariant: "vacant", size: "5,000", buy: "$180,000", buyNumeric: 180000, title: "Soft title", titleVariant: "soft", health: 34, pinX: 42, pinY: 56 },
  { id: 9, name: "BKK1 Land", code: "PP00032 Land", type: "Land", province: "Phnom Penh", status: "Rented", statusVariant: "rented", size: "480", buy: "$1,450,000", buyNumeric: 1450000, title: "Hard title", titleVariant: "hard", health: 100, pinX: 32, pinY: 48 },
  { id: 10, name: "Phnom Penh Urban", code: "PP00033 Land", type: "Land", province: "Phnom Penh", status: "Vacant", statusVariant: "vacant", size: "600", buy: "$980,000", buyNumeric: 980000, title: "Hard title", titleVariant: "hard", health: 75, pinX: 48, pinY: 60 },
];

const portfolioStats = {
  totalProperties: properties.length,
  totalValue: properties.reduce((sum, p) => sum + p.buyNumeric, 0),
  rentedCount: properties.filter((p) => p.statusVariant === "rented").length,
  vacantCount: properties.filter((p) => p.statusVariant === "vacant").length,
  avgHealth: Math.round(
    properties.reduce((sum, p) => sum + p.health, 0) / properties.length,
  ),
};

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

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

const triggerPlaceholders = [
  "Search properties, documents, tenants...",
  "Find: Phnom Penh land plots",
  "Find: Q1 2026 valuation report",
  "Find: Hard title properties",
  "Find: Vacant properties in Siem Reap",
];


export function HomePage() {
  const [selectedPin, setSelectedPin] = useState<number | null>(null);
  const [hoveredProperty, setHoveredProperty] = useState<number | null>(null);
  const [tableOpen, setTableOpen] = useState(false);
  const [tableOpenCount, setTableOpenCount] = useState(0);
  const [commandOpen, setCommandOpen] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [placeholderVisible, setPlaceholderVisible] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const navigate = useNavigate();
  const { isDark } = useOutletContext<{ isDark: boolean }>();

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
    ? properties.find((p) => p.id === selectedPin)
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
          {properties.map((p, i) => (
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
        <div data-no-drag className={cn(
          "absolute top-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3 w-[700px] max-w-[calc(100%-3rem)]",
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
              { label: "New Property", icon: Plus, action: () => navigate("/add-property") },
              { label: "Analytics", icon: BarChart2, action: () => navigate("/analytics") },
              { label: "Documents", icon: FileText, action: () => setCommandOpen(true) },
              { label: "Tenants", icon: Users, action: () => navigate("/estate-planning") },
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

        {/* Command Palette Dialog */}
        <ValgateCmdK
          open={commandOpen}
          onOpenChange={setCommandOpen}
          properties={properties}
          navigate={(path) => runCommand(() => navigate(path))}
        />

        {/* Portfolio summary card */}
        <div data-no-drag className={cn(
          "absolute left-6 top-44 z-10 bg-glass-panel-fill backdrop-blur-md border border-glass-panel-border rounded-xl p-6 shadow-sm w-72",
          mapLoaded ? "[animation:fade-slide-left_0.55s_cubic-bezier(0.16,1,0.3,1)_200ms_both]" : "opacity-0",
        )}>
          <p className="text-xs uppercase tracking-wider text-secondary font-medium">
            Portfolio Overview
          </p>
          <p className="text-3xl font-bold font-display text-foreground mt-1">
            {formatCurrency(portfolioStats.totalValue)}
          </p>
          <div className="flex items-center gap-4 mt-3 text-sm text-secondary">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-interactive-primary" />
              {portfolioStats.totalProperties} Properties
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-status-success" />
              {portfolioStats.rentedCount} Rented
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-status-warning" />
              {portfolioStats.vacantCount} Vacant
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-border-subtle">
            <span className="text-xs text-secondary">Avg Health </span>
            <span className={cn("text-xs font-medium", healthClass(portfolioStats.avgHealth))}>
              {portfolioStats.avgHealth}%
            </span>
          </div>
        </div>

        {/* Pins moved into zoomable layer above */}

        {/* Map controls */}
        <div className="absolute right-4 bottom-4 flex flex-col gap-2 z-10" data-no-drag>
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

        {/* Property info panel */}
        {selectedProperty && (
          <div key={selectedPin} className="absolute right-4 top-6 w-80 bg-glass-panel-fill backdrop-blur-md border border-glass-panel-border rounded-xl shadow-sm z-20 overflow-hidden [animation:slide-in-right_0.3s_cubic-bezier(0.16,1,0.3,1)_both]">
            <div className="relative">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1665691964802-956fc06b93cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBob3VzZSUyMGRyaXZld2F5JTIwbmlnaHR8ZW58MXx8fHwxNzczNzM0NjE4fDA&ixlib=rb-4.1.0&q=80&w=1080"
                alt={selectedProperty.name}
                className="w-full h-40 object-cover"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedPin(null)}
                className="absolute top-2 right-2 bg-glass-icon-btn-fill backdrop-blur-md hover:bg-surface-base rounded-full size-7 shadow-sm border border-glass-icon-btn-border"
              >
                <X className="size-3 text-foreground" />
              </Button>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-secondary">{selectedProperty.code}</p>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded text-xs font-medium",
                    statusClasses[selectedProperty.statusVariant],
                  )}
                >
                  {selectedProperty.status}
                </span>
              </div>
              <p className="text-lg font-semibold text-foreground mt-1">
                {selectedProperty.name}
              </p>
              <p className="text-sm text-secondary">{selectedProperty.province}</p>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-secondary">Buy Price</span>
                  <span className="font-medium text-foreground">
                    {selectedProperty.buy}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Size</span>
                  <span className="text-foreground">
                    {selectedProperty.size} m&sup2;
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Title</span>
                  <span
                    className={cn(
                      "font-medium",
                      titleClasses[selectedProperty.titleVariant],
                    )}
                  >
                    {selectedProperty.title}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Health</span>
                  <span
                    className={cn(
                      "flex items-center gap-1 font-medium",
                      healthClass(selectedProperty.health),
                    )}
                  >
                    <span className="w-2 h-2 rounded-full bg-current" />
                    {selectedProperty.health}%
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full mt-4"
                onClick={() => navigate(`/property/${selectedProperty.id}`)}
              >
                View Details
              </Button>
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
            onClick={(e) => { e.stopPropagation(); navigate("/portfolio"); }}
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
                {properties.map((p, i) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/property/${p.id}`)}
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

function MapIconButton({
  children,
  onClick,
  spin,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  spin?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "bg-glass-icon-btn-fill backdrop-blur-md border border-glass-icon-btn-border rounded-lg p-2 shadow-sm text-secondary hover:bg-surface-base hover:text-foreground hover:scale-110 active:scale-95 transition-all duration-150 [&_svg]:transition-transform [&_svg]:duration-300",
        spin && "hover:[&_svg]:rotate-180",
      )}
    >
      {children}
    </button>
  );
}

function ValgateCmdK({
  open,
  onOpenChange,
  properties,
  navigate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  properties: Property[];
  navigate: (path: string) => void;
}) {
  const mockDocs = [
    { id: "doc-1", name: "Land near river - Lease Agreement.pdf", type: "pdf" as const, modified: "2 days ago" },
    { id: "doc-2", name: "Siem Reap Land Plot - Title Deed.pdf", type: "pdf" as const, modified: "1 week ago" },
    { id: "doc-3", name: "Maintenance Log - Commercial Building", type: "doc" as const, modified: "3 days ago" },
    { id: "doc-4", name: "Portfolio Valuation Report Q1 2026", type: "doc" as const, modified: "5 days ago" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-2xl top-[20%] translate-y-0 gap-0 rounded-xl border-border-default bg-surface-base shadow-[0_0_40px_-10px_rgba(37,99,235,0.3)] [&>button:last-child]:hidden [animation:cmd-open_0.22s_cubic-bezier(0.16,1,0.3,1)_both]">
        <DialogHeader className="sr-only">
          <DialogTitle>Command Palette</DialogTitle>
          <DialogDescription>Search your portfolio — properties, documents, and navigation</DialogDescription>
        </DialogHeader>
        <Command className="bg-surface-base text-foreground [&_[cmdk-group-heading]]:text-secondary [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:px-5 [&_[cmdk-group-heading]]:py-2 [&_[data-slot=command-input-wrapper]]:h-16 [&_[data-slot=command-input-wrapper]]:px-5 [&_[data-slot=command-input-wrapper]]:gap-3 [&_[data-slot=command-input-wrapper]_svg]:size-5">
          <CommandInput
            placeholder="Search properties, documents, tenants..."
            className="h-16 text-base placeholder:text-secondary"
          />
          <CommandList className="max-h-96">
            <CommandEmpty className="py-10 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-sunken flex items-center justify-center">
                  <Search className="size-4 text-secondary" />
                </div>
                <p className="text-sm text-secondary">No matching properties or documents found.</p>
              </div>
            </CommandEmpty>

            {/* Properties */}
            <CommandGroup heading="Properties">
              {properties.slice(0, 5).map((p, i) => (
                <CommandItem
                  key={p.id}
                  value={`${p.name} ${p.code} ${p.province}`}
                  onSelect={() => navigate(`/property/${p.id}`)}
                  className="gap-3 pl-5 pr-4 py-3 border-l-4 border-transparent data-[selected=true]:border-interactive-primary data-[selected=true]:bg-brand-subtle [animation:cmd-item-in_0.18s_cubic-bezier(0.16,1,0.3,1)_both]"
                  style={{ animationDelay: `${i * 35}ms` }}
                >
                  <div className="size-8 rounded-lg bg-surface-sunken flex items-center justify-center shrink-0">
                    <Building className="size-4 text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-secondary flex items-center gap-1.5 truncate">
                        <span className={cn("w-1.5 h-1.5 rounded-full bg-current shrink-0", healthClass(p.health))} />
                        {p.type} · {p.province}
                      </p>
                      <span className="text-xs font-mono font-medium text-foreground/60 shrink-0">{p.buy}</span>
                    </div>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-xs font-medium shrink-0",
                    statusClasses[p.statusVariant],
                  )}>
                    {p.status}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator className="bg-border-subtle" />

            {/* Documents */}
            <CommandGroup heading="Documents">
              {mockDocs.map((doc, i) => (
                <CommandItem
                  key={doc.id}
                  value={doc.name}
                  onSelect={() => navigate("/portfolio")}
                  className="gap-3 pl-5 pr-4 py-3 border-l-4 border-transparent data-[selected=true]:border-interactive-primary data-[selected=true]:bg-brand-subtle [animation:cmd-item-in_0.18s_cubic-bezier(0.16,1,0.3,1)_both]"
                  style={{ animationDelay: `${i * 35}ms` }}
                >
                  <div className={cn(
                    "size-8 rounded-lg flex items-center justify-center shrink-0",
                    doc.type === "pdf" ? "bg-status-danger-bg" : "bg-status-info-bg",
                  )}>
                    <FileText className={cn(
                      "size-4",
                      doc.type === "pdf" ? "text-status-danger-text" : "text-status-info-text",
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{doc.name}</p>
                    <p className="text-xs text-secondary flex items-center gap-1.5">
                      <span className="uppercase font-medium tracking-wide text-[10px] text-text-disabled">{doc.type}</span>
                      <span className="text-text-disabled">·</span>
                      Updated {doc.modified}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator className="bg-border-subtle" />

            {/* Navigate */}
            <CommandGroup heading="Navigate">
              {[
                { label: "Add Property", icon: Plus, path: "/add-property" },
                { label: "Analytics", icon: BarChart2, path: "/analytics" },
                { label: "All Properties", icon: LayoutGrid, path: "/portfolio" },
                { label: "Map View", icon: MapIcon, path: "/map" },
                { label: "Succession Planning", icon: Users, path: "/estate-planning" },
                { label: "Settings", icon: Settings, path: "/settings" },
                { label: "Profile", icon: UserCircle, path: "/profile" },
              ].map(({ label, icon: Icon, path }, i) => (
                <CommandItem
                  key={path}
                  value={label}
                  onSelect={() => navigate(path)}
                  className="gap-3 pl-5 pr-4 py-3 border-l-4 border-transparent data-[selected=true]:border-interactive-primary data-[selected=true]:bg-brand-subtle [animation:cmd-item-in_0.18s_cubic-bezier(0.16,1,0.3,1)_both]"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className="size-8 rounded-lg bg-brand-subtle flex items-center justify-center shrink-0">
                    <Icon className="size-4 text-interactive-primary" />
                  </div>
                  <span className="text-sm font-medium">{label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-border-default bg-[#f8f9ff]">
            <div className="flex items-center gap-1.5 text-[11px] text-secondary">
              {["↑", "↓"].map((k) => (
                <kbd key={k} className="bg-surface-base border border-border-default rounded px-1.5 py-0.5 font-medium text-secondary text-[11px]">
                  {k}
                </kbd>
              ))}
              <span>to navigate</span>
              <span className="text-text-disabled mx-1">·</span>
              <kbd className="bg-surface-base border border-border-default rounded px-1.5 py-0.5 font-medium text-secondary text-[11px]">
                Enter
              </kbd>
              <span>to open</span>
              <span className="text-text-disabled mx-1">·</span>
              <kbd className="bg-surface-base border border-border-default rounded px-1.5 py-0.5 font-medium text-secondary text-[11px]">
                Esc
              </kbd>
              <span>to dismiss</span>
            </div>
            <span className="text-[10px] font-semibold text-interactive-primary tracking-widest uppercase opacity-60">
              Valgate Search
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
