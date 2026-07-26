import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// The acceptance test renders only the analytics page markup. Replacing the
// client-only chart chunks keeps the test focused on the timeline display.
vi.mock("next/dynamic", () => ({
  default: () => function DynamicChartStub() {
    return null;
  },
}));

// The page uses the router only for period-filter button clicks. Static
// rendering does not click those buttons, so a no-op router is sufficient.
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// App chrome is outside this acceptance test's surface.
vi.mock("@/components/layout/AppHeader", () => ({
  AppHeader: () => null,
}));

import { AnalyticsPage } from "./AnalyticsPage";
import type { AnalyticsPageData } from "../queries";
import { PaymentSchema, type Payment } from "@/lib/data/types/payment";

type AnalyticsDataWithTimeline = AnalyticsPageData & {
  timelineLabel: string;
};

/** Loads and validates the same committed demo payment records the seed process consumes. */
function loadDemoPayments(): Payment[] {
  const paymentsDirectory = path.resolve(
    process.cwd(),
    "public/data/users/demo-user/payments",
  );

  return readdirSync(paymentsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const paymentPath = path.join(paymentsDirectory, entry.name, "core.json");
      const paymentJson = JSON.parse(readFileSync(paymentPath, "utf8"));
      return PaymentSchema.parse(paymentJson);
    });
}

/** Formats a stored payment timestamp as the timeline's user-facing month and year. */
function formatTimelineMonth(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(new Date(timestamp))
    .toUpperCase();
}

/** Builds the smallest typed analytics fixture around real demo rent-payment fields. */
function buildSeedDerivedAnalyticsData(): AnalyticsDataWithTimeline {
  const paidRentPayments = loadDemoPayments()
    .filter((payment) => payment.kind === "Rent" && payment.status === "Paid")
    .sort((left, right) => left.date - right.date);

  if (paidRentPayments.length === 0) {
    throw new Error("The demo seed must contain at least one paid rent payment.");
  }

  const firstPayment = paidRentPayments[0];
  const lastPayment = paidRentPayments[paidRentPayments.length - 1];

  if (!firstPayment || !lastPayment) {
    throw new Error("The paid rent payment range could not be determined.");
  }

  const revenueByMonth = new Map<string, number>();

  for (const payment of paidRentPayments) {
    const monthKey = new Date(payment.date).toISOString().slice(0, 7);
    const existingRevenue = revenueByMonth.get(monthKey) ?? 0;
    revenueByMonth.set(monthKey, existingRevenue + payment.amount);
  }

  const revenueData = [...revenueByMonth.entries()].map(([monthKey, revenue]) => ({
    month: new Intl.DateTimeFormat("en-US", {
      month: "short",
      timeZone: "UTC",
    }).format(new Date(`${monthKey}-01T00:00:00.000Z`)),
    revenue,
    expenses: 0,
  }));

  return {
    revenueData,
    kpiCards: [],
    leasePipeline: [],
    capitalGrowth: [],
    maintenanceSpend: [],
    savedReports: [],
    expenseBreakdown: [],
    expenseBreakdownTotal: 0,
    period: "Custom",
    timelineLabel: `${formatTimelineMonth(firstPayment.date)} - ${formatTimelineMonth(lastPayment.date)}`,
  };
}

describe("AnalyticsPage revenue timeline", () => {
  it("renders the real demo payment date range instead of the hardcoded 2024 range", () => {
    const data = buildSeedDerivedAnalyticsData();
    const markup = renderToStaticMarkup(
      createElement(AnalyticsPage, {
        data,
        period: data.period,
      }),
    );

    expect(data.timelineLabel).toBe("FEBRUARY 2026 - JUNE 2026");
    expect(markup).toContain(data.timelineLabel);
    expect(markup).not.toContain("MARCH 2024 - AUGUST 2024");
  });
});
