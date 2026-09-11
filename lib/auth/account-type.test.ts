import { describe, it, expect } from "vitest";
import {
  accountTypeSchema,
  isManagerFromAccountType,
  parseAccountType,
} from "./account-type";

describe("accountTypeSchema", () => {
  it("accepts the two known enum values", () => {
    expect(accountTypeSchema.parse("owner")).toBe("owner");
    expect(accountTypeSchema.parse("manager")).toBe("manager");
  });

  it("rejects anything that is not owner or manager", () => {
    expect(accountTypeSchema.safeParse("admin").success).toBe(false);
    expect(accountTypeSchema.safeParse("Owner").success).toBe(false);
    expect(accountTypeSchema.safeParse("").success).toBe(false);
    expect(accountTypeSchema.safeParse(undefined).success).toBe(false);
    expect(accountTypeSchema.safeParse(null).success).toBe(false);
    expect(accountTypeSchema.safeParse(1).success).toBe(false);
  });
});

describe("parseAccountType", () => {
  it("returns owner for the owner enum value", () => {
    expect(parseAccountType("owner")).toBe("owner");
  });

  it("returns manager for the manager enum value", () => {
    expect(parseAccountType("manager")).toBe("manager");
  });

  it("defaults missing values to owner (normal consumer sign-up)", () => {
    expect(parseAccountType(undefined)).toBe("owner");
    expect(parseAccountType(null)).toBe("owner");
  });

  it("defaults unknown or wrong-typed values to owner instead of throwing", () => {
    expect(parseAccountType("admin")).toBe("owner");
    expect(parseAccountType("hacker")).toBe("owner");
    expect(parseAccountType("Manager")).toBe("owner");
    expect(parseAccountType("")).toBe("owner");
    expect(parseAccountType(123)).toBe("owner");
    expect(parseAccountType({ accountType: "manager" })).toBe("owner");
  });
});

describe("isManagerFromAccountType", () => {
  it("is true only for the manager enum value", () => {
    expect(isManagerFromAccountType("manager")).toBe(true);
  });

  it("is false for owner, missing, and invalid values", () => {
    expect(isManagerFromAccountType("owner")).toBe(false);
    expect(isManagerFromAccountType(undefined)).toBe(false);
    expect(isManagerFromAccountType("admin")).toBe(false);
    expect(isManagerFromAccountType("manager ")).toBe(false);
  });
});
