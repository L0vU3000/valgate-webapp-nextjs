"use client";

import { useEffect, useRef } from "react";
import type mapboxgl from "mapbox-gl";
import type { BoundaryGeometry } from "@/lib/data/types/land-parcel";

export const BOUNDARY_SOURCE_ID = "valgate-boundary";
export const BOUNDARY_FILL_ID = "valgate-boundary-fill";
export const BOUNDARY_LINE_ID = "valgate-boundary-line";

const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

/**
 * Add (or update) the boundary fill+outline on a map. Idempotent — safe to call on `load` and
 * again on every `style.load`, which is what a style swap (theme / satellite) requires because it
 * destroys every layer.
 *
 * Callers pass `minZoom` when the ring is one of many on a dense view (the portfolio map) and omit
 * it on the property's own map, where the boundary is the subject rather than a speck.
 */
export function addBoundaryLayer(
  map: mapboxgl.Map,
  geometry: BoundaryGeometry | null,
  opts: { minZoom?: number } = {},
) {
  if (map.getSource(BOUNDARY_SOURCE_ID)) {
    (map.getSource(BOUNDARY_SOURCE_ID) as mapboxgl.GeoJSONSource).setData(toFeature(geometry));
    return;
  }
  map.addSource(BOUNDARY_SOURCE_ID, { type: "geojson", data: toFeature(geometry) });

  map.addLayer({
    id: BOUNDARY_FILL_ID,
    type: "fill",
    source: BOUNDARY_SOURCE_ID,
    ...(opts.minZoom != null ? { minzoom: opts.minZoom } : {}),
    paint: { "fill-color": "#2563eb", "fill-opacity": 0.18 },
  });
  map.addLayer({
    id: BOUNDARY_LINE_ID,
    type: "line",
    source: BOUNDARY_SOURCE_ID,
    ...(opts.minZoom != null ? { minzoom: opts.minZoom } : {}),
    paint: { "line-color": "#2563eb", "line-width": 2 },
  });
}

/** Swap the drawn boundary without rebuilding the map. */
export function setBoundaryGeometry(map: mapboxgl.Map, geometry: BoundaryGeometry | null) {
  const source = map.getSource(BOUNDARY_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
  source?.setData(toFeature(geometry));
}

function toFeature(geometry: BoundaryGeometry | null): GeoJSON.FeatureCollection {
  return geometry ? { ...EMPTY, features: [{ type: "Feature", properties: {}, geometry: geometry as GeoJSON.Geometry }] } : EMPTY;
}

/**
 * Draw a boundary over a map's lifetime. Handles the three things a plain `addLayer` gets wrong:
 * re-adding after a style swap, updating when the geometry changes, and clearing on unmount.
 */
export function useBoundaryLayer(
  mapRef: React.RefObject<mapboxgl.Map | null>,
  geometry: BoundaryGeometry | null | undefined,
  opts: { minZoom?: number } = {},
) {
  // Serialised so the effect re-runs on a real geometry change, not on every parent render
  // (the geometry object is rebuilt from props each time).
  const key = geometry ? JSON.stringify(geometry) : "";
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !key) return;
    const parsed = JSON.parse(key) as BoundaryGeometry;

    const draw = () => addBoundaryLayer(map, parsed, optsRef.current);
    if (map.isStyleLoaded()) draw();
    map.on("style.load", draw);
    return () => {
      map.off("style.load", draw);
    };
  }, [mapRef, key]);
}
