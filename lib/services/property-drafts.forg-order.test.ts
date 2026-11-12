import { expect, it, vi } from "vitest";

// O8: in the cross-org conversion the admin check must be the tx's FIRST statement. Before it, a
// non-admin took FOR UPDATE on the foreign org's property row, held it, then got rejected.
const txFrom: unknown[] = [];

vi.mock("@/lib/env", () => ({ env: { DEMO_MODE: false, DEMO_ALLOW_WRITES: false } }));
vi.mock("@/lib/services/_mapping", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/services/_mapping")>(),
  nextId: async () => "DOC-0001",
}));
vi.mock("@/lib/db/client", () => {
  const rows = (r: unknown[]): unknown => Object.assign(Promise.resolve(r), {
    where: () => rows(r), orderBy: () => rows(r), limit: () => rows(r), for: () => rows(r),
  });
  // Outside the tx: listDraftFiles returns one staged photo.
  const file = {
    id: "DRFF-0001", orgId: "ORG-0001", userId: "USR-0001", draftId: "DRFT-0001", kind: "photo",
    name: "p.jpg", mimeType: null, sizeBytes: null, storageId: "ORG-0001/DOC-0009/p.jpg", createdAt: new Date(0),
  };
  // Inside the tx: record each table read; nothing is found (no property, no membership).
  const tx = { select: () => ({ from: (t: unknown) => { txFrom.push(t); return rows([]); } }) };
  return {
    db: {
      select: () => ({ from: () => rows([file]) }),
      transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
    },
  };
});

import { organizationMemberships } from "@/lib/db/schema";
import { MutationDeniedError } from "@/lib/services/_mapping";
import { convertDraftToDocumentsForOrg } from "./property-drafts";

it("a non-admin is rejected before the conversion tx touches the foreign property", async () => {
  // Owner of their own org (assertCanMutate passes), but no membership in ORG-0002.
  const ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" as const };
  await expect(convertDraftToDocumentsForOrg(ctx, "DRFT-0001", "PROP-0001", "ORG-0002"))
    .rejects.toBeInstanceOf(MutationDeniedError);
  expect(txFrom).toEqual([organizationMemberships]);
});
