import { describe, expect, it } from "vitest";
import {
  buildParcelFacts,
  countFactsOnFile,
  formatAddress,
  parseAreaM2,
} from "@/lib/data/derivations/parcel-facts";
import type { LandParcel } from "@/lib/data/types/land-parcel";

const parcel = (over: Partial<LandParcel> = {}): LandParcel => ({
  id: "LPAR-0001",
  propertyId: "PROP-0001",
  sizeM2: 1250.75,
  ...over,
});

describe("parseAreaM2", () => {
  it("strips thousands separators", () => {
    expect(parseAreaM2("17,212")).toBe(17212);
  });

  it("returns null for blank, junk and zero — an absent field must cost nothing", () => {
    // The old KPI cards rendered an em dash for each of these; the Parcel panel omits them.
    expect(parseAreaM2(null)).toBeNull();
    expect(parseAreaM2("")).toBeNull();
    expect(parseAreaM2("n/a")).toBeNull();
    expect(parseAreaM2("0")).toBeNull();
  });
});

describe("buildParcelFacts", () => {
  it("prefers zoningClass and falls back to zoningCode", () => {
    expect(buildParcelFacts(parcel({ zoningClass: "R" }), null).zoning).toBe("R");
    expect(buildParcelFacts(parcel({ zoningCode: "R2" }), null).zoning).toBe("R2");
  });

  it("computes the declared-vs-measured delta as a signed percent", () => {
    // PROP-0020: declared 17,212 m² on the title, 1,250.75 m² measured from the ring.
    const f = buildParcelFacts(parcel({ sizeM2: 1250.75 }), 17212);
    expect(f.landSizeM2).toBe(1250.75);
    expect(f.declaredM2).toBe(17212);
    expect(f.deltaPct).toBe(-93); // measured is 93% under the declared figure
  });

  it("reports no delta when either figure is missing or they agree", () => {
    expect(buildParcelFacts(parcel(), null).deltaPct).toBeNull();
    expect(buildParcelFacts(null, 17212).deltaPct).toBeNull();
    expect(buildParcelFacts(parcel({ sizeM2: 17212 }), 17212).deltaPct).toBe(0);
  });
});

describe("countFactsOnFile", () => {
  it("counts only the groups that hold a value", () => {
    // A parcel with only size_m2 on file — the shape of all 42 rows in the dev database.
    expect(countFactsOnFile(buildParcelFacts(parcel(), null))).toEqual({ on: 1, of: 6 });
  });

  it("counts nothing when there is no parcel row at all", () => {
    expect(countFactsOnFile(buildParcelFacts(null, null))).toEqual({ on: 0, of: 6 });
  });

  it("counts a group when any one of its fields is present", () => {
    // Terrain groups elevation, slope and terrain — one is enough.
    const f = buildParcelFacts(parcel({ elevationM: 12 }), null);
    expect(countFactsOnFile(f).on).toBe(2);
  });
});

describe("formatAddress", () => {
  it("prints a value that repeats only once", () => {
    // city and province both hold "Phnom Penh" on real rows, which used to read
    // "Phnom Penh, Phnom Penh".
    expect(formatAddress(["Village Chamka Chek", null, "Damnak", "Damnak", null, "Cambodia"])).toBe(
      "Village Chamka Chek, Damnak, Cambodia",
    );
  });

  it("returns an empty string when nothing is on file", () => {
    expect(formatAddress([null, undefined, ""])).toBe("");
  });
});