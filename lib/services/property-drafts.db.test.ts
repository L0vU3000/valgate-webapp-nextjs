import { afterAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import type { Ctx } from "@/lib/services/_mapping";
import { db } from "@/lib/db/client";
import { propertyDrafts } from "@/lib/db/schema";
import {
  listPropertyDrafts,
  getPropertyDraft,
  createPropertyDraft,
  updatePropertyDraft,
  deletePropertyDraft,
  stageDraftFile,
  listDraftFiles,
  getDraftFile,
  removeDraftFile,
  sweepExpiredDrafts,
} from "@/lib/services/property-drafts";

// ---------------------------------------------------------------------------
// Live-DB integration tests for the property-draft service.
//
// These run against the real dev/preview Neon branch (see vitest.config.db.ts). They
// prove the two things pure-logic tests can't: that the SQL WHERE clauses actually
// enforce (org_id, user_id) tenancy (no IDOR), and that the full create→get→update→
// delete lifecycle round-trips through Drizzle + the column classifier.
//
// Gated on DATABASE_URL so the suite skips cleanly when the env isn't present.
// ---------------------------------------------------------------------------

const HAS_DB = !!process.env.DATABASE_URL;

// ctxA is the seeded demo owner (ORG-0001 / USR-0001) — its org row exists, so inserts
// satisfy the org_id FK. ctxB is a DIFFERENT org + user used only for IDOR read/delete
// attempts (it never inserts, so its org doesn't need to exist in the DB).
const ctxA: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" };
const ctxB: Ctx = { userId: "USR-IDOR-TEST", orgId: "ORG-IDOR-TEST", orgRole: "owner" };

describe.skipIf(!HAS_DB)("property-drafts service (live DB)", () => {
  // Track every draft we create so we can delete them afterwards and not pollute the dev DB.
  const createdDraftIds: string[] = [];

  afterAll(async () => {
    for (const id of createdDraftIds) {
      // Best-effort cleanup; deleting a draft cascades its files. Ignore "already gone".
      await deletePropertyDraft(ctxA, id).catch(() => {});
    }
  });

  // A unique-ish fake S3 key for staged-file rows. We never upload bytes in tests; S3
  // DeleteObject is idempotent on a missing key, so remove/delete still succeed.
  function fakeStorageId(label: string): string {
    return `ORG-0001/DOC-test-${label}-${Date.now()}/file`;
  }

  it("create → get round-trips the draft through Drizzle", async () => {
    const draft = await createPropertyDraft(ctxA, {
      title: "Round-trip Test",
      step: 2,
      form: { propertyName: "Round-trip Test", bedrooms: "3", nested: { a: 1 } },
    });
    createdDraftIds.push(draft.id);

    expect(draft.id).toMatch(/^DRFT-\d{4}$/);

    const got = await getPropertyDraft(ctxA, draft.id);
    expect(got).not.toBeNull();
    expect(got?.title).toBe("Round-trip Test");
    expect(got?.step).toBe(2);
    expect(got?.form.bedrooms).toBe("3");
    expect((got?.form.nested as { a: number }).a).toBe(1);
    expect(typeof got?.updatedAt).toBe("number");
  });

  it("update mutates fields and bumps updatedAt", async () => {
    const draft = await createPropertyDraft(ctxA, { title: "Before", step: 1, form: {} });
    createdDraftIds.push(draft.id);

    const updated = await updatePropertyDraft(ctxA, draft.id, {
      title: "After",
      step: 3,
      form: { propertyName: "After", changed: true },
    });
    expect(updated).not.toBeNull();
    expect(updated?.title).toBe("After");
    expect(updated?.step).toBe(3);
    expect(updated?.form.changed).toBe(true);
    expect(updated!.updatedAt).toBeGreaterThanOrEqual(draft.updatedAt);
  });

  it("stage → list → remove a draft file", async () => {
    const draft = await createPropertyDraft(ctxA, { title: "With Files", step: 4, form: {} });
    createdDraftIds.push(draft.id);

    const file = await stageDraftFile(ctxA, draft.id, {
      kind: "document",
      name: "title-deed.pdf",
      mimeType: "application/pdf",
      sizeBytes: 2048,
      storageId: fakeStorageId("stage"),
    });
    expect(file.id).toMatch(/^DRFF-\d{4}$/);
    expect(file.draftId).toBe(draft.id);

    const listed = await listDraftFiles(ctxA, draft.id);
    expect(listed.map((f) => f.id)).toContain(file.id);

    const removed = await removeDraftFile(ctxA, file.id);
    expect(removed).toBe(true);
    expect(await listDraftFiles(ctxA, draft.id)).toHaveLength(0);
  });

  it("delete removes the draft and cascades its files", async () => {
    const draft = await createPropertyDraft(ctxA, { title: "To Delete", step: 0, form: {} });
    const file = await stageDraftFile(ctxA, draft.id, {
      kind: "photo",
      name: "exterior.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 512,
      storageId: fakeStorageId("cascade"),
    });

    await deletePropertyDraft(ctxA, draft.id);

    expect(await getPropertyDraft(ctxA, draft.id)).toBeNull();
    expect(await getDraftFile(ctxA, file.id)).toBeNull(); // cascade-removed
    // not tracked in createdDraftIds — it's already gone.
  });

  it("IDOR: a second org's ctx cannot read, stage into, or delete another's draft/file", async () => {
    const draft = await createPropertyDraft(ctxA, {
      title: "Private Draft",
      step: 2,
      form: { secret: "do-not-leak" },
    });
    createdDraftIds.push(draft.id);
    const file = await stageDraftFile(ctxA, draft.id, {
      kind: "photo",
      name: "private.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 64,
      storageId: fakeStorageId("idor"),
    });

    // --- B cannot READ A's draft or file ---
    expect(await getPropertyDraft(ctxB, draft.id)).toBeNull();
    expect((await listPropertyDrafts(ctxB)).map((d) => d.id)).not.toContain(draft.id);
    expect(await getDraftFile(ctxB, file.id)).toBeNull();
    expect(await listDraftFiles(ctxB, draft.id)).toHaveLength(0);

    // --- B cannot STAGE a file into A's draft (would throw "draft not found") ---
    await expect(
      stageDraftFile(ctxB, draft.id, {
        kind: "photo",
        name: "evil.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1,
        storageId: fakeStorageId("evil"),
      }),
    ).rejects.toThrow();

    // --- B cannot DELETE A's file or draft (scoped no-ops) ---
    expect(await removeDraftFile(ctxB, file.id)).toBe(false);
    await deletePropertyDraft(ctxB, draft.id); // scoped to B → deletes nothing, must not throw

    // --- A's draft + file are untouched ---
    expect(await getPropertyDraft(ctxA, draft.id)).not.toBeNull();
    expect(await getDraftFile(ctxA, file.id)).not.toBeNull();
  });

  it("sweepExpiredDrafts removes drafts older than the cutoff and keeps recent ones", async () => {
    // One draft we'll backdate past the 30-day TTL, one that stays fresh.
    const oldDraft = await createPropertyDraft(ctxA, { title: "Stale", step: 0, form: {} });
    const recentDraft = await createPropertyDraft(ctxA, { title: "Fresh", step: 0, form: {} });
    createdDraftIds.push(oldDraft.id, recentDraft.id); // afterAll cleanup is a no-op if already swept

    // Give the old draft a staged file so the sweep exercises its S3-delete path. In dev the bucket
    // lacks s3:DeleteObject (403), so this delete fails and is COUNTED — the row still goes away.
    await stageDraftFile(ctxA, oldDraft.id, {
      kind: "document",
      name: "stale.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1,
      storageId: fakeStorageId("sweep"),
    });

    // Backdate updated_at to 40 days ago using the DB clock — the same clock the sweep's cutoff uses.
    await db.update(propertyDrafts)
      .set({ updatedAt: sql`now() - make_interval(days => 40)` })
      .where(eq(propertyDrafts.id, oldDraft.id));

    const result = await sweepExpiredDrafts(30);
    // At least our backdated draft was removed (the dev DB may hold other stale drafts too).
    expect(result.draftsDeleted).toBeGreaterThanOrEqual(1);

    expect(await getPropertyDraft(ctxA, oldDraft.id)).toBeNull();        // swept
    expect(await getPropertyDraft(ctxA, recentDraft.id)).not.toBeNull(); // survived
  });
});
