import { describe, it, expect } from "vitest";
import { isUnauthenticatedError } from "./ctx";

// ---------------------------------------------------------------------------
// isUnauthenticatedError is the only part of ctx.ts that is safe to unit-test
// without Clerk/DB: JSON route handlers use it to turn a missing session into
// HTTP 401 instead of a framework 500.
// ---------------------------------------------------------------------------

describe("isUnauthenticatedError", () => {
  it("returns true only for Error('unauthenticated')", () => {
    expect(isUnauthenticatedError(new Error("unauthenticated"))).toBe(true);
  });

  it("returns false for other errors so DEMO_MODE-refused still fails closed", () => {
    expect(isUnauthenticatedError(new Error("DEMO_MODE refused in production"))).toBe(false);
    expect(isUnauthenticatedError(new Error("forbidden"))).toBe(false);
    expect(isUnauthenticatedError("unauthenticated")).toBe(false);
    expect(isUnauthenticatedError(null)).toBe(false);
  });
});
