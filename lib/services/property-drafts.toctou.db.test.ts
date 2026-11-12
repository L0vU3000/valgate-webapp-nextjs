import { afterAll, describe, expect, it, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
import type { Ctx } from "@/lib/services/_mapping";
import { db } from "@/lib/db/client";
import { properties } from "@/lib/db/schema";
import { createThrowawayProperty, cleanup } from "../../e2e/helpers/db";

// O6: the photo merge must read the property inside the conversion tx under a row lock. Otherwise a
// gallery write that lands between the read and the patch is overwritten by the stale merge result.
//
// The concurrent write is fired from the update hook (both the old and new code call update after
// the read). It is an atomic array_append on its own pool connection, so it never computes from a
// stale read itself. Unlocked: it commits at once and the patch then erases it (red). Locked: it
// blocks on FOR UPDATE until the tx commits, then appends (green). Two pool connections are warmed
// first (a cold Neon connect can take over a second), and the hook waits up to 3 s, so the unlocked
// write has surely landed; the locked one cannot deadlock because the hook never waits forever.
const HAS_DB = !!process.env.DATABASE_URL;
const ctxA: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" };

const hook = vi.hoisted(() => ({ before: null as null | (() => Promise<void>) }));
vi.mock("@/lib/services/properties", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/properties")>();
  const wrap = <A extends unknown[], R>(fn: (...a: A) => Promise<R>) => async (...a: A) => {
    if (hook.before) await hook.before();
    return fn(...a);
  };
  return { ...actual, updateProperty: wrap(actual.updateProperty), updatePropertyForOrg: wrap(actual.updatePropertyForOrg) };
});

const { createPropertyDraft, stageDraftFile, deletePropertyDraft, convertDraftToDocuments, convertDraftToDocumentsForOrg } =
  await import("@/lib/services/property-drafts");

describe.skipIf(!HAS_DB)("draft conversion photo merge (live DB) — O6", () => {
  const drafts: string[] = [];
  afterAll(async () => {
    for (const id of drafts) await deletePropertyDraft(ctxA, id).catch(() => {});
  });

  for (const variant of ["single-org", "for-org"] as const) {
    it(`O6 (${variant}): a gallery write that lands mid-conversion survives the photo merge`, async () => {
      const { propertyId } = await createThrowawayProperty();
      const stamp = `${variant}-${Date.now()}`;
      const draftPhoto = `ORG-0001/DOC-o6-draft-${stamp}/front.jpg`;
      const galleryPhoto = `ORG-0001/DOC-o6-gallery-${stamp}/side.jpg`;
      let concurrent: Promise<void> | null = null;
      try {
        await db.update(properties).set({ photoStorageIds: [] }).where(eq(properties.id, propertyId));
        const draft = await createPropertyDraft(ctxA, { title: `O6 ${variant}`, step: 4, form: {} });
        drafts.push(draft.id);
        await stageDraftFile(ctxA, draft.id, { kind: "photo", name: "front.jpg", mimeType: "image/jpeg", sizeBytes: 10, storageId: draftPhoto });

        await Promise.all([db.execute(sql`select pg_sleep(0.2)`), db.execute(sql`select pg_sleep(0.2)`)]);
        hook.before = async () => {
          hook.before = null;
          concurrent = db.execute(sql`UPDATE properties SET photo_storage_ids = array_append(coalesce(photo_storage_ids, '{}'), ${galleryPhoto}) WHERE id = ${propertyId}`)
            .then(() => undefined); // drizzle queries are lazy thenables that re-run per .then: pin ONE execution
          await Promise.race([concurrent, new Promise((r) => setTimeout(r, 3000))]);
        };
        if (variant === "single-org") await convertDraftToDocuments(ctxA, draft.id, propertyId);
        else await convertDraftToDocumentsForOrg(ctxA, draft.id, propertyId, ctxA.orgId);
        await concurrent;

        const [prop] = await db.select({ photos: properties.photoStorageIds }).from(properties).where(eq(properties.id, propertyId));
        expect(prop?.photos).toEqual(expect.arrayContaining([draftPhoto, galleryPhoto]));
      } finally {
        hook.before = null;
        await cleanup(propertyId);
      }
    }, 20_000); // the locked path waits out the hook's 3 s window by design
  }
});
