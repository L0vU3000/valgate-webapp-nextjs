import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Lease } from "@/lib/data/types/lease";
import type { Payment } from "@/lib/data/types/payment";
import type { Property } from "@/lib/data/types/property";
import type { Tenant } from "@/lib/data/types/tenant";
import { toRentalSummaryDto } from "./dto";

const mocks = vi.hoisted(() => ({
  listProperties: vi.fn(), listLeases: vi.fn(), listPayments: vi.fn(), listTenants: vi.fn(),
  listCertifications: vi.fn(), listSafetyRisks: vi.fn(), countDocuments: vi.fn(),
}));
vi.mock("@/lib/services/properties", () => ({ listProperties: mocks.listProperties }));
vi.mock("@/lib/services/leases", () => ({ listLeases: mocks.listLeases }));
vi.mock("@/lib/services/payments", () => ({ listPayments: mocks.listPayments }));
vi.mock("@/lib/services/tenants", () => ({ listTenants: mocks.listTenants }));
vi.mock("@/lib/services/certifications", () => ({ listCertifications: mocks.listCertifications }));
vi.mock("@/lib/services/safety-risks", () => ({ listSafetyRisks: mocks.listSafetyRisks }));
vi.mock("@/lib/services/documents", () => ({ countDocuments: mocks.countDocuments }));

import { getRentalSummary } from "@/lib/services/rental-summary";

const CTX = { userId: "USR-private", orgId: "ORG-private", orgRole: "viewer" } as const;
const NOW = Date.UTC(2026, 0, 15, 12);
const HOME = { id: "PROP-1", name: "Kestrel", status: "Rented" } as Property;
const LEASE: Lease = {
  id: "LEASE-private", propertyId: HOME.id, tenantId: "TEN-private", unit: "Main", stage: "Signed",
  startDate: Date.UTC(2025, 4, 10), endDate: Date.UTC(2027, 4, 10), monthlyRent: 1200, termMonths: 24,
};
const TENANT: Tenant = {
  id: "TEN-private", propertyId: HOME.id, name: "Sophea", unit: "Main", rent: 1200, status: "Paid",
};
function payment(id: string, date: number, status: Payment["status"] = "Pending", extra: Partial<Payment> = {}): Payment {
  return { id, leaseId: LEASE.id, date, status, kind: "Rent", amount: 1200, method: "Cash", ...extra };
}
async function dto() { return toRentalSummaryDto(await getRentalSummary(CTX)); }

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  mocks.listProperties.mockResolvedValue([HOME]);
  mocks.listLeases.mockResolvedValue([LEASE]);
  mocks.listPayments.mockResolvedValue([]);
  mocks.listTenants.mockResolvedValue([TENANT]);
  mocks.listCertifications.mockResolvedValue([]);
  mocks.listSafetyRisks.mockResolvedValue([]);
  mocks.countDocuments.mockResolvedValue(0);
});
afterEach(() => vi.useRealTimers());

describe("rental main page DTO through real service derivations (DB-free)", () => {
  it.each([
    ["paid", [payment("paid", Date.UTC(2026, 0, 1), "Paid")]],
    ["due", [payment("now", NOW)]],
    ["overdue", [payment("late", NOW - 1)]],
    ["upcoming", [payment("future", NOW + 1)]],
  ] as const)("derives %s from this month's rent rows", async (status, rows) => {
    mocks.listPayments.mockResolvedValue(rows);
    expect((await dto()).tenancies).toEqual([{
      propertyId: HOME.id, propertyName: "Kestrel", tenantName: "Sophea",
      monthlyRentNumeric: 1200, currency: "USD", status,
    }]);
  });

  it("unpaid current rent takes precedence over a paid row; past/future month rent and fees do not set tenancy status", async () => {
    mocks.listPayments.mockResolvedValue([
      payment("paid", Date.UTC(2026, 0, 1), "Paid"), payment("late", NOW - 1, "Failed"),
      payment("dec", Date.UTC(2025, 11, 1), "Overdue"),
      payment("feb", Date.UTC(2026, 1, 1)), payment("fee", NOW - 1, "Pending", { kind: "Fee" }),
    ]);
    expect((await dto()).tenancies[0]!.status).toBe("overdue");
    mocks.listPayments.mockResolvedValue([
      payment("dec", Date.UTC(2025, 11, 1), "Overdue"),
      payment("feb", Date.UTC(2026, 1, 1)), payment("fee", NOW - 1, "Pending", { kind: "Fee" }),
    ]);
    expect((await dto()).tenancies[0]!.status).toBe("due");
  });

  it.each([[10, "due"], [20, "upcoming"]] as const)("missing payment: start day %s gives %s, never overdue", async (day, status) => {
    mocks.listLeases.mockResolvedValue([{ ...LEASE, startDate: Date.UTC(2025, 4, day) }]);
    expect((await dto()).tenancies[0]!.status).toBe(status);
  });

  it("clamps the missing-payment due day at February's end", async () => {
    vi.setSystemTime(Date.UTC(2026, 1, 28));
    mocks.listLeases.mockResolvedValue([{ ...LEASE, startDate: Date.UTC(2025, 0, 31) }]);
    expect((await dto()).tenancies[0]!.status).toBe("due");
  });

  it("lists each active Signed lease and joins its own tenant; excludes expired, future and unsigned leases", async () => {
    mocks.listLeases.mockResolvedValue([
      LEASE, { ...LEASE, id: "second", tenantId: undefined },
      { ...LEASE, id: "expired", endDate: NOW - 1 },
      { ...LEASE, id: "future", startDate: NOW + 1 },
      { ...LEASE, id: "offered", stage: "Offered" },
    ]);
    expect((await dto()).tenancies.map((t) => t.tenantName)).toEqual(["Sophea", null]);
    mocks.listTenants.mockResolvedValue([{ ...TENANT, propertyId: "PROP-other" }]);
    expect((await dto()).tenancies.map((t) => t.tenantName)).toEqual([null, null]);
  });

  it("returns five UTC months across the year boundary, bounded amounts/counts and closed-month states", async () => {
    mocks.listPayments.mockResolvedValue([
      payment("aug", Date.UTC(2025, 7, 31, 23), "Paid", { amount: 9999 }),
      payment("sep", Date.UTC(2025, 8, 1), "Paid"),
      payment("oct-paid", Date.UTC(2025, 9, 1), "Paid", { amount: 500 }),
      payment("oct-pending", Date.UTC(2025, 9, 2)),
      payment("dec", Date.UTC(2025, 11, 31, 23, 59, 59, 999), "Paid"),
      payment("jan", Date.UTC(2026, 0, 1), "Paid"),
      payment("jan-fee", NOW, "Paid", { kind: "Fee", amount: 9999 }),
      payment("feb", Date.UTC(2026, 1, 1), "Paid", { amount: 9999 }),
    ]);
    const result = await dto();
    expect(result.history).toEqual([
      { monthLabel: "September 2025 (UTC)", amountNumeric: 1200, paidCount: 1, dueCount: 1, state: "paid" },
      { monthLabel: "October 2025 (UTC)", amountNumeric: 500, paidCount: 1, dueCount: 2, state: "in_progress" },
      { monthLabel: "November 2025 (UTC)", amountNumeric: 0, paidCount: 0, dueCount: 0, state: "in_progress" },
      { monthLabel: "December 2025 (UTC)", amountNumeric: 1200, paidCount: 1, dueCount: 1, state: "paid" },
      { monthLabel: "January 2026 (UTC)", amountNumeric: 1200, paidCount: 1, dueCount: 1, state: "in_progress" },
    ]);
    expect(result.history.at(-1)!.monthLabel).toBe(result.monthLabel);
  });

  it("sorts unsettled payments before capping at five, joins the property and converts dueAt to seconds", async () => {
    mocks.listPayments.mockResolvedValue([
      payment("sixth", NOW + 6000), payment("fifth", NOW + 5000), payment("fourth", NOW + 4000),
      payment("third", NOW + 3000), payment("second", NOW, "Failed", { kind: "Fee" }),
      payment("first", NOW - 2500), payment("settled", NOW - 5000, "Paid"),
      payment("unlinked", NOW - 6000, "Pending", { leaseId: undefined }),
      payment("unknown-lease", NOW - 7000, "Pending", { leaseId: "unknown" }),
    ]);
    const { upcoming } = await dto();
    expect(upcoming.map((p) => p.paymentId)).toEqual(["first", "second", "third", "fourth", "fifth"]);
    expect(upcoming[0]).toEqual({ paymentId: "first", propertyId: HOME.id, propertyName: "Kestrel",
      dueAt: Math.floor((NOW - 2500) / 1000), amountNumeric: 1200, currency: "USD", state: "overdue" });
    expect(upcoming.slice(1).every((p) => p.state === "due_soon")).toBe(true);
  });

  it("empty org arrays are [], deposit remains null and every service uses the same caller ctx", async () => {
    mocks.listProperties.mockResolvedValue([]);
    mocks.listLeases.mockResolvedValue([]);
    mocks.listTenants.mockResolvedValue([]);
    expect(await dto()).toMatchObject({ tenancies: [], history: [], upcoming: [], depositHeldNumeric: null });
    for (const mock of Object.values(mocks)) expect(mock).toHaveBeenCalledWith(CTX);
  });

  it("field-picks each nested DTO and withholds lease/tenant/org ids and extra internal fields", async () => {
    mocks.listPayments.mockResolvedValue([payment("PMT-public", NOW)]);
    const source = await getRentalSummary(CTX);
    for (const row of [source.tenancies[0]!, source.history[0]!, source.upcoming[0]!]) {
      Object.assign(row, { leaseId: "private", tenantId: "private", storageId: "private", orgId: "private" });
    }
    const result = toRentalSummaryDto(source);
    expect(Object.keys(result.tenancies[0]!).sort()).toEqual(["currency", "monthlyRentNumeric", "propertyId", "propertyName", "status", "tenantName"]);
    expect(Object.keys(result.history[0]!).sort()).toEqual(["amountNumeric", "dueCount", "monthLabel", "paidCount", "state"]);
    expect(Object.keys(result.upcoming[0]!).sort()).toEqual(["amountNumeric", "currency", "dueAt", "paymentId", "propertyId", "propertyName", "state"]);
    const json = JSON.stringify(result);
    for (const key of ["leaseId", "tenantId", "storageId", "orgId", "USR-private", "ORG-private"]) expect(json).not.toContain(key);
  });
});
