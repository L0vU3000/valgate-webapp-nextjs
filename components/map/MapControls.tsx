"use client";

import type React from "react";
import { RefreshCw, ZoomIn, ZoomOut } from "lucide-react";
import { MapIconButton } from "@/components/home/QuickStats";
import { cn } from "@/components/ui/utils";
import mapboxgl from "mapbox-gl";

const CAMBODIA_CENTER: [number, number] = [104.9, 12.5];
const CAMBODIA_ZOOM = 7;

interface MapControlsProps {
  mapRef: React.RefObject<mapboxgl.Map | null>;
  drawerOpen?: boolean;
  resetCenter?: [number, number];
  resetZoom?: number;
}

export function MapControls({
  mapRef,
  drawerOpen = false,
  resetCenter = CAMBODIA_CENTER,
  resetZoom = CAMBODIA_ZOOM,
}: MapControlsProps) {
  return (
    <div
      className={cn(
        "absolute bottom-4 flex flex-col gap-2 z-10 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
        drawerOpen ? "right-[22rem]" : "right-4",
      )}
      data-no-drag
    >
      <MapIconButton onClick={() => mapRef.current?.zoomIn()}>
        <ZoomIn className="size-4" />
      </MapIconButton>
      <MapIconButton onClick={() => mapRef.current?.zoomOut()}>
        <ZoomOut className="size-4" />
      </MapIconButton>
      <MapIconButton
        spin
        onClick={() =>
          mapRef.current?.flyTo({ center: resetCenter, zoom: resetZoom })
        }
      >
        <RefreshCw className="size-4" />
      </MapIconButton>
    </div>
  );
}
