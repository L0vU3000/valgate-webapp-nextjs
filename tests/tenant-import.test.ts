// Unit check for the deterministic half of the tenant importer: the field-first engine's row
// assembly (assembleRows) and the tenant normalizers/resolver. The AI planning step is NOT tested
// here (it needs a live model); we hand-build the plan the AI would return and assert the pure
// join/default/normalize logic. Sheets mirror the real Angkor Land workbook's structure: tenant
// identity in TENANT PROFILE, lease/rent/property in a SEPARATE LEASE AGREEMENT sheet, joined by
// tenant ID — the exact fragmentation this feature exists to handle.

import { describe, it, expect } from "vitest";
import { assembleRows, repairJoins, type SheetData, type FieldPlan, type Join } from "@/lib/services/entity-import";
import {
  TENANT_FIELDS,
  parseRent,
  normalizeTenantStatus,
  toTenantCandidate,
  resolveProperty,
  type PropertyMatch,
} from "@/lib/services/tenant-import";

// TENANT PROFILE: one row per tenant, identity only (no rent/property here).
const tenantProfile: SheetData = {
  name: "TENANT PROFILE",
  headers: ["TENANT ID", "Full Name / Company Name", "Email Address", "Primary Phone"],
  rows: [
    { "TENANT ID": "TEN-001", "Full Name / Company Name": "Sok Dara", "Email Address": "sok@ex.com", "Primary Phone": "012 345 678" },
    { "TENANT ID": "TEN-002", "Full Name / Company Name": "Chan Vibol", "Email Address": "", "Primary Phone": "" },
  ],
};

// LEASE AGREEMENT: rent/unit/status/property, joined back to a tenant by "Tenant ID". TEN-002 has
// no lease row — so that tenant's required lease-side fields must come back empty and flagged.
const leaseAgreement: SheetData = {
  name: "LEASE AGREEMENT",
  headers: ["Tenant ID", "Property Label", "Monthly Rent (USD)", "Payment Status"],
  rows: [
    { "Tenant ID": "TEN-001", "Property Label": "Villa Riverside", "Monthly Rent (USD)": "$1,200", "Payment Status": "Overdue" },
  ],
};

const sheets = [tenantProfile, leaseAgreement];

// The plan the AI is expected to produce for this workbook (field-first: each field points at
// wherever it lives, across two sheets, joined by tenant ID).
const plan: FieldPlan = {
  primarySheet: "TENANT PROFILE",
  joins: [{ sheet: "LEASE AGREEMENT", joinColumn: "Tenant ID", primaryColumn: "TENANT ID" }],
  sources: {
    name: { sheet: "TENANT PROFILE", column: "Full Name / Company Name" },
    email: { sheet: "TENANT PROFILE", column: "Email Address" },
    phone: { sheet: "TENANT PROFILE", column: "Primary Phone" },
    unit: { sheet: "LEASE AGREEMENT", column: "Property Label" },
    rent: { sheet: "LEASE AGREEMENT", column: "Monthly Rent (USD)" },
    status: { sheet: "LEASE AGREEMENT", column: "Payment Status" },
    property: { sheet: "LEASE AGREEMENT", column: "Property Label" },
  },
};

describe("assembleRows (field-first, two-sheet join)", () => {
  it("joins the lease sheet onto each tenant by the shared ID", () => {
    const rows = assembleRows(sheets, plan, TENANT_FIELDS);
    expect(rows).toHaveLength(2);

    // TEN-001: identity from the profile sheet, lease fields from the joined sheet.
    expect(rows[0]!.values).toMatchObject({
      name: "Sok Dara",
      email: "sok@ex.com",
      phone: "012 345 678",
      unit: "Villa Riverside",
      rent: "$1,200",
      status: "Overdue",
      property: "Villa Riverside",
    });
    expect(rows[0]!.missing).toEqual([]);
  });

  it("flags required fields that are absent everywhere (no lease row for the tenant)", () => {
    const rows = assembleRows(sheets, plan, TENANT_FIELDS);
    // TEN-002 has profile identity but no lease row → unit/rent/status/property empty + flagged.
    expect(rows[1]!.values.name).toBe("Chan Vibol");
    expect(rows[1]!.values.rent).toBe("");
    expect(rows[1]!.missing).toEqual(expect.arrayContaining(["unit", "rent", "status", "property"]));
  });

  it("joins on a name column when the ID columns are degenerate (the real-workbook case)", () => {
    // Mirrors the Angkor Land file: TENANT PROFILE's "TENANT ID" is 0 for every row, but the lease
    // sheet references tenants by name. The plan joins Full Name ↔ Tenant Name instead of the IDs.
    const profile: SheetData = {
      name: "TENANT PROFILE",
      headers: ["TENANT ID", "Full Name / Company Name"],
      rows: [
        { "TENANT ID": "0", "Full Name / Company Name": "Chan Dara" },
        { "TENANT ID": "0", "Full Name / Company Name": "Mekong Trading Co., Ltd." },
      ],
    };
    const lease: SheetData = {
      name: "LEASE AGREEMENT",
      headers: ["Tenant Name", "Monthly Rent (USD)", "Property Label"],
      rows: [
        { "Tenant Name": "chan dara", "Monthly Rent (USD)": "$1,500", "Property Label": "Riverside 2A" },
      ],
    };
    const namePlan: FieldPlan = {
      primarySheet: "TENANT PROFILE",
      joins: [{ sheet: "LEASE AGREEMENT", joinColumn: "Tenant Name", primaryColumn: "Full Name / Company Name" }],
      sources: {
        name: { sheet: "TENANT PROFILE", column: "Full Name / Company Name" },
        rent: { sheet: "LEASE AGREEMENT", column: "Monthly Rent (USD)" },
        unit: { sheet: "LEASE AGREEMENT", column: "Property Label" },
        property: { sheet: "LEASE AGREEMENT", column: "Property Label" },
        status: null,
        email: null,
        phone: null,
      },
    };
    const rows = assembleRows([profile, lease], namePlan, TENANT_FIELDS);
    // Case/whitespace-insensitive name match linked the lease despite the broken IDs.
    expect(rows[0]!.values.rent).toBe("$1,500");
    expect(rows[0]!.values.property).toBe("Riverside 2A");
    // The second tenant has no lease row → lease fields empty and flagged.
    expect(rows[1]!.values.rent).toBe("");
  });

  it("drops blank template rows that only carry a stray constant (no phantom records)", () => {
    // Real-workbook case: the register has 2 real tenants then padding rows that are empty EXCEPT for a
    // formula-filled "0" in the ID column — those must not become records.
    const padded: SheetData = {
      name: "TENANT PROFILE",
      headers: ["TENANT ID", "Full Name / Company Name", "Email Address"],
      rows: [
        { "TENANT ID": "0", "Full Name / Company Name": "Chan Dara", "Email Address": "chan@ex.com" },
        { "TENANT ID": "0", "Full Name / Company Name": "Emily Turner", "Email Address": "emily@ex.com" },
        { "TENANT ID": "0", "Full Name / Company Name": "", "Email Address": "" }, // blank padding
        { "TENANT ID": "0", "Full Name / Company Name": "", "Email Address": "" }, // blank padding
      ],
    };
    const p: FieldPlan = {
      primarySheet: "TENANT PROFILE",
      joins: [],
      sources: {
        name: { sheet: "TENANT PROFILE", column: "Full Name / Company Name" },
        email: { sheet: "TENANT PROFILE", column: "Email Address" },
        unit: null, rent: null, status: null, phone: null, property: null,
      },
    };
    const rows = assembleRows([padded], p, TENANT_FIELDS);
    expect(rows).toHaveLength(2); // the 2 blank padding rows are dropped despite their "0" IDs
    expect(rows.map((r) => r.values.name)).toEqual(["Chan Dara", "Emily Turner"]);
  });

  it("handles a single-sheet workbook (no joins, every field on the primary sheet)", () => {
    const flat: SheetData = {
      name: "Tenants",
      headers: ["Name", "Property", "Rent"],
      rows: [{ Name: "Lee", Property: "Unit 4B", Rent: "800" }],
    };
    const flatPlan: FieldPlan = {
      primarySheet: "Tenants",
      joins: [],
      sources: {
        name: { sheet: "Tenants", column: "Name" },
        unit: { sheet: "Tenants", column: "Property" },
        rent: { sheet: "Tenants", column: "Rent" },
        status: null,
        email: null,
        phone: null,
        property: { sheet: "Tenants", column: "Property" },
      },
    };
    const rows = assembleRows([flat], flatPlan, TENANT_FIELDS);
    expect(rows[0]!.values).toMatchObject({ name: "Lee", unit: "Unit 4B", rent: "800", property: "Unit 4B" });
    // status was sourced from nowhere → empty and flagged.
    expect(rows[0]!.missing).toContain("status");
  });
});

describe("repairJoins (deterministic join verification)", () => {
  it("replaces a degenerate ID join with the column pair that actually links rows", () => {
    // Primary IDs are all "0" (useless); names are distinct and match the lease's Tenant Name.
    const profile: SheetData = {
      name: "TENANT PROFILE",
      headers: ["TENANT ID", "Full Name / Company Name"],
      rows: [
        { "TENANT ID": "0", "Full Name / Company Name": "Chan Dara" },
        { "TENANT ID": "0", "Full Name / Company Name": "Meas Sophea" },
        { "TENANT ID": "0", "Full Name / Company Name": "Emily Turner" },
      ],
    };
    const lease: SheetData = {
      name: "LEASE AGREEMENT",
      headers: ["Tenant ID", "Tenant Name", "Monthly Rent (USD)"],
      rows: [
        { "Tenant ID": "TEN-0003", "Tenant Name": "Chan Dara", "Monthly Rent (USD)": "1200" },
        { "Tenant ID": "TEN-0004", "Tenant Name": "Meas Sophea", "Monthly Rent (USD)": "900" },
      ],
    };
    // The AI proposed the (broken) ID↔ID join; repair must swap it to the name pair.
    const proposed: Join[] = [{ sheet: "LEASE AGREEMENT", joinColumn: "Tenant ID", primaryColumn: "TENANT ID" }];
    const repaired = repairJoins([profile, lease], "TENANT PROFILE", proposed);
    expect(repaired[0]).toEqual({ sheet: "LEASE AGREEMENT", joinColumn: "Tenant Name", primaryColumn: "Full Name / Company Name" });
  });

  it("keeps a working join unchanged (no spurious swap)", () => {
    const profile: SheetData = {
      name: "P",
      headers: ["ID", "Name"],
      rows: [{ ID: "A1", Name: "Alice" }, { ID: "A2", Name: "Bob" }],
    };
    const other: SheetData = {
      name: "L",
      headers: ["Ref", "Rent"],
      rows: [{ Ref: "A1", Rent: "100" }, { Ref: "A2", Rent: "200" }],
    };
    const proposed: Join[] = [{ sheet: "L", joinColumn: "Ref", primaryColumn: "ID" }];
    expect(repairJoins([profile, other], "P", proposed)).toEqual(proposed);
  });
});

describe("tenant value normalizers", () => {
  it("parses rent out of currency-formatted text", () => {
    expect(parseRent("$1,200")).toBe(1200);
    expect(parseRent("1200 USD")).toBe(1200);
    expect(parseRent("")).toBe(0);
    expect(parseRent("-50")).toBe(0);
    expect(parseRent("n/a")).toBe(0);
  });

  it("maps free-text status to the Valgate enum, defaulting to Pending", () => {
    expect(normalizeTenantStatus("Overdue")).toBe("Overdue");
    expect(normalizeTenantStatus("late payment")).toBe("Overdue");
    expect(normalizeTenantStatus("Paid in full")).toBe("Paid");
    expect(normalizeTenantStatus("")).toBe("Pending");
    expect(normalizeTenantStatus("whatever")).toBe("Pending");
  });

  it("never reads a delinquent status as Paid (negation-aware)", () => {
    expect(normalizeTenantStatus("Not paid")).toBe("Overdue");
    expect(normalizeTenantStatus("Unpaid")).toBe("Overdue");
    expect(normalizeTenantStatus("Outstanding balance")).toBe("Overdue");
    // Ambiguous words must not slip through to Paid — they fall back to Pending.
    expect(normalizeTenantStatus("Balance due — current")).toBe("Pending");
    expect(normalizeTenantStatus("Partially paid")).toBe("Pending");
  });
});

describe("toTenantCandidate", () => {
  it("builds a normalized candidate and flags a missing name", () => {
    const c = toTenantCandidate({
      values: { name: "", unit: "Unit 4B", rent: "$900", status: "Overdue", email: "", phone: "", property: "Villa X" },
      missing: ["name"],
    });
    expect(c.rent).toBe(900);
    expect(c.status).toBe("Overdue");
    expect(c.rawProperty).toBe("Villa X");
    expect(c.propertyId).toBe(""); // resolution happens separately
    expect(c.issues).toContain("Missing name");
  });
});

describe("resolveProperty", () => {
  const properties: PropertyMatch[] = [
    { id: "PROP-0001", name: "Villa Riverside", code: "VR-01", title: "Deed-123" },
    { id: "PROP-0002", name: "Downtown Office", code: null, title: null },
  ];

  it("matches on exact name, code, or title (case-insensitive)", () => {
    expect(resolveProperty("Villa Riverside", properties)).toBe("PROP-0001");
    expect(resolveProperty("villa riverside", properties)).toBe("PROP-0001");
    expect(resolveProperty("VR-01", properties)).toBe("PROP-0001");
    expect(resolveProperty("deed-123", properties)).toBe("PROP-0001");
  });

  it("does NOT loose-match — a near-miss returns empty (safer than a wrong auto-link)", () => {
    // "Unit 10" must never silently link to a property named "Unit 1".
    const units: PropertyMatch[] = [{ id: "P1", name: "Unit 1", code: null, title: null }];
    expect(resolveProperty("Unit 10", units)).toBe("");
    // A decorated label no longer partial-matches; the user picks it in review.
    expect(resolveProperty("Villa Riverside (Unit 2)", properties)).toBe("");
  });

  it("returns empty when nothing matches or input is blank", () => {
    expect(resolveProperty("Some Other Place", properties)).toBe("");
    expect(resolveProperty("", properties)).toBe("");
  });
});
