# Phase 4 — Shared Read Cache with Upstash (Vercel-native)

- **Plan ID:** `plan-e40b6ac387ea480f`
- **Hosted:** https://plan.agent-native.com/plans/plan-e40b6ac387ea480f
- **Status:** complete — all 17 wrappers (leases + 16) converted to readThrough; bustCache wired into every mutating action; tsc 0 errors, vitest 83/83. Shipped 2026-06-29.
- **Part of:** the 4-phase client performance plan. Phases 1–3 shipped. This is Phase 4.

---

## Locked answers (2026-06-29) → the pivot

The open questions were answered: **Vercel** · cache-miss cost is **measured & real** ·
**hand-rolled** (no library).

These force a pivot away from the original idea. A custom Next.js `cacheHandler` **only
runs when self-hosting** — Vercel ignores it and uses its own managed Data Cache
(confirmed in Next.js's own self-hosting docs). So on Vercel, Phase 4 cannot be a free
storage swap under `unstable_cache`.

Instead it becomes an **explicit Upstash read-through cache inside the data layer**, with
explicit key-busting from the action layer. **This is no longer a zero-app-change plan** —
it touches `lib/data/cached-reads.ts` and every mutating action.

## Objective

On Vercel, Phase 3's `unstable_cache` is already backed by the managed Data Cache (shared
across functions). But that cache **evicts under pressure**, and you've measured the
resulting miss cost. Phase 4 adds a **second cache you control** — Upstash Redis — in front
of the read services, so reads stop falling through to Neon, and you decide TTL + exactly
when entries are busted.

## Decisions (locked)

| Decision | Choice | Why |
|---|---|---|
| Mechanism | Explicit Upstash read-through in the data layer (NOT a Next.js `cacheHandler`) | Vercel ignores custom `cacheHandler`; this is the only Vercel-native way to control the store |
| Redis client | `@upstash/redis` (REST/HTTP) | Serverless functions can't safely hold TCP pools; the REST client is built for per-invocation use |
| Cache of record | `readThrough` calls the **raw service** (bypass `unstable_cache` for moved entities) | Avoids double-caching / two sources of truth |
| Cache keys | `read:<tag>:<orgId>:<propertyId\|__all__>` | Same tenant isolation as Phase 3 |
| Invalidation | `bustCache(tag)` deletes a per-tag key set; called next to every `revalidateFeTag` | `revalidateTag` does not touch Upstash |
| Safety-net TTL | Modest `EX` (e.g. 1h) on every entry | A missed bust self-heals within the hour instead of going stale forever |

## Core implementation

**`lib/cache/redis.ts`** (new) — Upstash REST client, null when env is unset:

```typescript
import { Redis } from "@upstash/redis";

export const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;
```

**`lib/data/cached-reads.ts`** (modified) — read-through helper the wrappers delegate to:

```typescript
import { redis } from "@/lib/cache/redis";

async function readThrough<T>(
  tag: string,
  orgId: string,
  propertyId: string | undefined,
  query: () => Promise<T>,
): Promise<T> {
  if (!redis) return query();                 // caching off → hit the service directly
  const key = `read:${tag}:${orgId}:${propertyId ?? "__all__"}`;
  const hit = await redis.get<T>(key);
  if (hit !== null && hit !== undefined) return hit;

  const fresh = await query();
  await redis.set(key, fresh, { ex: 3600 });  // 1h safety-net TTL
  await redis.sadd(`tagkeys:${tag}`, key);     // index the key so bustCache can delete it
  return fresh;
}

// Same signature the loaders already import; internals swap unstable_cache → readThrough.
export function cachedListLeases(ctx: Ctx, propertyId?: string) {
  return readThrough("leases", ctx.orgId, propertyId, () => listLeases(ctx, propertyId));
}
```

**`lib/cache/bust.ts`** (new) — delete every entry tagged `tag`:

```typescript
import { redis } from "@/lib/cache/redis";

export async function bustCache(tag: string): Promise<void> {
  if (!redis) return;
  const keys = await redis.smembers(`tagkeys:${tag}`);
  if (keys.length > 0) await redis.del(...keys);
  await redis.del(`tagkeys:${tag}`);
}

// In an action, beside the existing revalidateFeTag:
//   revalidateFeTag("leases");
//   await bustCache("leases");
```

**`lib/env.ts`** (modified) — two optional server-only secrets:

```typescript
UPSTASH_REDIS_REST_URL: z.string().url().optional(),
UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
```

**Dependency:** `npm install @upstash/redis`. Set the two secrets in Vercel env vars.

## Smallest first cut

Wrap **one** hot read (`cachedListLeases`) in `readThrough` and add `bustCache("leases")`
to the lease actions. Prove hit-rate + invalidation on that single entity in production
before rolling the pattern across the other wrappers. Do not convert all 18 at once.

## Steps

1. Confirm the measured misses are Vercel Data Cache **evictions**, not cold-start compute.
2. Create an Upstash Redis database; add `UPSTASH_REDIS_REST_URL` + `_TOKEN` to Vercel env.
3. `npm install @upstash/redis`; add `lib/cache/redis.ts` + `lib/cache/bust.ts`.
4. Add `readThrough`; convert ONE wrapper (`cachedListLeases`) to use it, calling the raw service.
5. Add `bustCache("leases")` next to `revalidateFeTag` in the lease actions.
6. Verify: load a leases tab twice → 2nd is an Upstash hit; mutate a lease → next read misses + refetches.
7. `tsc` green + 83/83.
8. Roll `readThrough` + `bustCache` across the remaining wrappers + their actions, tag by tag.

## Files touched

- `lib/cache/redis.ts` — **new** (Upstash client)
- `lib/cache/bust.ts` — **new** (`bustCache`)
- `lib/data/cached-reads.ts` — modified (wrappers delegate to `readThrough`)
- `lib/env.ts` — modified (optional Upstash env)
- `app/actions/*.ts` + `app/(shell)/property/actions.ts` — modified (add `bustCache` beside `revalidateFeTag`)
- `package.json` — modified (`@upstash/redis`)

## Risks & correctness notes

- **One cache of record.** `readThrough` must call the raw service (not `unstable_cache`),
  or you cache the same data twice with two invalidation paths.
- **Invalidation is now manual.** A mutation that busts the Next tag but forgets
  `bustCache` serves stale data until the 1h TTL. Keep the two calls together.
- **Never cache auth.** `requireCtx` stays per-request React `cache()` only.
- **Coarse tag bust still spans tenants** (same as Phase 3).
- **Each read adds a network hop.** Upstash REST is only a win when the Neon query is
  slower than the round-trip — measure per entity.
- **First, rule out the cheaper fix.** If misses are Data Cache evictions, raising/segmenting
  `revalidate` windows on the existing `unstable_cache` may recover most of the win with no
  new infra — try that before Upstash.

## Open confirmation (in hosted plan)

**Are the measured misses Vercel Data Cache evictions, or cold-start compute?** Upstash
fixes the former; only function-warming/bundle work fixes the latter. (Recommended: confirm
evictions, or add hit/miss logging to one entity for a day before committing.)

## Explicitly deferred

Tuning Vercel's Data Cache revalidate windows *before* adding Upstash (try first) ·
org-scoped tags (`leases:${orgId}`) · folding `revalidateFeTag` + `bustCache` into one
helper · caching `getProgressContext()` · the self-hosted `cacheHandler` path (N/A on Vercel).
