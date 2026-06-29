# Phase 3 — Cross-Request Cache with unstable_cache + Tags

- **Plan ID:** `plan-f95de0eb04df4a79`
- **Hosted:** https://plan.agent-native.com/plans/plan-f95de0eb04df4a79
- **Status:** review (decisions locked pending open questions)
- **Part of:** the 4-phase client performance plan. Phase 1 + Phase 2 shipped. This is Phase 3. Phase 4 (Redis) deferred until measured.

---

## Objective

Phase 1 made each query **smaller**. Phase 2 deduped reads **within one request**. Phase 3 caches unchanged data **across navigations** until a mutation invalidates it.

Tab-switching on a property page re-runs every `list*` Drizzle query against Neon even when nothing changed. The write path already calls `revalidateFeTag("leases")`, `"properties"`, etc. in `app/actions/*.ts` — but **no read path uses `unstable_cache` yet**. Phase 3 connects the two halves.

## Decisions (LOCKED)

1. **Mechanism = `unstable_cache` only** — no Redis, no route `"use cache"` in cut 1.
2. **Scope = property-tab reads first** — portfolio/analytics/Pro fast-follow.
3. **Auth stays per-request** — `requireCtx()` keeps React `cache()` only; never cross-request cache auth.
4. **Tag contract = existing flat tags** (`"leases"`, `"properties"`, …). Cache keys include `orgId` (+ `propertyId` when filtered) for tenant isolation; flat tags = coarse invalidation (acceptable v1).
5. **Split ship:** (a) `cached-reads.ts` + property helpers, (b) 8 property `queries.ts` swaps, (c) portfolio + `property/actions.ts` tag alignment.
6. **Do not wrap `list*` in React `cache()`** — Phase 2 deferral stands; use `unstable_cache` at data-helper layer.

## Grounded finding

| Layer | Today |
|---|---|
| Mutations | 22 action files → `revalidateFeTag("…")` ✅ |
| Property shell actions | `revalidatePath` only — **no tag bust** ⚠️ fast-follow |
| Reads | Direct `list*` calls — **zero `unstable_cache`** |
| Per-request | Phase 2 React `cache()` on `requireCtx`, `getProperties`, etc. ✅ |

## Core implementation

**New file:** `lib/data/cached-reads.ts` — one `cachedList*` wrapper per entity, each calling existing `list*` service inside `unstable_cache` with keys `[entity, orgId, propertyId ?? "__all__"]` and tags matching actions.

**Property helpers:** add `unstable_cache` layer inside `lib/data/properties.ts` under existing React `cache()`.

**Loader swap:** property-tab `queries.ts` files import `cachedListLeases` instead of `listLeases`, etc.

## Steps

1. Add `lib/data/cached-reads.ts`.
2. Cut 1 — `getProperties` / `getPropertyByIdParam` cross-request layer; prove cache hit on second navigation.
3. Cut 2 — swap 8 property-tab `queries.ts` files.
4. Cut 3 (fast-follow) — portfolio/analytics; `revalidateFeTag("properties")` on `property/actions.ts`.
5. Defer `getProgressContext()` (13 unfiltered org lists — needs its own invalidation design).
6. `tsc` + 83/83 tests; manual invalidation check after lease mutation.

## Open questions (in hosted plan)

1. **`getProgressContext()`** — defer to cut 3 (recommended) or include in cut 2 with coarse tag bundle?
2. **Entities without actions yet** (expenses, safety-risks) — cache with reserved tags now, or skip until actions exist?

## Explicitly deferred

Redis (Phase 4) · org-scoped tags (`leases:${orgId}`) · `getProgressContext` cache · `"use cache"` routes · skeletons track · cross-request `requireCtx`.
