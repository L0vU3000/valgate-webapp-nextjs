import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Ctx } from "@/lib/services/_mapping";
import { apiError } from "./http";

const {
  assertCanMutateMock,
  createDocumentMock,
  deleteDocumentMock,
  getDocumentMock,
  getPropertyMock,
  listDocumentsPageMock,
  logActivityMock,
  presignUploadMock,
  resolveApiV1CtxMock,
  resolveDocumentUrlMock,
  roleAtLeastMock,
  updateDocumentMock,
} = vi.hoisted(() => ({
  assertCanMutateMock: vi.fn(),
  createDocumentMock: vi.fn(),
  deleteDocumentMock: vi.fn(),
  getDocumentMock: vi.fn(),
  getPropertyMock: vi.fn(),
  listDocumentsPageMock: vi.fn(),
  logActivityMock: vi.fn(),
  presignUploadMock: vi.fn(),
  resolveApiV1CtxMock: vi.fn(),
  resolveDocumentUrlMock: vi.fn(),
  roleAtLeastMock: vi.fn(),
  updateDocumentMock: vi.fn(),
}));

vi.mock("@/lib/api/v1/auth", () => ({ resolveApiV1Ctx: resolveApiV1CtxMock }));
vi.mock("@/lib/services/_mapping", () => ({
  assertCanMutate: assertCanMutateMock,
  roleAtLeast: roleAtLeastMock,
}));
vi.mock("@/lib/services/activity", () => ({ logActivity: logActivityMock }));
vi.mock("@/lib/services/documents", () => ({
  createDocument: createDocumentMock,
  deleteDocument: deleteDocumentMock,
  getDocument: getDocumentMock,
  listDocumentsPage: listDocumentsPageMock,
  updateDocument: updateDocumentMock,
}));
vi.mock("@/lib/services/properties", () => ({ getProperty: getPropertyMock }));
vi.mock("@/lib/services/storage", () => ({
  presignUpload: presignUploadMock,
  resolveDocumentUrl: resolveDocumentUrlMock,
}));

import { POST as createUploadTicket } from "@/app/api/v1/properties/[id]/documents/route";
import { POST as completeUpload } from "@/app/api/v1/properties/[id]/documents/complete/route";
import {
  DELETE as deleteDocumentRoute,
  GET as getDocumentUrl,
  PATCH as patchDocument,
} from "@/app/api/v1/properties/[id]/documents/[documentId]/route";

const OWNER_CTX: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" };
const VIEWER_CTX: Ctx = { userId: "USR-0002", orgId: "ORG-0001", orgRole: "viewer" };
const ADMIN_CTX: Ctx = { userId: "USR-0003", orgId: "ORG-0001", orgRole: "admin" };
const PROPERTY = { id: "PROP-0001", name: "42 Ocean Ave" };
const DOCUMENT = {
  id: "DOC-0007",
  propertyId: "PROP-0001",
  folderId: undefined,
  name: "deed.pdf",
  kind: "document",
  mimeType: "application/pdf",
  extension: "pdf",
  sizeBytes: 4,
  storageId: "ORG-0001/DOC-0007/deed.pdf",
  thumbStorageId: undefined,
  category: "Title",
  description: "Title deed",
  uploadedBy: "USR-0001",
  uploadedAt: 1760000000000,
  verifies: undefined,
  aiSummary: undefined,
};
const TICKET = {
  url: "https://uploads.example/presigned",
  fields: { "Content-Type": "application/pdf", policy: "signed" },
  storageId: "ORG-0001/DOC-0007/deed.pdf",
};

function propertyParams(id = "PROP-0001") {
  return { params: Promise.resolve({ id }) };
}

function documentParams(id = "PROP-0001", documentId = "DOC-0007") {
  return { params: Promise.resolve({ id, documentId }) };
}

function jsonRequest(url: string, body: unknown, method = "POST"): Request {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const uploadBody = {
  name: "deed.pdf",
  mimeType: "application/pdf",
  sizeBytes: 4,
  category: "Title",
  description: "Title deed",
};

beforeEach(() => {
  vi.clearAllMocks();
  roleAtLeastMock.mockImplementation((role: Ctx["orgRole"], minimum: Ctx["orgRole"]) => {
    const rank = { viewer: 0, member: 1, admin: 2, owner: 3 };
    return rank[role] >= rank[minimum];
  });
  resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: OWNER_CTX });
  getPropertyMock.mockResolvedValue(PROPERTY);
  getDocumentMock.mockResolvedValue(DOCUMENT);
  presignUploadMock.mockResolvedValue(TICKET);
  createDocumentMock.mockResolvedValue(DOCUMENT);
  updateDocumentMock.mockResolvedValue(DOCUMENT);
  deleteDocumentMock.mockResolvedValue(DOCUMENT);
  resolveDocumentUrlMock.mockResolvedValue("https://files.example/deed.pdf");
  logActivityMock.mockResolvedValue(undefined);
});

describe("POST /api/v1/properties/{id}/documents", () => {
  it("returns 401 before touching the property or storage service", async () => {
    resolveApiV1CtxMock.mockResolvedValue({
      ok: false,
      response: apiError(401, "unauthorized", "Authentication required."),
    });

    const response = await createUploadTicket(
      jsonRequest("/api/v1/properties/PROP-0001/documents", uploadBody),
      propertyParams(),
    );

    expect(response.status).toBe(401);
    expect(getPropertyMock).not.toHaveBeenCalled();
    expect(presignUploadMock).not.toHaveBeenCalled();
  });

  it("returns a bounded presigned upload ticket", async () => {
    const response = await createUploadTicket(
      jsonRequest("/api/v1/properties/PROP-0001/documents", uploadBody),
      propertyParams(),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(TICKET);
    expect(resolveApiV1CtxMock).toHaveBeenCalledWith("write");
    expect(getPropertyMock).toHaveBeenCalledWith(OWNER_CTX, "PROP-0001");
    expect(presignUploadMock).toHaveBeenCalledWith(OWNER_CTX, {
      name: "deed.pdf",
      mimeType: "application/pdf",
      sizeBytes: 4,
    });
  });

  it("rejects unsupported MIME types before issuing a ticket", async () => {
    const response = await createUploadTicket(
      jsonRequest("/api/v1/properties/PROP-0001/documents", {
        ...uploadBody,
        mimeType: "application/x-secret",
      }),
      propertyParams(),
    );

    expect(response.status).toBe(400);
    expect(presignUploadMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/v1/properties/{id}/documents/complete", () => {
  it("records the upload and returns only the public document DTO", async () => {
    const response = await completeUpload(
      jsonRequest("/api/v1/properties/PROP-0001/documents/complete", {
        ...uploadBody,
        storageId: TICKET.storageId,
      }),
      propertyParams(),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toMatchObject({
      id: "DOC-0007",
      propertyId: "PROP-0001",
      name: "deed.pdf",
      kind: "document",
      mimeType: "application/pdf",
      sizeBytes: 4,
      category: "Title",
      description: "Title deed",
    });
    expect(JSON.stringify(body)).not.toContain("storageId");
    expect(createDocumentMock).toHaveBeenCalledWith(
      OWNER_CTX,
      expect.objectContaining({
        propertyId: "PROP-0001",
        storageId: TICKET.storageId,
        kind: "document",
      }),
    );
  });

  it("rejects a storage id from another org", async () => {
    const response = await completeUpload(
      jsonRequest("/api/v1/properties/PROP-0001/documents/complete", {
        ...uploadBody,
        storageId: "ORG-OTHER/DOC-0007/deed.pdf",
      }),
      propertyParams(),
    );

    expect(response.status).toBe(400);
    expect(createDocumentMock).not.toHaveBeenCalled();
  });
});

describe("/api/v1/properties/{id}/documents/{documentId}", () => {
  it("resolves a document URL without exposing storage ids", async () => {
    const response = await getDocumentUrl(
      new Request("http://localhost/api/v1/properties/PROP-0001/documents/DOC-0007"),
      documentParams(),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.url).toBe("https://files.example/deed.pdf");
    expect(body.urlExpiresAt).toBeGreaterThan(Date.now());
    expect(JSON.stringify(body)).not.toContain("ORG-0001/");
    expect(resolveDocumentUrlMock).toHaveBeenCalledWith(DOCUMENT.storageId);
  });

  it("renames only public fields and strips storage/property ids", async () => {
    const response = await patchDocument(
      jsonRequest(
        "/api/v1/properties/PROP-0001/documents/DOC-0007",
        { name: "renamed.pdf", storageId: "ORG-SECRET/object", propertyId: "PROP-SECRET" },
        "PATCH",
      ),
      documentParams(),
    );

    expect(response.status).toBe(200);
    expect(updateDocumentMock).toHaveBeenCalledWith(OWNER_CTX, "DOC-0007", {
      name: "renamed.pdf",
    });
  });

  it("blocks a viewer from deleting a document", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: VIEWER_CTX });

    const response = await deleteDocumentRoute(
      new Request("http://localhost/api/v1/properties/PROP-0001/documents/DOC-0007", { method: "DELETE" }),
      documentParams(),
    );

    expect(response.status).toBe(403);
    expect(deleteDocumentMock).not.toHaveBeenCalled();
  });

  it("deletes the document and records the activity for an admin", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: ADMIN_CTX });

    const response = await deleteDocumentRoute(
      new Request("http://localhost/api/v1/properties/PROP-0001/documents/DOC-0007", { method: "DELETE" }),
      documentParams(),
    );

    expect(response.status).toBe(204);
    expect(deleteDocumentMock).toHaveBeenCalledWith(ADMIN_CTX, "DOC-0007");
    expect(logActivityMock).toHaveBeenCalledWith(ADMIN_CTX, expect.objectContaining({
      entity: "document",
      action: "removed",
      entityId: "DOC-0007",
      propertyId: "PROP-0001",
    }));
  });

  it("fails closed when URL resolution throws", async () => {
    resolveDocumentUrlMock.mockRejectedValue(new Error("SECRET-STORAGE-ERROR"));

    const response = await getDocumentUrl(
      new Request("http://localhost/api/v1/properties/PROP-0001/documents/DOC-0007"),
      documentParams(),
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe("internal_error");
    expect(JSON.stringify(body)).not.toContain("SECRET-STORAGE-ERROR");
  });
});
