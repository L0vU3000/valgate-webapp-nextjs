import { beforeEach, afterEach, describe, it, expect } from "vitest";
import { freezeClock, unfreezeClock } from "@/test/helpers";
import {
  getCompliancePageData,
  getProDashboardData,
  getProPropertiesData,
} from "./queries";

// ---------------------------------------------------------------------------
// Query-layer integration tests.
//
// These run the REAL Pro query functions against the REAL committed seed under
// `public/data/users/demo-user`. The clock is pinned to 2026-06-12 (see
// test/helpers.ts) so every date-derived count is reproducible.
//
// Two kinds of assertion, per the testing plan:
//   1. GOLDEN values — exact numbers at the pinned date. These are the
//      live-verified figures the Pro pages render today. They are *expected*
//      to change when the seed is legitimately edited (re-baseline them then).
//   2. INVARIANTS — properties that must hold for ANY valid seed. These are
//      the real prize: they catch future derivation bugs without re-hardcoding
//      a golden value, so they survive seed edits.
//
// Helper: assert a number is a real, finite number (not NaN / undefined).
// ---------------------------------------------------------------------------

function expectRealNumber(value: unknown, label: string): void {
  expect(value, `${label} should be a number`).toBeTypeOf("number");
  expect(Number.isFinite(value as number), `${label} should be finite`).toBe(
    true,
  );
}

beforeEach(() => {
  freezeClock();
});

afterEach(() => {
  unfreezeClock();
});

// ---------------------------------------------------------------------------
// getCompliancePageData()
// ---------------------------------------------------------------------------

describe("getCompliancePageData", () => {
  it("returns the golden summary counts at the pinned date", async () => {
    const data = await getCompliancePageData();

    // Live-verified against the rendered /pro/compliance page.
    expect(data.summary).toEqual({
      expiredCount: 1,
      expiringCount: 2,
      validCount: 7,
      openRiskCount: 7,
      highRiskCount: 1,
      failedInspections: 1,
    });
  });

  it("partitions certifications by STATUS so the KPI strip reconciles", async () => {
    const data = await getCompliancePageData();

    // Status-based partition: every cert is exactly one of Expired / Expiring
    // / Valid, so the three counts always sum to the total. This holds for ANY
    // seed because it reads `cert.status`, not the date.
    const { expiredCount, expiringCount, validCount } = data.summary;
    expect(expiredCount + expiringCount + validCount).toBe(
      data.certifications.length,
    );
  });

  it("keeps each cert's date-based daysLeft coherent with its expiry order", async () => {
    const data = await getCompliancePageData();

    // daysLeft is DATE-based (computed from expiresAt vs the pinned now),
    // kept deliberately distinct from the STATUS counts above — the seed has a
    // known status-vs-date mismatch (more certs are date-overdue than carry
    // the "Expired" status). So we assert the date invariants on their own:
    for (const cert of data.certifications) {
      expectRealNumber(cert.daysLeft, `cert ${cert.id} daysLeft`);
      expect(Number.isInteger(cert.daysLeft)).toBe(true);
    }

    // Rows are sorted by expiresAt ascending, so daysLeft must be
    // non-decreasing (daysLeft is a monotic function of expiresAt at a fixed
    // now). A break here means the sort or the day math regressed.
    for (let i = 1; i < data.certifications.length; i++) {
      expect(data.certifications[i].daysLeft).toBeGreaterThanOrEqual(
        data.certifications[i - 1].daysLeft,
      );
    }

    // Every row falls into exactly one horizon bucket, and the buckets cover
    // the whole list (Overdue < 0, then 0–30, 31–90, Later > 90).
    const overdue = data.certifications.filter((c) => c.daysLeft < 0);
    const within30 = data.certifications.filter(
      (c) => c.daysLeft >= 0 && c.daysLeft <= 30,
    );
    const within90 = data.certifications.filter(
      (c) => c.daysLeft > 30 && c.daysLeft <= 90,
    );
    const later = data.certifications.filter((c) => c.daysLeft > 90);
    expect(overdue.length + within30.length + within90.length + later.length).toBe(
      data.certifications.length,
    );

    // GOLDEN (date-specific): at 2026-06-12 exactly 3 certs are date-overdue
    // (daysLeft < 0), yet only 1 carries the "Expired" STATUS. This is the
    // deliberate status-vs-date mismatch in the seed — and it is what makes the
    // pinned clock load-bearing: this 3 shifts as time moves, while the
    // status-based summary.expiredCount stays at 1. If the clock pin ever
    // breaks, this assertion is the canary that catches it.
    expect(overdue.length).toBe(3);
    expect(data.summary.expiredCount).toBe(1);
  });

  it("sorts safety risks by severity rank (Critical first)", async () => {
    const data = await getCompliancePageData();

    const rank: Record<string, number> = {
      Critical: 0,
      High: 1,
      Medium: 2,
      Low: 3,
    };
    for (let i = 1; i < data.safetyRisks.length; i++) {
      expect(rank[data.safetyRisks[i].severity]).toBeGreaterThanOrEqual(
        rank[data.safetyRisks[i - 1].severity],
      );
    }

    // openRiskCount is simply the number of listed risks (all are open).
    expect(data.summary.openRiskCount).toBe(data.safetyRisks.length);
  });

  it("sorts inspections newest-first by inspectedAt", async () => {
    const data = await getCompliancePageData();

    for (let i = 1; i < data.inspections.length; i++) {
      expect(data.inspections[i].inspectedAt).toBeLessThanOrEqual(
        data.inspections[i - 1].inspectedAt,
      );
    }
  });

  it("only offers filter clients that actually own a record", async () => {
    const data = await getCompliancePageData();

    const clientIdsWithRecords = new Set<string>();
    for (const c of data.certifications) clientIdsWithRecords.add(c.clientId);
    for (const r of data.safetyRisks) clientIdsWithRecords.add(r.clientId);
    for (const i of data.inspections) clientIdsWithRecords.add(i.clientId);

    expect(data.clients.length).toBeGreaterThan(0);
    for (const client of data.clients) {
      expect(clientIdsWithRecords.has(client.id)).toBe(true);
    }
  });

  it("has no NaN / undefined in any summary field", async () => {
    const data = await getCompliancePageData();
    for (const [key, value] of Object.entries(data.summary)) {
      expectRealNumber(value, `summary.${key}`);
    }
  });
});

// ---------------------------------------------------------------------------
// getProDashboardData()
// ---------------------------------------------------------------------------

describe("getProDashboardData", () => {
  it("returns the golden KPI headline numbers at the pinned date", async () => {
    const data = await getProDashboardData();

    expect(data.kpis.totalValueFormatted).toBe("$14.50M");
    // kpis.propertyCount counts ACTIVE properties only (excludes Sold /
    // Archived). The book holds 23 properties in total — that total is asserted
    // separately in getProPropertiesData.summary.totalCount — of which 21 are
    // active. The two numbers are deliberately different; don't conflate them.
    expect(data.kpis.propertyCount).toBe(21);
    expect(data.kpis.clientCount).toBe(6);
  });

  it("keeps occupancy and collection rates within 0–100", async () => {
    const data = await getProDashboardData();

    expect(data.kpis.occupancyRate).toBeGreaterThanOrEqual(0);
    expect(data.kpis.occupancyRate).toBeLessThanOrEqual(100);
    expect(data.kpis.collectionRate).toBeGreaterThanOrEqual(0);
    expect(data.kpis.collectionRate).toBeLessThanOrEqual(100);
  });

  it("rolls client property counts up to the active total", async () => {
    const data = await getProDashboardData();

    // Each property is tagged to at most one client, so summing the per-client
    // active counts must equal the book-wide active property count. A mismatch
    // means a property was double-counted or dropped from a rollup.
    const summed = data.clients.reduce((sum, c) => sum + c.propertyCount, 0);
    expect(summed).toBe(data.kpis.propertyCount);
  });

  it("only raises alerts against real, present clients", async () => {
    const data = await getProDashboardData();

    const clientIds = new Set(data.clients.map((c) => c.client.id));
    for (const alert of data.alerts) {
      expect(clientIds.has(alert.clientId)).toBe(true);
    }
  });

  it("has no NaN in kpis / financials / occupancy numbers", async () => {
    const data = await getProDashboardData();

    for (const [key, value] of Object.entries(data.kpis)) {
      if (typeof value === "number") expectRealNumber(value, `kpis.${key}`);
    }
    expectRealNumber(data.financials.expected, "financials.expected");
    expectRealNumber(data.financials.collected, "financials.collected");
    expectRealNumber(data.financials.outstanding, "financials.outstanding");
    expectRealNumber(data.occupancy.rented, "occupancy.rented");
    expectRealNumber(data.occupancy.vacant, "occupancy.vacant");
    expectRealNumber(data.occupancy.occupancyRate, "occupancy.occupancyRate");
  });
});

// ---------------------------------------------------------------------------
// getProPropertiesData()
// ---------------------------------------------------------------------------

describe("getProPropertiesData", () => {
  it("returns the golden summary at the pinned date", async () => {
    const data = await getProPropertiesData();

    expect(data.summary.totalCount).toBe(23);
    expect(data.summary.totalValueFormatted).toBe("$14.50M");
  });

  it("sorts the register by value descending", async () => {
    const data = await getProPropertiesData();

    for (let i = 1; i < data.properties.length; i++) {
      expect(data.properties[i].value).toBeLessThanOrEqual(
        data.properties[i - 1].value,
      );
    }
  });

  it("gives every row a non-empty client name and a valid progress", async () => {
    const data = await getProPropertiesData();

    for (const row of data.properties) {
      expect(row.clientName.length).toBeGreaterThan(0);
      expectRealNumber(row.progress, `progress for ${row.id}`);
      expect(row.progress).toBeGreaterThanOrEqual(0);
      expect(row.progress).toBeLessThanOrEqual(100);
    }
  });

  it("offers only filter clients that actually own a property", async () => {
    const data = await getProPropertiesData();

    const owningClientNames = new Set(
      data.properties.map((p) => p.clientName),
    );
    for (const client of data.clients) {
      expect(owningClientNames.has(client.name)).toBe(true);
    }
  });
});
