import { beforeEach, describe, expect, it, vi } from "vitest";
const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));
vi.mock("@aws-sdk/client-s3", async (importOriginal) => ({
  ...await importOriginal<typeof import("@aws-sdk/client-s3")>(),
  S3Client: class { send = sendMock; },
}));
vi.mock("@/lib/env", () => ({ env: {
  STORAGE_BUCKET: "test-bucket", STORAGE_REGION: "us-east-1",
  STORAGE_ACCESS_KEY_ID: "test-key", STORAGE_SECRET_ACCESS_KEY: "test-secret",
} }));
import { HeadObjectCommand, S3ServiceException } from "@aws-sdk/client-s3";
import { statObject } from "./storage";
beforeEach(() => vi.resetAllMocks());
describe("statObject", () => {
  it("returns the actual S3 object metadata", async () => {
    sendMock.mockResolvedValue({ ContentType: "application/pdf", ContentLength: 17 });
    await expect(statObject("ORG-A/DOC-1/file.pdf")).resolves.toEqual({ mimeType: "application/pdf", sizeBytes: 17 });
    expect(sendMock).toHaveBeenCalledWith(expect.any(HeadObjectCommand));
    expect(sendMock.mock.calls[0][0].input).toEqual({ Bucket: "test-bucket", Key: "ORG-A/DOC-1/file.pdf" });
  });
  it("returns null for a missing object", async () => {
    sendMock.mockRejectedValue(new S3ServiceException({ name: "NotFound", $fault: "client", $metadata: { httpStatusCode: 404 } }));
    await expect(statObject("ORG-A/missing.pdf")).resolves.toBeNull();
  });
  it.each([403, 500])("propagates S3 status %s instead of reporting missing bytes", async (status) => {
    const error = new S3ServiceException({ name: "StorageFailure", $fault: "client", $metadata: { httpStatusCode: status } });
    sendMock.mockRejectedValue(error);
    await expect(statObject("ORG-A/file.pdf")).rejects.toBe(error);
  });
  it("propagates transport failures", async () => {
    const error = new Error("connection failed");
    sendMock.mockRejectedValue(error);
    await expect(statObject("ORG-A/file.pdf")).rejects.toBe(error);
  });
});
