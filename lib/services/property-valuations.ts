import "server-only"; // C1
import { and, asc, eq, gt, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { propertyValuations } from "@/lib/db/schema";
import { encodeCursor, decodeCursor } from "@/lib/pagination/cursor";
import { PropertyValuationSchema, type PropertyValuation } from "@/lib/data/types/property-valuation";
import type { NewPropertyValuation, PropertyValuationPatch } from "@/lib/data/types/property-valuation";
import { toDomain, type Ctx } from "@/lib/services/_mapping";
import { scopedInsert, scopedUpdate, scopedDelete } from "@/lib/services/_crud";

const rowToPropertyValuation = (r: typeof propertyValuations.$inferSelect): PropertyValuation =>
  PropertyValuationSchema.parse(toDomain(propertyValuations, r)); // C6/C7

export async function listPropertyValuations(ctx: Ctx, propertyId?: string): Promise<PropertyValuation[]> {
  const rows = await db.select().from(propertyValuations)
    .where(propertyId
      ? and(eq(propertyValuations.orgId, ctx.orgId), eq(propertyValuations.propertyId, propertyId))
      : eq(propertyValuations.orgId, ctx.orgId)) // C3
    .orderBy(asc(propertyValuations.recordedAt), asc(propertyValuations.id))
    .limit(500)
  return rows.map(rowToPropertyValuation);
}

// Cursor shape for listPropertyValuationsPage — the same (recordedAt, id) tuple
// listPropertyValuations already orders by, so pagination is a straight "give me rows after
// this tuple" query (never fetch-then-slice). id is a tie-breaker for same-millisecond
// recordedAt collisions.
type PropertyValuationPageCursor = { recordedAt: number; id: string };
const VALUATION_CURSOR_KEYS: (keyof PropertyValuationPageCursor)[] = ["recordedAt", "id"];

export type PropertyValuationPage = { items: PropertyValuation[]; nextCursor: string | null };

// HTTP API v1's paginated list (GET /api/v1/properties/{id}/valuations). Keeps
// listPropertyValuations's 500-row cap untouched for existing callers; this is the real,
// opaque-cursor, org-scoped alternative for a caller that needs to walk one property's
// valuation history page by page.
export async function listPropertyValuationsPage(
  ctx: Ctx,
  propertyId: string,
  opts: { limit: number; cursor?: string | null },
): Promise<PropertyValuationPage> {
  const { limit, cursor } = opts;
  const conditions = [
    eq(propertyValuations.orgId, ctx.orgId), // C3
    eq(propertyValuations.propertyId, propertyId),
  ];

  if (cursor) {
    const decoded = decodeCursor<PropertyValuationPageCursor>(cursor, VALUATION_CURSOR_KEYS);
    // decodeCursor only proves the two keys are present; a tampered/foreign cursor can still
    // carry the wrong runtime types (or a JSON number that overflowed to Infinity/-Infinity on
    // parse). Validate exactly before it ever reaches a query: recordedAt must be a finite
    // nonnegative number, id a nonempty string. No DB round-trip happens for a rejected cursor.
    if (
      !decoded ||
      typeof decoded.recordedAt !== "number" ||
      !Number.isFinite(decoded.recordedAt) ||
      decoded.recordedAt < 0 ||
      typeof decoded.id !== "string" ||
      decoded.id.length === 0
    ) {
      throw new Error("invalid_cursor");
    }
    const afterRecordedAt = new Date(decoded.recordedAt);
    conditions.push(
      or(
        gt(propertyValuations.recordedAt, afterRecordedAt),
        and(eq(propertyValuations.recordedAt, afterRecordedAt), gt(propertyValuations.id, decoded.id)),
      )!,
    );
  }

  // Fetch one extra row past `limit` so "is there a next page" never needs a second
  // round-trip (and never fetch-then-slice: only limit+1 rows ever leave the DB).
  const rows = await db.select().from(propertyValuations)
    .where(and(...conditions))
    .orderBy(asc(propertyValuations.recordedAt), asc(propertyValuations.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = (hasMore ? rows.slice(0, limit) : rows).map(rowToPropertyValuation);

  const last = items[items.length - 1];
  const nextCursor = hasMore && last
    ? encodeCursor<PropertyValuationPageCursor>({ recordedAt: last.recordedAt, id: last.id })
    : null;

  return { items, nextCursor };
}

export async function getPropertyValuation(ctx: Ctx, id: string): Promise<PropertyValuation | null> {
  const [row] = await db.select().from(propertyValuations)
    .where(and(eq(propertyValuations.orgId, ctx.orgId), eq(propertyValuations.id, id))); // C3
  return row ? rowToPropertyValuation(row) : null;
}

export async function createPropertyValuation(ctx: Ctx, input: NewPropertyValuation): Promise<PropertyValuation> {
  return scopedInsert(ctx, propertyValuations, "VAL", input, rowToPropertyValuation);
}

export async function updatePropertyValuation(ctx: Ctx, id: string, patch: PropertyValuationPatch): Promise<PropertyValuation | null> {
  return scopedUpdate(ctx, propertyValuations, id, patch, rowToPropertyValuation, false);
}

export async function deletePropertyValuation(ctx: Ctx, id: string): Promise<void> {
  await scopedDelete(ctx, propertyValuations, id);
}
