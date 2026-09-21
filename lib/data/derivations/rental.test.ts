import { describe, it, expect } from "vitest";
import type { Lease } from "@/lib/data/types/lease";
import type { Payment } from "@/lib/data/types/payment";
import type { Property } from "@/lib/data/types/property";
import {
  computeActiveMonthlyRent,
  computeNextPayout,
  computeOccupancyRate,
  computeOccupancySummary,
  computePropertyRentalRollup,
  computeTenancyCount,
} from "./rental";

const NOW = Date.UTC(2026, 8, 18, 12, 0, 0); // 2026-09-18T12:00:00.000Z
const DAY = 86_400_000;

// Builds a Property with only the occupancy fields filled in. The rest of the
// row is unused by these derivations, so it stays as a typed stub.
function makeProperty(id: string, status: Property["status"], isArchived = false): Property {
  return {
    id,
    userId: "USR-0001",
    orgId: "ORG-0001",
    name: id,
    code: id,
    type: "residential",
    status,
    lat: 0,
    lng: 0,
    createdAt: NOW,
    updatedAt: NOW,
    isArchived,
    totalArea: "1",
  } as Property;
}

// Builds a Lease with the dates and stage the occupancy/tenancy helpers read.
function makeLease(
  id: string,
  propertyId: string,
  stage: Lease["stage"],
  startDate: number,
  endDate: number,
): Lease {
  return {
    id,
    propertyId,
    unit: "A",
    stage,
    startDate,
    endDate,
    monthlyRent: 1000,
    termMonths: 12,
  };
}

// Builds a Payment with the kind/status/date/amount the next-payout helper reads.
function makePayment(
  id: string,
  date: number,
  amount: number,
  status: Payment["status"] = "Pending",
  kind: Payment["kind"] = "Rent",
): Payment {
  return {
    id,
    date,
    amount,
    status,
    kind,
    method: "Cash",
  };
}

describe("computeOccupancySummary", () => {
  it("returns zeros when the portfolio is empty", () => {
    expect(computeOccupancySummary([], [], NOW)).toEqual({
      percent: 0,
      occupiedCount: 0,
      totalCount: 0,
    });
  });

  it("counts a Signed in-range lease as occupied and a vacant property as empty", () => {
    const properties = [
      makeProperty("PROP-1", "Rented"),
      makeProperty("PROP-2", "Vacant"),
    ];
    const leases = [
      makeLease("LEASE-1", "PROP-1", "Signed", NOW - DAY, NOW + DAY),
    ];
    expect(computeOccupancySummary(properties, leases, NOW)).toEqual({
      percent: 50,
      occupiedCount: 1,
      totalCount: 2,
    });
  });

  it("counts Owner-Occupied as occupied even without a lease", () => {
    const properties = [makeProperty("PROP-1", "Owner-Occupied")];
    expect(computeOccupancySummary(properties, [], NOW)).toEqual({
      percent: 100,
      occupiedCount: 1,
      totalCount: 1,
    });
  });

  it("leaves archived properties out of the occupancy denominator", () => {
    const properties = [
      makeProperty("PROP-1", "Rented"),
      makeProperty("PROP-2", "Vacant", true),
    ];
    const leases = [
      makeLease("LEASE-1", "PROP-1", "Signed", NOW - DAY, NOW + DAY),
    ];
    expect(computeOccupancySummary(properties, leases, NOW)).toEqual({
      percent: 100,
      occupiedCount: 1,
      totalCount: 1,
    });
  });

  it("keeps computeOccupancyRate as the percent of the same summary", () => {
    const properties = [
      makeProperty("PROP-1", "Rented"),
      makeProperty("PROP-2", "Vacant"),
    ];
    const leases = [
      makeLease("LEASE-1", "PROP-1", "Signed", NOW - DAY, NOW + DAY),
    ];
    const summary = computeOccupancySummary(properties, leases, NOW);
    expect(computeOccupancyRate(properties, leases, NOW)).toBe(summary.percent);
  });
});

describe("computeTenancyCount", () => {
  it("counts only currently Signed leases", () => {
    const leases = [
      makeLease("LEASE-1", "PROP-1", "Signed", NOW - DAY, NOW + DAY),
      makeLease("LEASE-2", "PROP-2", "Signed", NOW - DAY, NOW + DAY),
      makeLease("LEASE-3", "PROP-3", "Offered", NOW - DAY, NOW + DAY),
      makeLease("LEASE-4", "PROP-4", "Signed", NOW - 20 * DAY, NOW - DAY),
    ];
    expect(computeTenancyCount(leases, NOW)).toBe(2);
  });

  it("returns 0 when there are no leases", () => {
    expect(computeTenancyCount([], NOW)).toBe(0);
  });
});

describe("computeNextPayout", () => {
  it("returns null when there is no upcoming Pending Rent", () => {
    expect(computeNextPayout([], NOW)).toBeNull();
    expect(
      computeNextPayout(
        [makePayment("PMT-1", NOW - 1, 1000, "Paid")],
        NOW,
      ),
    ).toBeNull();
  });

  it("picks the soonest upcoming Pending Rent and does not invent a date", () => {
    const later = Date.UTC(2026, 9, 15, 0, 0, 0);
    const sooner = Date.UTC(2026, 9, 1, 8, 0, 0);
    const result = computeNextPayout(
      [
        makePayment("PMT-1", later, 3200),
        makePayment("PMT-2", sooner, 2850),
      ],
      NOW,
    );
    expect(result).toEqual({ amountNumeric: 2850, at: sooner });
  });

  it("sums Pending Rent payments that share the same UTC calendar day", () => {
    const morning = Date.UTC(2026, 9, 1, 8, 0, 0);
    const evening = Date.UTC(2026, 9, 1, 18, 0, 0);
    const result = computeNextPayout(
      [
        makePayment("PMT-1", morning, 2850),
        makePayment("PMT-2", evening, 3190),
      ],
      NOW,
    );
    expect(result).toEqual({ amountNumeric: 6040, at: morning });
  });

  it("skips Paid, Failed, Overdue, non-Rent, past, and zero-amount rows", () => {
    const upcoming = Date.UTC(2026, 9, 1, 0, 0, 0);
    const result = computeNextPayout(
      [
        makePayment("PMT-paid", upcoming, 1000, "Paid"),
        makePayment("PMT-failed", upcoming, 1000, "Failed"),
        makePayment("PMT-overdue", NOW - 1000, 1000, "Overdue"),
        makePayment("PMT-fee", upcoming, 1000, "Pending", "Fee"),
        makePayment("PMT-zero", upcoming, 0, "Pending"),
        makePayment("PMT-past", NOW - 1000, 1000, "Pending"),
        makePayment("PMT-ok", upcoming, 2500, "Pending"),
      ],
      NOW,
    );
    expect(result).toEqual({ amountNumeric: 2500, at: upcoming });
  });
});

describe("computeActiveMonthlyRent", () => {
  it("sums only this property's active Signed leases", () => {
    const leases = [
      makeLease("LEASE-1", "PROP-1", "Signed", NOW - DAY, NOW + DAY),
      makeLease("LEASE-2", "PROP-1", "Signed", NOW - DAY, NOW + DAY),
      makeLease("LEASE-3", "PROP-1", "Offered", NOW - DAY, NOW + DAY),
      makeLease("LEASE-4", "PROP-1", "Signed", NOW - 20 * DAY, NOW - DAY),
      makeLease("LEASE-5", "PROP-2", "Signed", NOW - DAY, NOW + DAY),
    ];
    // Two active leases at 1000 each; offered, expired, and other-property rows excluded.
    expect(computeActiveMonthlyRent(leases, "PROP-1", NOW)).toBe(2000);
  });

  it("returns 0 for a property with no leases or an empty id", () => {
    expect(computeActiveMonthlyRent([], "PROP-1", NOW)).toBe(0);
    expect(computeActiveMonthlyRent([makeLease("LEASE-1", "PROP-1", "Signed", NOW - DAY, NOW + DAY)], "", NOW)).toBe(0);
  });
});

describe("computePropertyRentalRollup", () => {
  it("counts an occupied property with its active rent and next payment", () => {
    const property = makeProperty("PROP-1", "Rented");
    const leases = [
      makeLease("LEASE-1", "PROP-1", "Signed", NOW - DAY, NOW + DAY),
      makeLease("LEASE-2", "PROP-1", "Declined", NOW - DAY, NOW + DAY),
    ];
    const upcoming = Date.UTC(2026, 9, 1, 0, 0, 0);

    expect(
      computePropertyRentalRollup(property, leases, [makePayment("PMT-1", upcoming, 1200)], NOW),
    ).toEqual({
      occupancyPercent: 100,
      activeLeaseCount: 1,
      monthlyRentNumeric: 1000,
      nextPaymentAmountNumeric: 1200,
      nextPaymentAt: upcoming,
    });
  });

  it("returns zeros and nulls when the property has no leases and no upcoming payments", () => {
    expect(computePropertyRentalRollup(makeProperty("PROP-1", "Vacant"), [], [], NOW)).toEqual({
      occupancyPercent: 0,
      activeLeaseCount: 0,
      monthlyRentNumeric: 0,
      nextPaymentAmountNumeric: null,
      nextPaymentAt: null,
    });
  });

  it("counts Owner-Occupied as occupied without a lease", () => {
    const rollup = computePropertyRentalRollup(makeProperty("PROP-1", "Owner-Occupied"), [], [], NOW);
    expect(rollup.occupancyPercent).toBe(100);
    expect(rollup.activeLeaseCount).toBe(0);
  });

  it("treats an archived property as 0% and a null property as an empty rollup", () => {
    const archived = makeProperty("PROP-1", "Rented", true);
    expect(computePropertyRentalRollup(archived, [], [], NOW).occupancyPercent).toBe(0);

    expect(computePropertyRentalRollup(null, [], [], NOW)).toEqual({
      occupancyPercent: 0,
      activeLeaseCount: 0,
      monthlyRentNumeric: 0,
      nextPaymentAmountNumeric: null,
      nextPaymentAt: null,
    });
  });
});
