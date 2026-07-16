import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, getTableName } from "drizzle-orm";
import type { Ctx } from "@/lib/services/_mapping";
import { db } from "@/lib/db/client";
import { organizations, properties, utilityAccounts } from "@/lib/db/schema";
import {
  UtilityAccountSchema,
  NewUtilityAccountSchema,
  UtilityAccountPatchSchema,
} from "@/lib/data/types/utility-account";
import {
  listUtilityAccounts,
  getUtilityAccount,
  createUtilityAccount,
  updateUtilityAccount,
  deleteUtilityAccount,
} from "@/lib/services/utility-accounts";

// ---------------------------------------------------------------------------
// Explore-stage contract + live-DB integration test for the utility-accounts
// entity scaffold (entity-scaffold pipeline, ticket 2026-07-16-entity-utility-accounts).
//
// It is RED until Execute builds the full scaffold: the Zod type
// (lib/data/types/utility-account.ts), the Drizzle table (schema barrel export),
// and the org-scoped service (lib/services/utility-accounts.ts). The imports
// above fail to resolve today, so every case fails because the scaffold is
// ABSENT — not because the harness is broken. The sibling maintenance-items
// scaffold proves the harness itself works.
//
// Runs under vitest.config.db.ts (`npm run test:db`), which loads .env.local and
// connects to the dev Neon branch. Gated on DATABASE_URL so it skips cleanly
// without one.
// ---------------------------------------------------------------------------

const HAS_DB = !!process.env.DATABASE_URL;

// ctxA is the seeded demo owner (ORG-0001 / USR-0001). Its org row and PROP-0001
// exist in the seed, so inserts satisfy the org_id and property_id FKs.
const ctxA: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" };
// ctxB is a DIFFERENT org used only for cross-org read/update/delete denial. It
// never inserts, so its org row need not exist.
const ctxB: Ctx = { userId: "USR-UTIL-IDOR", orgId: "ORG-UTIL-IDOR", orgRole: "owner" };

// PROP-0001 belongs to ORG-0001 (verified live in Explore) — ctxA's own property.
const PROP_A = "PROP-0001";
// A second ORG-0001 property, used to prove the propertyId list filter excludes
// rows attached to a different property in the same org.
const PROP_A2 = "PROP-0002";

// A property that EXISTS but belongs to a DIFFERENT organization. Seeded here in
// beforeAll (its own org + property row) so the cross-org create/update guard is
// tested against a real, FK-satisfying property — a plain foreign-key check alone
// cannot reject it; only an org-ownership guard in the service can.
const FOREIGN_ORG = "ORG-UTIL-FOREIGN";
const FOREIGN_PROP = "PROP-UTIL-FOREIGN";

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    propertyId: PROP_A,
    provider: "EDC (Electricité du Cambodge)",
    utilityType: "electricity",
    accountNumber: "EDC-PP-104829",
    meterNumber: "MTR-55021",
    monthlyEstimate: 145,
    notes: "Main building supply",
    ...overrides,
  };
}

describe.skipIf(!HAS_DB)("utility-accounts service (live DB)", () => {
  const createdIds: string[] = [];

  beforeAll(async () => {
    // Seed a self-contained foreign org + property so the cross-org guard is tested
    // against a property whose foreign key resolves but whose org differs from ctxA.
    await db
      .insert(organizations)
      .values({ id: FOREIGN_ORG, clerkOrgId: "org_util_foreign_test", name: "Utility Guard Test Org" })
      .onConflictDoNothing();
    await db
      .insert(properties)
      .values({
        id: FOREIGN_PROP,
        orgId: FOREIGN_ORG,
        userId: "USR-UTIL-FOREIGN",
        name: "Foreign Guard Property",
        code: "UTIL-FOREIGN",
        type: "residential",
        status: "Vacant",
        lat: 11.5564,
        lng: 104.9282,
        buyNumeric: "0",
        totalArea: "0",
        title: "Hard title",
      })
      .onConflictDoNothing();
  });

  afterAll(async () => {
    for (const id of createdIds) {
      await deleteUtilityAccount(ctxA, id).catch(() => {});
    }
    // Tear down the foreign fixture (property first — utility rows on it cascade).
    await db.delete(properties).where(eq(properties.id, FOREIGN_PROP)).catch(() => {});
    await db.delete(organizations).where(eq(organizations.id, FOREIGN_ORG)).catch(() => {});
  });

  // ── Zod create validation ──────────────────────────────────────────────────
  it("NewUtilityAccountSchema accepts a complete valid record", () => {
    expect(NewUtilityAccountSchema.safeParse(validInput()).success).toBe(true);
  });

  it("NewUtilityAccountSchema accepts a minimal record (all optionals omitted)", () => {
    const minimal = { propertyId: PROP_A, provider: "Metfone", utilityType: "internet" };
    expect(NewUtilityAccountSchema.safeParse(minimal).success).toBe(true);
  });

  it("NewUtilityAccountSchema rejects a missing required provider", () => {
    const { provider: _drop, ...rest } = validInput();
    void _drop;
    expect(NewUtilityAccountSchema.safeParse(rest).success).toBe(false);
  });

  it("NewUtilityAccountSchema rejects a missing required utilityType", () => {
    const { utilityType: _drop, ...rest } = validInput();
    void _drop;
    expect(NewUtilityAccountSchema.safeParse(rest).success).toBe(false);
  });

  it("NewUtilityAccountSchema rejects a utilityType outside the enum", () => {
    expect(NewUtilityAccountSchema.safeParse(validInput({ utilityType: "solar" })).success).toBe(false);
  });

  // ── Zod patch validation ───────────────────────────────────────────────────
  it("UtilityAccountPatchSchema accepts a partial patch and an empty patch", () => {
    expect(UtilityAccountPatchSchema.safeParse({ notes: "Meter swapped" }).success).toBe(true);
    expect(UtilityAccountPatchSchema.safeParse({}).success).toBe(true);
  });

  it("UtilityAccountPatchSchema rejects an invalid enum in a patch", () => {
    expect(UtilityAccountPatchSchema.safeParse({ utilityType: "coal" }).success).toBe(false);
  });

  // ── Schema + service availability ──────────────────────────────────────────
  it("exposes the utility_accounts Drizzle table and the CRUD service functions", () => {
    expect(getTableName(utilityAccounts)).toBe("utility_accounts");
    expect(typeof listUtilityAccounts).toBe("function");
    expect(typeof getUtilityAccount).toBe("function");
    expect(typeof createUtilityAccount).toBe("function");
    expect(typeof updateUtilityAccount).toBe("function");
    expect(typeof deleteUtilityAccount).toBe("function");
  });

  // ── Live create → get round-trip (incl. numeric domain conversion) ─────────
  it("create → get round-trips through Drizzle and converts numeric to number", async () => {
    const created = await createUtilityAccount(ctxA, validInput());
    createdIds.push(created.id);

    expect(created.id).toMatch(/^UTIL-\d{4}$/);
    // The row is a valid domain object per the entity's own Zod contract.
    expect(UtilityAccountSchema.safeParse(created).success).toBe(true);

    const got = await getUtilityAccount(ctxA, created.id);
    expect(got).not.toBeNull();
    expect(got?.propertyId).toBe(PROP_A);
    expect(got?.provider).toBe("EDC (Electricité du Cambodge)");
    expect(got?.utilityType).toBe("electricity");
    expect(got?.accountNumber).toBe("EDC-PP-104829");
    expect(got?.meterNumber).toBe("MTR-55021");
    // numeric column must surface as a JS number, not a string.
    expect(typeof got?.monthlyEstimate).toBe("number");
    expect(got?.monthlyEstimate).toBe(145);
    expect(got?.notes).toBe("Main building supply");
  });

  it("create accepts a record that omits every optional field", async () => {
    const created = await createUtilityAccount(ctxA, {
      propertyId: PROP_A,
      provider: "Metfone",
      utilityType: "internet",
    });
    createdIds.push(created.id);

    const got = await getUtilityAccount(ctxA, created.id);
    expect(got?.provider).toBe("Metfone");
    expect(got?.utilityType).toBe("internet");
  });

  // ── Property filtering ─────────────────────────────────────────────────────
  it("list filters by propertyId within the org", async () => {
    const created = await createUtilityAccount(ctxA, validInput());
    createdIds.push(created.id);

    const onPropA = await listUtilityAccounts(ctxA, PROP_A);
    expect(onPropA.map((u) => u.id)).toContain(created.id);

    const onPropA2 = await listUtilityAccounts(ctxA, PROP_A2);
    expect(onPropA2.map((u) => u.id)).not.toContain(created.id);
  });

  // ── Live update ────────────────────────────────────────────────────────────
  it("update mutates the row and echoes the new values", async () => {
    const created = await createUtilityAccount(ctxA, validInput());
    createdIds.push(created.id);

    const updated = await updateUtilityAccount(ctxA, created.id, {
      monthlyEstimate: 162.5,
      notes: "Rate revised for dry season",
    });
    expect(updated).not.toBeNull();
    expect(updated?.monthlyEstimate).toBe(162.5);
    expect(updated?.notes).toBe("Rate revised for dry season");
  });

  // ── Live delete ────────────────────────────────────────────────────────────
  it("delete removes the row", async () => {
    const created = await createUtilityAccount(ctxA, validInput());
    await deleteUtilityAccount(ctxA, created.id);
    expect(await getUtilityAccount(ctxA, created.id)).toBeNull();
    // not tracked in createdIds — it's already gone.
  });

  // ── Cross-org read / list / update / delete denial ─────────────────────────
  it("a second org's ctx cannot read, list, update, or delete another org's row", async () => {
    const created = await createUtilityAccount(ctxA, validInput({ notes: "do-not-leak" }));
    createdIds.push(created.id);

    // B cannot READ or LIST A's row.
    expect(await getUtilityAccount(ctxB, created.id)).toBeNull();
    expect((await listUtilityAccounts(ctxB)).map((u) => u.id)).not.toContain(created.id);
    expect((await listUtilityAccounts(ctxB, PROP_A)).map((u) => u.id)).not.toContain(created.id);

    // B cannot UPDATE A's row (scoped no-op → null).
    expect(await updateUtilityAccount(ctxB, created.id, { notes: "hijacked" })).toBeNull();

    // B cannot DELETE A's row (scoped no-op → must not throw, must not remove).
    await deleteUtilityAccount(ctxB, created.id);

    // A's row is untouched.
    const stillThere = await getUtilityAccount(ctxA, created.id);
    expect(stillThere).not.toBeNull();
    expect(stillThere?.notes).toBe("do-not-leak");
  });

  // ── Cross-org propertyId rejection on CREATE ───────────────────────────────
  it("create rejects a propertyId owned by another organization", async () => {
    // FOREIGN_PROP exists (FK resolves) but belongs to FOREIGN_ORG, not ctxA's org.
    // Only an org-ownership guard in the service can reject this.
    await expect(
      createUtilityAccount(ctxA, validInput({ propertyId: FOREIGN_PROP })),
    ).rejects.toThrow();

    // Confirm nothing leaked into the foreign property.
    const rows = await db
      .select({ id: utilityAccounts.id })
      .from(utilityAccounts)
      .where(and(eq(utilityAccounts.orgId, ctxA.orgId), eq(utilityAccounts.propertyId, FOREIGN_PROP)));
    expect(rows).toHaveLength(0);
  });

  // ── Cross-org propertyId rejection on UPDATE ───────────────────────────────
  it("update rejects re-pointing a row to a propertyId owned by another organization", async () => {
    const created = await createUtilityAccount(ctxA, validInput());
    createdIds.push(created.id);

    await expect(
      updateUtilityAccount(ctxA, created.id, { propertyId: FOREIGN_PROP }),
    ).rejects.toThrow();

    // The row still points at its original, org-owned property.
    const got = await getUtilityAccount(ctxA, created.id);
    expect(got?.propertyId).toBe(PROP_A);
  });
});
