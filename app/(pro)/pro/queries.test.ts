// ⚠️ EXCLUDED from `npm test` (see vitest.config.ts `test.exclude`).
// TODO(M5): rework for Neon. These tests import the real Pro query functions,
// which now call requireCtx() -> Clerk auth() -> `server-only` and throw at
// IMPORT time under node/vitest. The file predates the Neon migration (it was
// written to read file-based seed with no auth). Re-enable once it mocks auth
// and runs against seeded Neon, then remove the exclude entry.

import { beforeEach, afterEach, describe, it, expect } from "vitest";
import { freezeClock, unfreezeClock } from "@/test/helpers";
import {
  getCompliancePageData,
  getProDashboardData,
  getProPropertiesData,
  getRentPageData,
  getWorkOrdersPageData,
  getClientPortfolioData,
  getAgentHubData,
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

    // Live-verified against the rendered /pro/compliance page. One Low risk
    // (RISK-0006) is seeded Resolved, so the open register holds 6 of the 7.
    expect(data.summary).toEqual({
      expiredCount: 1,
      expiringCount: 2,
      validCount: 7,
      openRiskCount: 6,
      resolvedRiskCount: 1,
      highRiskCount: 1,
      failedInspections: 1,
    });
  });

  it("excludes resolved risks from the open register", async () => {
    const data = await getCompliancePageData();

    // The card shows only open risks, so a resolved one must not appear...
    expect(data.safetyRisks.every((r) => r.status === "Open")).toBe(true);
    expect(data.safetyRisks.some((r) => r.id === "RISK-0006")).toBe(false);
    // ...and openRiskCount tracks exactly the rows on the card.
    expect(data.summary.openRiskCount).toBe(data.safetyRisks.length);
    expect(data.summary.resolvedRiskCount).toBe(1);
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

// ---------------------------------------------------------------------------
// getRentPageData()
// ---------------------------------------------------------------------------

describe("getRentPageData", () => {
  // rentRoll is sorted by this rank (most-urgent first); used to verify order.
  const rentStatusRank: Record<string, number> = {
    Overdue: 0,
    Unpaid: 1,
    Pending: 2,
    Paid: 3,
  };

  it("labels the period as the pinned calendar month", async () => {
    const data = await getRentPageData();
    expect(data.monthLabel).toBe("June 2026");
  });

  it("derives the same money totals as the dashboard", async () => {
    // expected / collected come from the same sumExpectedRent /
    // sumCollectedRent helpers the dashboard uses, so the two pages must
    // never disagree about this month's rent. A drift here means one page
    // forked the calculation.
    const [rent, dash] = await Promise.all([
      getRentPageData(),
      getProDashboardData(),
    ]);
    expect(rent.expected).toBe(dash.financials.expected);
    expect(rent.collected).toBe(dash.financials.collected);
    expect(rent.occupancy.rented).toBe(dash.occupancy.rented);
    expect(rent.occupancy.vacant).toBe(dash.occupancy.vacant);
  });

  it("keeps outstanding and collection-rate coherent", async () => {
    const data = await getRentPageData();
    expect(data.outstanding).toBe(Math.max(0, data.expected - data.collected));
    expect(data.collectionRate).toBeGreaterThanOrEqual(0);
    expect(data.collectionRate).toBeLessThanOrEqual(100);
    if (data.expected > 0) {
      expect(data.collectionRate).toBe(
        Math.round((data.collected / data.expected) * 100),
      );
    }
  });

  it("sorts the rent roll most-urgent first", async () => {
    const data = await getRentPageData();
    for (let i = 1; i < data.rentRoll.length; i++) {
      expect(rentStatusRank[data.rentRoll[i].rentStatus]).toBeGreaterThanOrEqual(
        rentStatusRank[data.rentRoll[i - 1].rentStatus],
      );
    }
  });

  it("derives the overdue list straight from the rent roll", async () => {
    const data = await getRentPageData();
    // Every overdue row is an unpaid/overdue row that also appears in the roll.
    const rollIds = new Set(data.rentRoll.map((r) => r.leaseId));
    for (const row of data.overdue) {
      expect(["Overdue", "Unpaid"]).toContain(row.rentStatus);
      expect(rollIds.has(row.leaseId)).toBe(true);
    }
  });

  it("only lists leases expiring within 90 days, soonest first", async () => {
    const data = await getRentPageData();
    for (const e of data.expiring) {
      expect(e.daysLeft).toBeGreaterThanOrEqual(0);
      expect(e.daysLeft).toBeLessThanOrEqual(90);
      // The renew preview must advance the end date, never move it backward.
      expect(e.projectedEndDate).toBeGreaterThan(e.endDate);
    }
    for (let i = 1; i < data.expiring.length; i++) {
      expect(data.expiring[i].endDate).toBeGreaterThanOrEqual(
        data.expiring[i - 1].endDate,
      );
    }
  });

  it("returns a 6-month cashflow series with no NaN money", async () => {
    const data = await getRentPageData();
    expect(data.series).toHaveLength(6);
    for (const point of data.series) {
      expectRealNumber(point.collected, `series ${point.month}`);
      expect(point.collected).toBeGreaterThanOrEqual(0);
    }
    for (const key of ["expected", "collected", "outstanding"] as const) {
      expectRealNumber(data[key], key);
    }
  });
});

// ---------------------------------------------------------------------------
// getWorkOrdersPageData()
// ---------------------------------------------------------------------------

describe("getWorkOrdersPageData", () => {
  it("agrees with the dashboard on the work-order counts", async () => {
    const [wo, dash] = await Promise.all([
      getWorkOrdersPageData(),
      getProDashboardData(),
    ]);
    expect(wo.counts.open).toBe(dash.workOrders.counts.open);
    expect(wo.counts.inProgress).toBe(dash.workOrders.counts.inProgress);
    expect(wo.counts.resolved).toBe(dash.workOrders.counts.resolved);
  });

  it("lists every work order exactly once across the status buckets", async () => {
    const data = await getWorkOrdersPageData();
    // Each maintenance item has exactly one status, so the rows must total the
    // three status counts. A mismatch means a row was dropped (orphaned
    // property join) or double-counted.
    const { open, inProgress, resolved } = data.counts;
    expect(data.rows.length).toBe(open + inProgress + resolved);
  });

  it("computes totalOpenCost as the sum of unresolved costs", async () => {
    const data = await getWorkOrdersPageData();
    const expected = data.rows
      .filter((r) => r.status !== "Resolved")
      .reduce((sum, r) => sum + (r.cost ?? 0), 0);
    expect(data.totalOpenCost).toBe(expected);
  });

  it("sorts rows by status, then severity, then newest", async () => {
    const data = await getWorkOrdersPageData();
    const statusRank: Record<string, number> = {
      Open: 0,
      InProgress: 1,
      Resolved: 2,
    };
    const severityRank = (s: string) =>
      s === "Emergency" ? 0 : s === "Urgent" ? 1 : 2;
    const key = (r: (typeof data.rows)[number]) => [
      statusRank[r.status],
      severityRank(r.severity),
      -r.createdAt,
    ];
    for (let i = 1; i < data.rows.length; i++) {
      const prev = key(data.rows[i - 1]);
      const cur = key(data.rows[i]);
      // Lexicographic non-decreasing.
      expect(prev[0] <= cur[0]).toBe(true);
      if (prev[0] === cur[0]) {
        expect(prev[1] <= cur[1]).toBe(true);
        if (prev[1] === cur[1]) expect(prev[2] <= cur[2]).toBe(true);
      }
    }
  });

  it("offers only real, dispatchable vendors and named properties", async () => {
    const data = await getWorkOrdersPageData();
    for (const v of data.vendors) {
      expect(v.name.length).toBeGreaterThan(0);
      expect(typeof v.available).toBe("boolean");
      expectRealNumber(v.rating, `vendor ${v.id} rating`);
    }
    for (const p of data.properties) {
      expect(p.name.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// getClientPortfolioData()
// ---------------------------------------------------------------------------

describe("getClientPortfolioData", () => {
  // Resolve a real client id from the dashboard rather than hardcoding one, so
  // the test survives a re-seed that renumbers clients.
  async function firstClientId(): Promise<string> {
    const dash = await getProDashboardData();
    return dash.clients[0].client.id;
  }

  it("returns null for a client that does not exist", async () => {
    const data = await getClientPortfolioData("CLI-does-not-exist");
    expect(data).toBeNull();
  });

  it("scopes every record to the requested client", async () => {
    const clientId = await firstClientId();
    const data = await getClientPortfolioData(clientId);
    expect(data).not.toBeNull();
    if (!data) return;

    expect(data.rollup.client.id).toBe(clientId);
    for (const p of data.properties) expect(p.clientId).toBe(clientId);
    for (const w of data.workOrders) expect(w.clientId).toBe(clientId);
    for (const c of data.compliance) expect(c.clientId).toBe(clientId);
    // Rent surfaces are derived over the same client-scoped slice.
    for (const r of data.rentRoll) expect(r.clientId).toBe(clientId);
    for (const o of data.overdue) expect(data.rentRoll).toContain(o);
  });

  it("merges the audit log into a newest-first, honestly-attributed activity feed", async () => {
    const clientId = await firstClientId();
    const data = await getClientPortfolioData(clientId);
    expect(data).not.toBeNull();
    if (!data) return;

    // Every event is tagged with its source and a known category, and the feed
    // is capped and sorted newest-first (day grouping happens client-side).
    const validCategories = ["payment", "maintenance", "lease", "update"];
    expect(data.activity.length).toBeLessThanOrEqual(50);
    for (let i = 1; i < data.activity.length; i++) {
      expect(data.activity[i - 1].timestamp).toBeGreaterThanOrEqual(
        data.activity[i].timestamp,
      );
    }
    for (const event of data.activity) {
      expect(validCategories).toContain(event.category);
      expect(["record", "audit"]).toContain(event.source);
      // Synthesized record-events never carry an actor; audit rows only ever
      // resolve to "You" (the manager) — we never fabricate a display name.
      if (event.source === "record") expect(event.actor).toBeUndefined();
      if (event.actor !== undefined) expect(event.actor).toBe("You");
    }
  });

  it("scopes safety risks + inspections and reconciles the compliance summary", async () => {
    const clientId = await firstClientId();
    const data = await getClientPortfolioData(clientId);
    expect(data).not.toBeNull();
    if (!data) return;

    // Safety risks + inspections are derived over the same client-scoped slice
    // (the scoped ProContext now filters both, not just certificates).
    for (const r of data.safetyRisks) expect(r.clientId).toBe(clientId);
    for (const i of data.inspections) expect(i.clientId).toBe(clientId);

    // Status-based partition: every cert is exactly one of Valid / Expiring /
    // Expired, so the three summary counts always sum to the certificate total.
    // This reads `cert.status`, NOT the date — the date-based daysLeft horizon
    // buckets are DELIBERATELY not reconciled with this, so we do not assert
    // any daysLeft-vs-status equality here.
    const s = data.complianceSummary;
    expect(s.validCount + s.expiringCount + s.expiredCount).toBe(
      data.compliance.length,
    );

    // The open/resolved split tracks exactly the register rows.
    expect(s.openRiskCount).toBe(
      data.safetyRisks.filter((r) => r.status === "Open").length,
    );
    expect(s.resolvedRiskCount).toBe(
      data.safetyRisks.filter((r) => r.status !== "Open").length,
    );

    // Failed-inspection count tracks exactly the failed rows.
    expect(s.failedInspections).toBe(
      data.inspections.filter((i) => i.status === "Failed").length,
    );
  });

  it("matches the dashboard's rollup for the same client", async () => {
    const clientId = await firstClientId();
    const [portfolio, dash] = await Promise.all([
      getClientPortfolioData(clientId),
      getProDashboardData(),
    ]);
    expect(portfolio).not.toBeNull();
    if (!portfolio) return;

    const dashRollup = dash.clients.find((c) => c.client.id === clientId);
    expect(dashRollup).toBeDefined();
    // Both call buildClientRollup with the same ctx + pinned month, so the
    // standalone portfolio page and the dashboard card must report identical
    // headline figures.
    expect(portfolio.rollup.totalValue).toBe(dashRollup!.totalValue);
    expect(portfolio.rollup.propertyCount).toBe(dashRollup!.propertyCount);
    expect(portfolio.rollup.monthlyExpected).toBe(dashRollup!.monthlyExpected);
    expect(portfolio.rollup.monthlyCollected).toBe(dashRollup!.monthlyCollected);
  });

  it("builds a balanced owner statement for the previous month", async () => {
    const clientId = await firstClientId();
    const data = await getClientPortfolioData(clientId);
    expect(data).not.toBeNull();
    if (!data) return;

    const s = data.ownerStatement;
    // Pinned now is June 2026, so the statement covers the prior full month.
    expect(s.monthLabel).toBe("May 2026");

    // The ledger must foot: expenses are the sum of their parts, and NOI is
    // income minus those expenses. These are the lines an owner reads.
    expect(s.totalExpenses).toBe(
      s.managementFee + s.taxAccrual + s.insuranceAccrual + s.maintenanceCosts,
    );
    expect(s.netOperatingIncome).toBe(
      s.rentCollected + s.otherIncome - s.totalExpenses,
    );
    expect(s.managementFee).toBe(
      Math.round((s.rentCollected * s.managementFeePct) / 100),
    );
    expect(s.occupancyRate).toBeGreaterThanOrEqual(0);
    expect(s.occupancyRate).toBeLessThanOrEqual(100);
  });

  it("returns a 6-month financial series with no NaN", async () => {
    const clientId = await firstClientId();
    const data = await getClientPortfolioData(clientId);
    expect(data).not.toBeNull();
    if (!data) return;

    expect(data.financialSeries).toHaveLength(6);
    for (const point of data.financialSeries) {
      expectRealNumber(point.collected, `series ${point.month}`);
    }
  });

  it("derives a collection rate consistent with the rollup", async () => {
    const clientId = await firstClientId();
    const data = await getClientPortfolioData(clientId);
    expect(data).not.toBeNull();
    if (!data) return;

    // collectionRate re-derives from the same scoped expected/collected the
    // rollup uses, so the KPI strip and the rollup can't disagree.
    const { monthlyExpected, monthlyCollected } = data.rollup;
    expect(data.collectionRate).toBe(
      monthlyExpected === 0
        ? 0
        : Math.round((monthlyCollected / monthlyExpected) * 100),
    );
    // Every expiring lease ends within the next 90 days (pinned now).
    const now = Date.now();
    for (const lease of data.expiring) {
      expect(lease.endDate).toBeGreaterThanOrEqual(now - 1);
      expect(lease.endDate).toBeLessThanOrEqual(now + 91 * 24 * 60 * 60 * 1000);
    }
  });

  it("derives work-order counts + open cost consistent with the scoped rows", async () => {
    const clientId = await firstClientId();
    const data = await getClientPortfolioData(clientId);
    expect(data).not.toBeNull();
    if (!data) return;

    // Each count tracks exactly the rows with that status (robust even when a
    // Cancelled row is present — Cancelled is intentionally uncounted).
    const { open, inProgress, resolved, urgentOpen } = data.workOrderCounts;
    expect(data.workOrders.filter((w) => w.status === "Open").length).toBe(open);
    expect(
      data.workOrders.filter((w) => w.status === "InProgress").length,
    ).toBe(inProgress);
    expect(data.workOrders.filter((w) => w.status === "Resolved").length).toBe(
      resolved,
    );

    // urgentOpen = non-closed Emergency/Urgent rows.
    const urgent = data.workOrders.filter(
      (w) =>
        w.status !== "Resolved" &&
        w.status !== "Cancelled" &&
        (w.severity === "Emergency" || w.severity === "Urgent"),
    ).length;
    expect(urgentOpen).toBe(urgent);

    // Open est. cost = sum of non-closed estimates.
    const openCost = data.workOrders
      .filter((w) => w.status !== "Resolved" && w.status !== "Cancelled")
      .reduce((sum, w) => sum + (w.cost ?? 0), 0);
    expect(data.totalOpenWorkOrderCost).toBe(openCost);
  });

  it("reuses the same trade-vendor directory as the global work-orders page", async () => {
    const clientId = await firstClientId();
    const [portfolio, global] = await Promise.all([
      getClientPortfolioData(clientId),
      getWorkOrdersPageData(),
    ]);
    expect(portfolio).not.toBeNull();
    if (!portfolio) return;

    // Both call the shared deriveWorkOrderSurfaces, and the vendor directory is
    // org-wide (not client-scoped), so the two must be identical. This is the
    // invariant that proves the extraction did not fork the vendor list.
    expect(portfolio.workOrderVendors).toEqual(global.vendors);
  });
});

// ---------------------------------------------------------------------------
// getAgentHubData — column-derivation rule
//
// The key invariant: the derivedStatus of a run is determined by the linked
// message's actionResult, not the run's stored status field. This guards
// against regressions where the derivation logic breaks and cards land in
// the wrong kanban column.
// ---------------------------------------------------------------------------

describe("getAgentHubData — column derivation", () => {
  beforeEach(freezeClock);
  afterEach(unfreezeClock);

  it("returns runs for all four columns from seed data", async () => {
    const { runs } = await getAgentHubData();
    expect(runs.length).toBeGreaterThanOrEqual(8);

    const byStatus = {
      watching: runs.filter((r) => r.derivedStatus === "watching"),
      detected: runs.filter((r) => r.derivedStatus === "detected"),
      "needs-approval": runs.filter((r) => r.derivedStatus === "needs-approval"),
      done: runs.filter((r) => r.derivedStatus === "done"),
    };

    // Seed has 2 watching, 2 detected, 2 needs-approval, 2 done.
    expect(byStatus.watching.length).toBeGreaterThanOrEqual(2);
    expect(byStatus.detected.length).toBeGreaterThanOrEqual(2);
    expect(byStatus["needs-approval"].length).toBeGreaterThanOrEqual(2);
    expect(byStatus.done.length).toBeGreaterThanOrEqual(2);
  });

  it("needs-approval runs have a linked message with a proposedAction and no actionResult", async () => {
    const { runs } = await getAgentHubData();
    const pending = runs.filter((r) => r.derivedStatus === "needs-approval");
    expect(pending.length).toBeGreaterThan(0);
    for (const run of pending) {
      expect(run.linkedMessage).toBeDefined();
      expect(run.linkedMessage?.proposedAction).toBeDefined();
      expect(run.linkedMessage?.actionResult).toBeUndefined();
    }
  });

  it("done runs have a linked message with actionResult.ok = true and no undone flag", async () => {
    const { runs } = await getAgentHubData();
    const done = runs.filter((r) => r.derivedStatus === "done");
    expect(done.length).toBeGreaterThan(0);
    for (const run of done) {
      expect(run.linkedMessage?.actionResult?.ok).toBe(true);
      expect(run.linkedMessage?.actionResult?.undone).toBeFalsy();
    }
  });

  it("monitor-only runs (no proposalMessageId) use their stored status", async () => {
    const { runs } = await getAgentHubData();
    const monitorOnly = runs.filter((r) => !r.proposalMessageId);
    expect(monitorOnly.length).toBeGreaterThan(0);
    for (const run of monitorOnly) {
      expect(run.derivedStatus).toBe(run.status);
    }
  });
});
