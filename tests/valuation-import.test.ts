// Unit check for the deterministic half of the valuation importer: the field-first engine's row
// assembly (assembleRows, single-sheet case) and the valuation normalizers. The AI planning step is
// NOT tested here (it needs a live model); we hand-build the plan the AI would return and assert the
// pure default/normalize logic. The sheet mirrors the real Angkor Land workbook's VALUATION HISTORY:
// one row per valuation, several valuations per property, all fields in one sheet.

import { describe, it, expect } from "vitest";
import { assembleRows, type SheetData, type FieldPlan } from "@/lib/services/entity-import";
import {
  VALUATION_FIELDS,
  parsePrice,
  parseMonth,
  parseTimestamp,
  monthToTimestamp,
  recordedAtForMonth,
  toValuationCandidate,
} from "@/lib/services/valuation-import";
import { resolveProperty, type PropertyMatch } from "@/lib/services/import-property-link";

// VALUATION HISTORY: one row per valuation, keyed to a property by "Property ID". PROP-0002 has two
// valuations (the one-to-many case this feature exists to handle).
const valuationHistory: SheetData = {
  name: "VALUATION HISTORY",
  headers: ["Valuation ID", "Property ID", "Valuation Date", "Market Value (USD)", "Notes"],
  rows: [
    { "Valuation ID": "0", "Property ID": "PROP-0001", "Valuation Date": "2025-10-05T00:00:00.000Z", "Market Value (USD)": "210000", Notes: "Agricultural" },
    { "Valuation ID": "0", "Property ID": "PROP-0002", "Valuation Date": "2025-09-20T00:00:00.000Z", "Market Value (USD)": "780000", Notes: "Prime CBD" },
    { "Valuation ID": "0", "Property ID": "PROP-0002", "Valuation Date": "2024-09-20T00:00:00.000Z", "Market Value (USD)": "722000", Notes: "Prior-year" },
  ],
};

// The plan the AI is expected to produce for this single-sheet workbook (every field on the primary
// sheet, no joins).
const plan: FieldPlan = {
  primarySheet: "VALUATION HISTORY",
  joins: [],
  sources: {
    property: { sheet: "VALUATION HISTORY", column: "Property ID" },
    price: { sheet: "VALUATION HISTORY", column: "Market Value (USD)" },
    valuationDate: { sheet: "VALUATION HISTORY", column: "Valuation Date" },
  },
};

describe("assembleRows (valuation, single sheet, one-to-many)", () => {
  it("produces one assembled row per valuation, keeping repeated properties", () => {
    const rows = assembleRows([valuationHistory], plan, VALUATION_FIELDS);
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.values.property)).toEqual(["PROP-0001", "PROP-0002", "PROP-0002"]);
    expect(rows[1]!.values.price).toBe("780000");
    expect(rows[1]!.missing).toEqual([]);
  });

  it("drops blank template rows that only carry a stray constant (no phantom valuations)", () => {
    const padded: SheetData = {
      name: "VALUATION HISTORY",
      headers: ["Valuation ID", "Property ID", "Valuation Date", "Market Value (USD)"],
      rows: [
        { "Valuation ID": "0", "Property ID": "PROP-0001", "Valuation Date": "2025-10-05T00:00:00.000Z", "Market Value (USD)": "210000" },
        { "Valuation ID": "0", "Property ID": "", "Valuation Date": "", "Market Value (USD)": "" }, // blank padding
        { "Valuation ID": "0", "Property ID": "", "Valuation Date": "", "Market Value (USD)": "" }, // blank padding
      ],
    };
    const rows = assembleRows([padded], plan, VALUATION_FIELDS);
    expect(rows).toHaveLength(1); // the 2 blank padding rows are dropped despite their "0" IDs
    expect(rows[0]!.values.property).toBe("PROP-0001");
  });
});

describe("parsePrice", () => {
  it("parses a market value out of currency-formatted text", () => {
    expect(parsePrice("$210,000")).toBe(210000);
    expect(parsePrice("780000 USD")).toBe(780000);
  });

  it("treats missing, zero, or negative as 0 — never a fabricated price", () => {
    expect(parsePrice("")).toBe(0);
    expect(parsePrice("0")).toBe(0);
    expect(parsePrice("n/a")).toBe(0);
    expect(parsePrice("-50")).toBe(0);
  });
});

describe("parseMonth", () => {
  it("formats an ISO date to 'MMM YYYY' (UTC — no day-rollover into the previous month)", () => {
    expect(parseMonth("2025-10-05T00:00:00.000Z")).toBe("Oct 2025");
    expect(parseMonth("2026-01-01T00:00:00.000Z")).toBe("Jan 2026");
  });

  it("formats a JS Date string (what String(Date) produces for a real date cell)", () => {
    expect(parseMonth("Sat Oct 04 2025 00:00:00 GMT+0000 (Coordinated Universal Time)")).toBe("Oct 2025");
    expect(parseMonth("Fri Apr 12 1985 00:00:00 GMT+0000")).toBe("Apr 1985");
  });

  it("rejects junk and blanks (returns empty so the row is flagged)", () => {
    expect(parseMonth("")).toBe("");
    expect(parseMonth("not a date")).toBe("");
    expect(parseMonth("—")).toBe("");
  });
});

describe("parseTimestamp", () => {
  it("parses a date string to epoch ms", () => {
    expect(parseTimestamp("2025-10-05T00:00:00.000Z")).toBe(Date.UTC(2025, 9, 5));
  });

  it("returns 0 for junk and blanks", () => {
    expect(parseTimestamp("")).toBe(0);
    expect(parseTimestamp("not a date")).toBe(0);
  });
});

describe("monthToTimestamp", () => {
  it("maps a 'MMM YYYY' month to the first of that month (UTC)", () => {
    expect(monthToTimestamp("Oct 2025")).toBe(Date.UTC(2025, 9, 1));
    expect(monthToTimestamp("Jan 2026")).toBe(Date.UTC(2026, 0, 1));
  });

  it("returns 0 for a malformed month", () => {
    expect(monthToTimestamp("")).toBe(0);
    expect(monthToTimestamp("2025-10")).toBe(0);
    expect(monthToTimestamp("Foo 2025")).toBe(0);
  });
});

describe("recordedAtForMonth", () => {
  const sourceMs = Date.UTC(2025, 9, 5); // 5 Oct 2025

  it("keeps the exact source timestamp when it still falls in the reviewed month", () => {
    // Month unchanged from the source date → preserve the real day (5 Oct), not the 1st.
    expect(recordedAtForMonth(sourceMs, "Oct 2025")).toBe(sourceMs);
  });

  it("derives the first of the month when the user corrected the month away from the source", () => {
    // Source date was Oct but the reviewer changed the month to Nov → recordedAt must follow the month.
    expect(recordedAtForMonth(sourceMs, "Nov 2025")).toBe(Date.UTC(2025, 10, 1));
  });

  it("derives from the month when the source date was unparseable (recordedAt 0)", () => {
    expect(recordedAtForMonth(0, "Jan 2026")).toBe(Date.UTC(2026, 0, 1));
  });
});

describe("toValuationCandidate", () => {
  it("builds a normalized candidate from a good row", () => {
    const c = toValuationCandidate({
      values: { property: "PROP-0001", price: "$210,000", valuationDate: "2025-10-05T00:00:00.000Z" },
      missing: [],
    });
    expect(c.price).toBe(210000);
    expect(c.month).toBe("Oct 2025");
    expect(c.recordedAt).toBe(Date.UTC(2025, 9, 5));
    expect(c.rawProperty).toBe("PROP-0001");
    expect(c.propertyId).toBe(""); // resolution happens separately
    expect(c.issues).toEqual([]);
  });

  it("blocks a row with no/zero price (price is positive-only — never defaulted to 0)", () => {
    const c = toValuationCandidate({
      values: { property: "PROP-0001", price: "", valuationDate: "2025-10-05T00:00:00.000Z" },
      missing: ["price"],
    });
    expect(c.price).toBe(0);
    expect(c.issues).toContain("No valid price — a valuation needs a positive amount");
  });

  it("flags a bad valuation date and a missing property", () => {
    const c = toValuationCandidate({
      values: { property: "", price: "210000", valuationDate: "junk" },
      missing: ["property"],
    });
    expect(c.month).toBe("");
    expect(c.recordedAt).toBe(0);
    expect(c.issues).toContain("No valid valuation date");
    expect(c.issues).toContain("No property on the sheet");
  });
});

describe("resolveProperty (shared link — matches on id for valuation sheets)", () => {
  const properties: PropertyMatch[] = [
    { id: "PROP-0001", name: "Kampot Farm", code: "KF-01", title: "Deed-9" },
    { id: "PROP-0002", name: "CBD Shophouse", code: null, title: null },
  ];

  it("matches a sheet 'Property ID' value against the real property id (case-insensitive)", () => {
    expect(resolveProperty("PROP-0001", properties)).toBe("PROP-0001");
    expect(resolveProperty("prop-0002", properties)).toBe("PROP-0002");
  });

  it("still matches on name, code, or title (tenant behavior preserved)", () => {
    expect(resolveProperty("Kampot Farm", properties)).toBe("PROP-0001");
    expect(resolveProperty("KF-01", properties)).toBe("PROP-0001");
    expect(resolveProperty("deed-9", properties)).toBe("PROP-0001");
  });

  it("returns empty when nothing matches or input is blank (no silent wrong-link)", () => {
    expect(resolveProperty("PROP-9999", properties)).toBe("");
    expect(resolveProperty("", properties)).toBe("");
  });
});
