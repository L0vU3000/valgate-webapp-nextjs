// Unit tests for the utility-account Server Actions (app/actions/utility-accounts.ts).
//
// These test the ACTION layer's own responsibilities, not the DB. The service
// (lib/services/utility-accounts.ts) owns the Drizzle queries and org-ownership
// (IDOR) guard and is covered by lib/services/utility-accounts.db.test.ts. Here we
// mock the service so we can assert what the action itself must do:
//   - validate input with Zod BEFORE authenticating or touching the service
//   - never leak an internal error message to the client (CLAUDE.md security rule)
//   - map a null service result to a "not found" client error
//   - invalidate the cache on every successful mutation
//
// The service, auth, cache, and revalidation modules are mocked, so this file runs
// in the default (DB-free) vitest suite with no DATABASE_URL and no Clerk.
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { UtilityAccount } from "@/lib/data/types/utility-account";

// requireCtx() normally calls Clerk auth(); here it returns a fixed synthetic ctx.
vi.mock("@/lib/auth/ctx", () => ({ requireCtx: vi.fn() }));
// The service is the thing under test's collaborator — fully mocked.
vi.mock("@/lib/services/utility-accounts", () => ({
  createUtilityAccount: vi.fn(),
  updateUtilityAccount: vi.fn(),
  deleteUtilityAccount: vi.fn(),
}));
// Cache/revalidation are side effects we assert on, not real Next.js calls.
vi.mock("@/app/actions/_result", () => ({ revalidateFeTag: vi.fn() }));
vi.mock("@/lib/cache/bust", () => ({ bustCache: vi.fn() }));

import { requireCtx } from "@/lib/auth/ctx";
import * as svc from "@/lib/services/utility-accounts";
import { revalidateFeTag } from "@/app/actions/_result";
import { bustCache } from "@/lib/cache/bust";
import {
  createUtilityAccount,
  updateUtilityAccount,
  deleteUtilityAccount,
} from "@/app/actions/utility-accounts";

// A fully-formed domain object for the service mock to return on the happy path.
const sampleAccount: UtilityAccount = {
  id: "UTIL-0001",
  propertyId: "PROP-0001",
  provider: "EDC (Electricité du Cambodge)",
  utilityType: "electricity",
  accountNumber: "EDC-PP-104829",
  meterNumber: "MTR-55021",
  monthlyEstimate: 145,
  notes: "Main building supply",
  createdAt: 1774915200000,
};

// The smallest input that passes NewUtilityAccountSchema (provider + type + propertyId).
const validCreateInput = {
  propertyId: "PROP-0001",
  provider: "EDC (Electricité du Cambodge)",
  utilityType: "electricity",
};

const ctx = { orgId: "ORG-0001", userId: "USR-0001" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireCtx).mockResolvedValue(ctx as never);
  // The actions log the raw error on the catch path; keep the test output clean.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("createUtilityAccount action", () => {
  it("rejects invalid input before authenticating or calling the service", async () => {
    // Missing the required `provider` field.
    const result = await createUtilityAccount({
      propertyId: "PROP-0001",
      utilityType: "electricity",
    });

    expect(result).toEqual({ ok: false, error: "Invalid utility account" });
    // Validation is the first gate: neither auth nor the service should run.
    expect(requireCtx).not.toHaveBeenCalled();
    expect(svc.createUtilityAccount).not.toHaveBeenCalled();
  });

  it("rejects a bad utilityType enum value", async () => {
    const result = await createUtilityAccount({
      propertyId: "PROP-0001",
      provider: "EDC",
      utilityType: "nuclear",
    });

    expect(result).toEqual({ ok: false, error: "Invalid utility account" });
    expect(svc.createUtilityAccount).not.toHaveBeenCalled();
  });

  it("creates the account and invalidates the cache on success", async () => {
    vi.mocked(svc.createUtilityAccount).mockResolvedValue(sampleAccount);

    const result = await createUtilityAccount(validCreateInput);

    expect(result).toEqual({ ok: true, data: sampleAccount });
    // The action passes the ctx and the parsed data through to the service.
    expect(svc.createUtilityAccount).toHaveBeenCalledWith(ctx, validCreateInput);
    // A successful mutation must bust both cache surfaces.
    expect(revalidateFeTag).toHaveBeenCalledWith("utility-accounts");
    expect(bustCache).toHaveBeenCalledWith("utility-accounts");
  });

  it("returns a generic error without leaking the internal message when the service throws", async () => {
    // e.g. the service's IDOR guard rejecting a cross-org property id.
    vi.mocked(svc.createUtilityAccount).mockRejectedValue(
      new Error("property not in org: LEAK-INTERNAL-DETAIL"),
    );

    const result = await createUtilityAccount(validCreateInput);

    expect(result).toEqual({ ok: false, error: "Could not create utility account" });
    // Security: the raw error text must never reach the client.
    expect(JSON.stringify(result)).not.toContain("LEAK-INTERNAL-DETAIL");
    // A failed mutation must not revalidate/bust the cache.
    expect(revalidateFeTag).not.toHaveBeenCalled();
    expect(bustCache).not.toHaveBeenCalled();
  });
});

describe("updateUtilityAccount action", () => {
  it("rejects an invalid patch before calling the service", async () => {
    const result = await updateUtilityAccount("UTIL-0001", { utilityType: "nuclear" });

    expect(result).toEqual({ ok: false, error: "Invalid utility account" });
    expect(svc.updateUtilityAccount).not.toHaveBeenCalled();
  });

  it("maps a null service result to a not-found error", async () => {
    // The service returns null when the row isn't in the caller's org (or is gone).
    vi.mocked(svc.updateUtilityAccount).mockResolvedValue(null);

    const result = await updateUtilityAccount("UTIL-9999", { provider: "New Provider" });

    expect(result).toEqual({ ok: false, error: "Utility account not found" });
    // A no-op update must not bust the cache.
    expect(bustCache).not.toHaveBeenCalled();
  });

  it("updates the account and invalidates the cache on success", async () => {
    vi.mocked(svc.updateUtilityAccount).mockResolvedValue(sampleAccount);

    const result = await updateUtilityAccount("UTIL-0001", { provider: "New Provider" });

    expect(result).toEqual({ ok: true, data: sampleAccount });
    expect(svc.updateUtilityAccount).toHaveBeenCalledWith(ctx, "UTIL-0001", {
      provider: "New Provider",
    });
    expect(revalidateFeTag).toHaveBeenCalledWith("utility-accounts");
    expect(bustCache).toHaveBeenCalledWith("utility-accounts");
  });

  it("returns a generic error without leaking the internal message when the service throws", async () => {
    vi.mocked(svc.updateUtilityAccount).mockRejectedValue(
      new Error("db exploded: LEAK-INTERNAL-DETAIL"),
    );

    const result = await updateUtilityAccount("UTIL-0001", { provider: "New Provider" });

    expect(result).toEqual({ ok: false, error: "Could not update utility account" });
    expect(JSON.stringify(result)).not.toContain("LEAK-INTERNAL-DETAIL");
  });
});

describe("deleteUtilityAccount action", () => {
  it("deletes the account and invalidates the cache on success", async () => {
    vi.mocked(svc.deleteUtilityAccount).mockResolvedValue(undefined);

    const result = await deleteUtilityAccount("UTIL-0001");

    expect(result).toEqual({ ok: true, data: undefined });
    expect(svc.deleteUtilityAccount).toHaveBeenCalledWith(ctx, "UTIL-0001");
    expect(revalidateFeTag).toHaveBeenCalledWith("utility-accounts");
    expect(bustCache).toHaveBeenCalledWith("utility-accounts");
  });

  it("returns a generic error without leaking the internal message when the service throws", async () => {
    vi.mocked(svc.deleteUtilityAccount).mockRejectedValue(
      new Error("fk violation: LEAK-INTERNAL-DETAIL"),
    );

    const result = await deleteUtilityAccount("UTIL-0001");

    expect(result).toEqual({ ok: false, error: "Could not delete utility account" });
    expect(JSON.stringify(result)).not.toContain("LEAK-INTERNAL-DETAIL");
    expect(bustCache).not.toHaveBeenCalled();
  });
});
