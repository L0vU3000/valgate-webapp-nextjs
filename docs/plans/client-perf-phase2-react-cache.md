# Phase 2 — Request-Dedup with React cache()

- **Plan ID:** `plan-c6176354a2424ac5`
- **Hosted:** https://plan.agent-native.com/plans/plan-c6176354a2424ac5
- **Status:** complete (shipped)
- **Part of:** the 4-phase client performance plan. Phase 1 (DB filtering) shipped & verified. Phase 2 shipped (see Shipped below). Next: 3) `unstable_cache`/tags, 4) Redis (if measured). Skeletons are a separate track.

## Shipped

Per the locked split-ship order, all three targets landed:

- **`requireCtx()`** — `lib/auth/ctx.ts` (`resolveCtx` + `cache`)
- **`getProperties()` / `getPropertyByIdParam(id)`** — `lib/data/properties.ts`
- **`getUserProfile(ctx, id)`** — `lib/services/user-profiles.ts`

Tests: 83/83 green.

---

## Objective

Phase 1 made each query *smaller*. Phase 2 stops the app from running the *same*
query several times inside one page load.

The proof case: open any property tab. The **layout**
(`app/(shell)/property/[id]/layout.tsx`) runs `getPropertyByIdParam(id)` **and**
`getProgressContext()`, then the **page** runs its own loader. Every one of those
calls `requireCtx()` independently, and `requireCtx()` does Clerk `auth()` + Postgres
identity-sync existence checks (`users`, `organizations`) + `ourUserId`/`ourOrgId`
resolvers. So one property page resolves the same auth context **3+ times**.

React's `cache()` (`import { cache } from "react"` — already in this React 19 / Next 15
app, no new dependency) memoizes a function's result **for one server request**, then
discards it. It is per-request deduplication, not persistent caching — so it can never
serve stale data to a different user or a later request. It only collapses duplicate
work within one render.

## Grounded finding

- `requireCtx()` has **174 call sites**; the layout + page guarantee **3+ runs per
  property-page request**, each = 1 Clerk `auth()` + 2+ Postgres round-trips.
- Wrapping that one function is the single highest-leverage, lowest-risk change in the
  whole performance plan.

## Targets (ordered by payoff)

| Function | File | Why it repeats per request | Wrap? |
|---|---|---|---|
| `requireCtx()` | `lib/auth/ctx.ts` | layout + page + every loader call it; no args → 1 memo/request | ✅ highest |
| `getProperties()` | `lib/data/properties.ts` | layout ctx + page loaders + derivations all list org props | ✅ |
| `getPropertyByIdParam(id)` | `lib/data/properties.ts` | layout fetches property; page loader may refetch same one | ✅ |
| `getUserProfile(ctx, userId)` | `lib/services/user-profiles.ts` | overview + ai-context + pro loader, same user | ✅ |
| `getProgressContext()` | `lib/data/progress-context.ts` | called once (layout only) → nothing to dedup | ❌ skip |
| `list*` service fns | `lib/services/*` | post-Phase-1, callers pass different args (propertyId vs none) → won't dedup | ⚠️ defer |

## Decisions (LOCKED)

1. **Scope = NARROW.** Wrap only `requireCtx()` + the 3 broadly-shared reads
   (`getProperties`, `getPropertyByIdParam`, `getUserProfile`). Do NOT blanket-wrap the
   `list*` services — post-Phase-1 their caller args differ, so they wouldn't dedup. Add
   a service-level `cache()` later only if profiling shows a specific same-arg repeat.
2. **Ship order = SPLIT.** Ship the `requireCtx()` wrap on its own first (~80% of the
   value, lowest risk, one file); verify `console.count` drops from 3+ to 1 per request;
   then add the 3 helper wraps in a follow-up.

## Code stubs

```typescript
// lib/auth/ctx.ts — rename body to resolveCtx, export the cached wrapper under the
// SAME name so all 174 call sites are unchanged.
import { cache } from "react";

async function resolveCtx(): Promise<Ctx> {
  // …exact existing body, unchanged…
}

// One Ctx per server request: first call resolves Clerk + DB checks, later callers in
// the same render reuse it. New request = fresh memo, so no cross-user leak.
export const requireCtx = cache(resolveCtx);
```

```typescript
// lib/data/properties.ts
import { cache } from "react";

export const getProperties = cache(async (): Promise<Property[]> => {
  const ctx = await requireCtx();
  return listProperties(ctx);
});

export const getPropertyByIdParam = cache(
  async (id: string): Promise<Property | null> => {
    const ctx = await requireCtx();
    return getProperty(ctx, id);
  },
);
```

## Why it's safe (correctness notes)

- **Side effect:** `requireCtx` does an idempotent JIT upsert of user/org/membership.
  Memoizing runs it **once** per request instead of 3+ — strictly fewer redundant
  writes, no behaviour change.
- **Server Actions:** `requireCtx` is also called from actions; `cache()` is safe there
  (each action is its own request scope) — wrapping doesn't change action behaviour.
- **Synergy:** caching `requireCtx` makes the `Ctx` object a stable reference for the
  whole request. React `cache()` keys object args by identity (`===`), so a later
  `cache(listLeases(ctx, …))` would actually hit its memo. Cache `requireCtx` first; it
  unlocks downstream caching.

## Steps

1. Wrap `requireCtx()` (rename body → `resolveCtx`, export `requireCtx = cache(resolveCtx)`).
2. Wrap `getProperties()` + `getPropertyByIdParam(id)` in `lib/data/properties.ts`.
3. Wrap `getUserProfile(ctx, userId)` in `lib/services/user-profiles.ts`.
4. Do NOT wrap `getProgressContext` (called once) or the `list*` services (args differ).
5. Prove dedup: temporary `console.count("resolveCtx")` in the real body → logs ONCE per
   property-page request (was 3+). Remove the counter.
6. `tsc` + full suite green (83/83), behaviour identical.

## Files touched (tiny surface)

- `lib/auth/ctx.ts` — rename body → `resolveCtx`; export `requireCtx = cache(resolveCtx)`
- `lib/data/properties.ts` — wrap `getProperties` + `getPropertyByIdParam`
- `lib/services/user-profiles.ts` — wrap `getUserProfile`

## Verification

1. **Dedup proof:** `console.count("resolveCtx")` → one log per property-page request
   after the change (was 3+). Prove, then delete.
2. **Types + tests:** `npx tsc --noEmit` green; `npm run test` stays 83/83.
3. **Parity:** every page renders identical data — `cache()` changes *when* a function
   runs, never *what* it returns.
4. **No cross-request leak:** load two different property ids back-to-back; each shows
   its own data (confirms per-request memo).

## Explicitly deferred

`unstable_cache`/`use cache` + tags (Phase 3) · Redis (Phase 4, if measured) ·
blanket-wrapping `list*` services (only if profiling shows a real repeat) ·
skeletons (separate track).
