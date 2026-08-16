export interface ClerkMembership {
  organization: { id: string };
  role: string;
}

/**
 * Selects the best organization to activate for a user.
 * Priority:
 * 1. Organization where the user is an admin.
 * 2. The first available organization.
 * 
 * @param memberships List of organization memberships the user has.
 * @returns The ID of the selected organization, or null if none available.
 */
export function selectBestOrganization(memberships: ClerkMembership[] | null | undefined): string | null {
  if (!memberships || memberships.length === 0) {
    return null;
  }

  const adminMembership = memberships.find((m) => m.role === "org:admin");

  if (adminMembership) {
    return adminMembership.organization.id;
  }

  return memberships[0].organization.id;
}
