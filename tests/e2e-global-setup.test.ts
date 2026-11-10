import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { query, end } = vi.hoisted(() => ({ query: vi.fn(), end: vi.fn() }));

vi.mock("dotenv", () => ({ config: vi.fn() }));
vi.mock("pg", () => ({
  Pool: class {
    query = query;
    end = end;
  },
}));

import globalSetup from "../e2e/global-setup";

beforeEach(() => {
  query.mockReset();
  end.mockReset().mockResolvedValue(undefined);
  vi.stubEnv("E2E_SMOKE", "");
  vi.stubEnv("DEMO_MODE", "true");
  vi.stubEnv("PLAYWRIGHT_AUTH", "");
  vi.stubEnv("DATABASE_URL", "postgres://test:test@localhost:5432/e2e-test");
});

afterEach(() => vi.unstubAllEnvs());

describe("E2E setup isolation", () => {
  it("lets only the smoke runner skip DB preflight without a database URL", async () => {
    vi.stubEnv("E2E_SMOKE", "1");
    vi.stubEnv("DATABASE_URL", "");
    await globalSetup();
    expect(query).not.toHaveBeenCalled();
    expect(end).not.toHaveBeenCalled();
  });

  it("still requires a database URL for full E2E in demo mode", async () => {
    vi.stubEnv("DATABASE_URL", "");
    await expect(globalSetup()).rejects.toThrow("DATABASE_URL not set");
    expect(query).not.toHaveBeenCalled();
  });

  it("runs migration/seed checks and test-row cleanup for full demo E2E", async () => {
    query
      .mockResolvedValueOnce({ rows: [{ ok: 1 }] })
      .mockResolvedValueOnce({ rows: ["activities", "safety_risks", "id_counters"].map(
        table_name => ({ table_name }),
      ) })
      .mockResolvedValueOnce({ rows: [{ id: "PROP-0001" }] })
      .mockResolvedValue({ rowCount: 0 });

    await globalSetup();

    expect(query).toHaveBeenCalledWith(expect.stringContaining("information_schema.tables"));
    expect(query).toHaveBeenCalledWith(expect.stringContaining("WHERE id = 'PROP-0001'"));
    for (const table of ["properties", "professionals", "maintenance_items", "property_drafts"]) {
      expect(query).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^DELETE FROM ${table} .*LIKE 'E2E%'$`)));
    }
    expect(end).toHaveBeenCalledOnce();
  });

  it("rejects missing migrations before any cleanup in full demo E2E", async () => {
    query
      .mockResolvedValueOnce({ rows: [{ ok: 1 }] })
      .mockResolvedValueOnce({ rows: [] });
    await expect(globalSetup()).rejects.toThrow("Missing tables:");
    expect(query.mock.calls.some(([sql]) => sql.startsWith("DELETE"))).toBe(false);
    expect(end).toHaveBeenCalledOnce();
  });
});
