import { describe, it, expect } from "vitest";
import { selectBestOrganization, ClerkMembership } from "./org-utils";

describe("selectBestOrganization", () => {
  it("returns null for empty or null membership lists", () => {
    expect(selectBestOrganization(null)).toBeNull();
    expect(selectBestOrganization(undefined)).toBeNull();
    expect(selectBestOrganization([])).toBeNull();
  });

  it("selects the organization where the user is an admin", () => {
    const memberships: ClerkMembership[] = [
      { organization: { id: "org_1" }, role: "org:member" },
      { organization: { id: "org_2" }, role: "org:admin" },
      { organization: { id: "org_3" }, role: "org:member" },
    ];
    expect(selectBestOrganization(memberships)).toBe("org_2");
  });

  it("falls back to the first membership if no admin is found", () => {
    const memberships: ClerkMembership[] = [
      { organization: { id: "org_1" }, role: "org:member" },
      { organization: { id: "org_2" }, role: "org:member" },
    ];
    expect(selectBestOrganization(memberships)).toBe("org_1");
  });

  it("handles multiple admins by picking the first one", () => {
    const memberships: ClerkMembership[] = [
      { organization: { id: "org_1" }, role: "org:admin" },
      { organization: { id: "org_2" }, role: "org:admin" },
    ];
    expect(selectBestOrganization(memberships)).toBe("org_1");
  });
});
