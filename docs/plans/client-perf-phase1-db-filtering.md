# Phase 1 — Push Filtering into the Database

- **Plan ID:** `plan-4ca4bf0139004604`
- **Hosted:** https://plan.agent-native.com/plans/plan-4ca4bf0139004604
- **Status:** approved (decisions locked, ready for Sonnet execution)
- **Part of:** the 4-phase client performance plan. This is Phase 1. Later: 2) React `cache()`, 3) `unstable_cache`/tags, 4) Redis (only if measured). Skeletons are a separate parallel track.

---

## Objective

Property pages currently load **every** row the org owns for ~17 entity types (all
leases, all payments, all tenants, all documents…), then discard ~99% of it in
JavaScript to show **one** property. Move the filtering down into the SQL `WHERE`
clause so each page fetches only the rows it renders.

`getOverviewPageData(propertyId)` does 17 full-collection loads + 16 `.filter()`
passes. Add `WHERE property_id = $1` and the queries return a handful of rows instead
of thousands.

**Why Phase 1 (not caching):** caching a slow query just makes it repeat faster.
Fixing the query is the real win, needs zero new infra, and every later phase sits on
top of cheaper queries. Low risk — change is to internal service function signatures,
not any public API, wire format, or DB schema.

## The reuse insight

The pattern already exists. Three services already accept an optional filter:
- `listLeases(ctx, propertyId?)` — `lib/services/leases.ts:13`
- `listMaintenanceItems(ctx, propertyId?)` — `lib/services/maintenance-items.ts:13`
- `listActivities(ctx, propertyId, limit)` — already called filtered

Every service is already **org-scoped** (`WHERE org_id = ctx.orgId`) — that stays.
What's missing is the **second** filter (`property_id` / `client_id`). The query
loaders just aren't passing the argument yet. This phase finishes a half-built
pattern.

## Service inventory

| Service | Filter param today? | Phase-1 change |
|---|---|---|
| leases.ts | ✅ `listLeases(ctx, propertyId?)` | none |
| maintenance-items.ts | ✅ `listMaintenanceItems(ctx, propertyId?)` | none |
| activities.ts | ✅ `listActivities(ctx, propertyId, limit)` | none |
| property-valuations.ts | ❌ | add optional `propertyId` param |
| tenants.ts | ❌ | add optional `propertyId` param |
| expenses.ts | ❌ | add optional `propertyId` param |
| ownership-records.ts | ❌ | add optional `propertyId` param |
| co-owners.ts | ❌ | add optional `propertyId` param |
| ownership-documents.ts | ❌ | add optional `propertyId` param |
| safety-risks.ts | ❌ | add optional `propertyId` param |
| inspections.ts | ❌ | add optional `propertyId` param |
| certifications.ts | ❌ | add optional `propertyId` param |
| emergency-contacts.ts | ❌ | add optional `propertyId` param |
| estate-assignments.ts | ❌ | add optional `propertyId` param |
| documents.ts | ❌ | add optional `propertyId` param |
| payments.ts | ⚠️ filters by `leaseId`, not `propertyId` | see decision |
| notifications.ts | ⚠️ matched via `propertyId` OR `linkTo` regex | stays JS-filtered (the exception) |

## Decisions (LOCKED)

1. **Payments → Option B.** Add an optional `propertyId` param to `listPayments` and
   filter on `payments.property_id` directly (column exists: `createPayment` stores it
   at `lib/services/payments.ts:37`). Keeps all 17 loads in one parallel `Promise.all`.
   **Include the one-time backfill** for legacy payments with NULL `property_id` (set it
   from their lease) so none are missed.
2. **Notifications → stays JS-filtered.** Keep `listNotifications(authCtx)` (no DB
   filter) + the existing `notificationMatchesProperty()` match in the loader, because a
   notification references a property via `property_id` OR a `linkTo` URL regex. The one
   intentional exception.
3. **Scope → property tabs first, then measure.** Ship the 8 `property/[id]` tabs,
   confirm the row-count/latency win, then fast-follow portfolio, analytics, Pro cockpit.
   Do not bundle all loaders into the first cut.

## Code stubs

Service pattern to copy (already ships as `listLeases`):

```typescript
// Lists inspections for the org. When propertyId is given, the database
// filters to that one property instead of returning the whole org's rows.
export async function listInspections(ctx: Ctx, propertyId?: string): Promise<Inspection[]> {
  const rows = await db.select().from(inspections)
    .where(propertyId
      ? and(eq(inspections.orgId, ctx.orgId), eq(inspections.propertyId, propertyId))
      : eq(inspections.orgId, ctx.orgId))
    .orderBy(asc(inspections.createdAt), asc(inspections.id))
    .limit(500);
  return rows.map(rowToInspection);
}
```

Loader after (pass `propertyId`, delete the `.filter()` passes):

```typescript
const [valuations, leases, tenants, payments, expenses,
  allNotifications, maintenanceItems, /* …11 more */ ] = await Promise.all([
  listPropertyValuations(authCtx, propertyId),
  listLeases(authCtx, propertyId),
  listTenants(authCtx, propertyId),
  listPayments(authCtx, undefined, propertyId), // Option B
  listExpenses(authCtx, propertyId),
  listNotifications(authCtx),                    // the one exception
  listMaintenanceItems(authCtx, propertyId),
  // …
]);
return {
  valuations, leases, tenants, payments,
  notifications: allNotifications.filter((n) => notificationMatchesProperty(n, propertyId)),
  // …other entities returned as-is, no .filter()
};
```

## Steps

1. Confirm the payments decision (Option B + NULL-backfill check).
2. Add optional `propertyId` param + ternary `WHERE` to the 13 ❌ services (copy the
   `listLeases` pattern; one backend comment per function).
3. Update `getOverviewPageData()` to pass `propertyId`; delete the `.filter()` passes
   (keep only the notifications match).
4. Repeat the loader change for the other 7 property tabs' `queries.ts`.
5. Fast-follow: portfolio, analytics, Pro cockpit loaders (Pro uses `clientId`).
6. `tsc` + service tests; spot-check two pages render identical data.

## Files touched

- `lib/services/{property-valuations,tenants,expenses,ownership-records,co-owners,ownership-documents,safety-risks,inspections,certifications,emergency-contacts,estate-assignments,documents,payments}.ts` — `+ optional propertyId param`
- `app/(shell)/property/[id]/{overview,rental,financials,location,ownership,safety,valuation,documents,edit}/queries.ts` — pass propertyId, drop `.filter()`
- `app/(shell)/portfolio/queries.ts`, `app/(shell)/analytics/queries.ts` — fast-follow
- `app/(pro)/pro/queries.ts` — fast-follow (clientId scoping)

## Verification

No schema migration — verify parity + speed:

1. `npx tsc --noEmit` green (optional params don't break callers).
2. `npm run test` — `lib/services/properties.test.ts` + leases tests pass; add one
   assertion that `listInspections(ctx, propertyId)` returns only that property's rows.
3. Data parity: overview + rental tabs render identical numbers/lists before/after.
   Only edge: payments with NULL `property_id` (covered by backfill).
4. Speed sanity: row counts per query drop from hundreds to single digits.

## Explicitly deferred (not this phase)

React `cache()` (Phase 2) · `unstable_cache`/tags (Phase 3) · Redis (Phase 4, if
measured) · skeletons/`loading.tsx` (separate track) · pagination (the `.limit(500)`
cap stays; filtering makes it a non-issue per-property).
