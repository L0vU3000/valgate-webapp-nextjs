import { describe, it, expect } from "vitest";
import { isRealClerkKey, DEMO_CLERK_SENTINEL } from "./clerk-check";

describe("isRealClerkKey", () => {
  it("should return false for null or undefined", () => {
    expect(isRealClerkKey(null)).toBe(false);
    expect(isRealClerkKey(undefined)).toBe(false);
  });

  it("should return false for empty string", () => {
    expect(isRealClerkKey("")).toBe(false);
  });

  it("should return false for the demo sentinel", () => {
    expect(isRealClerkKey(DEMO_CLERK_SENTINEL)).toBe(false);
  });

  it("should return true for a real-looking secret", () => {
    expect(isRealClerkKey("real-secret-value")).toBe(true);
  });
});
