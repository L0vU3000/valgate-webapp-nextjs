"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { env } from "@/lib/env";
import { useShellContext } from "@/components/layout/shell-context";
import { addBoundaryLayer, setBoundaryGeometry, fitBoundary } from "@/components/map/boundary-layer";
import type { BoundaryGeometry } from "@/lib/data/types/land-parcel";

const DEFAULT_ZOOM = 15;

interface PropertyDetailMapProps {
  lat: number;
  lng: number;
  /** The property's land boundary, drawn as a filled outline under the pin. */
  boundary?: BoundaryGeometry | null;
  zoom?: number;
  onMapReady?: (map: mapboxgl.Map) => void;
  onLoad?: () => void;
  className?: string;
}

export function PropertyDetailMap({
  lat,
  lng,
  boundary,
  zoom = DEFAULT_ZOOM,
  onMapReady,
  onLoad,
  className,
}: PropertyDetailMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const { isDark } = useShellContext();
  const center: [number, number] = [lng, lat];
  const boundaryRef = useRef(boundary);
  boundaryRef.current = boundary;

  function addMarker(map: mapboxgl.Map) {
    markerRef.current?.remove();

    // With a boundary drawn, the ring is the subject and the pin is just a locator — and parcels
    // are small: the smallest here is ~17 m across, which at a fitted zoom is only a few hundred
    // px of land but a 36 px pin is still a large hole punched through it. So the marker shrinks
    // to a dot once there is a ring to look at, and keeps its full size when it is all there is.
    const size = boundaryRef.current ? 14 : 36;

    const el = document.createElement("div");
    el.style.cssText = `width:${size}px;height:${size}px;cursor:default;`;

    const circle = document.createElement("div");
    circle.style.cssText =
      `width:${size}px;height:${size}px;border-radius:50%;` +
      "background:#2563eb;border:3px solid #fff;" +
      "box-shadow:0 2px 8px rgba(0,0,0,0.25);" +
      "display:flex;align-items:center;justify-content:center;";
    if (size > 20) {
      circle.innerHTML = `<svg width="16" height="20" viewBox="0 0 16 20" fill="none"><path d="M8 0C3.589 0 0 3.589 0 8c0 5.25 7.125 11.438 7.438 11.703a.75.75 0 0 0 1.124 0C8.875 19.438 16 13.25 16 8c0-4.411-3.589-8-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" fill="#fff"/></svg>`;
    }

    el.appendChild(circle);

    const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
      .setLngLat(center)
      .addTo(map);

    markerRef.current = marker;
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = env.NEXT_PUBLIC_MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: isDark
        ? "mapbox://styles/mapbox/dark-v11"
        : "mapbox://styles/mapbox/light-v11",
      center,
      zoom,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-left");
    mapRef.current = map;

    map.on("load", () => {
      addMarker(map);
      addBoundaryLayer(map, boundaryRef.current ?? null);
      // Fit to the ring, so a 124 m² parcel and an 87,000 m² estate both open showing their land
      // rather than the same fixed zoom.
      fitBoundary(map, boundaryRef.current);
      onLoad?.();
      onMapReady?.(map);
    });

    map.on("style.load", () => {
      addMarker(map);
      // A style swap (theme / satellite) replaces the whole style, destroying every layer,
      // so the boundary has to be re-added — not just re-positioned.
      addBoundaryLayer(map, boundaryRef.current ?? null);
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
    // Only chase the pin when there is no boundary framing the view. With one, the land is the
    // subject and following the pin would zoom past the parcel.
    if (!boundaryRef.current) map.flyTo({ center, zoom, duration: 600 });
  }, [lat, lng, zoom]);

  // Geometry changed without a remount (e.g. a boundary just attached): swap it in place rather
  // than tearing the map down, and re-frame so the newly drawn ring is what you see. Re-runs the
  // marker too, because its size depends on whether a boundary exists.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    setBoundaryGeometry(map, boundary ?? null);
    markerRef.current?.remove();
    addMarker(map);
    if (boundary) fitBoundary(map, boundary);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundary]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const style = isDark
      ? "mapbox://styles/mapbox/dark-v11"
      : "mapbox://styles/mapbox/light-v11";
    map.setStyle(style);
  }, [isDark]);

  return (
    <div ref={containerRef} className={className} style={{ width: "100%", height: "100%" }} />
  );
}
