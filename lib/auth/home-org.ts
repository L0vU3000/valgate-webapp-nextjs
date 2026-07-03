import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { ensureManagerHomeOrganizationForClerkUser } from "@/lib/services/managers";

/**
 * Returns the Clerk org id the user should land in after sign-in.
 *
 * Managers → personal home workspace (never a client portfolio or owner grant).
 * Owners   → their admin org, or their only membership.
 */
export async function resolveDefaultHomeOrgForClerkUser(
  clerkUserId: string,
): Promise<string | null> {
  const managerHome = await ensureManagerHomeOrganizationForClerkUser(clerkUserId);
  if (managerHome) return managerHome;

  const client = await clerkClient();
  const memberships = await client.users.getOrganizationMembershipList({
    userId: clerkUserId,
    limit: 100,
  });

  if (memberships.data.length === 0) return null;

  const preferredMembership =
    memberships.data.find((membership) => membership.role === "org:admin") ??
    memberships.data[0];

  return preferredMembership.organization.id;
}
