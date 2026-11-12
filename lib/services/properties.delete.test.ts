import { expect, it, vi } from "vitest";

// B2.10: deleteProperty must clean up storage for EVERY document, not the first 500.
const DOCS = Array.from({ length: 501 }, (_, i) => ({
  id: `DOC-${i}`, orgId: "ORG-0001", userId: "USR-0001", propertyId: "PROP-0001", name: `f${i}.pdf`,
  kind: "document", storageId: `ORG-0001/DOC-${i}/f.pdf`, thumbStorageId: null, uploadedAt: new Date(0),
}));

const mocks = vi.hoisted(() => ({ deleteStorageObject: vi.fn(async () => true), deleteStorageObjects: vi.fn(async () => {}) }));

vi.mock("@/lib/env", () => ({ env: { DEMO_MODE: false, DEMO_ALLOW_WRITES: false } }));
vi.mock("@/lib/services/storage", () => ({ assertOwnStorageId: () => {}, deleteStorageObject: mocks.deleteStorageObject, deleteStorageObjects: mocks.deleteStorageObjects }));
vi.mock("@/lib/db/client", async () => {
  const { properties } = await import("@/lib/db/schema");
  // A chainable select whose .limit(n) slices, so a capped read is visible as a short result.
  const chain = (rows: unknown[]): unknown => Object.assign(Promise.resolve(rows), {
    where: () => chain(rows), orderBy: () => chain(rows), limit: (n: number) => chain(rows.slice(0, n)),
  });
  return {
    db: {
      select: () => ({ from: (t: unknown) => chain(t === properties ? [{ photoStorageIds: [] }] : DOCS) }),
      delete: () => ({ where: async () => [] }),
    },
  };
});

import { deleteProperty } from "./properties";

// O7: one batched call (storage.ts chunks it into DeleteObjects of 1000), not 501 sequential round trips.
it("deleteProperty cleans up storage for every document, not the first 500, in one batched call", async () => {
  await deleteProperty({ userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" }, "PROP-0001");
  expect(mocks.deleteStorageObject).not.toHaveBeenCalled();
  expect(mocks.deleteStorageObjects).toHaveBeenCalledTimes(1);
  expect(mocks.deleteStorageObjects).toHaveBeenCalledWith(DOCS.map((d) => d.storageId));
});
