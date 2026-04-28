"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { env } from "@/lib/env";

const DEFAULT_ZOOM = 13;

interface PropertyLocationMapProps {
  center: [number, number];
  onLocationChange?: (lat: number, lng: number) => void;
  onLoad?: () => void;
  className?: string;
}

export function PropertyLocationMap({
  center,
  onLocationChange,
  onLoad,
  className,
}: PropertyLocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const isDragRef = useRef(false);
  const prevCenterRef = useRef<[number, number]>(center);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = env.NEXT_PUBLIC_MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
    mapRef.current = map;

    map.on("load", () => {
      onLoad?.();
      const el = document.createElement("div");
      el.style.cssText = "width:36px;height:36px;cursor:grab;";

      const circle = document.createElement("div");
      circle.style.cssText =
        "width:36px;height:36px;border-radius:50%;" +
        "background:#2563eb;border:3px solid #fff;" +
        "box-shadow:0 2px 8px rgba(0,0,0,0.25);" +
        "display:flex;align-items:center;justify-content:center;" +
        "transition:transform 150ms ease;";
      circle.innerHTML = `<svg width="16" height="20" viewBox="0 0 16 20" fill="none"><path d="M8 0C3.589 0 0 3.589 0 8c0 5.25 7.125 11.438 7.438 11.703a.75.75 0 0 0 1.124 0C8.875 19.438 16 13.25 16 8c0-4.411-3.589-8-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" fill="#fff"/></svg>`;

      el.appendChild(circle);
      el.addEventListener("mouseenter", () => { circle.style.transform = "scale(1.1)"; });
      el.addEventListener("mouseleave", () => { circle.style.transform = "scale(1)"; });

      const marker = new mapboxgl.Marker({ element: el, anchor: "center", draggable: true })
        .setLngLat(center)
        .addTo(map);

      marker.on("dragend", () => {
        const { lat, lng } = marker.getLngLat();
        isDragRef.current = true;
        onLocationChange?.(lat, lng);
      });

      markerRef.current = marker;
    });

    return () => {
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fly to new center when it changes externally (e.g. address search)
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    const [lng, lat] = center;
    const [prevLng, prevLat] = prevCenterRef.current;
    prevCenterRef.current = center;

    // Skip when array reference changed but values didn't
    if (lng === prevLng && lat === prevLat) return;

    // Skip flyTo after a drag — marker is already at the correct position
    if (isDragRef.current) {
      isDragRef.current = false;
      return;
    }

    map.flyTo({ center, zoom: DEFAULT_ZOOM, duration: 800 });
    marker.setLngLat(center);
  }, [center]);

  return (
    <div ref={containerRef} className={className} style={{ width: "100%", height: "100%" }} />
  );
}
