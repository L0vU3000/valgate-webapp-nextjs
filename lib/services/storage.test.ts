import { describe, it, expect } from "vitest";
import { describeFailedUpload } from "@/lib/services/storage";

// ---------------------------------------------------------------------------
// Unit tests for describeFailedUpload: the diagnostic formatter used when the
// server-side S3 POST (uploadDraftFileAction) comes back non-2xx. Pure function,
// no network/env — proves the bounding + redaction behavior in isolation from
// the action's fetch plumbing.
// ---------------------------------------------------------------------------

describe("describeFailedUpload", () => {
  it("captures status, statusText, and the response body", () => {
    const res = { status: 403, statusText: "Forbidden" };
    const body = "<Error><Code>AccessDenied</Code><Message>Policy expired.</Message></Error>";
    const out = describeFailedUpload(res, body);
    expect(out.status).toBe(403);
    expect(out.statusText).toBe("Forbidden");
    expect(out.body).toContain("AccessDenied");
    expect(out.body).toContain("Policy expired.");
  });

  it("bounds the body to a fixed max length regardless of input size", () => {
    const res = { status: 400, statusText: "Bad Request" };
    const huge = "x".repeat(50_000);
    const out = describeFailedUpload(res, huge);
    expect(out.body.length).toBeLessThan(5_000);
  });

  it("redacts AWS signing/policy material embedded in the S3 error body", () => {
    const res = { status: 403, statusText: "Forbidden" };
    const body = [
      "<Error>",
      "<Code>SignatureDoesNotMatch</Code>",
      "<AWSAccessKeyId>AKIAABCDEFGHIJKLMNOP</AWSAccessKeyId>",
      "<SignatureProvided>deadbeefcafebabe</SignatureProvided>",
      "<StringToSign>eyJleHBpcmF0aW9uIjoiMjAyNS0wMS0wMVQwMDowMDowMFoifQ==</StringToSign>",
      "<StringToSignBytes>65 79 4a</StringToSignBytes>",
      "<CanonicalRequest>POST\n/bucket\n</CanonicalRequest>",
      "<Policy>eyJjb25kaXRpb25zIjpbXX0=</Policy>",
      "</Error>",
    ].join("");
    const out = describeFailedUpload(res, body);
    expect(out.body).not.toContain("AKIAABCDEFGHIJKLMNOP");
    expect(out.body).not.toContain("deadbeefcafebabe");
    expect(out.body).not.toContain("eyJleHBpcmF0aW9uIjoiMjAyNS0wMS0wMVQwMDowMDowMFoifQ==");
    expect(out.body).not.toContain("65 79 4a");
    expect(out.body).not.toContain("POST\n/bucket\n");
    expect(out.body).not.toContain("eyJjb25kaXRpb25zIjpbXX0=");
    // Non-sensitive diagnostic info survives the redaction.
    expect(out.body).toContain("SignatureDoesNotMatch");
  });
});
