import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Document } from "@/lib/data/types/document";
import type { Ctx } from "@/lib/services/_mapping";

const mocks = vi.hoisted(() => ({
  requireCtx: vi.fn(),
  allowed: vi.fn(),
  getDocument: vi.fn(),
  getFolder: vi.fn(),
  updateDocument: vi.fn(),
  revalidateFeTag: vi.fn(),
  bustCache: vi.fn(),
}));

vi.mock("@/lib/auth/ctx", () => ({ requireCtx: mocks.requireCtx }));
vi.mock("@/lib/ratelimit", () => ({ actionLimiter: {}, allowed: mocks.allowed }));
vi.mock("@/app/actions/_result", () => ({ revalidateFeTag: mocks.revalidateFeTag }));
vi.mock("@/lib/cache/bust", () => ({ bustCache: mocks.bustCache }));
vi.mock("@/lib/services/documents", () => ({
  getDocument: mocks.getDocument,
  updateDocument: mocks.updateDocument,
}));
vi.mock("@/lib/services/folders", () => ({ getFolder: mocks.getFolder }));
vi.mock("@/lib/services/storage", () => ({}));
vi.mock("@/lib/services/activity", () => ({}));

import { updateDocument } from "./documents";

const ctx: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" };
const document: Document = {
  id: "DOC-0001",
  propertyId: "PROP-0001",
  folderId: "FLDR-0001",
  name: "deed.pdf",
  kind: "document",
  storageId: "ORG-0001/DOC-0001/deed.pdf",
  uploadedAt: 1760000000000,
};
const folder = {
  id: "FLDR-0002",
  propertyId: document.propertyId,
  name: "Legal",
  createdAt: 1760000000000,
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireCtx.mockResolvedValue(ctx);
  mocks.allowed.mockResolvedValue(true);
  mocks.getDocument.mockResolvedValue(document);
  mocks.getFolder.mockResolvedValue(folder);
  mocks.updateDocument.mockResolvedValue({ ...document, folderId: folder.id });
});

describe("updateDocument folder changes", () => {
  it("preserves an explicit null through validation so the service clears the folder", async () => {
    const cleared = { ...document, folderId: undefined };
    mocks.updateDocument.mockResolvedValue(cleared);

    expect(await updateDocument(document.id, { folderId: null })).toEqual({ ok: true, data: cleared });
    expect(mocks.updateDocument).toHaveBeenCalledWith(ctx, document.id, { folderId: null });
    expect(mocks.getFolder).not.toHaveBeenCalled();
    expect(mocks.revalidateFeTag).toHaveBeenCalledWith("documents");
    expect(mocks.bustCache).toHaveBeenCalledWith("documents");
  });

  it("moves a document to a folder in the same org and property", async () => {
    expect(await updateDocument(document.id, { folderId: folder.id })).toMatchObject({ ok: true });
    expect(mocks.getDocument).toHaveBeenCalledWith(ctx, document.id);
    expect(mocks.getFolder).toHaveBeenCalledWith(ctx, folder.id);
    expect(mocks.updateDocument).toHaveBeenCalledWith(ctx, document.id, { folderId: folder.id });
  });

  it("rejects a folder in another property before updating", async () => {
    mocks.getFolder.mockResolvedValue({ ...folder, propertyId: "PROP-0002" });

    expect(await updateDocument(document.id, { folderId: folder.id })).toMatchObject({ ok: false });
    expect(mocks.updateDocument).not.toHaveBeenCalled();
    expect(mocks.revalidateFeTag).not.toHaveBeenCalled();
    expect(mocks.bustCache).not.toHaveBeenCalled();
  });

  it("rejects a folder missing from the caller's org before updating", async () => {
    // getFolder is org-scoped: a foreign-org ID, like a nonexistent ID, returns null.
    mocks.getFolder.mockResolvedValue(null);

    expect(await updateDocument(document.id, { folderId: folder.id })).toMatchObject({ ok: false });
    expect(mocks.getFolder).toHaveBeenCalledWith(ctx, folder.id);
    expect(mocks.updateDocument).not.toHaveBeenCalled();
  });

  it("rejects a document missing from the caller's org before checking the folder", async () => {
    mocks.getDocument.mockResolvedValue(null);

    expect(await updateDocument(document.id, { folderId: folder.id })).toEqual({
      ok: false,
      error: "Document not found",
    });
    expect(mocks.getFolder).not.toHaveBeenCalled();
    expect(mocks.updateDocument).not.toHaveBeenCalled();
  });

  it("keeps unrelated patches working without a folder lookup", async () => {
    expect(await updateDocument(document.id, { name: "title.pdf" })).toMatchObject({ ok: true });
    expect(mocks.getFolder).not.toHaveBeenCalled();
    expect(mocks.updateDocument).toHaveBeenCalledWith(ctx, document.id, { name: "title.pdf" });
  });
});
