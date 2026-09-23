import "server-only"; // C1 — server-side only, never shipped to the browser
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { activities } from "@/lib/db/schema";
import { ActivitySchema, type Activity } from "@/lib/data/types/activity";
import { toDomain, type Ctx } from "@/lib/services/_mapping";

// Converts a raw DB row into the validated Activity domain object.
// Same pattern as rowToEstateActivityEvent in lib/services/estate-activity-events.ts.
function rowToActivity(row: typeof activities.$inferSelect): Activity {
  return ActivitySchema.parse(toDomain(activities, row));
}

// Returns the most recent audit rows for an org, newest first.
// Optionally filtered to a single property (for the per-property panel).
// The limit keeps the query cheap — this result is shown in a UI panel, not exported.
//
// How to call:
//   const ctx = await requireCtx();
//   const events = await listActivities(ctx);             // all org activity
//   const events = await listActivities(ctx, propertyId); // one property only
//   const events = await listActivities(ctx, undefined, 10); // cap at 10
export async function listActivities(
  ctx: Ctx,
  propertyId?: string,
  limit = 50,
): Promise<Activity[]> {
  const rows = await db
    .select()
    .from(activities)
    .where(
      propertyId
        // Filter to one property: org must match AND propertyId must match (C3).
        ? and(eq(activities.orgId, ctx.orgId), eq(activities.propertyId, propertyId))
        // All activity for the org — still org-scoped (C3).
        : eq(activities.orgId, ctx.orgId),
    )
    .orderBy(desc(activities.createdAt), asc(activities.id)) // newest first
    .limit(limit);

  return rows.map(rowToActivity);
}
