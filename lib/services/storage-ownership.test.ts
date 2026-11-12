import { describe, expect, it } from "vitest";
import { assertOwnStorageId, isOrgStorageId } from "./storage";
import { createDocument, updateDocument } from "./documents";
import { updateProperty, setCoverPhoto } from "./properties";
import { stageDraftFile } from "./property-drafts";
import type { Ctx } from "./_mapping";

const ctx: Ctx = { orgId: "ORG-B", userId: "USR-B", orgRole: "owner" };
const foreignKey = "ORG-A/DOC-0001/x.pdf";

describe("storage ownership at the persistence boundary", () => {
  it("allows own keys and legacy local references", () => {
    expect(() => assertOwnStorageId(ctx, "ORG-B/DOC-0001/x.pdf")).not.toThrow();
    expect(() => assertOwnStorageId(ctx, "_storage/legacy.pdf")).not.toThrow();
    expect(isOrgStorageId("_storage/legacy.pdf", ctx.orgId)).toBe(false);
  });

  it.each([foreignKey, "ORG-B-other/x.pdf", "x.pdf"])("refuses foreign or unscoped key %s", (key) => {
    expect(() => assertOwnStorageId(ctx, key)).toThrow("forbidden");
  });

  it.each(["storageId", "thumbStorageId"] as const)("document create and update guard %s", async (field) => {
    const input = { propertyId: "PROP-B", name: "x.pdf", kind: "document" as const, uploadedAt: 1, storageId: "ORG-B/DOC-B/own.pdf", [field]: foreignKey };
    await expect(createDocument(ctx, input)).rejects.toThrow("forbidden");
    await expect(updateDocument(ctx, "DOC-B", { [field]: foreignKey })).rejects.toThrow("forbidden");
  });

  it.each(["photoStorageIds", "documentStorageIds"] as const)("property updates guard every %s entry", async (field) => {
    await expect(updateProperty(ctx, "PROP-B", { [field]: ["ORG-B/own.pdf", foreignKey] })).rejects.toThrow("forbidden");
  });

  it("guards both property cover write paths", async () => {
    await expect(updateProperty(ctx, "PROP-B", { coverStorageId: foreignKey })).rejects.toThrow("forbidden");
    await expect(setCoverPhoto(ctx, "PROP-B", foreignKey)).rejects.toThrow("forbidden");
  });

  it("refuses a foreign staged draft file before looking up the draft", async () => {
    await expect(stageDraftFile(ctx, "DRF-B", { kind: "document", name: "x.pdf", mimeType: "application/pdf", sizeBytes: 1, storageId: foreignKey })).rejects.toThrow("forbidden");
  });
});
