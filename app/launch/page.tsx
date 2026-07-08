import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { requireCtx } from "@/lib/auth/ctx";
import { getIsManager, ensureManagerHomeOrganizationForClerkUser } from "@/lib/services/managers";
import { upsertUser } from "@/lib/services/identity-sync";
import { completePendingHandoffsForUser } from "@/lib/services/client-onboarding";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { resolveRedirectUrl } from "@/app/(auth)/_lib/resolve-redirect-url";

// /launch is the post-auth landing decider: managers go to the Pro cockpit,
// owners go to their portfolio map. This avoids baking role logic into the
// sign-in/up finalize callbacks, which can't read the DB.
//
// What could go wrong: requireCtx throws "unauthenticated" if the session
// cookie isn't present yet — in practice Clerk finalize() sets the cookie
// before redirecting here, so this is only reachable by authenticated users.
export default async function LaunchPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const { userId, orgId } = await auth();
  if (!userId) redirect("/login");

  const { redirect_url: rawRedirectUrl } = await searchParams;

  if (!orgId) {
    const [user] = await db
      .select({ isManager: users.isManager })
      .from(users)
      .where(eq(users.clerkUserId, userId))
      .limit(1);

    const clerkUser = user ? null : await currentUser();
    const isManager =
      user?.isManager ?? clerkUser?.unsafeMetadata?.accountType === "manager";

    // Carry the original redirect_url through the org-selection bounce by
    // nesting it inside the /launch URL we send /login/tasks back to —
    // once an org is active, /launch runs again below with the same
    // rawRedirectUrl and can honor it directly.
    const launchWithRedirect = rawRedirectUrl
      ? `/launch?redirect_url=${encodeURIComponent(rawRedirectUrl)}`
      : "/launch";

    if (isManager) {
      if (!user && clerkUser) {
        await upsertUser({
          id: userId,
          primaryEmail:
            clerkUser.emailAddresses[0]?.emailAddress ?? `${userId}@pending.clerk`,
          displayName:
            [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null,
          avatarUrl: clerkUser.imageUrl ?? null,
          isManager: true,
        });
      }
      try {
        await ensureManagerHomeOrganizationForClerkUser(userId);
      } catch (err) {
        logger.error("launch: ensure manager home org failed", { error: String(err) });
      }
      redirect(`/login/tasks?redirect_url=${encodeURIComponent(launchWithRedirect)}`);
    }

    redirect(`/login/tasks?redirect_url=${encodeURIComponent(launchWithRedirect)}`);
  }

  const ctx = await requireCtx();
  const isManager = await getIsManager(ctx);

  if (isManager) {
    redirect(resolveRedirectUrl(rawRedirectUrl, "/pro/dashboard"));
  } else {
    // Fallback: if the organizationInvitation.accepted Clerk webhook didn't fire
    // (or hasn't arrived yet), complete any pending handoffs for this user so the
    // manager sees the correct "Active" status and receives a notification.
    try {
      const { completed } = await completePendingHandoffsForUser(userId);
      if (completed > 0) {
        logger.info("launch: completed pending handoffs via fallback", { userId, completed });
      }
    } catch (err) {
      logger.warn("launch: completePendingHandoffsForUser failed", { error: String(err) });
    }
    redirect(resolveRedirectUrl(rawRedirectUrl, "/"));
  }
}
