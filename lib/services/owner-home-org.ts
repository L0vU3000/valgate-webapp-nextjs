import "server-only";
import { and, eq } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db/client";
import { organizationMemberships, organizations, users } from "@/lib/db/schema";
import { assertCanMutate } from "@/lib/services/_mapping";
import { upsertMembership, upsertOrg } from "@/lib/services/identity-sync";
import { log } from "@/lib/log";

/**
 * Build a human-readable name for an owner's personal workspace.
 *
 * What could go wrong: display name or email can be missing. We always return
 * a non-empty string so Clerk's createOrganization call has a valid name.
 */
export function ownerHomeOrgName(
  displayName: string | null | undefined,
  primaryEmail: string,
): string {
  const trimmed = displayName?.trim();
  if (trimmed) {
    const firstName = trimmed.split(/\s+/)[0];
    if (firstName) return `${firstName}'s Workspace`;
  }
  const localPart = primaryEmail.split("@")[0]?.trim();
  if (localPart) return `${localPart}'s Workspace`;
  return "My Workspace";
}

/**
 * Pick the Clerk membership we should treat as the owner's home workspace.
 *
 * Prefer an admin membership (they own that org). If none exists, use the
 * first membership in the list. The caller must pass a non-empty list.
 */
function pickPreferredClerkMembership<T extends { role: string }>(
  memberships: T[],
): T {
  const adminMembership = memberships.find((membership) => membership.role === "org:admin");
  if (adminMembership) return adminMembership;
  return memberships[0];
}

/**
 * Load this Clerk user's active Neon membership's Clerk org id, if any.
 *
 * What could go wrong: a `removed` membership must not count — `/api/v1`
 * only accepts status = "active".
 */
async function findActiveMembershipClerkOrgId(valgateUserId: string): Promise<string | null> {
  const [membership] = await db
    .select({ clerkOrgId: organizations.clerkOrgId })
    .from(organizationMemberships)
    .innerJoin(organizations, eq(organizations.id, organizationMemberships.orgId))
    .where(
      and(
        eq(organizationMemberships.userId, valgateUserId),
        eq(organizationMemberships.status, "active"),
      ),
    )
    .limit(1);

  return membership?.clerkOrgId ?? null;
}

/**
 * Ensures a consumer owner has a Valgate org + active membership in Neon.
 *
 * Why this exists: the Clerk webhook already created a `users` row on
 * `user.created`, but it only created a workspace for managers
 * (`ensureManagerHomeOrganizationForClerkUser`). iOS ClerkKit sign-in does
 * not run the web JIT path, and `/api/v1` must not auto-provision. Without
 * this helper, `ctxFromMcpAuth(..., { provisionIfMissing: false })` fails
 * on zero active memberships → 401.
 *
 * Steps, in order:
 * 1. If the Neon user is missing, do nothing (caller upserts the user first).
 * 2. If the user is a manager, do nothing (the manager helper owns that path).
 * 3. If an active Neon membership already exists, return that Clerk org id.
 * 4. If Clerk already has org memberships, mirror each of them via identity-sync.
 * 5. If Clerk has zero orgs, create a personal Clerk org and mirror it.
 *
 * All Neon writes go through `upsertOrg` / `upsertMembership` — no second
 * identity writer. Idempotent: a second call hits step 3 and returns.
 *
 * What could go wrong: Clerk API errors, or DEMO_MODE blocking the org create
 * (`assertCanMutate`). Callers (the webhook) catch and log so the webhook
 * can still return 2xx.
 */
export async function ensureOwnerHomeOrganizationForClerkUser(
  clerkUserId: string,
): Promise<string | null> {
  if (!clerkUserId) {
    log.warn("owner-home-org.missing_clerk_user_id");
    return null;
  }

  const [user] = await db
    .select({
      id: users.id,
      isManager: users.isManager,
      displayName: users.displayName,
      primaryEmail: users.primaryEmail,
    })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);

  if (!user) {
    log.warn("owner-home-org.user_row_missing", { clerkUserId });
    return null;
  }

  if (user.isManager) {
    return null;
  }

  const existingClerkOrgId = await findActiveMembershipClerkOrgId(user.id);
  if (existingClerkOrgId) {
    return existingClerkOrgId;
  }

  const client = await clerkClient();
  let clerkMemberships: Array<{
    role: string;
    organization: { id: string; name: string; slug: string | null };
  }>;

  try {
    const list = await client.users.getOrganizationMembershipList({
      userId: clerkUserId,
      limit: 100,
    });
    clerkMemberships = list.data.map((membership) => ({
      role: membership.role,
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug ?? null,
      },
    }));
  } catch (err) {
    log.error("owner-home-org.list_memberships_failed", err, { clerkUserId });
    throw err;
  }

  if (clerkMemberships.length > 0) {
    for (const membership of clerkMemberships) {
      await upsertOrg({
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
      });
      await upsertMembership({
        clerkOrgId: membership.organization.id,
        clerkUserId,
        role: membership.role,
      });
    }
    const preferred = pickPreferredClerkMembership(clerkMemberships);
    log.info("owner-home-org.mirrored_existing_clerk_orgs", {
      clerkUserId,
      clerkOrgId: preferred.organization.id,
      count: clerkMemberships.length,
    });
    return preferred.organization.id;
  }

  assertCanMutate();

  const orgName = ownerHomeOrgName(user.displayName, user.primaryEmail);
  let clerkOrg: { id: string; name: string };

  try {
    clerkOrg = await client.organizations.createOrganization({
      name: orgName,
      createdBy: clerkUserId,
    });
  } catch (err) {
    log.error("owner-home-org.create_clerk_org_failed", err, { clerkUserId });
    throw err;
  }

  await upsertOrg({ id: clerkOrg.id, name: clerkOrg.name ?? orgName });
  await upsertMembership({
    clerkOrgId: clerkOrg.id,
    clerkUserId,
    role: "org:admin",
  });

  log.info("owner-home-org.created_home_org", {
    clerkUserId,
    clerkOrgId: clerkOrg.id,
  });

  return clerkOrg.id;
}
