import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { requireCtx } from "@/lib/auth/ctx";
import { getIsManager, ensureManagerHomeOrganizationForClerkUser } from "@/lib/services/managers";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

// Root layout for the (pro) route group — the Manager cockpit (Pro-2.x).
//
// Access rule:
//   • DEMO_MODE  → open. The hosted/dev demo is a full-access sandbox (the e2e
//     DEMO suite drives /pro as the demo owner), so we keep it reachable there.
//   • real auth  → managers only. Non-managers (normal owners) get notFound(),
//     so /pro is invisible to them in every environment, prod included.
//
// This is a UI gate (defence-in-depth). The service layer is the enforcement of
// record; cross-org grants arrive in Pro-2.2.

export default async function ProLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Demo sandbox stays open without an is_manager check.
  if (env.DEMO_MODE) {
    return children;
  }

  // Real auth: only flagged managers may enter the cockpit.
  const ctx = await requireCtx();
  if (!(await getIsManager(ctx))) {
    notFound();
  }

  const { userId } = await auth();
  if (userId) {
    try {
      await ensureManagerHomeOrganizationForClerkUser(userId);
    } catch (err) {
      logger.error("pro layout: ensure manager home org failed", { error: String(err) });
    }
  }

  return children;
}
