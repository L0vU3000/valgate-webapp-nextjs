// Regression coverage for the "default-org activation failed; continuing to /app" QA symptom:
// completeSignIn() calls setActive({ organization }) immediately after signIn.finalize() to
// pre-select the user's home org. That Clerk client call can reject transiently (observed as a
// generic "An unexpected response was received from the server"). The old code caught the
// rejection and silently continued — this helper instead retries a bounded, small number of
// times with a test-injectable delay, and reports success/failure instead of throwing, so the
// caller can log a structured error on exhaustion while still preserving the invariant that a
// valid sign-in must never strand the user on /login.

import { describe, it, expect, vi } from "vitest";
import { activateDefaultOrgWithRetry } from "./activate-default-org";

describe("activateDefaultOrgWithRetry", () => {
  it("succeeds on the first attempt without retrying", async () => {
    const setActive = vi.fn().mockResolvedValue(undefined);
    const wait = vi.fn().mockResolvedValue(undefined);

    const result = await activateDefaultOrgWithRetry({ clerkOrgId: "org_123", setActive, wait });

    expect(result).toEqual({ success: true, attempts: 1 });
    expect(setActive).toHaveBeenCalledTimes(1);
    expect(setActive).toHaveBeenCalledWith({ organization: "org_123" });
    expect(wait).not.toHaveBeenCalled();
  });

  it("retries once after a transient rejection, then succeeds", async () => {
    const setActive = vi
      .fn()
      .mockRejectedValueOnce(new Error("An unexpected response was received from the server"))
      .mockResolvedValueOnce(undefined);
    const wait = vi.fn().mockResolvedValue(undefined);

    const result = await activateDefaultOrgWithRetry({ clerkOrgId: "org_123", setActive, wait });

    expect(result).toEqual({ success: true, attempts: 2 });
    expect(setActive).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledTimes(1);
  });

  it("returns failure without throwing once retries are exhausted", async () => {
    const setActive = vi.fn().mockRejectedValue(new Error("An unexpected response was received from the server"));
    const wait = vi.fn().mockResolvedValue(undefined);

    const result = await activateDefaultOrgWithRetry({
      clerkOrgId: "org_123",
      setActive,
      wait,
      maxAttempts: 3,
    });

    expect(result).toEqual({ success: false, attempts: 3 });
    expect(setActive).toHaveBeenCalledTimes(3);
    // Only waits between attempts, never after the final failed attempt.
    expect(wait).toHaveBeenCalledTimes(2);
  });

  it("does not call setActive or retry when there is no org id", async () => {
    const setActive = vi.fn().mockResolvedValue(undefined);
    const wait = vi.fn().mockResolvedValue(undefined);

    const result = await activateDefaultOrgWithRetry({ clerkOrgId: null, setActive, wait });

    expect(result).toEqual({ success: true, attempts: 0 });
    expect(setActive).not.toHaveBeenCalled();
    expect(wait).not.toHaveBeenCalled();
  });
});
