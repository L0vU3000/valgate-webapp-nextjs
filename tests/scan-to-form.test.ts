// Unit check for scanToForm: the AI's extracted object -> wizard form patch. Pure, no AI/DB (the
// ExtractedProperty import is type-only, so document-scan.ts is never loaded at runtime).

import { describe, it, expect } from "vitest";
import { scanToForm } from "@/app/_shared/add-property/_lib/scan-to-form";
import type { ExtractedProperty } from "@/lib/services/document-scan";

const full: ExtractedProperty = {
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

describe("scanToForm", () => {
  it("maps every extracted field into the form patch", () => {
    const patch = scanToForm(full);
    expect(patch.propertyName).toBe("Riverside Villa");
    expect(patch.propertyType).toBe("residential");
    expect(patch.status).toBe("Rented");
    expect(patch.city).toBe("Phnom Penh");
    expect(patch.totalArea).toBe("320");
    expect(patch.purchasePrice).toBe("250000");
    expect(patch.purchaseDate).toBe("2022-03-15");
  });

  it("turns nulls (fields the document didn't state) into empty strings", () => {
    const sparse: ExtractedProperty = {
      ...full,
      propertyType: null,
      status: null,
      purchasePrice: null,
      bedrooms: null,
      addressLine2: null,
    };
    const patch = scanToForm(sparse);
    expect(patch.propertyType).toBe("");
    expect(patch.status).toBe("");
    expect(patch.purchasePrice).toBe("");
    expect(patch.bedrooms).toBe("");
    // A present field still comes through
    expect(patch.propertyName).toBe("Riverside Villa");
  });
});
