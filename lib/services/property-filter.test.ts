// Exercise the real service exports and mapping with only the DB client mocked.
// No database, network, dynamic-import fallback, or swallowed assertion failures.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { ZodError } from "zod";
import { inspections, payments } from "@/lib/db/schema";
import type { Ctx } from "@/lib/services/_mapping";

const { from, where, orderBy, limit } = vi.hoisted(() => ({
  from: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({
  db: { select: () => ({ from }) },
}));

import { listInspections } from "./inspections";
import { listPayments } from "./payments";

const CTX: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" };
const NOW = 1_700_000_000_000;
const dialect = new PgDialect();
const cases = [
  {
    name: "listInspections",
    list: listInspections,
    table: inspections,
    row: {
      id: "INSP-0001", propertyId: "PROP-0001", inspectedAt: new Date(NOW),
      type: "Electrical", inspectorId: "USR-0002", status: "Passed", issues: 0,
      createdAt: new Date(NOW), updatedAt: new Date(NOW),
    },
    expected: {
      id: "INSP-0001", propertyId: "PROP-0001", inspectedAt: NOW,
      type: "Electrical", inspectorId: "USR-0002", status: "Passed", issues: 0,
      createdAt: NOW, updatedAt: NOW,
    },
  },
  {
    name: "listPayments",
    list: listPayments,
    table: payments,
    row: {
      id: "PMT-0001", propertyId: "PROP-0001", leaseId: "LEASE-0001",
      date: new Date(NOW), kind: "Rent", amount: "1250.50", method: "Cash", status: "Paid",
    },
    expected: {
      id: "PMT-0001", leaseId: "LEASE-0001", date: NOW,
      kind: "Rent", amount: 1250.5, method: "Cash", status: "Paid",
    },
  },
];

beforeEach(() => {
  vi.resetAllMocks();
  from.mockReturnValue({ where });
  where.mockReturnValue({ orderBy });
  orderBy.mockReturnValue({ limit });
  limit.mockResolvedValue([]);
});

describe.each(cases)("$name — callable property-filter contract", ({ list, table, row, expected }) => {
  it("accepts ctx alone, maps valid rows, and scopes only to the org", async () => {
    limit.mockResolvedValue([{ ...row, orgId: CTX.orgId }]);

    await expect(list(CTX)).resolves.toEqual([expected]);
    expect(from).toHaveBeenCalledExactlyOnceWith(table);
    expect(where).toHaveBeenCalledTimes(1);
    const query = dialect.sqlToQuery(where.mock.calls[0][0]);
    expect(query.params).toEqual([CTX.orgId]);
    expect(query.sql).toContain('"org_id"');
    expect(query.sql).not.toContain('"property_id"');
    expect(limit).toHaveBeenCalledExactlyOnceWith(500);
  });

  it("accepts propertyId and filters the property column as well as the caller's org", async () => {
    const ctx = { ...CTX, orgId: "ORG-0002" };
    limit.mockResolvedValue([row]);

    await expect(list(ctx, "PROP-0001")).resolves.toEqual([expected]);
    expect(from).toHaveBeenCalledExactlyOnceWith(table);
    expect(where).toHaveBeenCalledTimes(1);
    const query = dialect.sqlToQuery(where.mock.calls[0][0]);
    expect(query.params).toEqual([ctx.orgId, "PROP-0001"]);
    expect(query.sql).toContain('"org_id"');
    expect(query.sql).toContain('"property_id"');
    expect(query.sql).toContain(" and ");
  });

  it("returns an empty list when no rows match", async () => {
    await expect(list(CTX, "PROP-missing")).resolves.toEqual([]);
  });

  it("rejects a missing context instead of succeeding", async () => {
    await expect(list(undefined as unknown as Ctx, "PROP-0001")).rejects.toThrow(TypeError);
    expect(limit).not.toHaveBeenCalled();
  });

  it("rejects malformed row input at the domain schema boundary", async () => {
    limit.mockResolvedValue([{ ...row, id: "" }]);
    await expect(list(CTX, "PROP-0001")).rejects.toBeInstanceOf(ZodError);
  });

  it("propagates query failures", async () => {
    const failure = new Error("query failed");
    limit.mockRejectedValue(failure);
    await expect(list(CTX, "PROP-0001")).rejects.toBe(failure);
  });
});
