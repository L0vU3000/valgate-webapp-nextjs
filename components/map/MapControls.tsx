"use client";

import type React from "react";
import { Layers, RefreshCw, ZoomIn, ZoomOut } from "lucide-react";
import { MapIconButton } from "@/components/home/QuickStats";
import { cn } from "@/components/ui/utils";
// Type-only import: this component uses `mapboxgl.Map` solely as a type on `mapRef`,
// never the runtime. `import type` keeps the ~500 kB mapbox-gl library out of any
// bundle that pulls in MapControls.
import type mapboxgl from "mapbox-gl";

const CAMBODIA_CENTER: [number, number] = [104.9, 12.5];
const CAMBODIA_ZOOM = 7;

interface MapControlsProps {
  mapRef: React.RefObject<mapboxgl.Map | null>;
  drawerOpen?: boolean;
  resetCenter?: [number, number];
  resetZoom?: number;
  isSatellite?: boolean;
  onToggleSatellite?: () => void;
}

export function MapControls({
  mapRef,
  drawerOpen = false,
  resetCenter = CAMBODIA_CENTER,
  resetZoom = CAMBODIA_ZOOM,
  isSatellite = false,
  onToggleSatellite,
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
      <MapIconButton
        onClick={onToggleSatellite}
        className={cn(isSatellite && "bg-interactive-primary text-white hover:bg-interactive-primary/90")}
      >
        <Layers className="size-4" />
      </MapIconButton>
    </div>
  );
}
