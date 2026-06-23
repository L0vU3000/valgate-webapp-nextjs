// IDOR / org-scoping tests — proves that ctx.orgId is the only access gate.
//
// A caller holding a valid session in ORG-B (even as 'owner') must NEVER be able
// to read, update, or delete rows owned by ORG-A.  The WHERE clause
//   AND(eq(table.orgId, ctx.orgId), eq(table.id, rowId))
// in every scoped* function IS the IDOR defense.  These tests confirm it holds.
//
// Strategy:
//   ORG-A = ORG-0001  (the seeded demo org; createThrowawayProperty writes here)
//   ORG-B = ORG-PHANTOM  (does not exist; we never INSERT under this org, only probe)
//   orgBCtx.orgRole = 'owner'  so the role check always passes — only the orgId filter
//   is being exercised.  Any cross-org leak would mean the orgId check is broken.
//
// Runs against the DEV Neon branch.  Never touches prod.  Never seed:reset.

import { describe, it, expect, beforeAll, afterAll } from "vitest";

// ── Module mocks (hoisted before all imports) ─────────────────────────────────

// Disable DEMO_MODE so assertCanMutate() passes for mutation calls.
// DATABASE_URL is read from process.env — populated by test/setup/env.ts (setupFiles)
// which runs before this module is loaded, so the value is always present here.
vi.mock("@/lib/env", () => ({
  env: {
    DEMO_MODE: false,
    DEMO_ALLOW_WRITES: false,
    DATABASE_URL: process.env.DATABASE_URL ?? "",
    // Other env fields the services reference; keep these inert for tests.
    CLERK_SECRET_KEY: "sk_test_placeholder",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_placeholder",
  },
}));

// ── Imports ───────────────────────────────────────────────────────────────────

// e2e/helpers/db.ts loads .env.local via dotenv on import and exposes a raw pg Pool.
// We use it for seeding throwaway rows and for direct row-existence checks that do NOT
// go through the service layer (so the assertions are independent of what we're testing).
import {
  createThrowawayProperty,
  cleanup,
  rowExists,
} from "../../e2e/helpers/db";

// Service functions under test — these use the real Drizzle client and the real DB.
import { getProperty } from "@/lib/services/properties";
import { getDocument, listDocuments } from "@/lib/services/documents";
import { listProfessionals } from "@/lib/services/professionals";
import { scopedDelete, scopedUpdate } from "@/lib/services/_crud";
import { properties } from "@/lib/db/schema";
import type { Ctx } from "@/lib/services/_mapping";

// ── Synthetic Ctx objects ─────────────────────────────────────────────────────

// ORG-A ctx — used only to confirm the ORG-A row still exists after a cross-org attempt.
const orgAOwnerCtx: Ctx = {
  userId: "USR-0001",
  orgId: "ORG-0001",
  orgRole: "owner",
};

// ORG-B ctx — the attacker.  orgRole is 'owner' so role checks always pass;
// only the orgId filter is being exercised in each test.
const orgBOwnerCtx: Ctx = {
  userId: "USR-TEST",
  orgId: "ORG-PHANTOM",
  orgRole: "owner",
};

// ── Shared test state ─────────────────────────────────────────────────────────
// Seeded once in beforeAll, cleaned up in afterAll.

let propId = "";
let docId  = "";

beforeAll(async () => {
  // Clone PROP-0001 into a fresh throwaway row under ORG-0001 (= ORG-A).
  // withDocument seeds one document row so we can test document IDOR too.
  const ids = await createThrowawayProperty({ withDocument: true });
  propId = ids.propertyId;
  docId  = ids.documentId ?? "";

  if (!docId) {
    throw new Error("createThrowawayProperty did not return a documentId — check withDocument: true");
  }
});

afterAll(async () => {
  // Delete the throwaway property.  ON DELETE CASCADE removes the seeded document too.
  // Leaves the DB exactly as it was before this test file ran.
  await cleanup(propId);
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Cross-org READ — property
// ─────────────────────────────────────────────────────────────────────────────

describe("property IDOR — ORG-B cannot read ORG-A rows", () => {
  it("getProperty returns null when ctx.orgId does not match the row's org_id", async () => {
    // Defense: getProperty WHERE clause is eq(properties.orgId, ctx.orgId).
    // orgId='ORG-PHANTOM' matches nothing owned by ORG-0001, so the row is invisible.
    const result = await getProperty(orgBOwnerCtx, propId);
    expect(result).toBeNull();
  });

  it("ORG-A can still read its own property (confirms the row exists and scoping works both ways)", async () => {
    // Sanity: the same row IS visible to the correct org.
    // If this fails, the test setup is broken, not the security boundary.
    const result = await getProperty(orgAOwnerCtx, propId);
    expect(result).not.toBeNull();
    expect(result?.id).toBe(propId);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Cross-org UPDATE — property
// ─────────────────────────────────────────────────────────────────────────────

describe("property IDOR — ORG-B cannot update ORG-A rows", () => {
  it("scopedUpdate returns null (0 rows matched) for a cross-org ctx", async () => {
    // Defense: scopedUpdate WHERE clause is AND(eq(orgId, 'ORG-PHANTOM'), eq(id, propId)).
    // No row matches both conditions, so the UPDATE RETURNING returns [] → null.
    const result = await scopedUpdate(
      orgBOwnerCtx,
      properties,
      propId,
      { name: "hacked-by-org-b" },
      (row) => row,  // identity — never called because no rows are returned
    );
    expect(result).toBeNull();
  });

  it("ORG-A property still exists after the cross-org update attempt", async () => {
    // The cross-org update was a no-op.  Direct DB check (bypasses orgId scoping)
    // confirms the row was not silently deleted or corrupted.
    const exists = await rowExists("properties", propId);
    expect(exists).toBe(true);
  });

  it("ORG-A property name was NOT changed by the cross-org update attempt", async () => {
    // Re-read through the ORG-A ctx.  The name must not be 'hacked-by-org-b'.
    const prop = await getProperty(orgAOwnerCtx, propId);
    expect(prop).not.toBeNull();
    expect(prop?.name).not.toBe("hacked-by-org-b");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Cross-org DELETE — property
// ─────────────────────────────────────────────────────────────────────────────

describe("property IDOR — ORG-B cannot delete ORG-A rows", () => {
  it("scopedDelete does not throw for a cross-org ctx (WHERE matches 0 rows — silent no-op)", async () => {
    // Defense: scopedDelete WHERE clause is AND(eq(orgId, 'ORG-PHANTOM'), eq(id, propId)).
    // The DELETE statement finds 0 rows and succeeds silently.
    // The row surviving is proven in the next test.
    await expect(
      scopedDelete(orgBOwnerCtx, properties, propId)
    ).resolves.toBeUndefined();
  });

  it("ORG-A property still exists after the cross-org delete attempt", async () => {
    // The cross-org delete was a no-op.  Direct DB check confirms the row survived.
    const exists = await rowExists("properties", propId);
    expect(exists).toBe(true);
  });

  it("ORG-A can still read its own property after the cross-org delete attempt", async () => {
    // Confirms the row is not just present in the DB but also correctly returned
    // through the org-scoped service function.
    const prop = await getProperty(orgAOwnerCtx, propId);
    expect(prop).not.toBeNull();
    expect(prop?.id).toBe(propId);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Cross-org READ — documents
// ─────────────────────────────────────────────────────────────────────────────

describe("document IDOR — ORG-B cannot read ORG-A documents", () => {
  it("getDocument returns null when ctx.orgId does not match the document's org_id", async () => {
    // Defense: getDocument WHERE clause is AND(eq(documents.orgId, ctx.orgId), eq(documents.id, id)).
    // orgId='ORG-PHANTOM' does not own docId, so the row is invisible.
    const result = await getDocument(orgBOwnerCtx, docId);
    expect(result).toBeNull();
  });

  it("listDocuments returns an empty array for a ctx whose orgId owns no documents", async () => {
    // Defense: listDocuments WHERE clause is eq(documents.orgId, ctx.orgId).
    // 'ORG-PHANTOM' has no documents, so the list is always empty regardless of what ORG-A owns.
    const result = await listDocuments(orgBOwnerCtx);
    expect(result).toHaveLength(0);
  });

  it("ORG-A can still read its own document (confirms docId exists and scoping works both ways)", async () => {
    // Sanity: the seeded document IS visible to the correct org.
    const result = await getDocument(orgAOwnerCtx, docId);
    expect(result).not.toBeNull();
    expect(result?.id).toBe(docId);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Cross-org READ — professionals / clients
// ─────────────────────────────────────────────────────────────────────────────
// Proves that the same ctx.orgId filter exists on the professionals table.
// No seeding needed — 'ORG-PHANTOM' owns zero professionals, so an empty list
// is the correct (and proof-positive) result regardless of what ORG-A holds.

describe("professional/client IDOR — ORG-B cannot read ORG-A professionals", () => {
  it("listProfessionals returns an empty array for a ctx whose orgId owns no professionals", async () => {
    // Defense: listProfessionals WHERE clause is eq(professionals.orgId, ctx.orgId).
    // 'ORG-PHANTOM' owns nothing, so the list is empty — no ORG-0001 professionals leak through.
    const result = await listProfessionals(orgBOwnerCtx);
    expect(result).toHaveLength(0);
  });
});
