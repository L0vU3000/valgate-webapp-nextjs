// TM1-125: nextId() must reconcile the counter against the table, not just increment it.
//
// Production wedged on this: `POST /api/v1/properties` died with
//   duplicate key value violates unique constraint "properties_pkey" | 23505 |
//   Key (id)=(PROP-0028) already exists.
// The counter had fallen behind the highest row in the table, and because the old
// upsert only did `next = id_counters.next + 1`, it handed out the same colliding
// id on every request — a permanent wedge, not a transient race.
//
// Deliberately a *unit* test, not a live-DB one: the failure was in the SQL we
// generate, so what matters is that the statement contains the reconciliation
// clause at all. A real-DB test would need a drifted fixture to prove the same
// thing more slowly, and `test:db` no-ops without a database.

import { describe, it, expect, vi, beforeEach } from "vitest";

// `server-only` throws outside a server bundle; stub it as the other unit suites do.
vi.mock("server-only", () => ({}));

// Capture the SQL handed to db.execute, and drive the returned `next`.
const { executeMock, lastQuery } = vi.hoisted(() => ({
  executeMock: vi.fn(),
  lastQuery: { value: null as unknown },
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    execute: (q: unknown) => {
      lastQuery.value = q;
      return executeMock(q);
    },
  },
}));

vi.mock("@/lib/env", () => ({
  env: { DEMO_MODE: false, DEMO_ALLOW_WRITES: true, DATABASE_URL: "" },
}));

import { nextId } from "@/lib/services/_mapping";
import { properties } from "@/lib/db/schema";
import { getTableName } from "drizzle-orm";

/** Flatten the SQL object Drizzle builds into the text Postgres would receive. */
function sqlText(query: unknown): string {
  const chunks = (query as { queryChunks?: unknown[] }).queryChunks ?? [];
  const walk = (node: unknown): string => {
    if (typeof node === "string") return node;
    if (node == null) return "";
    const n = node as Record<string, unknown>;
    if (Array.isArray(n.queryChunks)) return (n.queryChunks as unknown[]).map(walk).join("");
    if (typeof n.value === "string") return n.value;
    if (Array.isArray(n.value)) return (n.value as unknown[]).map(walk).join("");
    return "";
  };
  return chunks.map(walk).join(" ");
}

describe("nextId reconciliation (TM1-125)", () => {
  beforeEach(() => {
    executeMock.mockReset();
    lastQuery.value = null;
  });

  it("reconciles the counter from the table when given one", async () => {
    executeMock.mockResolvedValue({ rows: [{ next: 29 }] });

    const id = await nextId("PROP", properties);

    const text = sqlText(lastQuery.value);
    // The counter must be able to move *forward past the data*, not only +1.
    expect(text).toContain("GREATEST");
    // …and it must read the table it was handed.
    expect(text).toContain(getTableName(properties));
    // Only ids for THIS prefix may feed the max, or a foreign prefix inflates it.
    expect(text).toContain("PROP-[0-9]+");
    // nextId returns next-1.
    expect(id).toBe("PROP-0028");
  });

  it("stays increment-only when no table is given (token-style ids)", async () => {
    executeMock.mockResolvedValue({ rows: [{ next: 5 }] });

    const id = await nextId("DOC");

    const text = sqlText(lastQuery.value);
    expect(text).toContain("GREATEST");
    // No table reference at all — nothing to reconcile against.
    expect(text).not.toContain("split_part");
    expect(id).toBe("DOC-0004");
  });

  it("an id handed out is strictly above the max suffix already present", async () => {
    // The drifted production shape: table holds PROP-0027, counter would hand out 0028.
    executeMock.mockResolvedValue({ rows: [{ next: 29 }] });

    const id = await nextId("PROP", properties);
    const suffix = Number(id.split("-")[1]);

    expect(suffix).toBeGreaterThan(27);
  });

  it("throws rather than returning a malformed id when the counter row is absent", async () => {
    executeMock.mockResolvedValue({ rows: [] });
    await expect(nextId("PROP", properties)).rejects.toThrow(/unknown collection/);
  });
});
