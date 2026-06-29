import "server-only"; // C1 — server-only, never shipped to the browser.

// logActivity — writes one audit row to the `activities` table whenever something changes.
//
// If the event matches one of the 7 original estate/document/successor kinds, it ALSO
// writes a row to estate_activity_events (the "dual-write"), so the existing estate
// timeline (listEstateActivityEvents) continues to show those events without any change.
//
// Old behaviour: threw an error for unsupported (entity, action) pairs.
// New behaviour: ALWAYS writes to activities (no throw); estate write is a bonus.
//
// How callers should use this:
//   // Wrap in try/catch so an audit failure can never roll back the real mutation.
//   try {
//     await logActivity(ctx, { entity: "payment", action: "created", summary: "..." });
//   } catch (err) {
//     console.error("audit log failed", err);
//   }

import { db } from "@/lib/db/client";
import { activities, estateActivityEvents } from "@/lib/db/schema";
import { assertCanMutate, toDomain, type Ctx } from "@/lib/services/_mapping";
import { requireMember, scopedInsert } from "@/lib/services/_crud";
import {
  EstateActivityEventSchema,
  type EstateActivityEvent,
} from "@/lib/data/types/estate-activity-event";

// The 7 kinds the estate_activity_events table still accepts (mirrors the pg enum).
// We only need this type internally for the dual-write path.
type EstateKind =
  | "successor.created"
  | "successor.updated"
  | "successor.deleted"
  | "successor.assigned"
  | "document.added"
  | "document.removed"
  | "estate.reviewed";

// What callers pass in.
// entity and action are now plain strings — no longer locked to the 7 estate variants.
// This means any new event type ("payment", "folder", "photo", etc.) works without
// a schema change or a code change here.
export type LogActivityInput = {
  // What kind of thing changed, e.g. "property", "payment", "photo", "workOrder".
  entity: string;
  // What happened, e.g. "created", "updated", "deleted", "added", "removed".
  action: string;
  // The id of the specific record that changed (e.g. "PROP-0001"). Optional.
  entityId?: string;
  // Short human-readable description shown in activity feeds.
  summary: string;
  // Optional: which property this activity is about, for per-property filtering.
  propertyId?: string;
};

// Maps an (entity, action) string pair to one of the 7 estate kinds, or null.
// Returns null for anything that isn't an estate/document/successor event — those
// go to activities only, not estate_activity_events.
function resolveEstateKind(entity: string, action: string): EstateKind | null {
  const lookup: Record<string, EstateKind> = {
    "successor.created":  "successor.created",
    "successor.updated":  "successor.updated",
    "successor.deleted":  "successor.deleted",
    "successor.assigned": "successor.assigned",
    "document.added":     "document.added",
    "document.removed":   "document.removed",
    "estate.reviewed":    "estate.reviewed",
  };
  return lookup[`${entity}.${action}`] ?? null;
}

// Needed by scopedInsert for the estate dual-write path.
function rowToEstateActivityEvent(
  row: typeof estateActivityEvents.$inferSelect,
): EstateActivityEvent {
  return EstateActivityEventSchema.parse(toDomain(estateActivityEvents, row));
}

// Writes one audit row to the activities table. Call this from inside a Server Action
// AFTER the real change has succeeded, wrapped in try/catch.
export async function logActivity(ctx: Ctx, input: LogActivityInput): Promise<void> {
  // Same guards as scopedInsert: refuse in demo mode (D9) and require member role.
  assertCanMutate();
  requireMember(ctx);

  // Build a short title for the feed, e.g. "payment.created — LEASE-0003".
  const entityAction = `${input.entity}.${input.action}`;
  const title = input.entityId ? `${entityAction} — ${input.entityId}` : entityAction;

  // 1. Write to the general activities table.
  //    Uses a UUID id ($defaultFn on the schema) — no counter lock, no "ACT" collection.
  //    Drizzle calls crypto.randomUUID() automatically because we don't supply id here.
  await db.insert(activities).values({
    orgId:       ctx.orgId,
    userId:      ctx.userId,
    entity:      input.entity,
    action:      input.action,
    entityId:    input.entityId,
    title,
    description: input.summary,
    propertyId:  input.propertyId,
  });

  // 2. Dual-write to estate_activity_events for the 7 original kinds.
  //    This keeps listEstateActivityEvents and the estate timeline un-regressed.
  //    scopedInsert re-runs assertCanMutate + requireMember (idempotent) and uses
  //    the "ESTAT" counter to generate a prefixed id like "ESTAT-0012".
  const estateKind = resolveEstateKind(input.entity, input.action);
  if (estateKind !== null) {
    await scopedInsert(
      ctx,
      estateActivityEvents,
      "ESTAT",
      {
        kind:        estateKind,
        title,
        description: input.summary,
        propertyId:  input.propertyId,
      },
      rowToEstateActivityEvent,
    );
  }
}
