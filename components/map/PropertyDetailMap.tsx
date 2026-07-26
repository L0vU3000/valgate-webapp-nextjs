"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { env } from "@/lib/env";
import { useShellContext } from "@/components/layout/shell-context";
import { createMapIfSupported } from "@/components/map/map-support";

const DEFAULT_ZOOM = 15;

interface PropertyDetailMapProps {
  lat: number;
  lng: number;
  zoom?: number;
  onMapReady?: (map: mapboxgl.Map) => void;
  onLoad?: () => void;
  className?: string;
}

export function PropertyDetailMap({
  lat,
  lng,
  zoom = DEFAULT_ZOOM,
  onMapReady,
  onLoad,
  className,
}: PropertyDetailMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [isMapUnavailable, setIsMapUnavailable] = useState(false);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const { isDark } = useShellContext();
  const center: [number, number] = [lng, lat];

  function addMarker(map: mapboxgl.Map) {
    markerRef.current?.remove();

    const el = document.createElement("div");
    el.style.cssText = "width:36px;height:36px;cursor:default;";

    const circle = document.createElement("div");
    circle.style.cssText =
      "width:36px;height:36px;border-radius:50%;" +
      "background:#2563eb;border:3px solid #fff;" +
      "box-shadow:0 2px 8px rgba(0,0,0,0.25);" +
      "display:flex;align-items:center;justify-content:center;";
    circle.innerHTML = `<svg width="16" height="20" viewBox="0 0 16 20" fill="none"><path d="M8 0C3.589 0 0 3.589 0 8c0 5.25 7.125 11.438 7.438 11.703a.75.75 0 0 0 1.124 0C8.875 19.438 16 13.25 16 8c0-4.411-3.589-8-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" fill="#fff"/></svg>`;

    el.appendChild(circle);

    const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
      .setLngLat(center)
      .addTo(map);

    markerRef.current = marker;
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = env.NEXT_PUBLIC_MAPBOX_TOKEN;

    const map = createMapIfSupported({
      container: containerRef.current,
      style: isDark
        ? "mapbox://styles/mapbox/dark-v11"
        : "mapbox://styles/mapbox/light-v11",
      center,
      zoom,
      attributionControl: false,
    });

    if (!map) {
      containerRef.current.replaceChildren();
      setIsMapUnavailable(true);
      onLoad?.();
      return;
    }

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-left");
    mapRef.current = map;

    map.on("load", () => {
      onLoad?.();
      onMapReady?.(map);
      addMarker(map);
    });

    map.on("style.load", () => {
      addMarker(map);
    });

    return () => {
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    marker.setLngLat(center);
    map.flyTo({ center, zoom, duration: 600 });
  }, [lat, lng, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const style = isDark
      ? "mapbox://styles/mapbox/dark-v11"
      : "mapbox://styles/mapbox/light-v11";
    map.setStyle(style);
  }, [isDark]);

  return (
    <div ref={containerRef} className={className} style={{ width: "100%", height: "100%" }}>
      {isMapUnavailable ? (
        <div
          role="status"
          className="flex h-full w-full items-center justify-center bg-muted/40 px-6 text-center text-sm text-muted-foreground"
        >
          Map preview unavailable
        </div>
      ) : null}
    </div>
  );
}
