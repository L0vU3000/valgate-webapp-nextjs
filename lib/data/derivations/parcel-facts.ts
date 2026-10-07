import type { LandParcel } from "@/lib/data/types/land-parcel";

// Parcel facts for the property Location tab.
//
// One panel decides what to render from what actually exists. Two of the three old KPI
// cards (Current Zoning, Elevation Range) are backed by land_parcels columns that hold a
// value on 0 of 42 rows in the database, so they rendered an em dash for every property.
// These helpers keep an absent field costing nothing instead of costing a box.

export type ParcelFacts = {
  /** Total land size: the measured area, which is the parcel row's own figure. */
  landSizeM2: number | null;
  /** The figure on the title document. Distinct from the measurement; never merged. */
  declaredM2: number | null;
  /** How far the measurement sits from the declared figure, as a signed percent. */
  deltaPct: number | null;
  widthM: number | null;
  lengthM: number | null;
  zoning: string | null;
  developmentPotential: string[];
  elevationM: number | null;
  slopeDeg: number | null;
  terrain: string | null;
};

/** Parse "17,212" / "1250.75" into a number. Returns null for blank, zero or junk. */
export function parseAreaM2(raw: string | null | undefined): number | null {
  const n = Number((raw ?? "").replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function buildParcelFacts(
  parcel: LandParcel | null,
  declaredM2: number | null,
): ParcelFacts {
  const measured = parcel ? parcel.sizeM2 : null;
  // A delta is only meaningful when both figures exist and actually differ.
  const deltaPct =
    measured != null && declaredM2 != null && declaredM2 > 0
      ? Math.round(((measured - declaredM2) / declaredM2) * 100)
      : null;

  return {
    landSizeM2: measured,
    declaredM2,
    deltaPct,
    widthM: parcel?.widthM ?? null,
    lengthM: parcel?.lengthM ?? null,
    zoning: parcel?.zoningClass ?? parcel?.zoningCode ?? null,
    developmentPotential: parcel?.developmentPotential ?? [],
    elevationM: parcel?.elevationM ?? null,
    slopeDeg: parcel?.slopeAngleDeg ?? null,
    terrain: parcel?.terrainType ?? null,
  };
}

/** Count the groups that hold a value, for the panel's "N of M on file" line. */
export function countFactsOnFile(f: ParcelFacts): { on: number; of: number } {
  const groups: unknown[] = [
    f.landSizeM2,
    f.declaredM2,
    f.widthM != null || f.lengthM != null,
    f.zoning,
    f.developmentPotential.length > 0,
  ];
  return { on: groups.filter(Boolean).length, of: groups.length };
}

/** Join the address parts, printing any value that repeats only once. */
export function formatAddress(parts: (string | null | undefined)[]): string {
  return parts
    .filter((v): v is string => Boolean(v))
    // city and province often hold the same value in Cambodia; print it once.
    .filter((v, i, all) => all.indexOf(v) === i)
    .join(", ");
}
/**
 * A boundary's corners as an open ring — the repeated closing position dropped.
 *
 * GeoJSON closes a linear ring by repeating the first position, and the draw tool has to hand back
 * that same closed shape when it saves. But for EDITING the repeat is a phantom vertex: it renders a
 * second handle on top of the first, and dragging it would silently split the ring. So the editor
 * opens on the open ring and the server closes it again on save.
 *
 * The first polygon only: a MultiPolygon parcel cannot be represented by the single-ring editor, and
 * seeding a half-drawn shape would be worse than refusing it. It is left alone, not mangled.
 */
export function ringPoints(
  geometry: { type: string; coordinates: unknown } | null | undefined,
): number[][] {
  if (!geometry || geometry.type !== "Polygon") return [];
  const outer = (geometry.coordinates as number[][][])?.[0];
  if (!Array.isArray(outer) || outer.length < 3) return [];
  const open = [...outer];
  const [f, l] = [open[0], open[open.length - 1]];
  // Only drop a repeat that is genuinely the same position, so an unclosed ring is still accepted.
  if (open.length > 1 && f[0] === l[0] && f[1] === l[1]) open.pop();
  return open;
}
