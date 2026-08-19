export type AuthStep = "password" | "verify-client-trust" | "verify-mfa" | "select-mfa" | "unsupported-mfa";

// Strategies this UI knows how to collect a code/credential for. Clerk's SignInSecondFactor
// union also includes `email_link`, which requires a distinct poll-for-verification flow this
// screen does not implement — it is deliberately excluded and routed to `unsupported-mfa`
// instead of being misrepresented as a code input.
export type UsableMFAStrategy = "totp" | "backup_code" | "email_code" | "phone_code";

// Structural shape of Clerk v7's SignInSecondFactor union (@clerk/shared `signInCommon`):
// every variant carries `strategy`; phone/email variants also carry an id + masked identifier.
// Modeled as an interface (not `any`) so real Clerk factor objects satisfy it without a cast.
export interface ClerkSecondFactor {
  strategy: string;
  emailAddressId?: string;
  phoneNumberId?: string;
  safeIdentifier?: string;
}

export interface UsableFactor {
  strategy: UsableMFAStrategy;
  emailAddressId?: string;
  phoneNumberId?: string;
  safeIdentifier?: string;
}

export interface AuthState {
  status: string;
  supportedSecondFactors: ClerkSecondFactor[] | null | undefined;
}

function isUsableFactor(factor: ClerkSecondFactor): factor is UsableFactor {
  switch (factor.strategy) {
    case "totp":
    case "backup_code":
    case "email_code":
    case "phone_code":
      return true;
    default:
      return false;
  }
}

export function filterUsableFactors(factors: ClerkSecondFactor[] | null | undefined): UsableFactor[] {
  return (factors ?? []).filter(isUsableFactor);
}

export type DetermineAuthStepResult =
  | { step: "password" }
  | { step: "verify-client-trust" }
  | { step: "unsupported-mfa" }
  | { step: "verify-mfa"; factor: UsableFactor }
  | { step: "select-mfa"; factors: UsableFactor[] };

export function determineAuthStep(state: AuthState): DetermineAuthStepResult {
  if (state.status === "needs_client_trust") {
    return { step: "verify-client-trust" };
  }
  if (state.status === "needs_second_factor") {
    const rawFactors = state.supportedSecondFactors ?? [];
    if (rawFactors.length === 0) {
      return { step: "password" };
    }
    const usable = filterUsableFactors(rawFactors);
    if (usable.length === 0) {
      // Clerk reports second factors, but none of them are strategies this UI can collect
      // (e.g. the account only has `email_link` configured). Never silently fall through
      // to the password screen or guess a factor — surface a safe recovery message.
      return { step: "unsupported-mfa" };
    }
    if (usable.length === 1) {
      return { step: "verify-mfa", factor: usable[0] };
    }
    return { step: "select-mfa", factors: usable };
  }
  return { step: "password" };
}

export function factorDisplayName(strategy: UsableMFAStrategy): string {
  switch (strategy) {
    case "totp":
      return "Authenticator app";
    case "backup_code":
      return "Backup code";
    case "email_code":
      return "Email code";
    case "phone_code":
      return "Text message";
  }
}

// Code factors must have a code sent before the user can enter one; TOTP and backup codes are
// generated/held by the user already and must never be "sent".
export function factorRequiresSend(strategy: UsableMFAStrategy): boolean {
  return strategy === "email_code" || strategy === "phone_code";
}
