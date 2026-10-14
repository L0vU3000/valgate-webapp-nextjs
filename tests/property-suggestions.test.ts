import { describe, expect, it } from "vitest";
import { suggestPropertyUpdates } from "@/lib/services/property-suggestions";
import type { ExtractedProperty } from "@/lib/services/document-scan";
import type { Property } from "@/lib/data/types/property";

// Only the fields the comparison reads matter here; the rest of the domain object is noise.
const property = (fields: Record<string, unknown>) =>
  ({ id: "PROP-0001", orgId: "ORG-0001", ...fields }) as unknown as Property;

const extracted = (fields: Partial<ExtractedProperty>) =>
  ({
    propertyName: null,
    propertyType: null,
    status: null,
    addressLine: null,
    addressLine2: null,
    city: null,
    province: null,
    zip: null,
    country: null,
    yearBuilt: null,
    totalArea: null,
    bedrooms: null,
    bathrooms: null,
    parkingSpaces: null,
    purchasePrice: null,
    currentMarketValue: null,
    purchaseDate: null,
    ownershipStatus: null,
    ...fields,
  }) as ExtractedProperty;

describe("suggestPropertyUpdates", () => {
  it("proposes nothing when the document agrees with the property", () => {
    const s = suggestPropertyUpdates(
      property({ name: "Villa Soriya", city: "Phnom Penh" }),
      extracted({ propertyName: "Villa Soriya", city: "Phnom Penh" }),
    );
    expect(s).toEqual([]);
  });

  it("ignores fields the document said nothing about", () => {
    // Silence must not read as "delete this value" — the property's own data stays put.
    const s = suggestPropertyUpdates(
      property({ name: "Villa Soriya", city: "Phnom Penh" }),
      extracted({ purchasePrice: "450000" }),
    );
    expect(s.map((x) => x.field)).toEqual(["purchasePrice"]);
  });

  it("proposes a value for a field the property does not have yet", () => {
    const s = suggestPropertyUpdates(property({ name: "Villa" }), extracted({ bedrooms: "4" }));
    expect(s).toEqual([
      { field: "bedrooms", label: "Bedrooms", current: "", suggested: "4", next: 4 },
    ]);
  });

  it("proposes a replacement when the two disagree", () => {
    const s = suggestPropertyUpdates(property({ purchasePrice: "420000" }), extracted({ purchasePrice: "450000" }));
    expect(s).toEqual([
      { field: "purchasePrice", label: "Purchase price", current: "420000", suggested: "450000", next: "450000" },
    ]);
  });

  it("reads numbers through their formatting instead of flagging them as different", () => {
    // The model writes money the way the document wrote it; the property stores digits.
    const s = suggestPropertyUpdates(
      property({ currentMarketValue: 450000 }),
      extracted({ currentMarketValue: "€450,000" }),
    );
    expect(s).toEqual([]);
  });

  it("coerces an integer field to a number, so the update action's schema accepts it", () => {
    const s = suggestPropertyUpdates(property({ yearBuilt: 2019 }), extracted({ yearBuilt: "2022" }));
    expect(s[0].next).toBe(2022);
  });

  it("keeps the document's own wording when a number cannot be parsed", () => {
    const s = suggestPropertyUpdates(property({ bedrooms: 3 }), extracted({ bedrooms: "three" }));
    expect(s[0]).toMatchObject({ current: "3", suggested: "three", next: "three" });
  });

  it("stays quiet about the purchase date rather than flagging every dated document", () => {
    // The property stores a timestamp, the model returns YYYY-MM-DD. Text comparison here would
    // report a change on every document that states the same day.
    const s = suggestPropertyUpdates(
      property({ purchaseDate: 1_600_000_000_000 }),
      extracted({ purchaseDate: "2020-09-13" }),
    );
    expect(s).toEqual([]);
  });
});
