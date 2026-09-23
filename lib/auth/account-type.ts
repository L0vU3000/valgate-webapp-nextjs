import { z } from "zod";

// Clerk unsafeMetadata.accountType is user-controlled. The only values Valgate
// writes today are "owner" (invitation accept) and "manager" (Pro). Missing is
// the normal consumer sign-up path. Unknown strings must not grant manager.
export const ACCOUNT_TYPES = ["owner", "manager"] as const;

export const accountTypeSchema = z.enum(ACCOUNT_TYPES);

export type AccountType = z.infer<typeof accountTypeSchema>;

const DEFAULT_ACCOUNT_TYPE: AccountType = "owner";

/**
 * Parse a raw Clerk `unsafeMetadata.accountType` value through the Zod enum.
 *
 * What could go wrong: the value is missing, the wrong type (number/object),
 * or an unexpected string such as "admin". None of those should throw — the
 * Clerk webhook must stay 2xx, and an invalid value must not become manager.
 * We fail closed to "owner" in every failure case.
 */
export function parseAccountType(raw: unknown): AccountType {
  const result = accountTypeSchema.safeParse(raw);
  if (result.success) {
    return result.data;
  }
  return DEFAULT_ACCOUNT_TYPE;
}

/**
 * Return true only when the raw metadata value is the enum member "manager".
 *
 * Call this at each Clerk metadata boundary instead of comparing the raw
 * string with `=== "manager"`. Invalid or missing values parse as "owner".
 */
export function isManagerFromAccountType(rawAccountType: unknown): boolean {
  const accountType = parseAccountType(rawAccountType);
  return accountType === "manager";
}
