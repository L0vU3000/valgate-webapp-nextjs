import { beforeEach, expect, it, vi } from "vitest";
const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));
vi.mock("@aws-sdk/client-s3", async (importOriginal) => ({
  ...await importOriginal<typeof import("@aws-sdk/client-s3")>(),
  S3Client: class { send = sendMock; },
}));
vi.mock("@/lib/env", () => ({ env: {
  STORAGE_BUCKET: "test-bucket", STORAGE_REGION: "us-east-1",
  STORAGE_ACCESS_KEY_ID: "test-key", STORAGE_SECRET_ACCESS_KEY: "test-secret",
} }));
import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { deleteStorageObjects } from "./storage";

beforeEach(() => vi.resetAllMocks());

// O7: S3 DeleteObjects takes at most 1000 keys per request; legacy _storage/ ids never lived in S3.
it("deleteStorageObjects batches into DeleteObjects of 1000 and skips legacy ids", async () => {
  sendMock.mockResolvedValue({});
  const keys = Array.from({ length: 2001 }, (_, i) => `ORG-A/DOC-${i}/f.pdf`);
  await deleteStorageObjects([...keys, "_storage/legacy.pdf"]);
  expect(sendMock).toHaveBeenCalledTimes(3);
  const batches = sendMock.mock.calls.map(([cmd]) => {
    expect(cmd).toBeInstanceOf(DeleteObjectsCommand);
    expect(cmd.input.Bucket).toBe("test-bucket");
    return cmd.input.Delete.Objects.map((o: { Key: string }) => o.Key);
  });
  expect(batches.map((b) => b.length)).toEqual([1000, 1000, 1]);
  expect(batches.flat()).toEqual(keys);
});

it("deleteStorageObjects never throws: a failed batch is logged and the rest still run", async () => {
  const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
  sendMock.mockRejectedValueOnce(new Error("s3 down")).mockResolvedValueOnce({ Errors: [{ Key: "ORG-A/x", Code: "AccessDenied" }] });
  const keys = Array.from({ length: 1001 }, (_, i) => `ORG-A/DOC-${i}/f.pdf`);
  await expect(deleteStorageObjects(keys)).resolves.toBeUndefined();
  expect(sendMock).toHaveBeenCalledTimes(2);
  expect(quiet).toHaveBeenCalledTimes(2);
  quiet.mockRestore();
});

it("deleteStorageObjects with nothing to delete makes no S3 call", async () => {
  await deleteStorageObjects(["_storage/a"]);
  await deleteStorageObjects([]);
  expect(sendMock).not.toHaveBeenCalled();
});
