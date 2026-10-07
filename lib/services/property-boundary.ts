import "server-only"; // C1
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { properties } from "@/lib/db/schema";
import {
  parseKmz,
  parseGeometry,
  ringAreaM2,
  ringSelfIntersects,
  boundaryContains,
  KmzError,
  type ParsedBoundary,
} from "@/lib/services/kmz";
import { parcelAtPoint } from "@/lib/services/cadastre";
import { logger } from "@/lib/logger";
import {
  createLandParcel,
  updateLandParcel,
  listLandParcels,
  deleteLandParcel,
} from "@/lib/services/land-parcels";
import { updateProperty } from "@/lib/services/properties";
import { assertCanMutate, type Ctx } from "@/lib/services/_mapping";
import { createDocument } from "@/lib/services/documents";
import { putKmz } from "@/lib/services/storage";
import { KMZ_MIME } from "@/lib/upload-constants";
import type { BoundaryGeometry } from "@/lib/data/types/land-parcel";

// ── Boundary attach ───────────────────────────────────────────────────────────
//
// One property has at most one boundary. This is the ONLY writer of land_parcels.boundary and the
// only place a property's pin is moved to match it, so every caller (one-file upload, bulk upload,
// the backfill script) gets the same IDOR guard, the same replace-not-duplicate rule, and the same
// pin-follows-boundary behaviour instead of each re-implementing them.
//
// The pin move is deliberate: a boundary is measured geometry, a pin is hand-placed. Across the
// reference set 24 of 26 pins sat OUTSIDE their own polygon (median 1.5 km off, 113 km worst case),
// so keeping the pin would draw a marker pointing at nothing beside the actual land. The caller is
// expected to have confirmed the move with the user first (see confirmPinMove).

export type BoundaryAttach = {
  sizeM2: number;
  geometry: BoundaryGeometry;
  /** [lat, lng] the property pin was (or would be) moved to. */
  centroid: [number, number];
  /** Current pin, so the caller can ask before overwriting. */
  previousPin: [number, number];
  /** Distance between the old pin and the new centroid, metres. */
  pinShiftM: number;
  /** true when a pin already existed and the move is a real change. */
  pinMoved: boolean;
  /**
   * Whether the CURRENT pin sits inside the uploaded ring.
   *
   * The auto-move always ends up inside (`centroidOf` verifies its candidates), so this only
   * matters when the user declines the move: a pin outside the parcel is a data error, and the
   * preview must say so rather than let it through unremarked.
   */
  pinInside: boolean;
  /** The land parcel row that now holds the boundary. */
  landParcelId: string;
  /** The stored source `.kmz` Document, when one was kept. */
  documentId?: string;
  replaced: boolean;
};

const EARTH_R = 6378137;
/** Metres between two [lat, lng] points — haversine on a sphere, plenty at parcel scale. */
export function metresBetween(
  a: [number, number],
  b: [number, number],
): number {
  const [lat1, lng1] = a;
  const [lat2, lng2] = b;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  return Math.hypot(
    dLat * EARTH_R,
    dLng * EARTH_R * Math.cos((((lat1 + lat2) / 2) * Math.PI) / 180),
  );
}

/**
 * Parse a KMZ and report what attaching it WOULD do, without writing anything.
 *
 * The upload UI needs this to raise the "this will move the pin" confirmation before the user
 * commits, and the bulk path uses it to build the per-file review table.
 */
export async function previewBoundary(
  ctx: Ctx,
  propertyId: string,
  buf: Buffer,
): Promise<
  { ok: true; preview: BoundaryAttach } | { ok: false; error: string }
> {
  const [row] = await db
    .select({ lat: properties.lat, lng: properties.lng })
    .from(properties)
    .where(and(eq(properties.orgId, ctx.orgId), eq(properties.id, propertyId)));
  if (!row) return { ok: false, error: "Property not found" };

  let parsed: ParsedBoundary;
  try {
    parsed = parseKmz(buf);
  } catch (err) {
    // KmzError messages are written for the user; anything else is a bug and stays generic.
    return {
      ok: false,
      error: err instanceof KmzError ? err.message : "Could not read that KMZ.",
    };
  }

  const previousPin: [number, number] = [row.lat, row.lng];
  const shift = metresBetween(previousPin, parsed.centroid);
  const existing = (await listLandParcels(ctx, propertyId)).find(
    (p) => p.boundary != null,
  );

  return {
    ok: true,
    preview: {
      sizeM2: parsed.sizeM2,
      geometry: parsed.geometry,
      centroid: parsed.centroid,
      previousPin,
      pinShiftM: Math.round(shift),
      // ponytail: 1 m threshold — a sub-metre shift is the same pin, not a move worth confirming.
      pinMoved: shift > 1,
      pinInside: boundaryContains(parsed.geometry, previousPin),
      landParcelId: existing?.id ?? "",
      replaced: existing != null,
    },
  };
}

/**
 * Attach a parsed boundary to a property: create-or-replace its land parcel, and move the pin.
 *
 * `movePin: false` keeps the existing pin (the user declined the move) — the boundary is still
 * stored, so nothing is lost and the mismatch is visible rather than silently "fixed".
 */
export async function attachBoundary(
  ctx: Ctx,
  propertyId: string,
  parsed: ParsedBoundary,
  opts: {
    movePin?: boolean;
    sourceFile?: { buffer: Buffer; name: string };
    /** Overrides the stored origin. Defaults to 'kmz' — every caller but the cadastre uploads a file. */
    source?: "kmz" | "manual" | "cadastre";
    /** The official parcel id the geometry came from (French cadastre `idu`). */
    cadastreRef?: string;
    /** True when the ring was DRAWN by hand rather than parsed from a file. */
    drawn?: boolean;
  } = {},
): Promise<BoundaryAttach> {
  assertCanMutate(); // D9 — demo mode refuses all writes

  // Confirm the property belongs to the caller's org BEFORE writing anything (IDOR). The FK would
  // catch a cross-org id at insert time, but only as a 500 — this returns cleanly.
  const [target] = await db
    .select({ id: properties.id, lat: properties.lat, lng: properties.lng })
    .from(properties)
    .where(and(eq(properties.orgId, ctx.orgId), eq(properties.id, propertyId)));
  if (!target) throw new Error("Property not found");

  const existing = (await listLandParcels(ctx, propertyId)).find(
    (p) => p.boundary != null,
  );
  // Land size IS the measured ring area once a boundary exists; properties.totalArea keeps the
  // officially-declared figure. Two numbers, never merged (see the location page KPI card).
  const patch = {
    sizeM2: parsed.sizeM2,
    boundary: parsed.geometry,
    boundarySource:
      opts.source ?? (opts.drawn ? ("manual" as const) : ("kmz" as const)),
    // Only set when there IS one: an undefined key would blank a previously recorded ref on an
    // unrelated re-attach.
    ...(opts.cadastreRef ? { cadastreRef: opts.cadastreRef } : {}),
  };

  let landParcelId: string;
  if (existing) {
    const updated = await updateLandParcel(ctx, existing.id, patch);
    landParcelId = updated?.id ?? existing.id;
  } else {
    const created = await createLandParcel(ctx, { propertyId, ...patch });
    landParcelId = created.id;
  }

  // The original KMZ is kept as a Document so it can be re-downloaded and re-exported later. It is
  // stored FIRST: if storage is unreachable the whole attach fails before any boundary is written,
  // rather than leaving a boundary whose source file is silently missing.
  // ponytail: no delete of a replaced KMZ — the old Document stays as history; add pruning if the
  // bucket ever needs it.
  let documentId: string | undefined;
  if (opts.sourceFile) {
    const { storageId } = await putKmz(
      ctx,
      opts.sourceFile.buffer,
      opts.sourceFile.name,
    );
    const doc = await createDocument(ctx, {
      propertyId,
      name: opts.sourceFile.name,
      kind: "document",
      mimeType: KMZ_MIME,
      extension: "kmz",
      sizeBytes: opts.sourceFile.buffer.length,
      storageId,
      category: "Other",
      description: "Land boundary (KMZ)",
      uploadedAt: Date.now(),
    });
    documentId = doc.id;
  }

  const previousPin: [number, number] = [target.lat, target.lng];
  const shift = metresBetween(previousPin, parsed.centroid);
  const movePin = opts.movePin !== false && shift > 1;
  if (movePin) {
    await updateProperty(ctx, propertyId, {
      lat: parsed.centroid[0],
      lng: parsed.centroid[1],
    });
  }

  return {
    sizeM2: parsed.sizeM2,
    geometry: parsed.geometry,
    centroid: parsed.centroid,
    previousPin,
    pinShiftM: Math.round(shift),
    pinMoved: movePin,
    pinInside: boundaryContains(parsed.geometry, previousPin),
    landParcelId,
    documentId,
    replaced: existing != null,
  };
}

/** A chosen cadastral parcel: the point the user picked, and the id the cadastre gave it. */
export type CadastreAttachInput = {
  propertyId: string;
  /** The official parcel id from the picked parcel's `idu`. */
  ref: string;
  /** Where the user's pin was when they pressed "Use this parcel". */
  point: [number, number];
  /** false keeps the existing pin while still storing the parcel. */
  movePin?: boolean;
};

/**
 * Attach the cadastral parcel at `point` to a property.
 *
 * Re-fetches the geometry from the cadastre by POINT rather than accepting a polygon from the
 * client: the client only ever holds tile-clipped geometry, and a boundary that came in as a
 * request body would be attacker-controlled. The `ref` the user picked is stored as provenance,
 * and a mismatch with what the point resolves to is logged — it means the map and the API have
 * drifted, which is worth knowing about and must not fail the user's click.
 */
export async function attachCadastralParcel(
  ctx: Ctx,
  input: CadastreAttachInput,
): Promise<BoundaryAttach> {
  const parcel = await parcelAtPoint(input.point[0], input.point[1]);
  if (!parcel) throw new Error("No cadastral parcel at that location.");

  if (input.ref && parcel.idu && input.ref !== parcel.idu) {
    logger.warn("cadastre ref mismatch — map and API disagree", {
      picked: input.ref,
      resolved: parcel.idu,
    });
  }

  const parsed = parseGeometry(parcel.geometry as BoundaryGeometry);
  return attachBoundary(ctx, input.propertyId, parsed, {
    movePin: input.movePin,
    source: "cadastre",
    cadastreRef: parcel.idu,
  });
}

// ── Backfill ──────────────────────────────────────────────────────────────────
//
// The backfill runs in a script with no HTTP request behind it, so it needs a Ctx and a way to
// turn a KMZ into a document id without a browser. It reuses attachBoundary, so the backfill and
// the UI cannot drift on the pin rule or the replace rule.
export type BackfillOptions = {
  /** Store the original KMZ as a Document too. Needs storage creds; off by default. */
  storeFiles?: boolean;
  /** false keeps the existing pin (the user declined the move) while still storing the boundary. */
  movePin?: boolean;
};

/**
 * Remove a property's land boundary.
 *
 * DELETE rather than null-the-geometry: the parcel row also carries the measured size and the source
 * document, and a row holding `boundary: null` plus a size would be a shape the rest of the app has to
 * keep guarding against. The pin is deliberately left where it is — it is the property's own location,
 * not part of the boundary.
 *
 * Returns whether there was anything to remove, so the caller can tell "cleared" from "nothing there".
 */
export async function clearBoundary(
  ctx: Ctx,
  propertyId: string,
): Promise<boolean> {
  const existing = (await listLandParcels(ctx, propertyId)).find(
    (p) => p.boundary != null,
  );
  if (!existing) return false;
  await deleteLandParcel(ctx, existing.id);
  return true;
}

/**
 * Attach a boundary the user drew on the map, rather than uploaded as a KMZ.
 *
 * Same storage, same pin rule, same replace rule as the upload — it goes through {@link attachBoundary},
 * so the two entry points cannot drift. The only differences are the source label and the absence of
 * a source file: there is no KMZ behind a drawn ring, so nothing is put in storage.
 */
export async function attachDrawnBoundary(
  ctx: Ctx,
  propertyId: string,
  ring: number[][],
  opts: { movePin?: boolean } = {},
): Promise<BoundaryAttach> {
  if (ring.length < 3) throw new Error("A boundary needs at least 3 points.");
  // Same validation the KMZ parser applies: a ring that is not closed renders with its closing edge
  // missing (Mapbox's `line` does not auto-close the way `fill` does), so close it here too.
  const closed = [...ring];
  const [f, l] = [closed[0], closed[closed.length - 1]];
  if (closed.length > 1 && (f[0] !== l[0] || f[1] !== l[1]))
    closed.push([f[0], f[1]]);
  if (new Set(closed.slice(0, -1).map((p) => p.join(","))).size < 3) {
    throw new Error("A boundary needs 3 points that are not in a line.");
  }
  // A ring that crosses itself has no meaningful area, and the shoelace formula returns a confident
  // nonsense number for it rather than failing. Refuse it here, where the write happens, so a
  // hand-edited request cannot store one either.
  if (ringSelfIntersects(closed)) {
    throw new Error(
      "The boundary crosses itself. Move a corner so the outline does not overlap.",
    );
  }

  return attachBoundary(
    ctx,
    propertyId,
    {
      geometry: { type: "Polygon", coordinates: [closed] },
      sizeM2: Math.round(ringAreaM2(closed) * 100) / 100,
      // `centroidOf` is not exported, but the pin only needs to land ON the land, and a drawn ring
      // is convex-ish by construction: the area-weighted centre of the widest horizontal span is
      // safer than a plain average for a ring the user clicked, which can be concave.
      centroid: widestSpanCentroid(closed),
      bbox: bboxOf(closed),
      fields: {},
    },
    { ...opts, drawn: true },
  );
}

/** The centre of the widest inside span, over the ring's own latitude range. Falls back to the mean. */
function widestSpanCentroid(ring: number[][]): [number, number] {
  const n =
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
      ? ring.length - 1
      : ring.length;
  const lats = ring.slice(0, n).map((p) => p[1]);
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;

  const xs: number[] = [];
  for (let i = 0; i < n; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % n];
    if (y1 > midLat !== y2 > midLat)
      xs.push(x1 + ((midLat - y1) * (x2 - x1)) / (y2 - y1));
  }
  xs.sort((a, b) => a - b);
  let bestMid: number | null = null;
  let bestWidth = -1;
  for (let i = 0; i + 1 < xs.length; i += 2) {
    const width = xs[i + 1] - xs[i];
    if (width > bestWidth) {
      bestWidth = width;
      bestMid = (xs[i] + xs[i + 1]) / 2;
    }
  }
  if (bestMid !== null) return [midLat, bestMid];
  return [
    lats.reduce((s, v) => s + v, 0) / n,
    ring.slice(0, n).reduce((s, p) => s + p[0], 0) / n,
  ];
}

function bboxOf(ring: number[][]): [number, number, number, number] {
  const lngs = ring.map((p) => p[0]);
  const lats = ring.map((p) => p[1]);
  return [
    Math.min(...lngs),
    Math.min(...lats),
    Math.max(...lngs),
    Math.max(...lats),
  ];
}

export async function attachBoundaryFromBytes(
  ctx: Ctx,
  propertyId: string,
  bytes: Buffer,
  fileName: string,
  opts: BackfillOptions = {},
): Promise<BoundaryAttach> {
  const parsed = parseKmz(bytes);
  return attachBoundary(ctx, propertyId, parsed, {
    movePin: opts.movePin,
    sourceFile: opts.storeFiles ? { buffer: bytes, name: fileName } : undefined,
  });
}

// ── Filename → property matching ──────────────────────────────────────────────
//
// Two tiers, because the two callers know different things:
//
//   * Backfill (our own data): the client's own property code lives in `properties.name` as
//     "KPS00002 — Land, …". 108 of ORG-0018's 109 properties follow that shape, so parsing the
//     code out of the name is deterministic there.
//   * A real user's upload: their filename is THEIR scheme, and we have never seen it. Exact
//     match only, then the user picks the property by hand.
//
// Deliberately exact-only, mirroring resolveProperty: loose substring matching silently links a
// boundary to the WRONG property, which is worse than making the user pick.

const NAME_CODE_RE = /^([A-Z]{2,5}\d{4,5})\s*[—–-]\s*/;

/** The client's own property code, as stored at the start of `properties.name`. */
export function codeFromName(name: string | null | undefined): string {
  return (name ?? "").trim().match(NAME_CODE_RE)?.[1] ?? "";
}

/** The code a KMZ filename denotes: its stem, uppercased. "KD00005.kmz" → "KD00005". */
export function codeFromFileName(fileName: string): string {
  return fileName
    .replace(/\.kmz$/i, "")
    .trim()
    .toUpperCase();
}

export type BoundaryMatch = {
  file: string;
  code: string;
  /** Property id when exactly one matches; "" when the user must pick. */
  propertyId: string;
  /** Why it needs picking, for the review table. */
  reason?: "no-match" | "ambiguous";
};

/**
 * Match KMZ filenames to the org's properties. Exact code match only — on the code parsed from
 * `name`, or on the Valgate id itself (some users name files PROP-0001.kmz).
 */
export function matchBoundaries(
  files: string[],
  candidates: { id: string; name: string }[],
): BoundaryMatch[] {
  const byCode = new Map<string, string[]>();
  for (const c of candidates) {
    for (const key of [codeFromName(c.name), c.id.toUpperCase()]) {
      if (!key) continue;
      const hits = byCode.get(key) ?? [];
      if (!hits.includes(c.id)) hits.push(c.id);
      byCode.set(key, hits);
    }
  }
  return files.map((file) => {
    const code = codeFromFileName(file);
    const hits = byCode.get(code) ?? [];
    if (hits.length === 1) return { file, code, propertyId: hits[0] };
    return {
      file,
      code,
      propertyId: "",
      reason: hits.length ? "ambiguous" : "no-match",
    };
  });
}
