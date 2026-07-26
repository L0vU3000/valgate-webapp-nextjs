// Unit tests for the payment workbook-import mappers.
//
// DB-free by design: the four collaborators payment-import.ts imports at runtime
// (resolveProperty, parseCurrency/parseDateMs, persistCandidates, createPayment) are
// replaced with vi.fn() so nothing touches Neon or the AI SDK. Everything inside
// payment-import.ts — the kind/method/status normalizers, issue collection, and the
// candidate assembly loop — stays real and is exercised through its public API.
//
// Run with: npx vitest run lib/services/payment-import.test.ts

import { describe, it, expect, beforeEach, vi } from "vitest";
import { toPaymentReviewRow, bulkCreatePayments } from "./payment-import";
import { resolveProperty } from "@/lib/services/import-property-link";
import { parseCurrency, parseDateMs } from "@/app/_shared/add-property/map-to-property";
import { persistCandidates } from "@/lib/services/ingestion/persist";
import type { AssembledRow } from "@/lib/services/entity-import";
import type { PropertyMatch } from "@/lib/services/import-property-link";
import type { ReviewRow, BulkResult, IngestionCandidate } from "@/lib/services/ingestion/types";
import type { Ctx } from "@/lib/services/_mapping";

vi.mock("@/lib/services/import-property-link", () => ({
  resolveProperty: vi.fn(),
}));
vi.mock("@/app/_shared/add-property/map-to-property", () => ({
  parseCurrency: vi.fn(),
  parseDateMs: vi.fn(),
}));
vi.mock("@/lib/services/ingestion/persist", () => ({
  persistCandidates: vi.fn(),
}));
vi.mock("@/lib/services/payments", () => ({
  createPayment: vi.fn(),
}));

// Typed handles onto the mocked collaborators for per-test return values / call assertions.
const resolvePropertyMock = vi.mocked(resolveProperty);
const parseCurrencyMock = vi.mocked(parseCurrency);
const parseDateMsMock = vi.mocked(parseDateMs);
const persistCandidatesMock = vi.mocked(persistCandidates);

// Build an AssembledRow with sensible empty defaults, overridable per field.
function assembledRow(
  values: Partial<Record<string, string>> = {},
  missing: string[] = [],
): AssembledRow {
  return {
    values: {
      property: "",
      date: "",
      kind: "",
      amount: "",
      method: "",
      status: "",
      ...values,
    },
    missing,
  };
}

const noMatches: PropertyMatch[] = [];

beforeEach(() => {
  vi.clearAllMocks();
  // Default: property resolves to a concrete id so the "no matching property" branch
  // only fires in the tests that deliberately override this.
  resolvePropertyMock.mockReturnValue("PROP-DEFAULT");
});

describe("toPaymentReviewRow — kind normalization", () => {
  const cases: [string, string][] = [
    ["rent", "Rent"],
    ["FEE ", "Fee"],
    ["deposit", "Deposit"],
    ["Refund", "Refund"],
    ["xyz", "Rent"], // unknown falls back to Rent
  ];
  it.each(cases)("normalizes kind %j to %j", (raw, expected) => {
    const row = toPaymentReviewRow(assembledRow({ kind: raw }), noMatches);
    expect(row.values.kind).toBe(expected);
  });
});

describe("toPaymentReviewRow — method normalization", () => {
  const cases: [string, string][] = [
    ["aba bank", "ABA Bank"],
    ["wing", "Wing"],
    ["wire transfer", "Wire transfer"],
    ["transfer", "Wire transfer"],
    ["cash", "Cash"],
    ["carrier pigeon", "Cash"], // unknown falls back to Cash
  ];
  it.each(cases)("normalizes method %j to %j", (raw, expected) => {
    const row = toPaymentReviewRow(assembledRow({ method: raw }), noMatches);
    expect(row.values.method).toBe(expected);
  });
});

describe("toPaymentReviewRow — status normalization", () => {
  const cases: [string, string][] = [
    ["settled", "Paid"],
    ["processing", "Pending"],
    ["bounced", "Failed"],
    ["late", "Overdue"],
    ["whatever", "Pending"], // unknown falls back to Pending
  ];
  it.each(cases)("normalizes status %j to %j", (raw, expected) => {
    const row = toPaymentReviewRow(assembledRow({ status: raw }), noMatches);
    expect(row.values.status).toBe(expected);
  });
});

describe("toPaymentReviewRow — property resolution", () => {
  it("uses the resolved property id and adds no 'no matching property' issue", () => {
    resolvePropertyMock.mockReturnValue("PROP-1");
    const row = toPaymentReviewRow(assembledRow({ property: "Villa Riverside" }), noMatches);
    expect(row.values.propertyId).toBe("PROP-1");
    expect(row.issues).not.toContain("No matching property — pick one");
  });

  it("flags an unresolved but non-empty raw property", () => {
    resolvePropertyMock.mockReturnValue("");
    const row = toPaymentReviewRow(assembledRow({ property: "Unknown Block" }), noMatches);
    expect(row.values.propertyId).toBe("");
    expect(row.issues).toContain("No matching property — pick one");
  });

  it("does not flag an empty raw property even when resolveProperty returns ''", () => {
    resolvePropertyMock.mockReturnValue("");
    const row = toPaymentReviewRow(assembledRow({ property: "" }), noMatches);
    expect(row.issues).not.toContain("No matching property — pick one");
  });

  it("forwards the raw property and the matches array to resolveProperty", () => {
    const matches: PropertyMatch[] = [{ id: "PROP-9", name: "Nine" }];
    toPaymentReviewRow(assembledRow({ property: "Nine" }), matches);
    expect(resolvePropertyMock).toHaveBeenCalledWith("Nine", matches);
  });
});

describe("toPaymentReviewRow — issues and passthrough", () => {
  it("surfaces one 'Missing <field>' issue per assembled.missing entry", () => {
    const row = toPaymentReviewRow(
      assembledRow({ property: "X" }, ["amount", "date"]),
      noMatches,
    );
    expect(row.issues).toContain("Missing amount");
    expect(row.issues).toContain("Missing date");
  });

  it("passes date and amount through and echoes the raw property", () => {
    const row = toPaymentReviewRow(
      assembledRow({ property: "Sunrise Tower", date: "2026-01-15", amount: "1200" }),
      noMatches,
    );
    expect(row.values.date).toBe("2026-01-15");
    expect(row.values.amount).toBe("1200");
    expect(row.rawProperty).toBe("Sunrise Tower");
  });
});

describe("bulkCreatePayments", () => {
  const ctx = { orgId: "ORG-1" } as unknown as Ctx;

  const sentinelResult: BulkResult = { created: 2, failures: [] };

  function reviewRow(overrides: Partial<ReviewRow["values"]> = {}): ReviewRow {
    return {
      values: {
        propertyId: "PROP-1",
        date: "2026-01-01",
        kind: "Rent",
        amount: "1000",
        method: "Cash",
        status: "Paid",
        ...overrides,
      },
      rawProperty: "",
      issues: [],
    };
  }

  it("calls persistCandidates once with one candidate per row, numbered i+1", async () => {
    parseDateMsMock.mockReturnValue(111);
    parseCurrencyMock.mockReturnValue(222);
    persistCandidatesMock.mockResolvedValue(sentinelResult);

    await bulkCreatePayments(ctx, [reviewRow(), reviewRow()]);

    expect(persistCandidatesMock).toHaveBeenCalledTimes(1);
    const candidates = persistCandidatesMock.mock.calls[0]![1] as IngestionCandidate<unknown>[];
    expect(candidates).toHaveLength(2);
    expect(candidates.map((c) => c.source.row)).toEqual([1, 2]);
    for (const c of candidates) {
      expect(c.confidence).toBe("high");
      expect(c.source.type).toBe("spreadsheet");
      expect(c.issues).toEqual([]);
    }
  });

  it("carries parsed date/amount onto the entity when parsers return numbers", async () => {
    parseDateMsMock.mockReturnValue(1737000000000);
    parseCurrencyMock.mockReturnValue(950);
    persistCandidatesMock.mockResolvedValue(sentinelResult);

    await bulkCreatePayments(ctx, [reviewRow({ kind: "Fee", method: "Wing", status: "Pending" })]);

    const candidates = persistCandidatesMock.mock.calls[0]![1] as IngestionCandidate<{
      date: number;
      amount: number;
      kind: string;
      method: string;
      status: string;
    }>[];
    const entity = candidates[0]!.entity;
    expect(entity.date).toBe(1737000000000);
    expect(entity.amount).toBe(950);
    expect(entity.kind).toBe("Fee");
    expect(entity.method).toBe("Wing");
    expect(entity.status).toBe("Pending");
  });

  it("falls back to amount 0 and a numeric Date.now() date when parsers return undefined", async () => {
    parseDateMsMock.mockReturnValue(undefined);
    parseCurrencyMock.mockReturnValue(undefined);
    persistCandidatesMock.mockResolvedValue(sentinelResult);

    await bulkCreatePayments(ctx, [reviewRow()]);

    const candidates = persistCandidatesMock.mock.calls[0]![1] as IngestionCandidate<{
      date: number;
      amount: number;
    }>[];
    const entity = candidates[0]!.entity;
    expect(entity.amount).toBe(0);
    expect(typeof entity.date).toBe("number");
  });

  it("returns exactly the BulkResult that persistCandidates resolves to", async () => {
    parseDateMsMock.mockReturnValue(1);
    parseCurrencyMock.mockReturnValue(1);
    persistCandidatesMock.mockResolvedValue(sentinelResult);

    const result = await bulkCreatePayments(ctx, [reviewRow()]);
    expect(result).toBe(sentinelResult);
  });
});
