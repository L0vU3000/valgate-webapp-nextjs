// Unit check for extractRows: slice a raw sheet matrix from a non-zero header row into header-keyed
// rows. Mirrors the real Valgate "MAIN INVENTORY" sheet (category row, client row, blank row, then the
// real headers on row index 3, then data).

import { describe, it, expect } from "vitest";
import { extractRows, findHeaderRow } from "@/app/_shared/add-property/_lib/extract-rows";

const mainInventory: string[][] = [
  ["", "", "Location Information", "Property Details", "Ownership"], // 0: category groups
  ["CLI-001", "Alpha Solutions", "", "", ""],                        // 1: client row
  ["", "", "", "", ""],                                              // 2: blank
  ["Property Type", "Property ID", "Province/Region", "Total Area (sq m)", "Owner Name(s)"], // 3: HEADERS
  ["Agricultural", "PROP-0001", "Phnom Penh", "2000", "Sok Dara"],   // 4: data
  ["Residential", "PROP-0002", "Siem Reap", "450", "Chan Vibol"],    // 5: data
  ["", "", "", "", ""],                                              // 6: trailing blank
];

describe("extractRows", () => {
  it("uses the given header row and keys the data rows below it", () => {
    const { headers, rows } = extractRows(mainInventory, 3);
    expect(headers).toEqual(["Property Type", "Property ID", "Province/Region", "Total Area (sq m)", "Owner Name(s)"]);
    expect(rows).toHaveLength(2); // two data rows; the trailing blank is dropped
    expect(rows[0]).toEqual({
      "Property Type": "Agricultural",
      "Property ID": "PROP-0001",
      "Province/Region": "Phnom Penh",
      "Total Area (sq m)": "2000",
      "Owner Name(s)": "Sok Dara",
    });
    expect(rows[1]!["Province/Region"]).toBe("Siem Reap");
  });

  it("ignores the title/category/client rows above the header", () => {
    const { rows } = extractRows(mainInventory, 3);
    // "Alpha Solutions" / "CLI-001" lived above the header row and must not become a property.
    expect(rows.some((r) => Object.values(r).includes("Alpha Solutions"))).toBe(false);
  });
});

describe("findHeaderRow", () => {
  it("picks the fullest row with data below it, not the blank/category rows above", () => {
    // The real header row (index 3) has the most non-empty cells; rows 0-2 are sparser.
    expect(findHeaderRow(mainInventory)).toBe(3);
  });

  it("handles a plain sheet whose header is the first row", () => {
    const simple = [
      ["Name", "City", "Price"],
      ["Villa", "Phnom Penh", "250000"],
    ];
    expect(findHeaderRow(simple)).toBe(0);
  });
});
