import { describe, it, expect } from "vitest";
import { boundarySides, formatMeters, ringSpanM, sidesToLineFeatures } from "./boundary-sides";
import type { BoundaryGeometry } from "@/lib/data/types/land-parcel";

// A 100 m square at 11.45°N: 100 m north/south is 100/111320 degrees of latitude, and 100 m east/west
// is that divided by cos(lat). Built rather than pasted so the expected answer is arithmetic.
const LAT = 11.45;
const LNG = 104.5;
const D_LAT = 100 / 111320;
const D_LNG = 100 / (111320 * Math.cos((LAT * Math.PI) / 180));

const square = (repeatFirstVertex = true): BoundaryGeometry => {
  const ring: number[][] = [
    [LNG, LAT],
    [LNG + D_LNG, LAT],
    [LNG + D_LNG, LAT + D_LAT],
    [LNG, LAT + D_LAT],
  ];
  if (repeatFirstVertex) ring.push([LNG, LAT]);
  return { type: "Polygon", coordinates: [ring] };
};

describe("boundarySides", () => {
  it("measures all four sides of a square to the metre", () => {
    const m = boundarySides(square())!;
    expect(m.sides).toHaveLength(4);
    for (const side of m.sides) expect(side.meters).toBeGreaterThan(99.4);
    for (const side of m.sides) expect(side.meters).toBeLessThan(100.6);
    expect(m.perimeterM).toBeGreaterThan(398);
    expect(m.perimeterM).toBeLessThan(403);
  });

  it("gives the same answer whether the ring is closed or not", () => {
    const closed = boundarySides(square(true))!;
    const open = boundarySides(square(false))!;
    expect(open.sides).toHaveLength(4);
    expect(open.perimeterM).toBeCloseTo(closed.perimeterM, 6);
  });

  it("drops near-collinear vertices instead of reporting a 0 m side", () => {
    // The source KML repeats vertices, and repeats them again a few centimetres along.
    const ring = square(false).coordinates[0] as number[][];
    ring.splice(2, 0, [LNG + D_LNG, LAT], [LNG + D_LNG, LAT + 3e-7]);
    const m = boundarySides({ type: "Polygon", coordinates: [ring] })!;
    expect(m.sides).toHaveLength(4);
    for (const side of m.sides) expect(side.meters).toBeGreaterThan(MIN_SAFE);
  });

  it("numbers the sides in ring order and names the longest and shortest", () => {
    // An L: the long edge out of the corner is unmistakable.
    const m = boundarySides({
      type: "Polygon",
      coordinates: [
        [
          [LNG, LAT],
          [LNG + D_LNG * 3, LAT],
          [LNG + D_LNG * 3, LAT + D_LAT],
          [LNG + D_LNG, LAT + D_LAT],
          [LNG + D_LNG, LAT + D_LAT * 2],
          [LNG, LAT + D_LAT * 2],
        ],
      ],
    })!;
    expect(m.sides.map((s) => s.index)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(m.longest.meters).toBeGreaterThan(m.shortest.meters);
    // Side 1 is the 300 m run out of the corner; side 3 is the 200 m run back.
    expect(m.longest.meters).toBeCloseTo(m.sides[0].meters, 6);
    expect(m.shortest.meters).toBeCloseTo(100, 0);
  });

  it("sums every polygon of a MultiPolygon", () => {
    const one = boundarySides(square())!;
    const two = boundarySides({
      type: "MultiPolygon",
      coordinates: [
        [square().coordinates[0]],
        [[[LNG + 1, LAT], [LNG + 1 + D_LNG, LAT], [LNG + 1 + D_LNG, LAT + D_LAT]]],
      ],
    })!;
    expect(two.sides).toHaveLength(one.sides.length + 3);
    expect(two.perimeterM).toBeGreaterThan(one.perimeterM);
  });

  it("has nothing to measure for an absent, empty or degenerate ring", () => {
    expect(boundarySides(null)).toBeNull();
    expect(boundarySides(undefined)).toBeNull();
    expect(boundarySides({ type: "Polygon", coordinates: [] })).toBeNull();
    // Two distinct corners is a line, not a parcel.
    expect(boundarySides({ type: "Polygon", coordinates: [[[LNG, LAT], [LNG + D_LNG, LAT]]] })).toBeNull();
  });

  it("points the bearing north for a due-north edge", () => {
    const m = boundarySides(square())!;
    // sides[1] runs from the south-east corner to the north-east corner: due north.
    expect(m.sides[1].bearingDeg).toBeCloseTo(0, 0);
  });
});

describe("ringSpanM", () => {
  it("reports the ground the ring covers, in metres", () => {
    // The same 100 m square: its bounding box is 100 m on both axes.
    expect(ringSpanM(boundarySides(square())!)).toBeGreaterThan(99);
    expect(ringSpanM(boundarySides(square())!)).toBeLessThan(101);
  });
});

const MIN_SAFE = 1; // nothing under a metre reaches the UI

describe("formatMeters", () => {
  it("keeps one decimal, whatever the length", () => {
    expect(formatMeters(2.44)).toBe("2.4 m");
    expect(formatMeters(9.96)).toBe("10.0 m");
    expect(formatMeters(38.4)).toBe("38.4 m");
    expect(formatMeters(384.2)).toBe("384.2 m");
  });
});

describe("sidesToLineFeatures", () => {
  it("emits one straight segment per side, carrying its own label", () => {
    const fc = sidesToLineFeatures(boundarySides(square())!);
    expect(fc.features).toHaveLength(4);
    for (const f of fc.features) {
      const g = f.geometry as { type: string; coordinates: number[][] };
      expect(g.type).toBe("LineString");
      expect(g.coordinates).toHaveLength(2);
      expect(f.properties?.label).toMatch(/^(100|[0-9]{1,2}(\.[0-9])?) m$/);
    }
  });
});
