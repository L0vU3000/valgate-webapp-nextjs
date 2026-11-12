import { expect, it, vi } from "vitest";

// B2.6 sibling: the KMZ bytes are stored before the document row; a failed insert must delete them.
const mocks = vi.hoisted(() => ({
  putKmz: vi.fn(async () => ({ storageId: "ORG-0001/DOC-0009/site.kmz" })),
  deleteStorageObject: vi.fn(async () => true),
  createDocument: vi.fn(async () => { throw new Error("insert failed"); }),
}));
vi.mock("@/lib/db/client", () => ({ db: { select: () => ({ from: () => ({ where: async () => [{ id: "PROP-1", lat: 0, lng: 0 }] }) }) } }));
vi.mock("@/lib/services/land-parcels", () => ({
  listLandParcels: async () => [],
  createLandParcel: async () => ({ id: "LP-1" }),
  updateLandParcel: vi.fn(),
  deleteLandParcel: vi.fn(),
}));
vi.mock("@/lib/services/documents", () => ({ createDocument: mocks.createDocument }));
vi.mock("@/lib/services/storage", () => ({ putKmz: mocks.putKmz, deleteStorageObject: mocks.deleteStorageObject }));
vi.mock("@/lib/services/properties", () => ({ updateProperty: vi.fn() }));
vi.mock("@/lib/services/cadastre", () => ({ parcelAtPoint: vi.fn() }));

import { attachBoundary } from "./property-boundary";

it("deletes the stored KMZ when the document row insert fails", async () => {
  const ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" as const };
  const parsed = { sizeM2: 10, geometry: {}, centroid: [0, 0] } as never;
  await expect(
    attachBoundary(ctx, "PROP-1", parsed, { sourceFile: { buffer: Buffer.from("kmz"), name: "site.kmz" } }),
  ).rejects.toThrow("insert failed");
  expect(mocks.deleteStorageObject).toHaveBeenCalledWith("ORG-0001/DOC-0009/site.kmz");
});
