import { describe, it, expect } from "vitest";
import { deflateRawSync } from "node:zlib";
import { parseKmz, ringAreaM2, boundaryContains, ringSelfIntersects, KmzError } from "@/lib/services/kmz";
import type { BoundaryGeometry } from "@/lib/data/types/land-parcel";
import { codeFromName, codeFromFileName, matchBoundaries, metresBetween } from "@/lib/services/property-boundary";

// ── KMZ parse ─────────────────────────────────────────────────────────────────
//
// The parser is the one piece of real logic in this flow: a wrong ring silently becomes a wrong
// land area and a wrong map shape, with nothing downstream able to notice. These cases pin the
// three things most likely to break — zip inflation, ring closure, and the area formula.

function kmz(kml: string, { stored = false } = {}): Buffer {
  const name = Buffer.from("doc.kml", "utf8");
  const body = Buffer.from(kml, "utf8");
  const payload = stored ? body : deflateRawSync(body);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(stored ? 0 : 8, 8); // compression method
  local.writeUInt32LE(payload.length, 18); // compressed size
  local.writeUInt32LE(body.length, 22); // uncompressed size
  local.writeUInt16LE(name.length, 26);
  return Buffer.concat([local, name, payload]);
}

const KML = (coords: string, extra = "") => `<?xml version="1.0"?><kml><Document>
  <Placemark><ExtendedData><SchemaData>
    <SimpleData name="uprn">40</SimpleData>
  </SchemaData></ExtendedData>
  <Polygon><outerBoundaryIs><LinearRing><coordinates>
    ${coords}
  </coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>${extra}</Document></kml>`;

describe("parseKmz", () => {
  it("inflates a deflated KMZ and reads the ring", () => {
    const parsed = parseKmz(kmz(KML("104.0,11.0,0 104.001,11.0,0 104.001,11.001,0 104.0,11.0,0")));
    expect(parsed.geometry.type).toBe("Polygon");
    // The ring must stay CLOSED — first position repeated at the end. KML writes it that way and
    // RFC 7946 requires it. Dropping the repeat (which this parser used to do) breaks the drawn
    // outline: Mapbox's fill auto-closes but its line layer does not, so the closing edge is never
    // stroked and the boundary shows one side short.
    const ring = (parsed.geometry.coordinates as number[][][])[0];
    expect(ring).toHaveLength(4);
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    expect(parsed.fields.uprn).toBe("40");
  });

  it("closes a ring the source left open", () => {
    const parsed = parseKmz(kmz(KML("104.0,11.0,0 104.001,11.0,0 104.001,11.001,0")));
    const ring = (parsed.geometry.coordinates as number[][][])[0];
    expect(ring).toHaveLength(4);
    expect(ring[0]).toEqual(ring[ring.length - 1]);
  });

  it("reads a stored (uncompressed) KMZ too", () => {
    const parsed = parseKmz(kmz(KML("104.0,11.0,0 104.001,11.0,0 104.001,11.001,0"), { stored: true }));
    expect(parsed.sizeM2).toBeGreaterThan(0);
  });

  it("measures area in m², matching a hand-computed ~110 m square", () => {
    // 0.001° lng at 11°N ≈ 109.4 m; 0.001° lat ≈ 111.2 m. Ring area ≈ 12,160 m².
    const parsed = parseKmz(kmz(KML("104.0,11.0,0 104.001,11.0,0 104.001,11.001,0 104.0,11.001,0")));
    expect(parsed.sizeM2).toBeGreaterThan(11_000);
    expect(parsed.sizeM2).toBeLessThan(13_500);
  });

  it("centres on the ring, and reports its bbox", () => {
    const parsed = parseKmz(kmz(KML("104.0,11.0,0 104.002,11.0,0 104.002,11.004,0 104.0,11.004,0")));
    expect(parsed.centroid[0]).toBeCloseTo(11.002, 5); // lat
    expect(parsed.centroid[1]).toBeCloseTo(104.001, 5); // lng
    expect(parsed.bbox).toEqual([104, 11, 104.002, 11.004]);
  });

  it("treats a two-ring KMZ as a MultiPolygon and sums both areas", () => {
    const two = KML(
      "104.0,11.0,0 104.001,11.0,0 104.001,11.001,0",
      `<Placemark><Polygon><outerBoundaryIs><LinearRing><coordinates>
         104.01,11.01,0 104.011,11.01,0 104.011,11.011,0
       </coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>`,
    );
    const parsed = parseKmz(kmz(two));
    expect(parsed.geometry.type).toBe("MultiPolygon");
    expect((parsed.geometry.coordinates as number[][][][]).length).toBe(2);
    expect(parsed.sizeM2).toBeGreaterThan(parseKmz(kmz(KML("104.0,11.0,0 104.001,11.0,0 104.001,11.001,0"))).sizeM2);
  });

  it("rejects a zip with no KML inside", () => {
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(0, 8);
    const name = Buffer.from("readme.txt", "utf8");
    local.writeUInt16LE(name.length, 26);
    expect(() => parseKmz(Buffer.concat([local, name, Buffer.from("hi")]))).toThrow(KmzError);
  });

  it("rejects a KMZ whose KML has no polygon", () => {
    expect(() => parseKmz(kmz("<kml><Document><Placemark></Placemark></Document></kml>"))).toThrow(KmzError);
  });

  it("rejects a degenerate ring", () => {
    expect(() => parseKmz(kmz(KML("104.0,11.0,0 104.001,11.0,0")))).toThrow(KmzError);
  });

  // A 1 KB entry can inflate to gigabytes. The cap is what stops one upload from taking the
  // server down, so assert it actually fires rather than trusting the option name.
  it("refuses a zip bomb instead of allocating for it", () => {
    // 64 MB of zeros deflates to a few KB — the classic bomb shape.
    const payload = deflateRawSync(Buffer.alloc(64 * 1024 * 1024));
    const name = Buffer.from("doc.kml", "utf8");
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt16LE(name.length, 26);
    expect(() => parseKmz(Buffer.concat([local, name, payload]))).toThrow(KmzError);
  });
});

describe("ringAreaM2", () => {
  it("is orientation-independent", () => {
    const cw = [[104, 11], [104.001, 11], [104.001, 11.001], [104, 11.001]];
    expect(ringAreaM2(cw)).toBeCloseTo(ringAreaM2([...cw].reverse()), 6);
  });
});

// ── Matching ──────────────────────────────────────────────────────────────────

describe("boundary matching", () => {
  it("parses the client code out of a property name", () => {
    expect(codeFromName("KPS00002 — Land, Ampil Roung, Uddong")).toBe("KPS00002");
    expect(codeFromName("KD00005 - Land")).toBe("KD00005");
    expect(codeFromName("jt1")).toBe("");
    expect(codeFromName(null)).toBe("");
  });

  it("derives a code from a filename", () => {
    expect(codeFromFileName("KD00005.kmz")).toBe("KD00005");
    expect(codeFromFileName("kd00005.KMZ")).toBe("KD00005");
  });

  it("matches exactly one property by code, and matches on the Valgate id too", () => {
    const candidates = [
      { id: "PROP-0532", name: "KPS00002 — Land" },
      { id: "PROP-0533", name: "KPS00003 — Land" },
    ];
    expect(matchBoundaries(["KPS00002.kmz"], candidates)).toEqual([
      { file: "KPS00002.kmz", code: "KPS00002", propertyId: "PROP-0532" },
    ]);
    expect(matchBoundaries(["PROP-0533.kmz"], candidates)[0].propertyId).toBe("PROP-0533");
  });

  it("asks the user to pick rather than guessing, on no match or several", () => {
    const candidates = [
      { id: "PROP-0001", name: "KPS00002 — Land" },
      { id: "PROP-0002", name: "KPS00002 — Other" },
    ];
    expect(matchBoundaries(["SR00099.kmz"], candidates)[0]).toMatchObject({ propertyId: "", reason: "no-match" });
    expect(matchBoundaries(["KPS00002.kmz"], candidates)[0]).toMatchObject({ propertyId: "", reason: "ambiguous" });
  });
});

describe("metresBetween", () => {
  it("measures a known distance", () => {
    // One degree of latitude is ~111 km anywhere.
    expect(metresBetween([11, 104], [12, 104])).toBeGreaterThan(110_000);
    expect(metresBetween([11, 104], [12, 104])).toBeLessThan(112_500);
  });

  it("puts the pin on the land for a CONCAVE parcel whose area centroid falls outside", () => {
    // L-shape: an area-weighted centroid of this ring lands in the notch, off the land. The guard
    // must fall back so the pin stays on the parcel — 3 of the 41 reference parcels hit this.
    const L = [
      "0.0000,0.0000,0", "0.0030,0.0000,0", "0.0030,0.0010,0",
      "0.0010,0.0010,0", "0.0010,0.0030,0", "0.0000,0.0030,0", "0.0000,0.0000,0",
    ].join(" ");
    const { centroid } = parseKmz(kmz(KML(L)));
    const [lat, lng] = centroid;
    // The notch is the square lng>0.0010 && lat>0.0010; a pin there would be off the land.
    const inNotch = lng > 0.0010 && lat > 0.0010;
    expect(inNotch).toBe(false);
  });

  it("centres an ordinary rectangle rather than biasing toward one corner", () => {
    // Equal-area rectangle: the centre must be the middle, and adding a redundant midpoint on one
    // edge must not drag it (the old point-average did exactly that).
    const plain = parseKmz(kmz(KML("0.0000,0.0000,0 0.0040,0.0000,0 0.0040,0.0020,0 0.0000,0.0020,0 0.0000,0.0000,0")));
    const [lat, lng] = plain.centroid;
    expect(lat).toBeCloseTo(0.0010, 6);
    expect(lng).toBeCloseTo(0.0020, 6);
  });
});

describe("ringSelfIntersects", () => {
  it("passes a normal convex ring", () => {
    expect(ringSelfIntersects([[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]])).toBe(false);
  });

  it("catches a bow-tie", () => {
    // The classic crossed quad: the shoelace formula gives this a confident, meaningless area.
    expect(ringSelfIntersects([[0, 0], [1, 1], [1, 0], [0, 1]])).toBe(true);
  });

  it("passes a concave ring that does not cross", () => {
    expect(ringSelfIntersects([[0, 0], [3, 0], [3, 1], [1, 1], [1, 3], [0, 3]])).toBe(false);
  });

  it("treats touching an edge as legal", () => {
    // A vertex sitting exactly ON another edge is degenerate but not a crossing; refusing it would
    // reject shapes the parser happily accepts.
    expect(ringSelfIntersects([[0, 0], [2, 0], [1, 0], [1, 2]])).toBe(false);
  });

  it("skips the closing repeat", () => {
    const closed = [[0, 0], [1, 0], [1, 1], [0, 0]];
    expect(ringSelfIntersects(closed)).toBe(false);
  });
});

describe("boundaryContains", () => {
  const square: BoundaryGeometry = {
    type: "Polygon",
    coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
  };

  it("accepts a point inside and rejects one outside", () => {
    expect(boundaryContains(square, [0.5, 0.5])).toBe(true);
    expect(boundaryContains(square, [1.5, 0.5])).toBe(false);
  });

  it("rejects a point in the notch of a concave ring", () => {
    // The L-shape from the centroid test: the square lng>0.001, lat>0.001 is a notch, not land.
    // A centroid can land here (that is why centroidOf has guards), and a user-kept pin can too.
    const ell: BoundaryGeometry = {
      type: "Polygon",
      coordinates: [[
        [0.0000, 0.0000], [0.0030, 0.0000], [0.0030, 0.0010],
        [0.0010, 0.0010], [0.0010, 0.0030], [0.0000, 0.0030], [0.0000, 0.0000],
      ]],
    };
    expect(boundaryContains(ell, [0.0020, 0.0020])).toBe(false); // in the notch
    expect(boundaryContains(ell, [0.0005, 0.0005])).toBe(true);  // on the land
  });

  it("accepts a point in EITHER plot of a MultiPolygon", () => {
    // Two disjoint plots: the owner holds both, so a pin in the second one is on their land.
    const split: BoundaryGeometry = {
      type: "MultiPolygon",
      coordinates: [
        [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        [[[5, 5], [6, 5], [6, 6], [5, 6], [5, 5]]],
      ],
    };
    expect(boundaryContains(split, [0.5, 0.5])).toBe(true);
    expect(boundaryContains(split, [5.5, 5.5])).toBe(true);
    expect(boundaryContains(split, [3, 3])).toBe(false); // between the plots
  });
});
