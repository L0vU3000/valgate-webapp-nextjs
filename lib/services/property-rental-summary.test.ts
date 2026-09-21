import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Ctx } from "@/lib/services/_mapping";
import type { Lease } from "@/lib/data/types/lease";
import type { Payment } from "@/lib/data/types/payment";
import type { Property } from "@/lib/data/types/property";

// ---------------------------------------------------------------------------
// getPropertyRentalSummary — per-property rental rollup for
// GET /api/v1/properties/[id]/rental.
//
// The three services are mocked (no Clerk/DB/network) but the derivations are REAL, so this
// exercises computePropertyRentalRollup end to end. The rows handed back carry lease/tenant/
// payment identifiers and PII; the point of this suite is that NONE of them survive into the
// returned aggregate. Also covers: cross-org property -> null (route turns it into 404), and a
// property with no rental data at all -> zeros/nulls, not an error.
// ---------------------------------------------------------------------------

const { getPropertyMock, listLeasesMock, listPaymentsMock } = vi.hoisted(() => ({
  getPropertyMock: vi.fn(),
  listLeasesMock: vi.fn(),
  listPaymentsMock: vi.fn(),
}));

vi.mock("@/lib/services/properties", () => ({ getProperty: getPropertyMock }));
vi.mock("@/lib/services/leases", () => ({ listLeases: listLeasesMock }));
vi.mock("@/lib/services/payments", () => ({ listPayments: listPaymentsMock }));

import { getPropertyRentalSummary } from "./property-rental-summary";

const CTX: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "viewer" };
const NOW = Date.now();
const DAY = 86_400_000;

const SECRET_MARKERS = [
  "USR-SECRET-0001",
  "ORG-SECRET-0001",
  "LEASE-SECRET-0001",
  "TENANT-SECRET-0001",
  "PMT-SECRET-0001",
  "tenant-secret@example.com",
  "123 Tenant Secret St",
];

// A full Property row, secret org/user ids and all — exactly what the service layer hands back.
function fullProperty(overrides: Partial<Property> = {}): Property {
  return {
    id: "PROP-0001",
    userId: "USR-SECRET-0001",
    orgId: "ORG-SECRET-0001",
    name: "42 Ocean Ave",
    code: "PROP-0001",
    type: "residential",
    status: "Rented",
    lat: 0,
    lng: 0,
    createdAt: NOW,
    updatedAt: NOW,
    totalArea: "120 sqm",
    photoStorageIds: ["STORE-PHOTO-SECRET-1"],
    ...overrides,
  } as Property;
}

// A Lease row carrying every field the derivation reads PLUS the tenant link and unit, so the
// leak assertions are testing a row that genuinely has something to leak.
function fullLease(overrides: Partial<Lease> = {}): Lease {
  return {
    id: "LEASE-SECRET-0001",
    propertyId: "PROP-0001",
    tenantId: "TENANT-SECRET-0001",
    unit: "Unit 4B - 123 Tenant Secret St",
    stage: "Signed",
    startDate: NOW - 30 * DAY,
    endDate: NOW + 60 * DAY,
    monthlyRent: 2850,
    termMonths: 12,
    renewalStatus: "Not renewing - tenant-secret@example.com",
    ...overrides,
  };
}

function fullPayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: "PMT-SECRET-0001",
    leaseId: "LEASE-SECRET-0001",
    date: NOW + 5 * DAY,
    kind: "Rent",
    amount: 2850,
    method: "Wire transfer",
    status: "Pending",
    ...overrides,
  } as Payment;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPropertyRentalSummary", () => {
  it("returns null when the property is absent OR belongs to another org (one indistinguishable 404)", async () => {
    getPropertyMock.mockResolvedValue(null);

    expect(await getPropertyRentalSummary(CTX, "PROP-9999")).toBeNull();
    // Cross-org is a null result, not a distinct error — and the downstream queries never run.
    expect(listLeasesMock).not.toHaveBeenCalled();
    expect(listPaymentsMock).not.toHaveBeenCalled();
  });

  it("scopes every read to the caller's org and the URL property id", async () => {
    getPropertyMock.mockResolvedValue(fullProperty());
    listLeasesMock.mockResolvedValue([]);
    listPaymentsMock.mockResolvedValue([]);

    await getPropertyRentalSummary(CTX, "PROP-0001");

    expect(getPropertyMock).toHaveBeenCalledWith(CTX, "PROP-0001");
    expect(listLeasesMock).toHaveBeenCalledWith(CTX, "PROP-0001");
    expect(listPaymentsMock).toHaveBeenCalledWith(CTX, "PROP-0001");
  });

  it("rolls an occupied property into aggregates — and leaks no lease/tenant/payment id", async () => {
    getPropertyMock.mockResolvedValue(fullProperty());
    listLeasesMock.mockResolvedValue([
      fullLease(),
      fullLease({ id: "LEASE-SECRET-0002", stage: "Offered", monthlyRent: 9999 }),
      fullLease({ id: "LEASE-SECRET-0003", stage: "Signed", endDate: NOW - DAY, monthlyRent: 1234 }),
    ]);
    listPaymentsMock.mockResolvedValue([
      fullPayment(),
      fullPayment({ id: "PMT-SECRET-0002", status: "Paid" }),
    ]);

    const summary = await getPropertyRentalSummary(CTX, "PROP-0001");

    // Only the expiring/offered leases are excluded; the one active Signed lease drives both
    // the occupancy flag and the rent total.
    expect(summary).toEqual({
      occupancyPercent: 100,
      activeLeaseCount: 1,
      monthlyRentNumeric: 2850,
      nextPaymentAmountNumeric: 2850,
      nextPaymentAt: NOW + 5 * DAY,
    });

    const serialized = JSON.stringify(summary);
    for (const marker of SECRET_MARKERS) {
      expect(serialized).not.toContain(marker);
    }
    expect(Object.keys(summary ?? {}).sort()).toEqual([
      "activeLeaseCount",
      "monthlyRentNumeric",
      "nextPaymentAmountNumeric",
      "nextPaymentAt",
      "occupancyPercent",
    ]);
  });

  it("returns zeros and nulls for a property with no rental data (not an error)", async () => {
    getPropertyMock.mockResolvedValue(fullProperty({ status: "Vacant" }));
    listLeasesMock.mockResolvedValue([]);
    listPaymentsMock.mockResolvedValue([]);

    expect(await getPropertyRentalSummary(CTX, "PROP-0001")).toEqual({
      occupancyPercent: 0,
      activeLeaseCount: 0,
      monthlyRentNumeric: 0,
      nextPaymentAmountNumeric: null,
      nextPaymentAt: null,
    });
  });

  it("counts Owner-Occupied as occupied with no lease, matching the portfolio rule", async () => {
    getPropertyMock.mockResolvedValue(fullProperty({ status: "Owner-Occupied" }));
    listLeasesMock.mockResolvedValue([]);
    listPaymentsMock.mockResolvedValue([]);

    const summary = await getPropertyRentalSummary(CTX, "PROP-0001");
    expect(summary?.occupancyPercent).toBe(100);
    expect(summary?.activeLeaseCount).toBe(0);
  });

  it("ignores leases and payments belonging to a different property", async () => {
    getPropertyMock.mockResolvedValue(fullProperty());
    listLeasesMock.mockResolvedValue([fullLease({ propertyId: "PROP-OTHER" })]);
    listPaymentsMock.mockResolvedValue([]);

    const summary = await getPropertyRentalSummary(CTX, "PROP-0001");
    expect(summary?.activeLeaseCount).toBe(0);
    expect(summary?.monthlyRentNumeric).toBe(0);
  });
});
