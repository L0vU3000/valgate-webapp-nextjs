"use client";

/**
 * The boundary layer is called by two maps that run different renderers: the portfolio map on
 * MapLibre (Google tiles) and the property detail map on Mapbox.
 *
 * Their `Map` classes are structurally incompatible — overloaded signatures do not merge, and
 * `addLayer`'s source/paint shape differs enough that a hand-written structural type is not
 * assignable in either direction. Rather than duplicate this module or fight the union, the public
 * signatures accept "either", and the two API calls used here cast once, locally, to MapLibre's
 * types. Both libraries expose an identical `getSource`/`addSource`/`addLayer`/`fitBounds` contract
 * at runtime — this is the same layer spec Mapbox and MapLibre both implement.
 */
import type { Map as MapLibreMap, GeoJSONSource } from "maplibre-gl";
import type { Map as MapboxMap } from "mapbox-gl";
import type { BoundaryGeometry } from "@/lib/data/types/land-parcel";

type AnyMap = MapLibreMap | MapboxMap;

export const BOUNDARY_SOURCE_ID = "valgate-boundary";
export const BOUNDARY_FILL_ID = "valgate-boundary-fill";
export const BOUNDARY_LINE_ID = "valgate-boundary-line";

const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

/** `getSource`'s overloads do not merge across the two renderers, so narrow in one place. */
function sourceOf(map: AnyMap, id: string): GeoJSONSource | undefined {
  return (map as MapLibreMap).getSource(id) as GeoJSONSource | undefined;
}

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
  map: AnyMap,
  geometry: BoundaryGeometry | null,
  opts: { minZoom?: number } = {},
) {
  if (sourceOf(map, BOUNDARY_SOURCE_ID)) {
    sourceOf(map, BOUNDARY_SOURCE_ID)!.setData(toFeature(geometry));
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
    // `line-join: round` is load-bearing, not cosmetic. These rings come from a survey and carry
    // near-collinear vertices (KEP00001 has one at ~-1° between two 12 m and 30 m edges). Mapbox's
    // default miter join projects that vertex OUTWARD to build the corner, which draws a spike that
    // does not exist in the data — reproduced in isolation. Round joins cannot overshoot a vertex.
    layout: { "line-join": "round", "line-cap": "round" },
    paint: { "line-color": "#2563eb", "line-width": 2 },
  });
}

/** Swap the drawn boundary without rebuilding the map. */
export function setBoundaryGeometry(map: AnyMap, geometry: BoundaryGeometry | null) {
  const source = sourceOf(map, BOUNDARY_SOURCE_ID);
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
export function fitBoundary(map: AnyMap, geometry: BoundaryGeometry | null | undefined): boolean {
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
  return geometry
    ? { ...EMPTY, features: [{ type: "Feature", properties: {}, geometry: closeRings(geometry) }] }
    : EMPTY;
}

/**
 * Close every linear ring (first position repeated at the end), as RFC 7946 requires.
 *
 * The parser now emits closed rings, but rows written before that fix are stored unclosed, and the
 * drawn outline is what suffers: Mapbox's `fill` auto-closes a ring, `line` does not, so an unclosed
 * ring renders with the closing edge missing — the boundary looks like it has three sides, and the
 * stroke appears to sit inside the fill on those three. Cheap to guarantee here (a handful of
 * parcels, once per fit), and it repairs existing rows without a re-import.
 */
function closeRings(geometry: BoundaryGeometry): GeoJSON.Geometry {
  const close = (ring: number[][]): number[][] => {
    if (ring.length < 2) return ring;
    const [f, l] = [ring[0], ring[ring.length - 1]];
    return f[0] === l[0] && f[1] === l[1] ? ring : [...ring, [f[0], f[1]]];
  };
  // coordinates are schema-typed as unknown[] (the shape varies by geometry type), so narrow here
  // rather than widening the schema — the schema stays permissive, this function stays honest.
  if (geometry.type === "Polygon") {
    const poly = geometry.coordinates as number[][][];
    return { type: "Polygon", coordinates: poly.map(close) };
  }
  const multi = geometry.coordinates as number[][][][];
  return {
    type: "MultiPolygon",
    coordinates: multi.map((poly) => poly.map(close)),
  };
}
