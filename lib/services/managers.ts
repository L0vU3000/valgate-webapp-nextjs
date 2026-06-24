import "server-only"; // C1: never bundle DB access into a client component
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import type { Ctx } from "@/lib/services/_mapping";

// Pro-2.x manager identity. One tiny read for now; the request/approve services
// (Pro-2.2+) will live here too.

/**
 * Returns true when the signed-in user is flagged as a portfolio Manager.
 *
 * Reads users.is_manager for ctx.userId (the internal USR-id resolved by
 * requireCtx). Owners default to false, so existing accounts are unaffected.
 *
 * What could go wrong: if the user row is somehow missing we return false
 * (safe default — treat as a normal owner) rather than throwing, so a missing
 * mirror row never hard-errors a page load.
 */
export async function getIsManager(ctx: Ctx): Promise<boolean> {
  const [row] = await db
    .select({ isManager: users.isManager })
    .from(users)
    .where(eq(users.id, ctx.userId))
    .limit(1);

  return row?.isManager ?? false;
}
