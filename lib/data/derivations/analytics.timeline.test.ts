import { describe, expect, it } from "vitest";

import type { Expense } from "@/lib/data/types/expense";
import type { Payment } from "@/lib/data/types/payment";

import {
  computeRevenueTimelineLabel,
  type DateWindow,
} from "./analytics";

describe("computeRevenueTimelineLabel", () => {
  it("uses the earliest and latest contributing dates across paid rent and expenses", () => {
    const window: DateWindow = {
      from: Date.UTC(2026, 0, 1),
      to: Date.UTC(2026, 6, 1),
    };
    const payments: Payment[] = [
      {
        id: "payment-march-rent",
        leaseId: "lease-one",
        date: Date.UTC(2026, 2, 15),
        kind: "Rent",
        amount: 1_500,
        method: "ABA Bank",
        status: "Paid",
      },
      {
        id: "payment-june-rent",
        leaseId: "lease-one",
        date: Date.UTC(2026, 5, 20),
        kind: "Rent",
        amount: 1_500,
        method: "ABA Bank",
        status: "Paid",
      },
    ];
    const expenses: Expense[] = [
      {
        id: "expense-february-maintenance",
        propertyId: "property-one",
        date: Date.UTC(2026, 1, 5),
        category: "Maintenance",
        amount: 250,
        note: "Air conditioner service",
      },
      {
        id: "expense-may-insurance",
        propertyId: "property-one",
        date: Date.UTC(2026, 4, 8),
        category: "Insurance",
        amount: 400,
        note: "Insurance premium",
      },
    ];

    const timelineLabel = computeRevenueTimelineLabel(payments, expenses, window);

    expect(timelineLabel).toBe("FEBRUARY 2026 - JUNE 2026");
  });

  it("ignores non-rent payments, non-paid rent, and records outside the selected window", () => {
    const window: DateWindow = {
      from: Date.UTC(2026, 3, 1),
      to: Date.UTC(2026, 6, 1),
    };
    const payments: Payment[] = [
      {
        id: "payment-may-rent",
        leaseId: "lease-one",
        date: Date.UTC(2026, 4, 10),
        kind: "Rent",
        amount: 1_500,
        method: "ABA Bank",
        status: "Paid",
      },
      {
        id: "payment-april-fee",
        leaseId: "lease-one",
        date: Date.UTC(2026, 3, 1),
        kind: "Fee",
        amount: 50,
        method: "Cash",
        status: "Paid",
      },
      {
        id: "payment-april-deposit",
        leaseId: "lease-one",
        date: Date.UTC(2026, 3, 2),
        kind: "Deposit",
        amount: 1_500,
        method: "Wire transfer",
        status: "Paid",
      },
      {
        id: "payment-june-refund",
        leaseId: "lease-one",
        date: Date.UTC(2026, 5, 30),
        kind: "Refund",
        amount: 200,
        method: "Wing",
        status: "Paid",
      },
      {
        id: "payment-april-pending-rent",
        leaseId: "lease-one",
        date: Date.UTC(2026, 3, 3),
        kind: "Rent",
        amount: 1_500,
        method: "ABA Bank",
        status: "Pending",
      },
      {
        id: "payment-march-paid-rent-outside-window",
        leaseId: "lease-one",
        date: Date.UTC(2026, 2, 31),
        kind: "Rent",
        amount: 1_500,
        method: "ABA Bank",
        status: "Paid",
      },
      {
        id: "payment-july-paid-rent-outside-window",
        leaseId: "lease-one",
        date: Date.UTC(2026, 6, 1),
        kind: "Rent",
        amount: 1_500,
        method: "ABA Bank",
        status: "Paid",
      },
    ];
    const expenses: Expense[] = [
      {
        id: "expense-may-utilities",
        propertyId: "property-one",
        date: Date.UTC(2026, 4, 25),
        category: "Utilities",
        amount: 180,
        note: "Electricity",
      },
      {
        id: "expense-march-outside-window",
        propertyId: "property-one",
        date: Date.UTC(2026, 2, 31),
        category: "Maintenance",
        amount: 300,
        note: "Before selected window",
      },
      {
        id: "expense-july-outside-window",
        propertyId: "property-one",
        date: Date.UTC(2026, 6, 1),
        category: "Tax",
        amount: 500,
        note: "At exclusive end of selected window",
      },
    ];

    const timelineLabel = computeRevenueTimelineLabel(payments, expenses, window);

    expect(timelineLabel).toBe("MAY 2026 - MAY 2026");
  });

  it("returns null when there are no contributing records", () => {
    const window: DateWindow = {
      from: Date.UTC(2026, 0, 1),
      to: Date.UTC(2026, 1, 1),
    };
    const payments: Payment[] = [
      {
        id: "payment-january-overdue-rent",
        leaseId: "lease-one",
        date: Date.UTC(2026, 0, 15),
        kind: "Rent",
        amount: 1_500,
        method: "ABA Bank",
        status: "Overdue",
      },
    ];
    const expenses: Expense[] = [
      {
        id: "expense-february-outside-window",
        propertyId: "property-one",
        date: Date.UTC(2026, 1, 1),
        category: "Management",
        amount: 120,
        note: "At exclusive end of selected window",
      },
    ];

    const timelineLabel = computeRevenueTimelineLabel(payments, expenses, window);

    expect(timelineLabel).toBeNull();
  });
});
