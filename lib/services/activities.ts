import "server-only"; // C1 — server-side only, never shipped to the browser
import { and, asc, desc, eq, inArray } from "drizzle-orm";
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

// Returns the audit rows for a single managed client's scope, newest first.
//
// Why a separate reader from listActivities?
//   listActivities filters by the caller's OWN org (ctx.orgId) — correct for the
//   Standard "your organisation" activity page. But a manager's client lives under a
//   DIFFERENT org (client.orgId), so that contract can't reach it. This reader takes
//   the scope explicitly instead.
//
// Scoping (org-first, then property fallback):
//   - scope.orgId set        → all rows for that org (catches org-level rows whose
//                              propertyId is null, e.g. some change-request events).
//   - else scope.propertyIds → rows for those properties (own-portfolio / null-org /
//                              legacy clients, whose properties sit in the manager's org).
//   - neither                → returns nothing. It NEVER falls back to the whole table,
//                              so an empty scope can't leak another org's activity.
//
// The caller (getClientPortfolioData) only ever passes an org / property set it has
// already resolved as belonging to a client the manager manages — same trust model as
// the rest of the client-scoped slice.
export async function listActivitiesForScope(
  scope: { orgId?: string; propertyIds?: string[] },
  limit = 50,
): Promise<Activity[]> {
  let where;
  if (scope.orgId) {
    where = eq(activities.orgId, scope.orgId);
  } else if (scope.propertyIds && scope.propertyIds.length > 0) {
    where = inArray(activities.propertyId, scope.propertyIds);
  } else {
    // No scope → return nothing rather than the whole table (C3 — never leak).
    return [];
  }

  const rows = await db
    .select()
    .from(activities)
    .where(where)
    .orderBy(desc(activities.createdAt), asc(activities.id)) // newest first
    .limit(limit);

  return rows.map(rowToActivity);
}
