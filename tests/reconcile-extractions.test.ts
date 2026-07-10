// Unit check for reconcileExtractions: the self-consistency voting. Pure, no AI/DB (ExtractedProperty
// is a type-only import, so document-scan.ts is never loaded at runtime).

import { describe, it, expect } from "vitest";
import { reconcileExtractions } from "@/lib/services/reconcile-extractions";
import type { ExtractedProperty } from "@/lib/services/document-scan";

// A fully-populated baseline; each test overrides only the fields it cares about.
const base: ExtractedProperty = {
  propertyName: "Riverside Villa",
  propertyType: "residential",
  status: "Rented",
  addressLine: "12 Sisowath Quay",
  addressLine2: null,
  city: "Phnom Penh",
  province: "Phnom Penh",
  zip: "12207",
  country: "Cambodia",
  yearBuilt: "2018",
  totalArea: "320",
  bedrooms: "4",
  bathrooms: "3",
  parkingSpaces: "2",
  purchasePrice: "250000",
  currentMarketValue: "310000",
  purchaseDate: "2022-03-15",
  ownershipStatus: "owned",
};

describe("reconcileExtractions", () => {
  it("keeps the value and flags nothing when all runs agree", () => {
    const { extracted, lowConfidence } = reconcileExtractions([base, base, base]);
    expect(extracted.totalArea).toBe("320");
    expect(extracted.propertyName).toBe("Riverside Villa");
    expect(lowConfidence).toEqual([]);
  });

  it("keeps the majority value and flags the field when runs disagree (2 vs 1)", () => {
    const runs = [
      { ...base, totalArea: "2000" },
      { ...base, totalArea: "2000" },
      { ...base, totalArea: "1200" },
    ];
    const { extracted, lowConfidence } = reconcileExtractions(runs);
    expect(extracted.totalArea).toBe("2000"); // majority
    expect(lowConfidence).toContain("totalArea");
  });

  it("flags a field where every run differs and returns the first-seen answer", () => {
    const runs = [
      { ...base, totalArea: "2000" },
      { ...base, totalArea: "1200" },
      { ...base, totalArea: null },
    ];
    const { extracted, lowConfidence } = reconcileExtractions(runs);
    expect(extracted.totalArea).toBe("2000"); // first-seen wins the 3-way tie
    expect(lowConfidence).toContain("totalArea");
  });

  it("treats a value and null as disagreement (unreadable handwriting)", () => {
    const runs = [
      { ...base, purchasePrice: "250000" },
      { ...base, purchasePrice: null },
    ];
    const { lowConfidence } = reconcileExtractions(runs);
    expect(lowConfidence).toContain("purchasePrice");
  });

  it("counts numeric values as agreeing despite units/separators", () => {
    const runs = [
      { ...base, totalArea: "2000" },
      { ...base, totalArea: "2,000 square meters" },
    ];
    const { extracted, lowConfidence } = reconcileExtractions(runs);
    expect(lowConfidence).not.toContain("totalArea"); // "2000" === "2,000 square meters" for voting
    expect(extracted.totalArea).toBe("2000"); // returns the first raw value
  });

  it("throws on an empty run list", () => {
    expect(() => reconcileExtractions([])).toThrow();
  });
});
