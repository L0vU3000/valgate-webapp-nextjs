"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import type mapboxgl from "mapbox-gl";
import { X, Map as MapIcon } from "lucide-react";
import { cn } from "@/components/ui/utils";
import { MapControls } from "@/components/map/MapControls";

const PropertyDetailMap = dynamic(
  () => import("@/components/map/PropertyDetailMap").then((m) => m.PropertyDetailMap),
  { ssr: false },
);

interface PropertyMapExpandModalProps {
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  onClose: () => void;
}

export function PropertyMapExpandModal({
  lat,
  lng,
  title,
  subtitle,
  onClose,
}: PropertyMapExpandModalProps) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [visible, setVisible] = useState(false);
  const propertyCenter: [number, number] = [lng, lat];

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 260);
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm transition-opacity duration-[250ms] ease-out"
      style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? "auto" : "none" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className={cn(
          "absolute inset-3 flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-background shadow-2xl transition-[opacity,transform] duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)] sm:inset-4",
          visible ? "opacity-100 scale-100" : "opacity-0 scale-[0.98]",
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-foreground">{title}</h2>
            {subtitle && (
              <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground transition-[colors,transform] duration-150 hover:bg-accent active:scale-95"
            aria-label="Close map"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="relative min-h-0 flex-1">
          <PropertyDetailMap
            lat={lat}
            lng={lng}
            onLoad={() => setMapLoaded(true)}
            onMapReady={(map) => {
              mapRef.current = map;
            }}
            className="absolute inset-0"
          />

          <div
            className={cn(
              "absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background transition-opacity duration-500",
              mapLoaded ? "pointer-events-none opacity-0" : "opacity-100",
            )}
            onTransitionEnd={(e) => {
              if (e.propertyName === "opacity" && mapLoaded) {
                (e.currentTarget as HTMLElement).style.display = "none";
              }
            }}
          >
            <div className="flex items-center gap-2">
              <MapIcon className="size-5 animate-pulse text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Loading map…</span>
            </div>
            <div className="h-1 w-32 overflow-hidden rounded-full bg-muted">
              <div className="h-full animate-[loading-bar_1.5s_ease-in-out_infinite] rounded-full bg-primary" />
            </div>
          </div>

          <MapControls
            mapRef={mapRef}
            resetCenter={propertyCenter}
            resetZoom={15}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
