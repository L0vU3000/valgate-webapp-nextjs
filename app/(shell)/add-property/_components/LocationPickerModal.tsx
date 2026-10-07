"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { X, Search, MapPin, Plus, Minus, Map as MapIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";
import { env } from "@/lib/env";
import { useGeocode } from "@/app/_shared/add-property/_lib/use-geocode";

const DEFAULT_ZOOM = 13;

interface LocationPickerModalProps {
  center: [number, number];
  onClose: () => void;
  onConfirm: (center: [number, number]) => void;
}

export function LocationPickerModal({
  center,
  onClose,
  onConfirm,
}: LocationPickerModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [coords, setCoords] = useState<[number, number]>(center);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [visible, setVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const geocode = useGeocode();

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 260);
  }

  // Defer Mapbox init until after the browser has laid out the portal.
  // rAF alone isn't enough — the portal DOM is inserted but layout hasn't run yet.
  // A short setTimeout gives the browser one full layout + paint cycle.
  useEffect(() => {
    let destroyed = false;

    const timerId = setTimeout(() => {
      if (destroyed || !containerRef.current || mapRef.current) return;

      mapboxgl.accessToken = env.NEXT_PUBLIC_MAPBOX_TOKEN;

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        center,
        zoom: DEFAULT_ZOOM,
        attributionControl: false,
      });

      map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-left");
      mapRef.current = map;

      map.on("style.load", () => map.resize());

      map.on("load", () => {
        if (destroyed) return;
        map.resize();
        setMapLoaded(true);

        // Large draggable pin — all children absolutely positioned so el has
        // stable explicit dimensions: 48px circle + 11px triangle tip = 59px.
        // anchor:"bottom" places y=59 (the triangle tip) at the coordinate.
        const el = document.createElement("div");
        el.style.cssText = "position:relative;width:48px;height:59px;cursor:grab;";

        const circle = document.createElement("div");
        circle.style.cssText =
          "position:absolute;top:0;left:0;" +
          "width:48px;height:48px;border-radius:50%;" +
          "background:#2563eb;border:3px solid #fff;" +
          "box-shadow:0 10px 15px -3px rgba(0,0,0,0.1),0 4px 6px -4px rgba(0,0,0,0.1);" +
          "display:flex;align-items:center;justify-content:center;" +
          "transition:transform 150ms ease;";
        circle.innerHTML = `<svg width="19" height="21" viewBox="0 0 16 20" fill="none"><path d="M8 0C3.589 0 0 3.589 0 8c0 5.25 7.125 11.438 7.438 11.703a.75.75 0 0 0 1.124 0C8.875 19.438 16 13.25 16 8c0-4.411-3.589-8-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" fill="#fff"/></svg>`;

        // Triangle tip — bottom of this aligns with bottom of el (y=59)
        const point = document.createElement("div");
        point.style.cssText =
          "position:absolute;top:47px;left:50%;transform:translateX(-50%);" +
          "width:0;height:0;" +
          "border-left:8px solid transparent;" +
          "border-right:8px solid transparent;" +
          "border-top:12px solid #2563eb;";

        // Shadow sits just above the tip, within el bounds
        const shadow = document.createElement("div");
        shadow.style.cssText =
          "position:absolute;top:51px;left:50%;transform:translateX(-50%);" +
          "width:14px;height:4px;border-radius:50%;" +
          "background:rgba(0,0,0,0.18);filter:blur(1px);";

        el.appendChild(circle);
        el.appendChild(shadow);
        el.appendChild(point);
        el.addEventListener("mouseenter", () => { circle.style.transform = "scale(1.1)"; });
        el.addEventListener("mouseleave", () => { circle.style.transform = "scale(1)"; });

        const marker = new mapboxgl.Marker({ element: el, anchor: "bottom", draggable: true })
          .setLngLat(center)
          .addTo(map);

        marker.on("drag", () => {
          const { lat, lng } = marker.getLngLat();
          setCoords([lng, lat]);
        });

        markerRef.current = marker;
      });
    }, 50);

    return () => {
      destroyed = true;
      clearTimeout(timerId);
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleZoom(dir: "in" | "out") {
    mapRef.current?.easeTo({ zoom: (mapRef.current.getZoom()) + (dir === "in" ? 1 : -1) });
  }

  function formatCoords(lngLat: [number, number]) {
    const [lng, lat] = lngLat;
    return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? "E" : "W"}`;
  }

  // One layout, two presentations. Phone: full-bleed map with the header
  // (search + close) and footer card floating over it. sm+: a bordered dialog
  // where header, map and footer are stacked flex rows and the map takes the
  // remaining height.
  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex sm:items-center sm:justify-center bg-black/40 sm:backdrop-blur-sm transition-opacity duration-[250ms] ease-out"
      style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? "auto" : "none" }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className={cn(
          "relative flex flex-col w-full h-dvh overflow-hidden bg-background transition-[opacity,transform] duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
          "sm:mx-6 sm:h-[min(720px,calc(100dvh_-_4rem))] sm:max-w-[960px] sm:rounded-xl sm:border sm:border-border sm:shadow-xl",
        )}
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1) translateY(0)" : "scale(0.96) translateY(12px)",
        }}
      >
        {/* Header — floats over the map on phone, a bordered row on sm+ */}
        <div
          className={cn(
            "absolute inset-x-3 top-[calc(env(safe-area-inset-top)_+_12px)] z-20 flex items-center gap-2",
            "sm:relative sm:inset-auto sm:shrink-0 sm:gap-6 sm:px-6 sm:py-4 sm:border-b sm:border-border sm:bg-background",
          )}
        >
          <h2 className="hidden sm:block shrink-0 text-lg font-semibold leading-none text-[var(--val-heading)]">
            Set exact location
          </h2>

          <div className="relative flex-1 sm:ml-auto sm:max-w-[420px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                geocode.search(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => {
                if (geocode.suggestions.length > 0) setShowSuggestions(true);
              }}
              onBlur={() => {
                setTimeout(() => setShowSuggestions(false), 150);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") setShowSuggestions(false);
              }}
              placeholder="Search address…"
              aria-label="Search address"
              autoComplete="off"
              enterKeyHint="search"
              className={cn(
                "w-full h-11 border border-border bg-background pl-11 pr-11 text-base text-foreground placeholder:text-muted-foreground outline-none transition-[color,box-shadow,border-color]",
                "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                // Phone: floating pill over the map
                "rounded-full shadow-md",
                // sm+: the app's standard field
                "sm:h-9 sm:rounded-md sm:shadow-none sm:pl-9 sm:pr-9 sm:text-sm sm:bg-[var(--val-input-surface)]",
              )}
            />
            <Search className="absolute left-4 sm:left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            {geocode.loading ? (
              <Loader2 className="absolute right-4 sm:right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground animate-spin pointer-events-none" />
            ) : searchQuery ? (
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  setSearchQuery("");
                  setShowSuggestions(false);
                  geocode.clear();
                }}
                className="absolute right-2 sm:right-1 top-1/2 -translate-y-1/2 p-2 rounded-full sm:rounded-md hover:bg-accent transition-colors"
                aria-label="Clear search"
              >
                <X className="size-3.5 text-muted-foreground" />
              </button>
            ) : null}
            {showSuggestions && geocode.suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 z-50 max-h-[40dvh] overflow-y-auto bg-background border border-border rounded-2xl sm:rounded-lg shadow-lg">
                {geocode.suggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const [lng, lat] = s.center;
                      mapRef.current?.flyTo({ center: s.center, zoom: DEFAULT_ZOOM, duration: 800 });
                      markerRef.current?.setLngLat(s.center);
                      setCoords([lng, lat]);
                      setSearchQuery(s.placeName);
                      setShowSuggestions(false);
                      geocode.clear();
                    }}
                    className="w-full flex items-start gap-3 px-4 py-3 sm:py-2.5 hover:bg-accent transition-colors text-left border-b border-border last:border-b-0"
                  >
                    <MapPin className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-[15px] sm:text-sm font-medium text-foreground truncate">
                        {s.mainText}
                      </div>
                      <div className="text-[13px] sm:text-xs text-muted-foreground truncate">
                        {s.secondaryText}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleClose}
            className={cn(
              "flex shrink-0 items-center justify-center transition-colors text-foreground",
              "size-11 rounded-full bg-background/90 backdrop-blur border border-border shadow-md hover:bg-background",
              "sm:size-9 sm:rounded-md sm:bg-transparent sm:backdrop-blur-none sm:border-0 sm:shadow-none sm:hover:bg-accent",
            )}
            aria-label="Close"
          >
            <X className="size-5 sm:size-4" />
          </button>
        </div>

        {/* Map body — whole surface on phone, remaining height on sm+ */}
        <div className="relative flex-1 min-h-0">
          <div ref={containerRef} className="absolute inset-0" />

          {/* Loading overlay — covers the map area */}
          <div
            className={cn(
              "absolute inset-0 z-[5] flex flex-col items-center justify-center bg-background gap-3 transition-opacity duration-500",
              mapLoaded ? "opacity-0 pointer-events-none" : "opacity-100",
            )}
            onTransitionEnd={(e) => {
              if (e.propertyName === "opacity" && mapLoaded)
                (e.currentTarget as HTMLElement).style.display = "none";
            }}
          >
            <div className="flex items-center gap-2">
              <MapIcon className="size-5 text-primary animate-pulse" />
              <span className="text-[13px] font-medium text-muted-foreground">Loading map…</span>
            </div>
            <div className="w-32 h-1 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-[loading-bar_1.5s_ease-in-out_infinite]" />
            </div>
          </div>

          {/* Zoom — clears the floating footer card on phone */}
          <div className="absolute z-10 right-4 bottom-[calc(env(safe-area-inset-bottom)_+_120px)] sm:bottom-4 flex flex-col gap-2">
            <button
              onClick={() => handleZoom("in")}
              className="size-11 sm:size-9 rounded-full sm:rounded-md bg-background border border-border shadow-sm flex items-center justify-center hover:bg-accent transition-colors"
              aria-label="Zoom in"
            >
              <Plus className="size-3.5 text-foreground" />
            </button>
            <button
              onClick={() => handleZoom("out")}
              className="size-11 sm:size-9 rounded-full sm:rounded-md bg-background border border-border shadow-sm flex items-center justify-center hover:bg-accent transition-colors"
              aria-label="Zoom out"
            >
              <Minus className="size-3.5 text-foreground" />
            </button>
          </div>
        </div>

        {/* Footer — floating card on phone; on sm+ a bordered row with the
            coordinates on the left and the actions on the right */}
        <div
          className={cn(
            "absolute inset-x-3 bottom-[calc(env(safe-area-inset-bottom)_+_12px)] z-10 flex flex-col gap-2 p-3 bg-background border border-border rounded-2xl shadow-lg",
            "sm:relative sm:inset-auto sm:shrink-0 sm:flex-row sm:items-center sm:gap-3 sm:px-6 sm:py-4 sm:rounded-none sm:border-0 sm:border-t sm:shadow-none",
          )}
        >
          <div className="flex min-w-0 items-center gap-2 px-1 pt-1 sm:p-0 sm:mr-auto">
            <MapPin className="size-4 text-muted-foreground shrink-0" />
            <span className="text-[13px] sm:text-sm font-medium tabular-nums text-foreground truncate">
              {formatCoords(coords)}
            </span>
          </div>

          <Button variant="ghost" onClick={handleClose} className="hidden sm:inline-flex">
            Cancel
          </Button>
          <Button
            onClick={() => { onConfirm(coords); handleClose(); }}
            className="w-full h-12 rounded-full text-[15px] sm:w-auto sm:h-10 sm:rounded-md sm:text-sm"
          >
            Confirm location
          </Button>
          <button
            onClick={handleClose}
            className="sm:hidden min-h-11 w-full text-center text-[14px] text-secondary underline underline-offset-4 hover:text-foreground transition-colors py-3"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
