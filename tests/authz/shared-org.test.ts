import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import seedCore from "@/public/data/users/demo-user/properties/PROP-0001/core.json";

import seedFinance from "@/public/data/users/demo-user/properties/PROP-0001/finance.json";
import seedMedia from "@/public/data/users/demo-user/properties/PROP-0001/media.json";
import { PropertySchema } from "@/lib/data/types/property";
const seedProperty = PropertySchema.parse({ ...seedCore, ...seedFinance, ...seedMedia, userId: "USR-0001", orgId: "ORG-0001" });

const mocks = vi.hoisted(() => ({
  rows: [] as unknown[][],
  predicates: [] as SQL[],
  insert: vi.fn(), update: vi.fn(), delete: vi.fn(), execute: vi.fn(), transaction: vi.fn(),
}));
vi.mock("@/lib/env", () => ({ env: { DEMO_MODE: false, DEMO_ALLOW_WRITES: false } }));
vi.mock("@/lib/db/client", () => ({ db: {
  select: () => {
    const rows = mocks.rows.shift() ?? [];
    const query = {
      from: () => query, innerJoin: () => query, orderBy: () => query,
      where: (predicate: SQL) => { mocks.predicates.push(predicate); return query; },
      limit: async () => rows,
      then: (resolve: (rows: unknown[]) => unknown) => Promise.resolve(rows).then(resolve),
    };
    return query;
  },
  insert: mocks.insert, update: mocks.update, delete: mocks.delete,
  execute: mocks.execute, transaction: mocks.transaction,
} }));
vi.mock("@/lib/services/client-onboarding", () => ({ insertAccessNotification: vi.fn() }));

import { assertCanMutate, MutationDeniedError, type Ctx } from "@/lib/services/_mapping";
import { scopedInsert, scopedUpdate, scopedDelete, assertOrgAdmin } from "@/lib/services/_crud";
import { properties } from "@/lib/db/schema";
import { createProperty, getProperty, updateProperty, deleteProperty } from "@/lib/services/properties";
import { deleteFolder } from "@/lib/services/folders";
import { upsertUserProfile } from "@/lib/services/user-profiles";
import { updatePropertyDraft } from "@/lib/services/property-drafts";
import { presignUpload } from "@/lib/services/storage";
import { revokeVerification } from "@/lib/services/verification";
import { createChangeRequest, approveChangeRequest, rejectChangeRequest, recordAndApplyManagerChange } from "@/lib/services/change-requests";

const owner: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" };
const proposal = { ownerOrgId: owner.orgId, entityType: "property", entityId: seedProperty.id,
  operation: "update" as const, proposedPatch: { name: "Owner approval required" } };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rows.length = 0;
  mocks.predicates.length = 0;
});

describe.each(["viewer", "member", "admin"] as const)("shared organization: %s", orgRole => {
  const ctx: Ctx = { ...owner, userId: "USR-HOUSEHOLD", orgRole };

  it("rejects shared CRUD and composite writes before side effects with a typed read-only error", async () => {
    const attempts = [
      () => scopedInsert(ctx, properties, "PROP", seedProperty, row => row),
      () => scopedUpdate(ctx, properties, seedProperty.id, { name: "changed" }, row => row),
      () => scopedDelete(ctx, properties, seedProperty.id),
      () => createProperty(ctx, seedProperty),
      () => updateProperty(ctx, seedProperty.id, { name: "changed" }),
      () => deleteProperty(ctx, seedProperty.id),
      () => deleteFolder(ctx, "FLDR-0001"),
      () => upsertUserProfile(ctx, { firstName: "Changed" }),
      () => updatePropertyDraft(ctx, "DRFT-0001", { title: "Changed" }),
      () => presignUpload(ctx, { name: "photo.jpg", mimeType: "image/jpeg", sizeBytes: 1 }),
      () => revokeVerification(ctx, seedProperty.id, "financials"),
      () => approveChangeRequest(ctx, "CRQ-0001"),
      () => rejectChangeRequest(ctx, "CRQ-0001"),
      () => recordAndApplyManagerChange(ctx, proposal),
    ];
    for (const attempt of attempts) {
      await expect(attempt()).rejects.toMatchObject({ name: "MutationDeniedError", code: "READ_ONLY" });
    }
    expect(mocks.predicates).toHaveLength(0);
    for (const write of [mocks.insert, mocks.update, mocks.delete, mocks.execute, mocks.transaction]) {
      expect(write).not.toHaveBeenCalled();
    }
  });

  it("reads the same seeded property as the owner, scoped to the shared org", async () => {
    const row = { ...seedProperty, userId: owner.userId, orgId: owner.orgId };
    mocks.rows.push([row], [row]);
    const ownerRead = await getProperty(owner, seedProperty.id);
    const sharedRead = await getProperty(ctx, seedProperty.id);
    expect(sharedRead).toEqual(ownerRead);
    expect(sharedRead?.name).toBe(seedProperty.name);
    const query = new PgDialect().sqlToQuery(mocks.predicates[1]);
    expect(query.params).toEqual([owner.orgId, seedProperty.id]);
  });

  it("can submit a pending change request with an active grant, without applying the patch", async () => {
    mocks.rows.push([{ id: "MEM-HOUSEHOLD" }]);
    mocks.execute.mockResolvedValue({ rows: [{ next: 1 }] });
    mocks.insert.mockImplementation(() => ({ values: (value: object) => ({
      returning: async () => [{ ...value, createdAt: new Date(), updatedAt: new Date(), decidedAt: null, decidedByUserId: null }],
    }) }));
    const request = await createChangeRequest(ctx, proposal);
    expect(request.status).toBe("pending");
    expect(request.managerUserId).toBe(ctx.userId);
    expect(request.proposedPatch).toEqual(proposal.proposedPatch);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.delete).not.toHaveBeenCalled();
    expect(new PgDialect().sqlToQuery(mocks.predicates[0]).params).toEqual([owner.orgId, ctx.userId, "active"]);
  });

  it("cannot submit requests without an active grant", async () => {
    mocks.rows.push([]);
    await expect(createChangeRequest(ctx, { ...proposal, ownerOrgId: "ORG-OTHER" })).rejects.toBeInstanceOf(MutationDeniedError);
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.execute).not.toHaveBeenCalled();
  });
});

it("requires ownership in the target org for cross-org writes, including a home-org owner", async () => {
  for (const role of ["viewer", "member", "admin"]) {
    mocks.rows.push([{ role }]);
    await expect(assertOrgAdmin(owner, "ORG-OTHER")).rejects.toBeInstanceOf(MutationDeniedError);
  }
  mocks.rows.push([{ role: "owner" }]);
  await expect(assertOrgAdmin(owner, "ORG-OTHER")).resolves.toBeUndefined();
});

it("keeps ordinary owner writes enabled", async () => {
  expect(() => assertCanMutate(owner)).not.toThrow();
  mocks.delete.mockReturnValue({ where: async () => [] });
  await expect(scopedDelete(owner, properties, seedProperty.id)).resolves.toBeUndefined();
  expect(mocks.delete).toHaveBeenCalledOnce();
});
