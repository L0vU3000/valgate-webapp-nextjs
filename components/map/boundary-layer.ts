"use client";

import type mapboxgl from "mapbox-gl";
import type { BoundaryGeometry } from "@/lib/data/types/land-parcel";

export const BOUNDARY_SOURCE_ID = "valgate-boundary";
export const BOUNDARY_FILL_ID = "valgate-boundary-fill";
export const BOUNDARY_LINE_ID = "valgate-boundary-line";

const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

/** [minLng, minLat, maxLng, maxLat] over a Polygon/MultiPolygon's coordinates. Null if empty. */
export function boundaryBounds(
  geometry: BoundaryGeometry | null | undefined,
): [number, number, number, number] | null {
  if (!geometry) return null;
  const pts: number[][] = [];
  const walk = (n: unknown) => {
    if (Array.isArray(n) && typeof n[0] === "number" && typeof n[1] === "number") pts.push(n as number[]);
    else if (Array.isArray(n)) n.forEach(walk);
  };
  walk(geometry.coordinates);
  if (!pts.length) return null;
  const lngs = pts.map((p) => p[0]);
  const lats = pts.map((p) => p[1]);
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
}

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

/**
 * Frame a boundary so the whole ring is visible.
 *
 * Parcels are tiny — the smallest in the reference set is ~17 m across, which at the detail map's
 * default zoom 15 is under 4 px, i.e. hidden behind the 36 px pin. Fitting to the ring is what
 * makes the boundary visible at all on load, and it does it for a 124 m² plot and an 87,000 m²
 * estate alike instead of opening both at the same fixed zoom.
 *
 * `maxZoom` is capped at 20 because Google Earth's parcel rings carry centimetre precision; fitting
 * without a cap would zoom to street-furniture level. The padding keeps the ring clear of the
 * container's rounded corners and the expand/map controls that overhang it.
 */
export function fitBoundary(map: mapboxgl.Map, geometry: BoundaryGeometry | null | undefined): boolean {
  const b = boundaryBounds(geometry);
  if (!b) return false;
  map.fitBounds(
    [
      [b[0], b[1]],
      [b[2], b[3]],
    ],
    { padding: 48, maxZoom: 20, duration: 0 },
  );
  return true;
}

function toFeature(geometry: BoundaryGeometry | null): GeoJSON.FeatureCollection {
  return geometry ? { ...EMPTY, features: [{ type: "Feature", properties: {}, geometry: geometry as GeoJSON.Geometry }] } : EMPTY;
}
