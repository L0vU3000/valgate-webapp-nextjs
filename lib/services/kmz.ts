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

function centroidOf(rings: number[][][]): [number, number] {
  // ponytail: point-average, not a true area-weighted centroid. A parcel ring is compact
  // enough that they differ by centimetres; upgrade if a concave parcel ever needs it.
  let lat = 0, lng = 0, n = 0;
  for (const ring of rings) {
    // Skip the repeated closing position: rings are closed (RFC 7946), so counting it would bias
    // the average toward the first vertex. Matters for the 3-4 vertex parcels in this set.
    const last = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
      ? ring.length - 1
      : ring.length;
    for (let i = 0; i < last; i++) { lng += ring[i][0]; lat += ring[i][1]; n++; }
  }
  if (!n) throw new KmzError("That KMZ has no coordinates.");
  return [lat / n, lng / n];
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
    centroid: centroidOf(rings),
    fields,
  };
}
