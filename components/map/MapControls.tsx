"use client";

import type React from "react";
import { Layers, RefreshCw, ZoomIn, ZoomOut } from "lucide-react";
import { MapIconButton } from "@/components/home/QuickStats";
import { cn } from "@/components/ui/utils";

const CAMBODIA_CENTER: [number, number] = [104.9, 12.5];
const CAMBODIA_ZOOM = 7;

/**
 * Only the three camera methods used below, named structurally rather than pinned to one
 * renderer's `Map` class. The portfolio map runs MapLibre (Google tiles) and the property detail
 * map still runs Mapbox; a union of the two `Map` types is unusable because their overloaded
 * signatures do not merge, so this is the smaller honest type. It also keeps both ~500 kB
 * libraries out of any bundle that merely renders these buttons — no runtime import either way.
 */
interface CameraMap {
  zoomIn: () => unknown;
  zoomOut: () => unknown;
  flyTo: (options: { center: [number, number]; zoom: number }) => unknown;
}

interface MapControlsProps {
  mapRef: React.RefObject<CameraMap | null>;
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
