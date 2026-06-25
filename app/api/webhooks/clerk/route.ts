import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import { log } from "@/lib/log";
import {
  upsertOrg,
  upsertUser,
  upsertMembership,
  removeMembership,
  deactivateOrg,
  deactivateUser,
} from "@/lib/services/identity-sync";

// The ONLY writer of the Clerk→Postgres identity mirror (D14, §4 clerk-organizations.md).
// verifyWebhook reads CLERK_WEBHOOK_SIGNING_SECRET from env automatically.
// Always 2xx on success/no-op; Clerk retries on non-2xx (§5 idempotency).
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
      await upsertUser({
        id: d.id as string,
        primaryEmail: primary?.email_address ?? `${d.id}@unknown.clerk`,
        displayName: [d.first_name, d.last_name].filter(Boolean).join(" ") || null,
        avatarUrl: (d.image_url as string | null) ?? null,
      });
      break;
    }

    case "organizationMembership.created":
    case "organizationMembership.updated": {
      const org = d.organization as { id: string };
      const pub = d.public_user_data as { user_id: string };
      await upsertMembership({ clerkOrgId: org.id, clerkUserId: pub.user_id, role: d.role as string });
      break;
    }

    case "organizationMembership.deleted": {
      const org = d.organization as { id: string };
      const pub = d.public_user_data as { user_id: string };
      await removeMembership({ clerkOrgId: org.id, clerkUserId: pub.user_id });
      break;
    }

    // M2: org/user deleted in Clerk → deactivate memberships, never hard-delete tenant data.
    case "organization.deleted":
      await deactivateOrg(d.id as string);
      break;

    case "user.deleted":
      await deactivateUser(d.id as string);
      break;
  }

  return new Response("ok", { status: 200 });
}
