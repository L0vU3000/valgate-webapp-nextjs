"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { X, Search, MapPin, Plus, Minus, Map as MapIcon, Loader2 } from "lucide-react";
import { cn } from "@/components/ui/utils";
import { env } from "@/lib/env";
import { useGeocode } from "../_lib/use-geocode";

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
    let timerId: ReturnType<typeof setTimeout>;
    let destroyed = false;

    timerId = setTimeout(() => {
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

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-[250ms] ease-out"
      style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? "auto" : "none" }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="relative bg-white overflow-hidden w-full mx-6 transition-[opacity,transform] duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          maxWidth: 860,
          height: 640,
          borderRadius: 48,
          boxShadow:
            "0px 0px 0px 1px rgba(0,0,0,0.02), 0px 2px 6px 0px rgba(0,0,0,0.04), 0px 20px 40px 0px rgba(0,0,0,0.18)",
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1) translateY(0)" : "scale(0.96) translateY(12px)",
        }}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-5 bg-white border-b border-border">
          <h2
            className="text-[22px] font-semibold text-foreground leading-[33px]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Set exact location
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-accent/60 transition-colors"
            aria-label="Close"
          >
            <X className="w-[14px] h-[14px] text-foreground" />
          </button>
        </div>

        {/* Search bar */}
        <div className="absolute top-[73px] left-0 right-0 z-10 px-6 py-4 bg-white">
          <div className="relative">
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
              autoComplete="off"
              className="w-full border border-border rounded-full pl-12 pr-10 py-3 text-[16px] font-medium text-foreground bg-white placeholder:text-muted-foreground shadow-sm focus:outline-none focus:border-primary transition-colors"
              style={{ fontFamily: "var(--font-display)" }}
            />
            <Search className="absolute left-[19px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground pointer-events-none" />
            {geocode.loading ? (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-muted-foreground animate-spin pointer-events-none" />
            ) : searchQuery ? (
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  setSearchQuery("");
                  setShowSuggestions(false);
                  geocode.clear();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-accent/60 transition-colors"
                aria-label="Clear search"
              >
                <X className="w-[14px] h-[14px] text-muted-foreground" />
              </button>
            ) : null}
            {showSuggestions && geocode.suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-border rounded-2xl shadow-lg z-50 overflow-hidden">
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
                    className="w-full flex items-start gap-3 px-5 py-3 hover:bg-accent/60 transition-colors text-left border-b border-border last:border-b-0"
                  >
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div
                        className="text-[15px] font-medium text-foreground truncate"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {s.mainText}
                      </div>
                      <div className="text-[13px] text-muted-foreground truncate">
                        {s.secondaryText}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Map — explicit top + height so Mapbox always measures a non-zero container */}
        <div
          ref={containerRef}
          className="absolute left-0 right-0"
          style={{ top: 163, height: 392 }}
        />

        {/* Loading overlay */}
        <div
          className={cn(
            "absolute left-0 right-0 z-20 flex flex-col items-center justify-center bg-background gap-3 transition-opacity duration-500",
            mapLoaded ? "opacity-0 pointer-events-none" : "opacity-100",
          )}
          style={{ top: 163, height: 392 }}
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

        {/* Coordinates overlay */}
        <div className="absolute bottom-[101px] left-4 z-10 flex items-center gap-2 px-3.5 py-[7px] rounded-full border border-border bg-background/90 backdrop-blur-sm shadow-sm">
          <MapPin className="w-[14px] h-[14px] text-muted-foreground shrink-0" />
          <span
            className="text-[14px] font-medium text-[#434655] whitespace-nowrap"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {formatCoords(coords)}
          </span>
        </div>

        {/* Zoom controls */}
        <div className="absolute bottom-[101px] right-4 z-10 flex flex-col gap-2">
          <button
            onClick={() => handleZoom("in")}
            className="w-10 h-10 rounded-full bg-white border border-border flex items-center justify-center hover:bg-accent/60 transition-colors"
            style={{ boxShadow: "0px 1px 3px 0px rgba(0,0,0,0.1),0px 1px 2px -1px rgba(0,0,0,0.1)" }}
            aria-label="Zoom in"
          >
            <Plus className="w-[14px] h-[14px] text-foreground" />
          </button>
          <button
            onClick={() => handleZoom("out")}
            className="w-10 h-10 rounded-full bg-white border border-border flex items-center justify-center hover:bg-accent/60 transition-colors"
            style={{ boxShadow: "0px 1px 3px 0px rgba(0,0,0,0.1),0px 1px 2px -1px rgba(0,0,0,0.1)" }}
            aria-label="Zoom out"
          >
            <Minus className="w-[14px] h-[14px] text-foreground" />
          </button>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-end gap-4 px-6 py-5 bg-white border-t border-border">
          <button
            onClick={handleClose}
            className="px-5 py-2.5 text-[16px] font-medium text-[#434655] hover:text-foreground transition-colors"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(coords); handleClose(); }}
            className="px-6 py-2.5 text-[16px] font-medium text-white bg-foreground rounded-2xl hover:bg-foreground/90 transition-colors"
            style={{ fontFamily: "var(--font-display)", boxShadow: "0px 1px 2px 0px rgba(0,0,0,0.05)" }}
          >
            Confirm location
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
