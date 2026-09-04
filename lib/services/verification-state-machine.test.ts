import { describe, expect, it } from "vitest";
import { nextStatus, canTransition } from "./verification-state-machine";
import type { VerificationStatus } from "@/lib/data/types/pillar-verification";

describe("verification state machine", () => {
  describe("submit", () => {
    it.each<VerificationStatus>(["unverified", "rejected", "revoked"])(
      "transitions %s -> verified",
      (from) => {
        expect(nextStatus(from, "submit")).toBe("verified");
      },
    );

    it.each<VerificationStatus>(["pending_review", "verified"])(
      "throws on illegal submit from %s",
      (from) => {
        expect(() => nextStatus(from, "submit")).toThrow("illegal transition");
        expect(canTransition(from, "submit")).toBe(false);
      },
    );
  });

  describe("approve", () => {
    it("transitions pending_review -> verified", () => {
      expect(nextStatus("pending_review", "approve")).toBe("verified");
    });

    it.each<VerificationStatus>(["unverified", "rejected", "revoked", "verified"])(
      "throws on illegal approve from %s",
      (from) => {
        expect(() => nextStatus(from, "approve")).toThrow("illegal transition");
      },
    );
  });

  describe("reject", () => {
    it.each<VerificationStatus>(["pending_review", "verified"])(
      "transitions %s -> rejected",
      (from) => {
        expect(nextStatus(from, "reject")).toBe("rejected");
      },
    );

    it.each<VerificationStatus>(["unverified", "rejected", "revoked"])(
      "throws on illegal reject from %s",
      (from) => {
        expect(() => nextStatus(from, "reject")).toThrow("illegal transition");
      },
    );
  });

  describe("revoke", () => {
    it("transitions verified -> revoked", () => {
      expect(nextStatus("verified", "revoke")).toBe("revoked");
    });

    it.each<VerificationStatus>(["unverified", "pending_review", "rejected", "revoked"])(
      "throws on illegal revoke from %s",
      (from) => {
        expect(() => nextStatus(from, "revoke")).toThrow("illegal transition");
      },
    );
  });
});
