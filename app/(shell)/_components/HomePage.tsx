"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
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
  LocateFixed,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageWithFallback } from "@/components/figma/ImageWithFallback";
import { getPropertyCoverUrl } from "@/app/actions/property-photos";
import { pickHeroImage } from "@/lib/property-hero";
import { cn } from "@/components/ui/utils";
import { progressClass, progressBgClass, titleToVariant } from "@/lib/property-helpers";
import type { HomeProperty, TitleVariant, PortfolioStats } from "@/app/(shell)/queries";
import type { Document } from "@/lib/data/types/document";
import { formatCurrency, formatDate } from "@/lib/format";
import { CommandPalette } from "@/components/home/CommandPalette";
import { PropertyTable } from "@/components/portfolio/PropertyTable";
import type { TableAnimationConfig } from "@/components/portfolio/PropertyTable";
import { PortfolioLegend } from "./PortfolioLegend";
import { QuickAddPinLayer } from "./QuickAddPinLayer";
import { QuickAddPanel } from "./QuickAddPanel";
import { QuickAddSearch } from "./QuickAddSearch";
import { useQuickAdd } from "./use-quick-add";
import type * as mapboxgl from "maplibre-gl";

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
  const [tableOpen, setTableOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [placeholderVisible, setPlaceholderVisible] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isSatellite, setIsSatellite] = useState(false);
  // The property quick-add just created, held until the refreshed list contains it (see the handoff
  // effect below). Non-null means "creation succeeded, waiting for the server data".
  const [handoffId, setHandoffId] = useState<string | null>(null);
  // Cover photo for the currently-open drawer, resolved lazily when a pin is selected
  // (signed urls are short-lived, so we sign one on open rather than all up front).
  const [drawerCover, setDrawerCover] = useState<{ id: string; url: string | null } | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const router = useRouter();

  const quickAdd = useQuickAdd();

  // Map clicks drop the quick-add pin. Wired here rather than inside MapView so the map component
  // stays unaware of quick-add, and unwired the moment the mode is off — a stray click must not drop
  // a pin while the user is just browsing.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !quickAdd.active || !mapLoaded) return;
    const canvas = map.getCanvas();
    const prevCursor = canvas.style.cursor;
    // A bare crosshair says "something will happen"; it does not say what, and it is the same
    // cursor every map tool uses. This one names the action and carries the brand colour, so the
    // armed state is unmistakable even before the first pin is placed. The ring is drawn INSIDE
    // the glyph area (hotspot 16,16, a dot) so the point that clicks is visibly the point that
    // drops — a cursor whose hotspot is not where the mark is feels broken at high zoom.
    // Plain "#2563eb" — NOT "%232563eb". encodeURIComponent below already escapes the "#" to
    // "%23"; pre-escaping it here would double-encode to "%2523", and the SVG would then contain
    // the literal text "%232563eb", which is not a colour, so the ring and dot would render black.
    const CURSOR_HOTSPOT = "16 16";
    const armCursor = `url("data:image/svg+xml,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">' +
        "<circle cx='16' cy='16' r='11' fill='none' stroke='white' stroke-width='4'/>" +
        "<circle cx='16' cy='16' r='11' fill='none' stroke='#2563eb' stroke-width='2'/>" +
        "<circle cx='16' cy='16' r='2.5' fill='#2563eb' stroke='white' stroke-width='1.5'/>" +
        "</svg>",
    )}") ${CURSOR_HOTSPOT}, crosshair`;
    canvas.style.cursor = armCursor;
    const onClick = (e: mapboxgl.MapMouseEvent) => {
      quickAdd.dropPin([e.lngLat.lng, e.lngLat.lat]);
    };
    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
      // Only unwind our own cursor. Mapbox writes this same property during a pan/drag, and this
      // effect is torn down and re-created whenever the mode toggles — restoring a captured value
      // blindly would stomp a cursor Mapbox set in the meantime and leave a stuck targeting cursor.
      if (canvas.style.cursor === armCursor) canvas.style.cursor = prevCursor;
    };
    // Deps are the primitives, not the `quickAdd` object itself: that object is rebuilt every render,
    // which would tear down and re-add the click listener on every render for no reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quickAdd.active, quickAdd.dropPin, mapLoaded]);

  // Bring the highlighted suggestion into view. Only the suggestion list sets `preview`, so a pin
  // the user tapped or dragged is left alone — it is already where they were looking, and flying on
  // every drag would fight the gesture. Reduced motion jumps instead of travelling: the address is
  // the information, the flight is not.
  const quickAddPreview = quickAdd.preview;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !quickAddPreview) return;
    const [lng, lat] = quickAddPreview;
    if (quickAdd.reducedMotion.current) {
      map.jumpTo({ center: [lng, lat] });
    } else {
      // 700ms, not the 900ms of a deliberate "take me there": this replays on every arrow key, so it
      // has to settle before the next one lands or the camera never stops moving.
      map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 15), duration: 700 });
    }
  }, [quickAddPreview, quickAdd.reducedMotion]);

  // The pin the quick-add card renders, or null when there is no card. Gated on a DROPPED PIN, not
  // on the mode being armed: the card does not exist until then, so anything that offsets itself for
  // that slot must not move before there is a card in it.
  const quickAddCardPin = quickAdd.active ? quickAdd.pin : null;

  const startQuickAdd = useCallback(() => {
    // The quick-add card and the property drawer share one slot, so opening one closes the other.
    setSelectedPin(null);
    quickAdd.start();
  }, [quickAdd]);

  const handleQuickAddConfirm = useCallback(async () => {
    const id = await quickAdd.confirm();
    if (!id) return;
    // The property exists now. Point the drawer at it and re-fetch the server-rendered data so the
    // map, the stats bar and the drawer all see it — without the refresh, the record is in the DB
    // while `initialProperties` (which both the map's markers and the drawer's lookup read) is still
    // the list from page load.
    //
    // The card is closed by the effect below, not here: the drawer can only render once the new
    // property is in `initialProperties`, so closing the card now would leave the slot empty for
    // however long the refresh takes.
    setHandoffId(id);
    setSelectedPin(id);
    router.refresh();
  }, [quickAdd, router]);

  // Hand the card's slot to the drawer in a single commit: this runs on the render where the
  // refreshed property list first contains the new record, so the card unmounts and the drawer
  // mounts together and the sidebar is never empty in between.
  //
  // Deps use `quickAdd.active`, not the `quickAdd` object: that object is rebuilt every render, so
  // depending on it would re-run this effect constantly — the same reason the map-click effect above
  // lists primitives.
  const quickAddActive = quickAdd.active;
  const quickAddCancel = quickAdd.cancel;
  useEffect(() => {
    if (!handoffId || !quickAddActive) return;
    if (!initialProperties.some((p) => p.id === handoffId)) return;
    quickAddCancel();
    setHandoffId(null);
  }, [handoffId, quickAddActive, quickAddCancel, initialProperties]);

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

  // Drawer hero: real cover photo → the property's static map → placeholder (via the
  // shared ladder). Replaces the old hardcoded stock image. The map url mirrors the
  // overview hero's Mapbox static-image format.
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const drawerMapUrl =
    drawerProperty && mapboxToken && (drawerProperty.lat !== 0 || drawerProperty.lng !== 0)
      ? `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/pin-l+2563eb(${drawerProperty.lng},${drawerProperty.lat})/${drawerProperty.lng},${drawerProperty.lat},13,0/640x360@2x?access_token=${mapboxToken}`
      : null;
  const drawerCoverUrl =
    drawerCover && drawerProperty && drawerCover.id === drawerProperty.id ? drawerCover.url : null;
  const drawerHero = pickHeroImage(drawerCoverUrl, drawerMapUrl);

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
      // Quick-add owns the map while it is armed. Without this, tapping an existing property pin
      // also sets `selectedPin` — invisible at the time (the drawer is suppressed while quick-add is
      // active), then the property drawer springs open on cancel, long after the click that caused it.
      if (quickAdd.active) return;
      if (selectedPin === pinId) {
        closeDrawer();
      } else {
        setClosingKey(null);
        setSelectedPin(pinId);
      }
    },
    [selectedPin, closeDrawer, quickAdd.active],
  );

  // Resolve the selected property's cover photo when a drawer opens. A missing/expired
  // cover resolves to null, so the drawer hero falls back to the map (then placeholder).
  useEffect(() => {
    if (!selectedPin) return;
    let cancelled = false;
    getPropertyCoverUrl(selectedPin).then((result) => {
      if (!cancelled && result.ok) setDrawerCover({ id: selectedPin, url: result.data.url });
    });
    return () => { cancelled = true; };
  }, [selectedPin]);

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
          className={cn(
            "absolute z-10 flex justify-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] px-4 sm:px-0",
            "top-[calc(env(safe-area-inset-top)+24px)] sm:top-6 left-0 right-0",
            // Desktop drawer sits on the right — shrink the trigger area so it
            // stays centered in the remaining map space. On mobile the drawer
            // is a bottom sheet, so the offset only applies from `sm:` up.
            selectedProperty && "sm:right-80",
          )}
        >
          <div className={cn(
            "flex flex-col items-center gap-3 w-full max-w-[calc(100%-2rem)] sm:w-[700px] sm:max-w-[calc(100%-3rem)]",
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
          <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto scrollbar-none -mx-4 sm:mx-0 px-4 sm:px-0 py-1">
            {[
              // Quick Add is deliberately NOT in this row — it is the map's primary action, so it
              // lives as its own blue button above the stats bar. These chips stay for the
              // secondary destinations, and "New Property" remains for users who already know the
              // address and would rather type it than point at it.
              { label: "New Property", icon: Plus, action: () => router.push("/add-property") },
              { label: "Portfolio", icon: BarChart2, action: () => router.push("/portfolio") },
              { label: "Documents", icon: FileText, action: () => setCommandOpen(true) },
              { label: "Rental", icon: Users, action: () => router.push("/rental") },
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
        <PortfolioLegend
          stats={portfolioStats}
          mapLoaded={mapLoaded}
          drawerOpen={!!drawerProperty || !!quickAddCardPin}
          quickAddOpen={quickAdd.active}
          action={
            // The map's primary action, so it gets the brand colour and reads as a button rather
            // than one of the white chips. It sits above the stats bar because that is where the
            // eye already goes for "what's on this map" — and it is rendered by PortfolioLegend so
            // it inherits the legend's safe-area and drawer offsets instead of duplicating them.
            //
            // Armed, the button IS the address field: the same slot, no second control to find. The
            // field is desktop-only (QuickAddSearch hides itself under `sm`), so the cancel button
            // stays behind it for the phone, where the bottom sheet covers the legend anyway.
            quickAdd.active ? (
              <div className="flex items-center gap-2">
                <QuickAddSearch
                  query={quickAdd.query}
                  suggestions={quickAdd.suggestions}
                  loading={quickAdd.searching}
                  onChange={quickAdd.searchAddress}
                  onHighlight={quickAdd.highlightAddress}
                  onPick={quickAdd.pickAddress}
                />
                <button
                  onClick={quickAdd.cancel}
                  aria-label="Cancel quick add"
                  className="hidden items-center gap-2 rounded-full border border-border-default bg-surface-base px-5 py-2.5 text-sm font-semibold text-foreground shadow-lg transition-all duration-200 active:scale-[0.98] sm:flex"
                >
                  <X className="size-4" />
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={startQuickAdd}
                aria-label="Quick Add a property on the map"
                className={cn(
                  "flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-lg transition-all duration-200 active:scale-[0.98]",
                  "bg-interactive-primary text-white hover:bg-interactive-primary-hover hover:shadow-xl",
                  mapLoaded ? "[animation:fade-slide-up_0.4s_cubic-bezier(0.16,1,0.3,1)_250ms_both]" : "opacity-0",
                )}
              >
                <LocateFixed className="size-4" />
                Quick Add
              </button>
            )
          }
        />

        {/* Map controls */}
        <MapControls
          mapRef={mapRef}
          drawerOpen={!!selectedProperty || !!quickAddCardPin}
          isSatellite={isSatellite}
          onToggleSatellite={() => setIsSatellite((s) => !s)}
        />

        {/* Quick-add pin. Owned by its own layer because MapView's markers are a Supercluster view of
            saved properties that rebuilds on every map move — a pin being dragged is neither. The
            address is looked up on drop and on drag end, so it follows the pin.
            `preview` wins while it exists: the suggestion the list is pointing at is the thing the
            camera is flying to, so it must be the thing on screen. */}
        <QuickAddPinLayer
          mapRef={mapRef}
          active={quickAdd.active}
          pin={quickAdd.preview ?? quickAdd.pin?.center ?? null}
          preview={!!quickAdd.preview}
          onPinChange={quickAdd.resolveAt}
          reducedMotion={quickAdd.reducedMotion.current}
        />

        {/* Quick-add card. Gated on a real pin: a suggestion being previewed is not a dropped pin,
            and the card is only ever the answer to "what is at this pin?" — it has nothing to say
            before one exists. */}
        {quickAddCardPin && (
          <QuickAddPanel
            pin={quickAddCardPin}
            resolving={quickAdd.resolving}
            saving={quickAdd.saving}
            error={quickAdd.error}
            fields={quickAdd.fields}
            onFieldChange={quickAdd.setField}
            onConfirm={handleQuickAddConfirm}
            onCancel={quickAdd.cancel}
          />
        )}

        {/* Property info panel.
            Phone (Apple Maps pattern): bottom-anchored sheet with rounded top,
            grab handle, ~55dvh height, slides up from below. Map stays visible
            above and remains pan-able.
            Tablet+: full-height floating sidebar pinned to the right (original). */}
        {drawerProperty && !quickAdd.active && (
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

            {/* Hero image with overlay info — real cover photo, else the property's map */}
            <div className="relative shrink-0 overflow-hidden">
              <ImageWithFallback
                key={drawerHero?.src ?? "placeholder"}
                src={drawerHero?.src ?? ""}
                alt={drawerHero?.kind === "cover" ? `${drawerProperty.name} cover photo` : drawerProperty.name}
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
              <div className="absolute bottom-0 left-0 right-0 px-4 pb-3.5 flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-white/70">{drawerProperty.code}</p>
                  <h3 className="text-[15px] sm:text-[18px] font-display font-semibold text-white leading-snug mt-0.5">{drawerProperty.name}</h3>
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin className="size-3 text-white/50 shrink-0" />
                    <span className="text-xs text-white/65 truncate">
                      {[drawerProperty.city, drawerProperty.province].filter(Boolean).join(", ")}
                    </span>
                  </div>
                </div>
                {/* Small edit-property button → overview with the edit wizard auto-opened */}
                <button
                  onClick={() => router.push(`/property/${drawerProperty.id}/overview?edit=1`)}
                  aria-label="Edit property"
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 text-white text-[11px] font-semibold px-2.5 py-1 hover:bg-white/25 active:scale-95 transition-[background-color,transform] duration-150"
                >
                  <Pencil className="size-3" />
                  Edit
                </button>
              </div>
            </div>

            {/* Progress strip */}
            <div className="px-4 py-3 border-b border-border-default shrink-0 [animation:card-row-in_0.35s_cubic-bezier(0.16,1,0.3,1)_0.2s_both]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">Progress</span>
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
                    <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 whitespace-nowrap">Property</span>
                    <div className="flex-1 h-px bg-border-subtle" />
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-0.5">Type</p>
                      <p className="text-sm font-medium text-foreground capitalize">{drawerProperty.type}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-0.5">Use</p>
                      <p className="text-sm font-medium text-foreground capitalize">{drawerProperty.propertyUse || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-0.5">Title</p>
                      <p className={cn("text-sm font-medium", titleClasses[titleToVariant(drawerProperty.title)])}>{drawerProperty.title}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-0.5">Year Built</p>
                      <p className="text-sm font-medium text-foreground">{drawerProperty.yearBuilt || "—"}</p>
                    </div>
                  </div>
                </section>

                {/* Section: Physical */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 whitespace-nowrap">Physical</span>
                    <div className="flex-1 h-px bg-border-subtle" />
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-0.5">Total Area</p>
                      <p className="text-sm font-medium text-foreground">
                        {drawerProperty.totalArea ? `${Number(drawerProperty.totalArea).toLocaleString()} m²` : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-0.5">Parking</p>
                      <p className="text-sm font-medium text-foreground">{drawerProperty.parkingSpaces || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-0.5">Bedrooms</p>
                      <p className="text-sm font-medium text-foreground">{drawerProperty.bedrooms || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-0.5">Bathrooms</p>
                      <p className="text-sm font-medium text-foreground">{drawerProperty.bathrooms || "—"}</p>
                    </div>
                  </div>
                </section>

                {/* Section: Location */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 whitespace-nowrap">Location</span>
                    <div className="flex-1 h-px bg-border-subtle" />
                  </div>
                  <div className="space-y-3">
                    {drawerProperty.addressLine && (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-0.5">Address</p>
                        <p className="text-sm font-medium text-foreground">
                          {drawerProperty.addressLine}{drawerProperty.addressLine2 ? `, ${drawerProperty.addressLine2}` : ""}
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-0.5">City</p>
                        <p className="text-sm font-medium text-foreground">{drawerProperty.city || "—"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-0.5">Province</p>
                        <p className="text-sm font-medium text-foreground">{drawerProperty.province || "—"}</p>
                      </div>
                      {drawerProperty.country && (
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-0.5">Country</p>
                          <p className="text-sm font-medium text-foreground">{drawerProperty.country}</p>
                        </div>
                      )}
                      {drawerProperty.zip && (
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-0.5">ZIP</p>
                          <p className="text-sm font-medium text-foreground">{drawerProperty.zip}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* Section: Financials */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 whitespace-nowrap">Financials</span>
                    <div className="flex-1 h-px bg-border-subtle" />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-0.5">Purchase Price</p>
                      <p className="text-[22px] sm:text-[26px] font-bold font-display text-foreground leading-none tabular-nums">{drawerProperty.buy}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-0.5">Market Value</p>
                        <p className="text-sm font-medium text-foreground">
                          {drawerProperty.currentMarketValue ? formatCurrency(drawerProperty.currentMarketValue) : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-0.5">Mortgage</p>
                        <p className="text-sm font-medium text-foreground">
                          {drawerProperty.outstandingMortgage ? formatCurrency(drawerProperty.outstandingMortgage) : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-0.5">Monthly</p>
                        <p className="text-sm font-medium text-foreground">
                          {drawerProperty.monthlyPayment ? `$${drawerProperty.monthlyPayment.toLocaleString()}` : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-0.5">Annual Tax</p>
                        <p className="text-sm font-medium text-foreground">
                          {drawerProperty.annualPropertyTax ? `$${drawerProperty.annualPropertyTax.toLocaleString()}` : "—"}
                        </p>
                      </div>
                    </div>
                    {drawerProperty.purchaseDate ? (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 mb-0.5">Purchased</p>
                        <p className="text-sm font-medium text-foreground">{formatDate(drawerProperty.purchaseDate)}</p>
                      </div>
                    ) : null}
                  </div>
                </section>

              </div>
            </div>

            {/* CTA */}
            <div className="px-4 py-3 shrink-0 border-t border-border-default flex items-center gap-2 [animation:card-row-in_0.35s_cubic-bezier(0.16,1,0.3,1)_0.5s_both]">
              <button
                onClick={() => router.push(`/property/${drawerProperty.id}/overview?edit=1`)}
                aria-label="Edit property"
                className="shrink-0 flex items-center justify-center size-10 rounded-lg border border-border-default text-secondary hover:bg-surface-tint hover:text-foreground active:scale-[0.98] transition-all duration-150"
              >
                <Pencil className="size-4" />
              </button>
              <button
                onClick={() => router.push(`/property/${drawerProperty.id}`)}
                className="group flex-1 flex items-center justify-between px-4 py-2.5 rounded-lg bg-interactive-primary text-white text-sm font-medium hover:brightness-110 active:scale-[0.98] transition-all duration-150"
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
          className="flex items-center justify-between px-4 sm:px-6 py-2.5 cursor-pointer group hover:bg-surface-tint transition-colors duration-150"
          onClick={() => setTableOpen(!tableOpen)}
        >
          <h2 className="text-[18px] sm:text-[24px] font-bold font-display text-foreground">
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
