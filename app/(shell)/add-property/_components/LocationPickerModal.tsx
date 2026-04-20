"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { X, Search, MapPin, Plus, Minus } from "lucide-react";
import { env } from "@/lib/env";

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

        // Large draggable pin
        const el = document.createElement("div");
        el.style.cssText =
          "display:flex;flex-direction:column;align-items:center;cursor:grab;width:48px;";

        const circle = document.createElement("div");
        circle.style.cssText = `
          width:48px;height:48px;border-radius:50%;
          background:#2563eb;border:3px solid #fff;
          box-shadow:0 10px 15px -3px rgba(0,0,0,0.1),0 4px 6px -4px rgba(0,0,0,0.1);
          display:flex;align-items:center;justify-content:center;
          transition:transform 150ms ease;
        `;
        circle.innerHTML = `<svg width="19" height="21" viewBox="0 0 16 20" fill="none"><path d="M8 0C3.589 0 0 3.589 0 8c0 5.25 7.125 11.438 7.438 11.703a.75.75 0 0 0 1.124 0C8.875 19.438 16 13.25 16 8c0-4.411-3.589-8-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" fill="#fff"/></svg>`;

        const point = document.createElement("div");
        point.style.cssText = `
          width:0;height:0;
          border-left:8px solid transparent;
          border-right:8px solid transparent;
          border-top:12px solid #2563eb;
          margin-top:-1px;
        `;

        const shadow = document.createElement("div");
        shadow.style.cssText = `
          width:16px;height:6px;border-radius:50%;
          background:rgba(0,0,0,0.2);filter:blur(1px);margin-top:4px;
        `;

        el.appendChild(circle);
        el.appendChild(point);
        el.appendChild(shadow);
        el.addEventListener("mouseenter", () => { circle.style.transform = "scale(1.1)"; });
        el.addEventListener("mouseleave", () => { circle.style.transform = "scale(1)"; });

        const marker = new mapboxgl.Marker({ element: el, anchor: "top", draggable: true })
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
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  function handleZoom(dir: "in" | "out") {
    mapRef.current?.easeTo({ zoom: (mapRef.current.getZoom()) + (dir === "in" ? 1 : -1) });
  }

  function formatCoords(lngLat: [number, number]) {
    const [lng, lat] = lngLat;
    return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? "E" : "W"}`;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative bg-white overflow-hidden w-full mx-6"
        style={{
          maxWidth: 860,
          height: 640,
          borderRadius: 48,
          boxShadow:
            "0px 0px 0px 1px rgba(0,0,0,0.02), 0px 2px 6px 0px rgba(0,0,0,0.04), 0px 20px 40px 0px rgba(0,0,0,0.18)",
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
            onClick={onClose}
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
              placeholder="Search address…"
              className="w-full border border-border rounded-full pl-12 pr-10 py-3 text-[16px] font-medium text-foreground bg-white placeholder:text-muted-foreground shadow-sm focus:outline-none focus:border-primary transition-colors"
              style={{ fontFamily: "var(--font-display)" }}
            />
            <Search className="absolute left-[19px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground pointer-events-none" />
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-accent/60 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-[14px] h-[14px] text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Map — explicit top + height so Mapbox always measures a non-zero container */}
        <div
          ref={containerRef}
          className="absolute left-0 right-0"
          style={{ top: 163, height: 392 }}
        />

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
            onClick={onClose}
            className="px-5 py-2.5 text-[16px] font-medium text-[#434655] hover:text-foreground transition-colors"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(coords); onClose(); }}
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
