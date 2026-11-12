import { beforeEach, expect, it, vi } from "vitest";

// O10: a document that fails DocumentSchema must be rejected BEFORE the insert. Parsed after the
// insert, the row is already committed when the parse throws, and the caller's cleanup then deletes
// the bytes that committed row points at.
const mocks = vi.hoisted(() => ({ insert: vi.fn() }));

vi.mock("@/lib/env", () => ({ env: { DEMO_MODE: false, DEMO_ALLOW_WRITES: false } }));
vi.mock("@/lib/services/_mapping", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/services/_mapping")>(),
  nextId: async () => "DOC-0001",
}));
vi.mock("@/lib/db/client", () => {
  // One row answers both the property-scope check and assertOrgAdmin's membership read.
  const chain = (): unknown => Object.assign(Promise.resolve([{ id: "PROP-0001", role: "owner" }]), {
    from: chain, where: chain, limit: chain,
  });
  return { db: { select: chain, insert: mocks.insert } };
});

import { createDocument, createDocumentForOrg } from "./documents";

const ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" as const };
const bad = (orgId: string) => ({
  propertyId: "PROP-0001", name: "f.pdf", kind: "document" as const,
  storageId: `${orgId}/DOC-0001/f.pdf`, uploadedAt: 0, sizeBytes: -1,
});

beforeEach(() => {
  mocks.insert.mockReset();
  // The insert "commits" and echoes the bad row back, so a parse-after-insert throws only now.
  mocks.insert.mockImplementation(() => ({
    values: (v: Record<string, unknown>) => ({ returning: async () => [{ ...v, uploadedAt: new Date(0) }] }),
  }));
});

it("createDocument rejects an invalid document without inserting a row", async () => {
  await expect(createDocument(ctx, bad("ORG-0001"))).rejects.toThrow();
  expect(mocks.insert).not.toHaveBeenCalled();
});

it("createDocumentForOrg rejects an invalid document without inserting a row", async () => {
  await expect(createDocumentForOrg(ctx, "ORG-0002", bad("ORG-0002"))).rejects.toThrow();
  expect(mocks.insert).not.toHaveBeenCalled();
});

it("a valid document with null optionals still inserts (nulls read back as absent)", async () => {
  const doc = await createDocument(ctx, { ...bad("ORG-0001"), sizeBytes: 10, mimeType: null } as never);
  expect(mocks.insert).toHaveBeenCalledTimes(1);
  expect(doc.sizeBytes).toBe(10);
});
