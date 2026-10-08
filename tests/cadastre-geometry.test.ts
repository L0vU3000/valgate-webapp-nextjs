import { describe, it, expect } from "vitest";
import { parseGeometry } from "@/lib/services/kmz";
import { isInFrance } from "@/lib/geo/france";
import type { BoundaryGeometry } from "@/lib/data/types/land-parcel";

// The cadastre path's own logic, with no network and no database.
//
// The geometry math itself is already covered by the KMZ tests — this checks that the NEW entry
// point wires into it correctly (Polygon vs MultiPolygon, the degenerate guard) and that the France
// gate agrees with the two facts it exists for: Paris is inside, Phnom Penh is not.

// A ~1.1 km² square near Paris, closed, as APICarto returns (MultiPolygon of one polygon).
const SQUARE: BoundaryGeometry = {
  type: "MultiPolygon",
  coordinates: [
    [
      [
        [2.3300, 48.8600],
        [2.3450, 48.8600],
        [2.3450, 48.8700],
        [2.3300, 48.8700],
        [2.3300, 48.8600],
      ],
    ],
  ],
};

describe("parseGeometry", () => {
  it("measures a cadastre MultiPolygon and places the centroid inside it", () => {
    const parsed = parseGeometry(SQUARE);

    // 0.015° lng x 0.010° lat at 48.865°N: 1098.6 m x 1105.7 m = 1,214,700 m², and the spherical
    // formula lands within a fraction of a percent of that. Bounds are +/-2% so this fails if the
    // projection or the shoelace is ever changed, but not on rounding.
    expect(parsed.sizeM2).toBeGreaterThan(1_190_000);
    expect(parsed.sizeM2).toBeLessThan(1_240_000);

    // The pin must land ON the land — the whole reason the KMZ path has its inside-the-ring guard.
    const [lat, lng] = parsed.centroid;
    expect(lat).toBeGreaterThan(48.86);
    expect(lat).toBeLessThan(48.87);
    expect(lng).toBeGreaterThan(2.33);
    expect(lng).toBeLessThan(2.345);

    expect(parsed.bbox).toEqual([2.33, 48.86, 2.345, 48.87]);
    expect(parsed.geometry).toBe(SQUARE);
  });

  it("handles a Polygon (not MultiPolygon) the same way", () => {
    const poly: BoundaryGeometry = {
      type: "Polygon",
      coordinates: SQUARE.coordinates[0] as unknown[],
    };
    const asMulti = parseGeometry(SQUARE);
    const asPoly = parseGeometry(poly);

    // Same ring, so the same measurement regardless of how it is wrapped.
    expect(asPoly.sizeM2).toBeCloseTo(asMulti.sizeM2, 6);
    expect(asPoly.centroid).toEqual(asMulti.centroid);
  });

  it("subtracts a courtyard from the area and keeps the pin out of it", () => {
    // Real parcels have holes: the first real Paris parcel fetched has a 14,886 m² courtyard inside
    // a 42,083 m² outer ring. Summing outer rings alone overstated its land by 55%, which the UI
    // shows beside the official figure. This is the shape of that parcel, shrunk.
    const withCourtyard: BoundaryGeometry = {
      type: "Polygon",
      coordinates: [
        // outer: 0.006° x 0.004° ~= 197 x 442 m, but the hole is placed dead centre so the
        // shoelace centroid of the whole shape lands INSIDE it.
        [
          [2.3300, 48.8600],
          [2.3360, 48.8600],
          [2.3360, 48.8640],
          [2.3300, 48.8640],
          [2.3300, 48.8600],
        ],
        // hole: the middle half of each dimension, centred on the outer ring's centre
        [
          [2.3315, 48.8610],
          [2.3345, 48.8610],
          [2.3345, 48.8630],
          [2.3315, 48.8630],
          [2.3315, 48.8610],
        ],
      ],
    };

    const whole = parseGeometry({
      type: "Polygon",
      coordinates: [withCourtyard.coordinates[0] as unknown[]],
    });
    const holed = parseGeometry(withCourtyard);

    // Outer only vs outer-minus-hole: the difference IS the courtyard, so it must be subtracted
    // rather than ignored. 0.0030° lng at this latitude is ~220 m, 0.0020° lat is ~223 m, so the
    // hole is ~48,900 m². Bounds allow ±5% for the projection.
    expect(whole.sizeM2 - holed.sizeM2).toBeGreaterThan(46_500);
    expect(whole.sizeM2 - holed.sizeM2).toBeLessThan(51_500);

    // And the pin must not sit in the courtyard. Without the hole check it would: the area
    // centroid of this shape is the outer ring's centre, which the hole covers.
    const [lat, lng] = holed.centroid;
    const inHole = lng > 2.3315 && lng < 2.3345 && lat > 48.861 && lat < 48.863;
    expect(inHole).toBe(false);
  });

  it("refuses a geometry with no usable ring instead of returning a zero-area parcel", () => {
    const degenerate: BoundaryGeometry = {
      type: "Polygon",
      coordinates: [
        [
          [2.33, 48.86],
          [2.33, 48.86],
        ],
      ],
    };
    expect(() => parseGeometry(degenerate)).toThrow();
  });
});

describe("isInFrance", () => {
  it("accepts Paris and rejects Phnom Penh", () => {
    // The measured pair: APICarto returns a parcel for the first and an empty feature set for the
    // second. If this flips, the hover layer would load over Cambodia and the API gate would skip
    // France — so this is the assertion that fails if the boxes are ever mistyped.
    expect(isInFrance(2.3376, 48.8606)).toBe(true);
    expect(isInFrance(104.9282, 11.5564)).toBe(false);
  });

  it("covers the overseas territories whose tiles are also published", () => {
    expect(isInFrance(55.53, -21.11)).toBe(true); // Réunion
    expect(isInFrance(-61.53, 16.27)).toBe(true); // Guadeloupe
  });

  it("rejects points just outside the mainland box", () => {
    expect(isInFrance(-6.5, 48.0)).toBe(false); // Atlantic, west of Brittany
    expect(isInFrance(12.0, 45.0)).toBe(false); // Italy
  });
});
