"use client";

import { useEffect, useRef } from "react";
import { Map as MapLibreMap, Marker, AttributionControl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useShellContext } from "@/components/layout/shell-context";
import { addBoundaryLayer, setBoundaryGeometry, fitBoundary } from "@/components/map/boundary-layer";
import {
  configureWorker,
  googleSession,
  basemapStyle,
  placeholderStyle,
  ATTRIBUTION_POSITION,
} from "@/components/map/basemap";
import type { BoundaryGeometry } from "@/lib/data/types/land-parcel";

const DEFAULT_ZOOM = 15;

interface PropertyDetailMapProps {
  lat: number;
  lng: number;
  /** The property's land boundary, drawn as a filled outline under the pin. */
  boundary?: BoundaryGeometry | null;
  zoom?: number;
  onMapReady?: (map: MapLibreMap) => void;
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
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const { isDark } = useShellContext();
  const center: [number, number] = [lng, lat];
  const boundaryRef = useRef(boundary);
  boundaryRef.current = boundary;
  const isDarkRef = useRef(isDark);
  isDarkRef.current = isDark;

  function addMarker(map: MapLibreMap) {
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

    const marker = new Marker({ element: el, anchor: "center" })
      .setLngLat(center)
      .addTo(map);

    markerRef.current = marker;
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    configureWorker();

    const map = new MapLibreMap({
      container: containerRef.current,
      // Google tiles need a session token, which is an async round trip. Start on a blank style so
      // the map, its controls and its pins are usable immediately, then swap the basemap in when
      // the token lands (the `style.load` handler below re-adds pins and the boundary).
      style: placeholderStyle(isDark),
      center,
      zoom,
      attributionControl: false,
    });

    map.addControl(new AttributionControl({ compact: true }), ATTRIBUTION_POSITION);
    mapRef.current = map;

    // `isLive` guards the token arriving after unmount — the effect below has no other way to
    // know, and calling setStyle on a removed map is the same class of crash the handlers guard.
    googleSession("roadmap")
      .then((session) => {
        if (!isLive()) return;
        // Roadmap, not satellite: this map had light/dark, and roadmap is the only Google theme
        // with a light/dark pair. Satellite is available on the portfolio map, which has a toggle.
        map.setStyle(basemapStyle("roadmap", isDarkRef.current, session));
      })
      .catch(() => {
        // A failed basemap is not fatal: pins and the boundary still draw over the blank style, and
        // PropertyLocationMap already handles the harder case of no WebGL at all by bailing out.
      });

    // Mapbox fires these handlers from its own render loop, not synchronously with our React tree.
    // If the component unmounts while a handler is queued (a parent re-render can do it — the
    // location page sets state from `onLoad`, which runs inside this very `load` callback), the
    // handler then runs against a torn-down map: `map.remove()` nulls the canvas container, and
    // `Marker.addTo` does `getCanvasContainer().appendChild(...)` on undefined, which is the
    // "can't access property appendChild" console error. Every handler therefore re-checks that
    // this is still the mounted map before touching it.
    const isLive = () => mapRef.current === map;
    const onLoadHandler = () => {
      if (!isLive()) return;
      addMarker(map);
      addBoundaryLayer(map, boundaryRef.current ?? null);
      // Fit to the ring, so a 124 m² parcel and an 87,000 m² estate both open showing their land
      // rather than the same fixed zoom.
      fitBoundary(map, boundaryRef.current);
      onLoad?.();
      onMapReady?.(map);
    };
    const onStyleLoadHandler = () => {
      if (!isLive()) return;
      addMarker(map);
      // A style swap (theme / satellite) replaces the whole style, destroying every layer,
      // so the boundary has to be re-added — not just re-positioned.
      addBoundaryLayer(map, boundaryRef.current ?? null);
    };

    map.on("load", onLoadHandler);
    map.on("style.load", onStyleLoadHandler);

    return () => {
      map.off("load", onLoadHandler);
      map.off("style.load", onStyleLoadHandler);
      // Null the ref BEFORE removing, so any handler already queued behind this sees `isLive()`
      // false and bails instead of touching a removed map.
      mapRef.current = null;
      markerRef.current = null;
      map.remove();
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
    // A theme switch is a full style swap, same as before — but the style is now built from the
    // cached session token rather than a mapbox:// URL. If the token has not landed yet there is
    // nothing to swap to; the init effect above will apply the current theme when it arrives.
    let cancelled = false;
    googleSession("roadmap").then((session) => {
      if (cancelled || mapRef.current !== map) return;
      map.setStyle(basemapStyle("roadmap", isDark, session));
    });
    return () => {
      cancelled = true;
    };
  }, [isDark]);

  return (
    <div ref={containerRef} className={className} style={{ width: "100%", height: "100%" }} />
  );
}
