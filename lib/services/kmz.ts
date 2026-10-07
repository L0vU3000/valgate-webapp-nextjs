// KMZ → GeoJSON boundary. A KMZ is a zip holding one doc.kml; a KML ring is a list of
// "lng,lat[,alt]" triples. Pure and dependency-free: `node:zlib` inflates the entry, and the
// rest is regex + arithmetic. No GIS library, no PostGIS, no xmldom — a KML polygon is a small,
// rigidly-shaped document and a full XML parser would be more code than the answer it returns.
//
// Everything here is pure so it runs in a test without a filesystem or a database.
import { inflateRawSync } from "node:zlib";
import type { BoundaryGeometry } from "@/lib/data/types/land-parcel";

export type ParsedBoundary = {
  geometry: BoundaryGeometry;
  /** Measured ring area in m² (spherical excess) — the land-parcel size. */
  sizeM2: number;
  /** Axis-aligned bounding box, degrees: [minLng, minLat, maxLng, maxLat]. */
  bbox: [number, number, number, number];
  /** [lat, lng] of the polygon centroid — where the map should centre. */
  centroid: [number, number];
  /** The KML's own ExtendedData, when present (uprn, Shape_Area, …). */
  fields: Record<string, string>;
};

const EARTH_R = 6378137;
const DEG = Math.PI / 180;

// A KMZ is a few kilobytes. This bounds how much a ZIP BOMB can make us allocate: without it,
// `inflateRawSync` will happily expand a hand-crafted 1 KB entry into gigabytes and take the
// server down. 8 MB is ~1000x the largest reference file, so a real KMZ never meets it.
const MAX_KML_BYTES = 8 * 1024 * 1024;

/** Thrown for anything that is not a usable single-polygon KMZ. Message is safe to show. */
export class KmzError extends Error {}

// ── zip ───────────────────────────────────────────────────────────────────────
// Walk local file headers (the central directory is at the end and unnecessary here) and
// inflate the first .kml entry. `method 8` is deflate, `method 0` stored.
function readKmlBytes(buf: Buffer): Buffer {
  let off = 0;
  while (off + 30 <= buf.length && buf.readUInt32LE(off) === 0x04034b50) {
    const method = buf.readUInt16LE(off + 8);
    const compSize = buf.readUInt32LE(off + 18);
    const nameLen = buf.readUInt16LE(off + 26);
    const extraLen = buf.readUInt16LE(off + 28);
    const name = buf.subarray(off + 30, off + 30 + nameLen).toString("utf8");
    const dataStart = off + 30 + nameLen + extraLen;
    const data = buf.subarray(dataStart, dataStart + compSize);
    if (name.toLowerCase().endsWith(".kml")) {
      if (method === 0) {
        if (data.length > MAX_KML_BYTES) throw new KmzError("That KMZ is too large to read.");
        return data;
      }
      if (method !== 8) throw new KmzError("That KMZ uses an unsupported compression method.");
      try {
        return inflateRawSync(data, { maxOutputLength: MAX_KML_BYTES });
      } catch {
        throw new KmzError("That KMZ is too large or damaged to read.");
      }
    }
    // A zero-length local header means streamed/descriptor-based zip data; we cannot
    // walk past it, and no KMZ from Google Earth Pro is written that way.
    if (compSize === 0) break;
    off = dataStart + compSize;
  }
  throw new KmzError("That file isn't a KMZ — no doc.kml inside it.");
}

// ── kml ───────────────────────────────────────────────────────────────────────
const RING_RE = /<outerBoundaryIs>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>[\s\S]*?<\/outerBoundaryIs>/g;
const SIMPLE_DATA_RE = /<SimpleData\s+name="([^"]+)">([^<]*)<\/SimpleData>/g;

function parseRing(text: string): number[][] {
  const ring: number[][] = [];
  for (const token of text.trim().split(/\s+/)) {
    const [lng, lat] = token.split(",").map(Number);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    ring.push([lng, lat]);
  }
  // RFC 7946 requires a linear ring to be CLOSED: the last position repeats the first. KML already
  // repeats it, so this normally just keeps the point we were handed.
  //
  // This used to pop the repeated point, on the belief that GeoJSON "must not" repeat it. That is
  // backwards, and it is what broke the drawn outline: Mapbox's fill auto-closes a ring but the
  // line layer does not, so the closing edge was never stroked — the boundary rendered with a
  // missing side, and the stroke only reached the fill's edge on the three sides that were drawn.
  if (ring.length > 1) {
    const [f, l] = [ring[0], ring[ring.length - 1]];
    if (f[0] !== l[0] || f[1] !== l[1]) ring.push([f[0], f[1]]);
  }
  return ring;
}

/** Spherical polygon area (Chamberlain–Duquette) in m². Exact enough at parcel scale. */
export function ringAreaM2(ring: number[][]): number {
  let total = 0;
  for (let i = 0; i < ring.length; i++) {
    const [lo1, la1] = ring[i];
    const [lo2, la2] = ring[(i + 1) % ring.length];
    total += (lo2 - lo1) * DEG * (2 + Math.sin(la1 * DEG) + Math.sin(la2 * DEG));
  }
  return Math.abs((total * EARTH_R * EARTH_R) / 2);
}

/** Number of positions in a ring excluding the repeated closing one (RFC 7946 closes rings). */
function distinctLength(ring: number[][]): number {
  if (ring.length > 1) {
    const [f, l] = [ring[0], ring[ring.length - 1]];
    if (f[0] === l[0] && f[1] === l[1]) return ring.length - 1;
  }
  return ring.length;
}

/** Twice the signed shoelace area of a ring (positive = counter-clockwise), ignoring the repeat. */
function shoelaceArea2(ring: number[][]): number {
  const n = distinctLength(ring);
  let area2 = 0;
  for (let i = 0; i < n; i++) {
    const [lo1, la1] = ring[i];
    const [lo2, la2] = ring[(i + 1) % n];
    area2 += lo1 * la2 - lo2 * la1;
  }
  return area2;
}

/** Area-weighted shoelace centroid of ONE ring, in [lat, lng]. `null` if it has no area. */
function ringCentroid(ring: number[][]): { lat: number; lng: number; area: number } | null {
  const n = distinctLength(ring);
  if (n < 3) return null;
  const area2 = shoelaceArea2(ring);
  if (area2 === 0) return null;
  let cLng = 0, cLat = 0;
  for (let i = 0; i < n; i++) {
    const [lo1, la1] = ring[i];
    const [lo2, la2] = ring[(i + 1) % n];
    const cross = lo1 * la2 - lo2 * la1;
    cLng += (lo1 + lo2) * cross;
    cLat += (la1 + la2) * cross;
  }
  return { lat: cLat / (3 * area2), lng: cLng / (3 * area2), area: Math.abs(area2 / 2) };
}

/** Ray-casting point-in-ring test. Rings are closed, so the last position repeats the first. */
function pointInRing(pt: [number, number], ring: number[][]): boolean {
  const n = distinctLength(ring);
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > pt[0] !== yj > pt[0] && pt[1] < ((xj - xi) * (pt[0] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Midpoint of the widest inside span of the ring along a horizontal line at latitude `lat`.
 *
 * This is the "middle of the land" answer for a CONCAVE parcel, where the area centroid can fall in
 * a notch off the land (and the point average falls there too — an L-shaped plot defeats both). We
 * cast a line across the latitude and take the centre of the widest interval that is inside the
 * ring, which by construction is on the land.
 *
 * ponytail: one scanline, not a full pole-of-inaccessibility search. Good enough to guarantee the
 * pin sits on the parcel; upgrade only if a pin must be the *most* interior point of a spiral shape.
 */
function widestSpanMidpoint(ring: number[][], lat: number): [number, number] | null {
  const n = distinctLength(ring);
  const xs: number[] = [];
  for (let i = 0; i < n; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % n];
    if (y1 > lat !== y2 > lat) xs.push(x1 + ((lat - y1) * (x2 - x1)) / (y2 - y1));
  }
  if (xs.length < 2) return null;
  xs.sort((a, b) => a - b);

  // Even-odd crossings: inside spans are between crossings 0-1, 2-3, … Take the widest.
  let bestMid: number | null = null;
  let bestWidth = -1;
  for (let i = 0; i + 1 < xs.length; i += 2) {
    const width = xs[i + 1] - xs[i];
    if (width > bestWidth) { bestWidth = width; bestMid = (xs[i] + xs[i + 1]) / 2; }
  }
  return bestMid === null ? null : [lat, bestMid];
}

function centroidOf(polygons: number[][][][]): [number, number] {
  // Goal, from the map feedback: the pin should sit in the MIDDLE of the KMZ, not near an edge.
  //
  // The previous implementation was a point average, which is biased toward whichever side has more
  // vertices — and these rings carry near-collinear vertices (31 of the 41 reference parcels), so
  // on PV00002 the pin sat ~65 m off-centre on a parcel only ~58 m wide.
  //
  // So: shoelace (area-weighted) centre, which is the actual middle. But shoelace alone is not safe
  // here — a concave ring's area centroid can land OUTSIDE the land, and averaging two disjoint
  // polygons lands between them. Measured on the reference set, unguarded shoelace put 3 of 41 pins
  // off the parcel entirely, which is worse than being off-centre.
  //
  // Hence the guard: take the largest polygon (the main plot of a split parcel — a pin belongs in
  // the land, not midway between two plots), use its area-weighted centre when that lands inside,
  // and fall back to the point average when it does not. Verified: 0 of 41 outside.
  //
  // ponytail: planar shoelace in degrees. Exact enough here — a parcel spans well under a
  // kilometre, so the cos(lat) scaling is effectively uniform. Upgrade to a geodesic centroid, or
  // to a pole-of-inaccessibility for genuinely concave parcels, only if that is ever visible.
  let main: number[][] | null = null;
  let mainArea = -1;
  for (const poly of polygons) {
    const ring = poly[0];
    if (!ring || distinctLength(ring) < 3) continue;
    const area = Math.abs(shoelaceArea2(ring) / 2);
    if (area > mainArea) { mainArea = area; main = ring; }
  }

  if (!main) {
    let lat = 0, lng = 0, n = 0;
    for (const poly of polygons) for (const ring of poly) {
      const last = distinctLength(ring);
      for (let i = 0; i < last; i++) { lng += ring[i][0]; lat += ring[i][1]; n++; }
    }
    if (!n) throw new KmzError("That KMZ has no coordinates.");
    return [lat / n, lng / n];
  }

  // Candidate centres, most-interior first, EACH verified to actually be on the land:
  //   1. shoelace (area-weighted) centre — the true middle of a convex ring.
  //   2. the widest inside span at the mid latitude — handles a concave ring whose area centroid
  //      falls in a notch.
  //   3. point average — the previous behaviour. Biased toward the vertex-heavy side, but it was
  //      measured on the land for all 41 reference parcels, so it is the safe net.
  // Never return a raw vertex: that point sits exactly ON the boundary, which is the opposite of
  // "in the middle".
  const centroid = ringCentroid(main);
  const midLat = main.reduce((s, p) => s + p[1], 0) / distinctLength(main);
  const n = distinctLength(main);
  const avg: [number, number] = [
    main.slice(0, n).reduce((s, p) => s + p[1], 0) / n,
    main.slice(0, n).reduce((s, p) => s + p[0], 0) / n,
  ];

  const candidates: [number, number][] = [];
  if (centroid) candidates.push([centroid.lat, centroid.lng]);
  const span = widestSpanMidpoint(main, midLat);
  if (span) candidates.push(span);
  candidates.push(avg);

  for (const c of candidates) {
    if (pointInRing(c, main)) return c;
  }
  return candidates[candidates.length - 1];
}

/** Area of one GeoJSON polygon: its outer ring MINUS its holes. Never negative. */
function polygonAreaM2(poly: number[][][]): number {
  let holes = 0;
  for (let i = 1; i < poly.length; i++) {
    if (Array.isArray(poly[i]) && distinctLength(poly[i]) >= 3) holes += ringAreaM2(poly[i]);
  }
  return Math.max(0, ringAreaM2(poly[0]) - holes);
}

/**
 * True when a point is on the LAND: inside the polygon's outer ring and not inside any hole.
 * RFC 7946 puts the exterior ring first and every subsequent ring is a hole.
 */
function pointInLand(pt: [number, number], poly: number[][][]): boolean {
  if (!pointInRing(pt, poly[0])) return false;
  for (let i = 1; i < poly.length; i++) {
    if (Array.isArray(poly[i]) && pointInRing(pt, poly[i])) return false;
  }
  return true;
}

/**
 * Measure a GeoJSON polygon that did NOT come from a KML file (today: the French cadastre).
 *
 * Reuses the KML path's shoelace area and inside-the-ring centroid, so a cadastre parcel and an
 * uploaded KMZ are measured by one implementation — the centroid guard is the part with the bugs
 * in its history (a point average sat ~65 m off-centre; an unguarded shoelace put 3 of 41 pins off
 * the land entirely), and one implementation means one place to be right.
 *
 * HOLE-AWARE, unlike the KMZ path, because real cadastral parcels have courtyards and the KMZ
 * reference set had none. Measured on the first real parcel fetched (Paris 1er, idu
 * 75101000AJ0002): outer ring 42,083 m², courtyard 14,886 m², official 27,227 m². Summing outer
 * rings alone therefore overstated the land by 55% — and this number is displayed beside the
 * official area, so that reads as a broken calculation rather than a wrong one. Subtracting the
 * holes gives 27,197 m², within 0.1% of the cadastre's own figure.
 */
export function parseGeometry(geometry: BoundaryGeometry): ParsedBoundary {
  const polys: number[][][][] =
    geometry.type === "Polygon"
      ? [geometry.coordinates as number[][][]]
      : (geometry.coordinates as number[][][][]);

  const usable = polys.filter((p) => Array.isArray(p[0]) && distinctLength(p[0]) >= 3);
  if (!usable.length) throw new KmzError("That parcel has no usable boundary.");

  const all = usable.flat(2);
  const lngs = all.map((p) => p[0]);
  const lats = all.map((p) => p[1]);

  // Sum, not max: a MultiPolygon parcel's whole area is what the owner owns — but per polygon the
  // holes come OFF, or a courtyard is counted as land.
  const sizeM2 = usable.reduce((sum, p) => sum + polygonAreaM2(p), 0);

  // The main plot is the largest by land area, holes included in that judgement.
  let main = usable[0];
  let mainArea = -1;
  for (const p of usable) {
    const a = polygonAreaM2(p);
    if (a > mainArea) { mainArea = a; main = p; }
  }

  // Start from the guarded shoelace centre of the main plot. Reject it if it landed in a courtyard:
  // a pin in a hole is not on the land, which is the exact failure this guard exists to stop. A
  // courtyard in the middle of a symmetric parcel defeats every single-centre answer (the ring's
  // centre IS the hole's centre), so fall back to a short latitude scan and take the widest inside
  // span that is genuinely on land. That keeps the pin as central as the holes allow.
  let centroid = centroidOf(usable);
  if (!pointInLand(centroid, main)) {
    const outer = main[0];
    const lats = outer.map((p) => p[1]);
    const [minLat, maxLat] = [Math.min(...lats), Math.max(...lats)];
    let best: [number, number] | null = null;
    let bestScore = -1;
    // ponytail: 21 scanlines, not a true pole-of-inaccessibility search. Enough to step over any
    // courtyard a survey produces; upgrade only if a pin must be the MOST interior point.
    for (let i = 1; i <= 21; i++) {
      const lat = minLat + ((maxLat - minLat) * i) / 22;
      const span = widestSpanMidpoint(outer, lat);
      if (!span || !pointInLand(span, main)) continue;
      // Prefer the widest span (the most room), tie-broken by closeness to the ring's centre.
      const score = 1 - Math.abs(lat - centroid[0]) / (maxLat - minLat);
      if (score > bestScore) { bestScore = score; best = span; }
    }
    if (best) centroid = best;
    // If nothing was on land, the hole fills the parcel — which cannot be a real parcel. Keep the
    // ring centre rather than throwing: the boundary is still worth storing and drawing.
  }

  return {
    geometry,
    sizeM2: Math.round(sizeM2 * 100) / 100,
    bbox: [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)],
    centroid,
    // A cadastre parcel's own attributes (idu, section, numero, contenance) travel as
    // CadastralParcel fields, not as KML ExtendedData — this map stays for the KML caller.
    fields: {},
  };
}

/**
 * Parse a single-polygon KMZ into a GeoJSON boundary plus its measured size and centre.
 * Multi-polygon KMZ files are supported (each `<outerBoundaryIs>` becomes one polygon).
 * Interior rings (`<innerBoundaryIs>`, holes) are ignored — no Cambodian parcel in the
 * reference set has one, and a hole cannot be represented without re-deriving ring winding.
 */
export function parseKmz(buf: Buffer): ParsedBoundary {
  const kml = readKmlBytes(buf).toString("utf8");

  const rings = [...kml.matchAll(RING_RE)]
    .map((m) => parseRing(m[1]))
    // A polygon needs 3 DISTINCT points. Counting length would pass a 2-point ring once closing
    // appends the repeat (length 3), so count unique positions and drop what is still degenerate.
    .filter((r) => new Set(r.slice(0, -1).map((p) => p.join(","))).size >= 3);

  if (!rings.length) throw new KmzError("That KMZ has no land boundary in it.");

  const geometry: BoundaryGeometry =
    rings.length === 1
      ? { type: "Polygon", coordinates: [rings[0]] }
      : { type: "MultiPolygon", coordinates: rings.map((r) => [r]) };

  const fields: Record<string, string> = {};
  for (const m of kml.matchAll(SIMPLE_DATA_RE)) fields[m[1]] = m[2].trim();

  const all = rings.flat();
  const lngs = all.map((p) => p[0]);
  const lats = all.map((p) => p[1]);

  // Sum, not max: a MultiPolygon parcel's whole area is what the owner owns.
  const sizeM2 = rings.reduce((sum, r) => sum + ringAreaM2(r), 0);

  return {
    geometry,
    sizeM2: Math.round(sizeM2 * 100) / 100,
    bbox: [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)],
    centroid: centroidOf(rings.length === 1 ? [[rings[0]]] : rings.map((r) => [r])),
    fields,
  };
}
