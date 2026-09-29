import { describe, it, expect } from "vitest";
import { boundaryBounds, fitBoundary, addBoundaryLayer, BOUNDARY_LINE_ID } from "./boundary-layer";
import type { BoundaryGeometry } from "@/lib/data/types/land-parcel";

// The bug this guards: the detail map opened at a fixed zoom 15, where the smallest parcel in the
// reference set (~17 m across) draws at under 4 px and is hidden behind a 36 px pin. Fitting to
// the ring is what makes the boundary visible on load, so these pin the bounds maths and the
// camera call rather than trusting the option name.
describe("boundaryBounds", () => {
  const square = (lng: number, lat: number, d: number) =>
    ({ type: "Polygon" as const, coordinates: [[[lng, lat], [lng + d, lat], [lng + d, lat + d], [lng, lat + d]]] });

  it("returns the bbox of a single ring", () => {
    expect(boundaryBounds(square(104.5, 11.45, 1e-4))).toEqual([104.5, 11.45, 104.5 + 1e-4, 11.45 + 1e-4]);
  });

  it("spans every polygon of a MultiPolygon", () => {
    const mp = {
      type: "MultiPolygon" as const,
      coordinates: [square(104.5, 11.45, 1e-4).coordinates, square(104.6, 11.46, 1e-4).coordinates],
    };
    expect(boundaryBounds(mp)).toEqual([104.5, 11.45, 104.6 + 1e-4, 11.46 + 1e-4]);
  });

  it("is null for nothing to fit, so callers can skip the camera move", () => {
    expect(boundaryBounds(null)).toBeNull();
    expect(boundaryBounds(undefined)).toBeNull();
    expect(boundaryBounds({ type: "Polygon", coordinates: [] })).toBeNull();
  });
});

describe("fitBoundary", () => {
  function fakeMap() {
    const calls: unknown[] = [];
    return {
      calls,
      map: { fitBounds: (b: unknown, o: unknown) => calls.push([b, o]) } as never,
    };
  }

  it("frames the ring's corners and does not jump instantly", () => {
    const { map, calls } = fakeMap();
    const square = { type: "Polygon" as const, coordinates: [[[104.5, 11.45], [104.5001, 11.45], [104.5001, 11.4501]]] };
    expect(fitBoundary(map, square)).toBe(true);
    const [bounds, opts] = calls[0] as [[number, number][], { maxZoom: number; duration: number }];
    expect(bounds).toEqual([[104.5, 11.45], [104.5001, 11.4501]]);
    // Cap matters: parcel rings carry centimetre precision, so an uncapped fit would dive past
    // street level on the smallest plots.
    expect(opts.maxZoom).toBe(20);
    expect(opts.duration).toBe(0);
  });

  it("does not move the camera when there is no boundary", () => {
    const { map, calls } = fakeMap();
    expect(fitBoundary(map, null)).toBe(false);
    expect(calls).toHaveLength(0);
  });
});

describe("boundary line style", () => {
  // The bug this guards: Mapbox's default `line-join: miter` projects a near-collinear vertex
  // OUTWARD when building the corner, drawing a spike that is not in the data. 31 of the 41
  // reference rings have such a vertex (KEP00001's is ~1.2° between a 12 m and a 30 m edge), so the
  // spike was visible on most parcels. A round join cannot overshoot, so `line-join` is required
  // rather than cosmetic — and it must be LAYOUT, not paint (Mapbox rejects it in paint).
  function captureLayers(geometry: BoundaryGeometry) {
    const added: { id: string; [k: string]: unknown }[] = [];
    const map = {
      getSource: () => undefined,
      addSource: () => {},
      addLayer: (l: { id: string }) => added.push(l),
    } as unknown as Parameters<typeof addBoundaryLayer>[0];
    addBoundaryLayer(map, geometry);
    return added;
  }

  const square: BoundaryGeometry = {
    type: "Polygon",
    coordinates: [[[104.5, 11.45], [104.5001, 11.45], [104.5001, 11.4501], [104.5, 11.4501]]],
  };

  it("uses a round join so a near-collinear vertex cannot spike", () => {
    const line = captureLayers(square).find((l) => l.id === BOUNDARY_LINE_ID)!;
    expect(line.layout).toMatchObject({ "line-join": "round" });
  });

  it("keeps line-join out of paint, where Mapbox would reject it", () => {
    const line = captureLayers(square).find((l) => l.id === BOUNDARY_LINE_ID)!;
    expect(line.paint).not.toHaveProperty("line-join");
  });
});
