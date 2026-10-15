import { describe, expect, it } from "vitest";
import { documentSummaryRows } from "@/app/(shell)/_components/quick-add";

// The rows the quick-add card shows for a document it just read. This is the last place the user can
// catch a value the read got wrong before it is saved on the property, so what it hides, what it
// keeps and what it flags all matter.
describe("documentSummaryRows", () => {
  it("returns nothing for a document that was never read", () => {
    expect(documentSummaryRows(null)).toEqual([]);
    expect(documentSummaryRows(undefined)).toEqual([]);
    expect(documentSummaryRows({})).toEqual([]);
  });

  it("keeps only what the document actually stated", () => {
    // The scan returns null for every field it could not find. A row reading "Bedrooms: —" would
    // present a gap as a fact, so absent values are dropped rather than rendered.
    const rows = documentSummaryRows({
      bedrooms: "3",
      bathrooms: null,
      parkingSpaces: "",
      yearBuilt: "   ",
      province: "Phnom Penh",
    });
    expect(rows.map((r) => r.key)).toEqual(["province", "bedrooms"]);
    // ...and the order is the reading order, not the object's key order.
    expect(rows.map((r) => r.value)).toEqual(["Phnom Penh", "3"]);
  });

  it("trims the model's padding instead of shipping it into the panel", () => {
    const rows = documentSummaryRows({ purchasePrice: " 120000 " });
    expect(rows[0]?.value).toBe("120000");
  });

  it("marks the values the read's passes disagreed on, and leaves the rest unmarked", () => {
    const rows = documentSummaryRows(
      { bedrooms: "3", bathrooms: "2", totalArea: "120" },
      ["bedrooms", "totalArea"],
    );
    expect(rows.map((r) => [r.key, r.uncertain])).toEqual([
      ["totalArea", true],
      ["bedrooms", true],
      ["bathrooms", false],
    ]);
  });

  it("flags nothing when the read was unanimous", () => {
    const rows = documentSummaryRows({ bedrooms: "3" });
    expect(rows[0]?.uncertain).toBe(false);
  });

  it("does not repeat the four fields the card already shows as inputs", () => {
    // The card edits name, type, street address and city in the form right below the summary. Printing
    // them twice would make the user read the same text twice to answer one question — so the summary
    // is deliberately everything the form CANNOT hold.
    const rows = documentSummaryRows({
      propertyName: "Skyline Lofts",
      propertyType: "residential",
      addressLine: "12 Street 271",
      city: "Phnom Penh",
      status: "Vacant",
    });
    expect(rows.map((r) => r.key)).toEqual(["status"]);
  });

  it("carries a human label for every row it emits", () => {
    const rows = documentSummaryRows({
      status: "Rented",
      addressLine2: "Khan Chamkar Mon",
      province: "Phnom Penh",
      zip: "12000",
      country: "Cambodia",
      ownershipStatus: "owned",
      yearBuilt: "2019",
      totalArea: "84",
      bedrooms: "2",
      bathrooms: "2",
      parkingSpaces: "1",
      purchasePrice: "120000",
      currentMarketValue: "150000",
      purchaseDate: "2021-04-02",
    });
    expect(rows).toHaveLength(14);
    for (const row of rows) {
      expect(row.label.length).toBeGreaterThan(0);
      // A label that is just the key is a label nobody wrote.
      expect(row.label).not.toBe(row.key);
    }
  });
});
