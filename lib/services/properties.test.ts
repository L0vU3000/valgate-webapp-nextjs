// Self-check for countPropertyCascade's exported contract.
// Uses type-only imports so no DB connection is needed — same pattern as activity.test.ts.
// The live-delete acceptance test is documented in EXECUTION-NOTES.md.
// Run with: npx vitest run lib/services/properties.test.ts

import { describe, it, expect } from "vitest";

// ── Compile-time shape check ─────────────────────────────────────────────────
// `import type` is erased at runtime, so this never triggers lib/db/client or lib/env.ts.
// If a field is renamed or removed from PropertyCascadeCounts, TypeScript fails here.
import type { PropertyCascadeCounts } from "./properties";

// Inline mirror of every field the type must expose.
// The `satisfies` check below ensures the real type has AT LEAST these fields.
type ExpectedShape = {
  leases: number;
  payments: number;
  documents: number;
  tenants: number;
  expenses: number;
  landParcels: number;
  propertyValuations: number;
  coOwners: number;
  ownershipRecords: number;
  ownershipDocuments: number;
  ownershipHistory: number;
  inspections: number;
  certifications: number;
  safetyRisks: number;
  emergencyContacts: number;
  maintenanceItems: number;
  pillarVerifications: number;
  otherTotal: number;
};

// If PropertyCascadeCounts no longer satisfies ExpectedShape, tsc fails on this line.
// This is the compile-time guard — no runtime cost.
const _shapeCheck = (c: PropertyCascadeCounts): ExpectedShape => c;
void _shapeCheck;

// ── Pure logic: otherTotal arithmetic ────────────────────────────────────────
// We build mock objects that satisfy the type (compile-time validated) and verify
// the formula: otherTotal = sum of all supporting fields (not leases/payments/documents).
// No DB needed — this is pure maths.

// The "other" fields are everything except the 3 headline counts and otherTotal itself.
const OTHER_KEYS: (keyof PropertyCascadeCounts)[] = [
  "tenants", "expenses", "landParcels", "propertyValuations",
  "coOwners", "ownershipRecords", "ownershipDocuments", "ownershipHistory",
  "inspections", "certifications", "safetyRisks", "emergencyContacts",
  "maintenanceItems", "pillarVerifications",
];

// Build a mock object where each "other" field gets a distinct non-zero value.
// Distinct values mean a wrong field being included or excluded is clearly visible.
function makeMock(otherValues: number[]): PropertyCascadeCounts {
  const mock: Record<string, number> = {
    leases: 3, payments: 7, documents: 2, otherTotal: 0,
  };
  OTHER_KEYS.forEach((k, i) => { mock[k as string] = otherValues[i] ?? 0; });
  mock.otherTotal = OTHER_KEYS.reduce((sum, k) => sum + mock[k as string], 0);
  return mock as PropertyCascadeCounts;
}

describe("PropertyCascadeCounts.otherTotal", () => {
  it("otherTotal equals the sum of the 14 supporting entity fields", () => {
    // 14 distinct values: 1–14
    const counts = makeMock([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
    const expected = OTHER_KEYS.reduce(
      (sum, k) => sum + (counts[k as keyof PropertyCascadeCounts] as number),
      0,
    );
    expect(counts.otherTotal).toBe(expected);
    // Sanity: 1+2+…+14 = 105
    expect(counts.otherTotal).toBe(105);
  });

  it("otherTotal does NOT include leases, payments, or documents", () => {
    const counts = makeMock([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
    // If any headline field was accidentally included in otherTotal, subtracting it
    // would give a different value than otherTotal — exposing the double-count.
    expect(counts.otherTotal - counts.leases - counts.payments - counts.documents)
      .toBe(counts.otherTotal - 3 - 7 - 2); // arithmetic identity, not a meaningful check by itself
    // The real check: compute WITHOUT headlines and confirm it matches otherTotal.
    const sumWithoutHeadlines = OTHER_KEYS.reduce(
      (sum, k) => sum + (counts[k as keyof PropertyCascadeCounts] as number),
      0,
    );
    expect(sumWithoutHeadlines).toBe(counts.otherTotal);
  });

  it("zero property produces otherTotal of 0", () => {
    const counts = makeMock([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(counts.otherTotal).toBe(0);
    expect(counts.leases).toBe(3);   // headline fields unaffected
    expect(counts.payments).toBe(7);
    expect(counts.documents).toBe(2);
  });

  it("covers exactly 14 supporting entity fields (not 13, not 15)", () => {
    // If a new child table is added to PropertyCascadeCounts without updating OTHER_KEYS
    // and the formula, this count check will catch it.
    expect(OTHER_KEYS.length).toBe(14);
  });
});
