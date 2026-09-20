import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { clerkClient } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { log } from "@/lib/log";
import {
  upsertOrg,
  upsertUser,
  upsertMembership,
  removeMembership,
  deactivateOrg,
  deactivateUser,
  hasActiveMembershipForClerkUser,
} from "@/lib/services/identity-sync";
import { handleInvitationAccepted } from "@/lib/services/client-onboarding";
import { ensureManagerHomeOrganizationForClerkUser } from "@/lib/services/managers";
import { ensureOwnerHomeOrganizationForClerkUser } from "@/lib/services/owner-home-org";
import { parseAccountType, type AccountType } from "@/lib/auth/account-type";

// The ONLY writer of the Clerk→Postgres identity mirror (D14, §4 clerk-organizations.md).
// verifyWebhook reads CLERK_WEBHOOK_SIGNING_SECRET from env automatically.
// Always 2xx on success/no-op; Clerk retries on non-2xx (§5 idempotency).

/**
 * After the Neon `users` row exists, give this Clerk user an active workspace.
 *
 * Managers already had `ensureManagerHomeOrganizationForClerkUser` on
 * `user.created`. Consumer owners (the iOS path) did not — so `/api/v1`
 * with `provisionIfMissing: false` 401'd after a valid Clerk sign-in.
 *
 * What could go wrong: Clerk API is down, or DEMO_MODE blocks creating an org.
 * We log and swallow so this webhook still returns 2xx. Clerk retries on
 * 4xx/5xx; a transient blip should not retry forever.
 */
async function ensureWorkspaceForClerkUser(
  clerkUserId: string,
  accountType: AccountType,
): Promise<void> {
  try {
    if (accountType === "manager") {
      await ensureManagerHomeOrganizationForClerkUser(clerkUserId);
      return;
    }
    await ensureOwnerHomeOrganizationForClerkUser(clerkUserId);
  } catch (err) {
    log.warn("clerk.webhook.ensure_workspace failed", {
      clerkUserId,
      accountType,
      error: err instanceof Error ? err.name : "unknown",
    });
  }
}

/**
 * Copy a Clerk user payload into Neon, then ensure they have an active membership.
 *
 * Shared by `user.created`, `user.updated`, and the `session.created` catch-up
 * so every path writes BOTH the `users` row and an `organization_memberships` row.
 */
async function upsertUserAndEnsureWorkspace(input: {
  clerkUserId: string;
  primaryEmail: string;
  displayName: string | null;
  avatarUrl: string | null;
  accountType: AccountType;
}): Promise<void> {
  await upsertUser({
    id: input.clerkUserId,
    primaryEmail: input.primaryEmail,
    displayName: input.displayName,
    avatarUrl: input.avatarUrl,
    // Only honoured on first INSERT (sticky in upsertUser). The webhook is the
    // authoritative first writer; subsequent replays leave is_manager unchanged.
    isManager: input.accountType === "manager",
  });
  await ensureWorkspaceForClerkUser(input.clerkUserId, input.accountType);
}

/**
 * Catch-up for Clerk users who signed in before this webhook wrote a membership
 * (the existing iOS test account: `user.created` already fired, or never hit us).
 *
 * Fast path: if Neon already has a user + active membership, do nothing.
 * Slow path: load the Clerk user, upsert, then ensure a workspace.
 *
 * What could go wrong: missing Clerk secret or a deleted user. We log and
 * leave the webhook 2xx so Clerk does not retry a permanent failure forever.
 */
async function catchUpIdentityFromSession(clerkUserId: string): Promise<void> {
  const alreadyProvisioned = await hasActiveMembershipForClerkUser(clerkUserId);
  if (alreadyProvisioned) return;

  try {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(clerkUserId);
    const accountType = parseAccountType(clerkUser.unsafeMetadata?.accountType);
    const primaryEmail =
      clerkUser.emailAddresses[0]?.emailAddress ?? `${clerkUserId}@unknown.clerk`;
    await upsertUserAndEnsureWorkspace({
      clerkUserId,
      primaryEmail,
      displayName: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null,
      avatarUrl: clerkUser.imageUrl ?? null,
      accountType,
    });
  } catch (err) {
    log.warn("clerk.webhook.session_catchup failed", {
      clerkUserId,
      error: err instanceof Error ? err.name : "unknown",
    });
  }
}

export async function POST(req: NextRequest) {
  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch (err) {
    log.warn("clerk.webhook.bad_signature", { error: err instanceof Error ? err.name : "unknown" });
    return new Response("bad signature", { status: 400 });
  }

  const d = evt.data as unknown as Record<string, unknown>;

  switch (evt.type) {
    case "organization.created":
    case "organization.updated":
      await upsertOrg({ id: d.id as string, name: d.name as string, slug: d.slug as string | null });
      break;

    case "user.created":
    case "user.updated": {
      const emails = (d.email_addresses as Array<{ id: string; email_address: string }>) ?? [];
      const primary = emails.find((e) => e.id === d.primary_email_address_id) ?? emails[0];
      // unsafe_metadata is the webhook field name for what the frontend sets as unsafeMetadata.
      const unsafeMeta = (d.unsafe_metadata as Record<string, unknown> | null) ?? {};
      // Parse through the Zod enum at this boundary. Invalid values become "owner"
      // so a user-controlled string cannot grant manager and this handler stays 2xx.
      const accountType = parseAccountType(unsafeMeta.accountType);
      await upsertUserAndEnsureWorkspace({
        clerkUserId: d.id as string,
        primaryEmail: primary?.email_address ?? `${d.id}@unknown.clerk`,
        displayName: [d.first_name, d.last_name].filter(Boolean).join(" ") || null,
        avatarUrl: (d.image_url as string | null) ?? null,
        accountType,
      });
      break;
    }

    // Existing iOS sessions: user.created may already have been delivered (or
    // missed) before we started writing owner memberships. Sign-in fires this.
    case "session.created": {
      const clerkUserId = typeof d.user_id === "string" ? d.user_id : "";
      if (clerkUserId) {
        await catchUpIdentityFromSession(clerkUserId);
      }
      break;
    }

    case "organizationMembership.created":
    case "organizationMembership.updated": {
      const org = d.organization as { id?: string; name?: string; slug?: string | null };
      const pub = d.public_user_data as { user_id?: string };
      const clerkOrgId = org?.id;
      const clerkUserId = pub?.user_id;
      if (!clerkOrgId || !clerkUserId) {
        log.warn("clerk.webhook.membership_missing_ids", { type: evt.type });
        break;
      }
      // Upsert the org first so a membership event that arrives before
      // organization.created does not throw inside ourOrgId().
      await upsertOrg({
        id: clerkOrgId,
        name: org.name ?? clerkOrgId,
        slug: org.slug ?? null,
      });
      await upsertMembership({
        clerkOrgId,
        clerkUserId,
        role: (d.role as string) ?? "org:member",
      });
      break;
    }

    case "organizationMembership.deleted": {
      const org = d.organization as { id: string };
      const pub = d.public_user_data as { user_id: string };
      await removeMembership({ clerkOrgId: org.id, clerkUserId: pub.user_id });
      break;
    }

    // M2: org/user deleted in Clerk → deactivate memberships, never hard-delete tenant data.
    case "organizationInvitation.accepted":
      await handleInvitationAccepted(d.id as string);
      break;

    case "organization.deleted":
      await deactivateOrg(d.id as string);
      break;

    case "user.deleted":
      await deactivateUser(d.id as string);
      break;
  }

  return new Response("ok", { status: 200 });
}
