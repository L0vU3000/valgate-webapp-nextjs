import type { BoundaryGeometry } from "@/lib/data/types/land-parcel";
import { haversineKm } from "@/lib/utils/geo";

/**
 * One edge of a parcel ring, measured in metres.
 *
 * `a` and `b` are the endpoints as `[lng, lat]`, kept (not just the midpoint) because the map draws
 * the label along the segment and needs both ends to know which way the text runs.
 */
export type ParcelSide = {
  /** 1-based, in ring order — how the measurements list and the map label refer to the same edge. */
  index: number;
  a: [number, number];
  b: [number, number];
  meters: number;
  /** True bearing of the edge, degrees clockwise from north. 0–360. */
  bearingDeg: number;
};

export type ParcelMeasurement = {
  sides: ParcelSide[];
  perimeterM: number;
  /** Longest and shortest edge, so a summary line can name a real side instead of "varies". */
  longest: ParcelSide;
  shortest: ParcelSide;
};

/**
 * Vertices closer together than this are the same vertex.
 *
 * The source KML carries duplicated and near-collinear vertices — 31 of the 41 reference parcels
 * have at least one — and every one of them produced a bogus 0 m side in a first pass. Dropping them
 * here rather than in the parser is deliberate: the ring that draws is the ring that was surveyed,
 * and this is a measurement of it.
 */
const MIN_SIDE_M = 1;

/** The outer ring of each polygon. Holes are ignored, matching `parseKmz`. */
function outerRings(geometry: BoundaryGeometry | null | undefined): number[][][] {
  if (!geometry) return [];
  const coords = geometry.coordinates as number[][][] | number[][][][];
  if (!Array.isArray(coords) || coords.length === 0) return [];
  const first = coords[0];
  if (!Array.isArray(first) || first.length === 0) return [];
  // Polygon is [ring][position]; MultiPolygon is [polygon][ring][position]. A number two levels in
  // means the first entry is a ring, i.e. Polygon.
  const polygons =
    typeof (first as number[][][])[0]?.[0] === "number"
      ? [coords as number[][][]]
      : (coords as number[][][][]);
  return polygons.map((poly) => poly[0]).filter((ring) => Array.isArray(ring) && ring.length > 0);
}

/** Drop repeated vertices and the closing duplicate, so the ring is a list of distinct corners. */
function corners(ring: number[][]): number[][] {
  const out: number[][] = [];
  for (const p of ring) {
    if (!Array.isArray(p) || typeof p[0] !== "number" || typeof p[1] !== "number") continue;
    const last = out[out.length - 1];
    if (!last || haversineKm(last[1], last[0], p[1], p[0]) * 1000 >= MIN_SIDE_M) out.push(p);
  }
  // A closed ring repeats its first position at the end. If that survived, it is not a 0 m side.
  if (out.length > 1) {
    const [f, l] = [out[0], out[out.length - 1]];
    if (haversineKm(f[1], f[0], l[1], l[0]) * 1000 < MIN_SIDE_M) out.pop();
  }
  return out;
}

/**
 * Every side of a parcel boundary, in metres. `null` when there is no ring, or nothing to measure.
 *
 * Lengths are geodesic (haversine) and carry no survey accuracy: they are read off the ring, and the
 * ring is only as good as the KMZ it came from. Callers say so where the numbers are shown.
 */
export function boundarySides(
  geometry: BoundaryGeometry | null | undefined,
): ParcelMeasurement | null {
  const sides: ParcelSide[] = [];
  for (const ring of outerRings(geometry)) {
    const pts = corners(ring);
    if (pts.length < 3) continue;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const meters = haversineKm(a[1], a[0], b[1], b[0]) * 1000;
      sides.push({
        index: sides.length + 1,
        a: [a[0], a[1]],
        b: [b[0], b[1]],
        meters,
        bearingDeg: bearingDeg(a, b),
      });
    }
  }
  if (sides.length === 0) return null;
  return {
    sides,
    perimeterM: sides.reduce((total, s) => total + s.meters, 0),
    longest: sides.reduce((max, s) => (s.meters > max.meters ? s : max)),
    shortest: sides.reduce((min, s) => (s.meters < min.meters ? s : min)),
  };
}

/** Bearing in the local tangent plane: a few hundred metres is flat enough for a direction. */
function bearingDeg(a: number[], b: number[]): number {
  const midLat = ((a[1] + b[1]) / 2) * (Math.PI / 180);
  const east = (b[0] - a[0]) * Math.cos(midLat);
  const north = b[1] - a[1];
  return ((Math.atan2(east, north) * 180) / Math.PI + 360) % 360;
}

/**
 * How a length is written down. One decimal always: the ring is a stored geometry, so the tenth of
 * a metre is the honest resolution the coordinates carry, and on a map a bare "63 m" next to a
 * "63.4 m" reads as two different measurements of the same edge.
 */
export function formatMeters(meters: number): string {
  return `${meters.toFixed(1)} m`;
}

/**
 * The ground the ring covers: the longer side of its bounding box, in metres.
 *
 * Used to decide when a parcel is close enough to read, so the test is the parcel's own size rather
 * than a zoom number — a 300 m parcel earns its sides at the zoom where a 40 m one is still a smudge.
 */
export function ringSpanM(measurement: ParcelMeasurement): number {
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const { a, b } of measurement.sides) {
    for (const [lng, lat] of [a, b]) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }
  const midLat = ((minLat + maxLat) / 2) * (Math.PI / 180);
  return Math.max((maxLng - minLng) * 111320 * Math.cos(midLat), (maxLat - minLat) * 110574);
}

/**
 * The sides as a GeoJSON LineString collection — one feature per edge, carrying its own label text.
 * Straight segments, so a renderer can place the text along the edge rather than at a point.
 */
export function sidesToLineFeatures(measurement: ParcelMeasurement): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: measurement.sides.map((side) => ({
      type: "Feature" as const,
      properties: { index: side.index, meters: side.meters, label: formatMeters(side.meters) },
      geometry: { type: "LineString" as const, coordinates: [side.a, side.b] },
    })),
  };
}
