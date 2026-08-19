import { describe, it, expect } from "vitest";
import {
  determineAuthStep,
  filterUsableFactors,
  factorDisplayName,
  factorRequiresSend,
  AuthState,
} from "./auth-flow-helper";

describe("determineAuthStep", () => {
  it("returns verify-client-trust when status is needs_client_trust", () => {
    const state: AuthState = { status: "needs_client_trust", supportedSecondFactors: [] };
    expect(determineAuthStep(state)).toEqual({ step: "verify-client-trust" });
  });

  it("returns verify-mfa with the full factor object when only totp is supported", () => {
    const state: AuthState = {
      status: "needs_second_factor",
      supportedSecondFactors: [{ strategy: "totp" }],
    };
    expect(determineAuthStep(state)).toEqual({
      step: "verify-mfa",
      factor: { strategy: "totp" },
    });
  });

  it("returns verify-mfa with id/safeIdentifier preserved for phone_code", () => {
    const state: AuthState = {
      status: "needs_second_factor",
      supportedSecondFactors: [
        { strategy: "phone_code", phoneNumberId: "idn_123", safeIdentifier: "+1 (***) ***-1234" },
      ],
    };
    expect(determineAuthStep(state)).toEqual({
      step: "verify-mfa",
      factor: { strategy: "phone_code", phoneNumberId: "idn_123", safeIdentifier: "+1 (***) ***-1234" },
    });
  });

  // Regression: the prior implementation mapped supportedSecondFactors down to bare strategy
  // strings and silently fell back to `factors[0]` in the UI layer whenever more than one
  // factor was available, never surfacing a choice to the user. determineAuthStep must instead
  // report every usable factor object and let the caller render an explicit chooser.
  it("returns select-mfa with every usable factor (not the first one) when multiple are supported", () => {
    const state: AuthState = {
      status: "needs_second_factor",
      supportedSecondFactors: [
        { strategy: "totp" },
        { strategy: "email_code", emailAddressId: "idn_1", safeIdentifier: "a***@example.com" },
      ],
    };
    const result = determineAuthStep(state);
    expect(result.step).toBe("select-mfa");
    expect(result).toEqual({
      step: "select-mfa",
      factors: [
        { strategy: "totp" },
        { strategy: "email_code", emailAddressId: "idn_1", safeIdentifier: "a***@example.com" },
      ],
    });
  });

  // Regression: the prior MFAFactor union ('totp' | 'backup_code' | 'email_code' | 'phone_code')
  // did not include Clerk's real `email_link` second-factor strategy, so an account configured
  // with only email_link would have its strategy string silently coerced through an `any`-typed
  // cast into a factor the verify UI cannot actually collect a code for. It must never be
  // treated as a usable code factor.
  it("returns unsupported-mfa (not verify-mfa) when the only supported factor is email_link", () => {
    const state: AuthState = {
      status: "needs_second_factor",
      supportedSecondFactors: [{ strategy: "email_link", emailAddressId: "idn_1" }],
    };
    expect(determineAuthStep(state)).toEqual({ step: "unsupported-mfa" });
  });

  it("filters out email_link when it appears alongside a usable factor", () => {
    const state: AuthState = {
      status: "needs_second_factor",
      supportedSecondFactors: [{ strategy: "email_link" }, { strategy: "totp" }],
    };
    expect(determineAuthStep(state)).toEqual({ step: "verify-mfa", factor: { strategy: "totp" } });
  });

  it("returns password when status is unknown", () => {
    const state: AuthState = { status: "unknown", supportedSecondFactors: [] };
    expect(determineAuthStep(state)).toEqual({ step: "password" });
  });

  it("returns password when needs_second_factor but no factors are supported", () => {
    const state: AuthState = { status: "needs_second_factor", supportedSecondFactors: [] };
    expect(determineAuthStep(state)).toEqual({ step: "password" });
  });

  it("returns password when needs_second_factor but supportedSecondFactors is null", () => {
    const state: AuthState = { status: "needs_second_factor", supportedSecondFactors: null };
    expect(determineAuthStep(state)).toEqual({ step: "password" });
  });
});

describe("filterUsableFactors", () => {
  it("keeps totp, backup_code, email_code, and phone_code", () => {
    const factors = [
      { strategy: "totp" },
      { strategy: "backup_code" },
      { strategy: "email_code" },
      { strategy: "phone_code" },
    ];
    expect(filterUsableFactors(factors)).toEqual(factors);
  });

  it("drops unknown or unsupported strategies, including email_link", () => {
    const factors = [{ strategy: "email_link" }, { strategy: "totp" }, { strategy: "passkey" }];
    expect(filterUsableFactors(factors)).toEqual([{ strategy: "totp" }]);
  });

  it("returns an empty array for null or undefined input", () => {
    expect(filterUsableFactors(null)).toEqual([]);
    expect(filterUsableFactors(undefined)).toEqual([]);
  });
});

describe("factorDisplayName", () => {
  it("returns a human-readable label per strategy", () => {
    expect(factorDisplayName("totp")).toBe("Authenticator app");
    expect(factorDisplayName("backup_code")).toBe("Backup code");
    expect(factorDisplayName("email_code")).toBe("Email code");
    expect(factorDisplayName("phone_code")).toBe("Text message");
  });
});

describe("factorRequiresSend", () => {
  it("requires sending a code for email_code and phone_code", () => {
    expect(factorRequiresSend("email_code")).toBe(true);
    expect(factorRequiresSend("phone_code")).toBe(true);
  });

  it("does not require sending a code for totp or backup_code", () => {
    expect(factorRequiresSend("totp")).toBe(false);
    expect(factorRequiresSend("backup_code")).toBe(false);
  });
});
