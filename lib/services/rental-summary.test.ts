import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Ctx } from "@/lib/services/_mapping";
import type { Certification } from "@/lib/data/types/certification";
import type { Lease } from "@/lib/data/types/lease";
import type { Payment } from "@/lib/data/types/payment";
import type { Property } from "@/lib/data/types/property";
import type { SafetyRisk } from "@/lib/data/types/safety-risk";
import { toRentalSummaryDto } from "@/lib/api/v1/dto";

// ---------------------------------------------------------------------------
// getRentalSummary — the portfolio rollup behind GET /api/v1/rental.
//
// Services are mocked (no DB); the derivations are REAL, so this runs the month totals, overdue,
// deposit, attention and activity logic end to end, then serialises through the real DTO to
// prove no internal identifier reaches the wire. Clock pinned to 15 Oct 2026 UTC.
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  listProperties: vi.fn(),
  listLeases: vi.fn(),
  listPayments: vi.fn(),
  listCertifications: vi.fn(),
  listSafetyRisks: vi.fn(),
  countDocuments: vi.fn(),
}));

vi.mock("@/lib/services/properties", () => ({ listProperties: mocks.listProperties }));
vi.mock("@/lib/services/leases", () => ({ listLeases: mocks.listLeases }));
vi.mock("@/lib/services/payments", () => ({ listPayments: mocks.listPayments }));
vi.mock("@/lib/services/certifications", () => ({ listCertifications: mocks.listCertifications }));
vi.mock("@/lib/services/safety-risks", () => ({ listSafetyRisks: mocks.listSafetyRisks }));
vi.mock("@/lib/services/documents", () => ({ countDocuments: mocks.countDocuments }));

import { getRentalSummary } from "./rental-summary";

const CTX: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "viewer" };
const NOW = Date.UTC(2026, 9, 15, 12);
const DAY = 86_400_000;

function property(id: string, name: string): Property {
  return {
    id, name, userId: "USR-0001", orgId: "ORG-0001", code: id, type: "residential", status: "Rented",
    lat: 0, lng: 0, createdAt: NOW - 400 * DAY, updatedAt: NOW, totalArea: "100 sqm",
  } as Property;
}

function lease(id: string, propertyId: string, monthlyRent: number): Lease {
  return {
    id, propertyId, tenantId: `TEN-${id}`, unit: "Main", stage: "Signed",
    startDate: NOW - 200 * DAY, endDate: NOW + 165 * DAY, monthlyRent, termMonths: 12,
  };
}

function payment(id: string, leaseId: string, daysAgo: number, amount: number, kind: Payment["kind"] = "Rent", status: Payment["status"] = "Paid"): Payment {
  return { id, leaseId, date: NOW - daysAgo * DAY, kind, amount, method: "Wire transfer", status };
}

const PROPERTIES = [
  property("PROP-0001", "77 Kestrel"),
  property("PROP-0002", "12 Heron"),
  property("PROP-0003", "3 Osprey"),
  property("PROP-0004", "9 Finch"),
];
const LEASES = [
  lease("LEASE-0001", "PROP-0001", 3200),
  lease("LEASE-0002", "PROP-0002", 2850),
  lease("LEASE-0003", "PROP-0003", 3190),
];
const PAYMENTS = [
  payment("PMT-0001", "LEASE-0001", 13, 3200),           // Oct rent, paid
  payment("PMT-0002", "LEASE-0002", 12, 2850),           // Oct rent, paid
  payment("PMT-0003", "LEASE-0003", 40, 3190),           // Sep
  payment("PMT-0004", "LEASE-0001", 44, 3200),           // Sep
  payment("PMT-0005", "LEASE-0002", 45, 2850),           // Sep
  payment("PMT-0006", "LEASE-0001", 200, 6400, "Deposit"),
  payment("PMT-0007", "LEASE-0002", 190, 3170, "Deposit"),
  payment("PMT-0008", "LEASE-0003", 1, 3190, "Rent", "Pending"),
  payment("PMT-0009", "LEASE-0003", -5, 3190, "Rent", "Pending"), // future: not activity
];
const CERTS: Certification[] = [
  { id: "CERT-0001", propertyId: "PROP-0001", name: "Fire Safety Certificate", status: "Valid", issuedAt: NOW - 400 * DAY, expiresAt: NOW - 3 * DAY, inspectorId: "INS-0001", createdAt: NOW, updatedAt: NOW },
  { id: "CERT-0002", propertyId: "PROP-0002", name: "Electrical Compliance", status: "Expiring", issuedAt: NOW - 300 * DAY, expiresAt: NOW + 9 * DAY, inspectorId: "INS-0001", createdAt: NOW, updatedAt: NOW },
  { id: "CERT-0003", propertyId: "PROP-0003", name: "Plumbing Certificate", status: "Valid", issuedAt: NOW - 30 * DAY, expiresAt: NOW + 300 * DAY, inspectorId: "INS-0001", createdAt: NOW, updatedAt: NOW },
];
const RISKS: SafetyRisk[] = [
  { id: "RISK-0001", propertyId: "PROP-0004", severity: "Low", title: "Loose handrail", description: "x", status: "Open", createdAt: NOW - 10 * DAY, updatedAt: NOW },
];

function load(data: { properties?: Property[]; leases?: Lease[]; payments?: Payment[]; certs?: Certification[]; risks?: SafetyRisk[]; docs?: number }) {
  mocks.listProperties.mockResolvedValue(data.properties ?? []);
  mocks.listLeases.mockResolvedValue(data.leases ?? []);
  mocks.listPayments.mockResolvedValue(data.payments ?? []);
  mocks.listCertifications.mockResolvedValue(data.certs ?? []);
  mocks.listSafetyRisks.mockResolvedValue(data.risks ?? []);
  mocks.countDocuments.mockResolvedValue(data.docs ?? 0);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getRentalSummary — portfolio rollup", () => {
  it("4 properties, 3 signed leases, 2 rent payments paid this month → 2 of 3 paid", async () => {
    load({ properties: PROPERTIES, leases: LEASES, payments: PAYMENTS, certs: CERTS, risks: RISKS, docs: 10 });

    const s = await getRentalSummary(CTX);

    expect(s.monthLabel).toBe("October 2026 (UTC)");
    expect(s.paidCount).toBe(2);
    expect(s.dueCount).toBe(3);
    expect(s.collectedAmountNumeric).toBe(3200 + 2850);
    expect(s.expectedAmountNumeric).toBe(3200 + 2850 + 3190);
    expect(s.totalCount).toBe(4);
    expect(s.depositHeldNumeric).toBe(6400 + 3170);
    expect(s.overdueCount).toBe(0);
    expect(s.overdueAmountNumeric).toBeNull();
    expect(s.documentCount).toBe(10);
  });

  it("attention: Overdue before Expiring, then soonest dueAt; risks have no dueAt", async () => {
    load({ properties: PROPERTIES, certs: CERTS, risks: RISKS });

    const { attention } = await getRentalSummary(CTX);

    expect(attention).toEqual([
      { kind: "certificate", title: "Fire Safety Certificate", propertyName: "77 Kestrel", dueAt: NOW - 3 * DAY, status: "Overdue" },
      { kind: "certificate", title: "Electrical Compliance", propertyName: "12 Heron", dueAt: NOW + 9 * DAY, status: "Expiring" },
      { kind: "risk", title: "Loose handrail", propertyName: "9 Finch", dueAt: null, status: "Expiring" },
    ]);
  });

  it("activity is payments only, capped at 5, newest first, no future payments", async () => {
    load({ properties: PROPERTIES, leases: LEASES, payments: PAYMENTS });

    const { activity } = await getRentalSummary(CTX);

    expect(activity).toHaveLength(5);
    const ats = activity.map((a) => a.at);
    expect(ats).toEqual([...ats].sort((a, b) => b - a));
    expect(activity[0]).toEqual({ title: "Rent pending", propertyName: "3 Osprey", at: NOW - DAY, amountNumeric: 3190 });
    expect(ats.every((at) => at <= NOW)).toBe(true);
  });

  it("an org with no data gets zeros, nulls and empty arrays", async () => {
    load({});

    const dto = toRentalSummaryDto(await getRentalSummary(CTX));

    expect(dto).toEqual({
      occupancyPercent: 0,
      occupiedCount: 0,
      totalCount: 0,
      tenancyCount: 0,
      nextPayoutAmountNumeric: null,
      nextPayoutAt: null,
      currency: null,
      monthLabel: "October 2026 (UTC)",
      collectedAmountNumeric: null,
      expectedAmountNumeric: null,
      paidCount: 0,
      dueCount: 0,
      overdueAmountNumeric: null,
      overdueCount: 0,
      depositHeldNumeric: null,
      documentCount: 0,
      attention: [],
      activity: [],
    });
  });

  it("the serialised DTO carries no internal identifiers", async () => {
    load({ properties: PROPERTIES, leases: LEASES, payments: PAYMENTS, certs: CERTS, risks: RISKS, docs: 3 });

    const json = JSON.stringify(toRentalSummaryDto(await getRentalSummary(CTX)));

    for (const key of ["leaseId", "tenantId", "paymentId", "documentId", "orgId", "storageId", "propertyId"]) {
      expect(json).not.toContain(key);
    }
    for (const id of ["PROP-", "LEASE-", "TEN-", "PMT-", "CERT-", "RISK-", "INS-", "USR-", "ORG-"]) {
      expect(json).not.toContain(id);
    }
  });

  it("overdue payments: amount summed and counted", async () => {
    load({
      properties: PROPERTIES,
      leases: LEASES,
      payments: [payment("PMT-0100", "LEASE-0001", 20, 3200, "Rent", "Overdue"), payment("PMT-0101", "LEASE-0002", 120, 2850, "Rent", "Overdue")],
    });

    const s = await getRentalSummary(CTX);

    expect(s.overdueCount).toBe(2);
    expect(s.overdueAmountNumeric).toBe(6050);
  });
});
