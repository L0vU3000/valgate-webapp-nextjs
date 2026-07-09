// Unit check for the deterministic half of the bulk importer: applyMapping turns raw spreadsheet
// rows + a column mapping into wizard FormData candidates, normalizing free-text type/status and
// flagging rows that are missing required fields. No DB, no AI — pure logic.

import { describe, it, expect } from "vitest";
import { applyMapping, type ColumnMapping } from "@/lib/services/property-import";

const baseMapping: ColumnMapping = {
  propertyName: "Name",
  propertyType: "Category",
  status: "Occupancy",
  addressLine: "Address",
  addressLine2: null,
  city: "City",
  province: null,
  zip: null,
  country: "Country",
  yearBuilt: null,
  totalArea: null,
  bedrooms: null,
  bathrooms: null,
  parkingSpaces: null,
  storageUnit: null,
  purchasePrice: "Bought For",
  purchaseDate: null,
  currentMarketValue: null,
  outstandingMortgage: null,
  monthlyPayment: null,
  interestRate: null,
  annualPropertyTax: null,
  taxAssessmentValue: null,
  annualInsurance: null,
  ownershipStatus: null,
};

describe("applyMapping", () => {
  it("maps columns and normalizes free-text type/status", () => {
    const rows = [
      { Name: "Villa One", Category: "House", Occupancy: "Rented out", Address: "1 Main St", City: "Phnom Penh", Country: "KH", "Bought For": "$250,000" },
    ];
    const [c] = applyMapping(rows, baseMapping);
    expect(c!.form.propertyName).toBe("Villa One");
    expect(c!.form.propertyType).toBe("residential"); // "House" -> residential
    expect(c!.form.status).toBe("Rented"); // "Rented out" -> Rented
    expect(c!.form.purchasePrice).toBe("$250,000"); // raw kept; parsed later by mapWizardToProperty
    expect(c!.address).toContain("Phnom Penh");
    expect(c!.issues).toHaveLength(0);
    expect(c!.needsLocation).toBe(false);
  });

  it("flags a row missing the required name", () => {
    const rows = [{ Name: "", Category: "Commercial office", Occupancy: "", Address: "", City: "", Country: "" }];
    const [c] = applyMapping(rows, baseMapping);
    expect(c!.form.propertyType).toBe("commercial");
    expect(c!.issues).toContain("Missing property name");
    expect(c!.needsLocation).toBe(true); // no address -> needs location
  });

  it("leaves type blank (flagged) when it cannot be normalized and no address maps", () => {
    const rows = [{ Name: "Plot 7", Category: "", Occupancy: "vacant lot", Address: "", City: "", Country: "" }];
    const [c] = applyMapping(rows, baseMapping);
    expect(c!.form.propertyName).toBe("Plot 7");
    expect(c!.form.propertyType).toBe(""); // empty category -> blank, flagged below
    expect(c!.form.status).toBe("Vacant"); // "vacant lot" -> Vacant
    expect(c!.issues).toContain("Missing property type");
  });
});
