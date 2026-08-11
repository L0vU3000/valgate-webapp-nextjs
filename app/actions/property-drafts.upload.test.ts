import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Focused test for uploadDraftFileAction's diagnostic logging when the server-side
// S3 POST comes back non-2xx (the bug: today it silently returns a generic error
// with nothing logged, so a preview repro can't reveal the actual storage rejection).
//
// Mocks every collaborator so this exercises ONLY the fetch-failure branch:
//   - requireCtx: fixed Ctx, no Clerk/DB.
//   - presignUpload: fixed url/fields/storageId, no real S3 client.
//   - stageDraftFile: spied — must NOT be called when the S3 POST fails.
//   - global fetch: returns a canned non-2xx Response with an S3-style error body.
// ---------------------------------------------------------------------------

const requireCtx = vi.fn(async () => ({ userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" as const }));
vi.mock("@/lib/auth/ctx", () => ({ requireCtx }));

const FAKE_PRESIGNED_URL = "https://example-bucket.s3.amazonaws.com/";
const FAKE_FIELDS = {
  key: "ORG-0001/DOC-0001/photo.jpg",
  policy: "super-secret-policy-document",
  "x-amz-credential": "AKIAFAKEFAKEFAKEFAKE/20260101/us-east-1/s3/aws4_request",
  "x-amz-signature": "deadbeefcafebabe0123456789",
};
const presignUpload = vi.fn(async () => ({
  url: FAKE_PRESIGNED_URL,
  fields: FAKE_FIELDS,
  storageId: "ORG-0001/DOC-0001/photo.jpg",
}));
vi.mock("@/lib/services/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/storage")>();
  return { ...actual, presignUpload };
});

const stageDraftFile = vi.fn(async () => {
  throw new Error("stageDraftFile should not be called when the S3 POST fails");
});
vi.mock("@/lib/services/property-drafts", () => ({ stageDraftFile }));

vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

const { uploadDraftFileAction } = await import("@/app/actions/property-drafts");

function fakeFile(): File {
  return new File(["fake-bytes"], "photo.jpg", { type: "image/jpeg" });
}

describe("uploadDraftFileAction — S3 failure diagnostics", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.unstubAllGlobals();
    presignUpload.mockClear();
    stageDraftFile.mockClear();
  });

  it("logs status, statusText, and a sanitized body when S3 rejects the POST", async () => {
    const s3ErrorBody =
      "<Error><Code>AccessDenied</Code><Message>Invalid according to Policy: Policy expired.</Message>" +
      "<AWSAccessKeyId>AKIAABCDEFGHIJKLMNOP</AWSAccessKeyId></Error>";
    fetchMock.mockResolvedValue(
      new Response(s3ErrorBody, { status: 403, statusText: "Forbidden" }),
    );

    const formData = new FormData();
    formData.set("file", fakeFile());
    const result = await uploadDraftFileAction("DRFT-0001", "photo", formData);

    // User-facing error stays generic.
    expect(result).toEqual({ ok: false, error: "Could not upload file to storage" });
    // The bytes never got recorded as a staged file.
    expect(stageDraftFile).not.toHaveBeenCalled();

    // Server logs carry enough to diagnose the AWS rejection.
    expect(consoleErrorSpy).toHaveBeenCalled();
    const logged = JSON.stringify(consoleErrorSpy.mock.calls);
    expect(logged).toContain("403");
    expect(logged).toContain("Forbidden");
    expect(logged).toContain("AccessDenied");
    expect(logged).toContain("Policy expired");

    // Never leak the presigned URL, policy fields, or credentials into the logs.
    expect(logged).not.toContain(FAKE_PRESIGNED_URL);
    expect(logged).not.toContain(FAKE_FIELDS.policy);
    expect(logged).not.toContain(FAKE_FIELDS["x-amz-credential"]);
    expect(logged).not.toContain(FAKE_FIELDS["x-amz-signature"]);
    expect(logged).not.toContain("AKIAABCDEFGHIJKLMNOP"); // redacted from the S3 body itself
    // Never leak the uploaded file bytes.
    expect(logged).not.toContain("fake-bytes");
  });

  it("bounds an oversized S3 error body instead of logging it verbatim", async () => {
    const huge = "<Error>" + "x".repeat(100_000) + "</Error>";
    fetchMock.mockResolvedValue(new Response(huge, { status: 500, statusText: "Internal Server Error" }));

    const formData = new FormData();
    formData.set("file", fakeFile());
    await uploadDraftFileAction("DRFT-0001", "photo", formData);

    expect(consoleErrorSpy).toHaveBeenCalled();
    const logged = JSON.stringify(consoleErrorSpy.mock.calls);
    expect(logged.length).toBeLessThan(20_000);
  });
});
