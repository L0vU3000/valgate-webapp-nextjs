# Upstash Ratelimit — Valgate guide

> Role: rate limiting for auth-sensitive + verification-submit edges, on serverless (no TCP connection pool to manage).
> Version pinned: `@upstash/ratelimit` ^2 · `@upstash/redis` · Last verified: 2026-06-11 against upstash.com/docs.
> Decisions: B9 (rate-limit tool — **leaning, not locked**). Conventions: C2 (edge-only), C5 (generic errors).
> Official docs: https://upstash.com/docs/redis/sdks/ratelimit-ts/overview

---

## §0 — Cheat-sheet

```ts
// lib/ratelimit.ts — define ONCE, module scope (server-only)
import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

export const authLimiter = new Ratelimit({
  redis: new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN }),
  limiter: Ratelimit.slidingWindow(5, "1 m"),   // 5 attempts / minute
  prefix: "rl:auth",
  analytics: true,
});
```

```ts
// at the EDGE (Server Action / Route Handler) — BEFORE the service call (C2)
const { success } = await authLimiter.limit(ctx.userId);   // identifier = userId (or IP if signed-out)
if (!success) return { error: "Too many attempts. Try again shortly." };  // generic — C5
await verifyPillar(ctx, input);                            // service runs only if allowed
```

The five facts that matter most: **(1)** this is the **leaning** choice for B9, not locked (§1). **(2)** the limiter lives **at the edge, before the service — never inside `lib/services/`** ([C2](./_conventions.md#c2)). **(3)** identifier is **`ctx.userId`** signed-in, **IP** signed-out (§4). **(4)** it's **connectionless HTTP** — that's why it fits serverless/Neon-style edges (§3). **(5)** decide **fail-open vs fail-closed** deliberately (§5).

## §1 — Why it's in our stack (the leaning choice, not locked)

B9 hardens the auth-sensitive edges and the master plan marks the rate-limit *tool* as **genuinely still open**: *"decide at B9; lean Upstash Ratelimit, alternative: a small Postgres-based limiter table."* This doc documents the **lean**, so the B9 implementer has a running start — it is **not a locked decision**.

Why Upstash leads: it's **connectionless (HTTP)**, so it adds no TCP pool to manage on a serverless edge (the same reason our Neon driver story is what it is), the SDK is a few lines, and it ships sliding-window/analytics out of the box. The standing **alternative** is a small **Postgres limiter table** (one `id_counters`-style atomic `UPDATE … RETURNING` per window) — zero new vendor, reuses the DB we already have, but we hand-roll the window math and eat a DB round-trip on every guarded action. **Pick at B9.** If the alternative wins, this file gets rewritten; the §4 *placement* rule (edge, before service) holds either way.

## §2 — Setup in our stack

```bash
npm i @upstash/ratelimit @upstash/redis
```

Create an Upstash Redis database (console → Redis → REST). Add its two REST credentials to the env schema — **validated through `@t3-oss/env-nextjs`, never read `process.env` directly** (see [`env-nextjs.md`](./env-nextjs.md)):

```ts
// lib/env.ts — server block
UPSTASH_REDIS_REST_URL:   z.string().url(),
UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
```

Both go in `.env.local`. The limiter module **`lib/ratelimit.ts`** is `server-only` ([C1](./_conventions.md#c1)) — it holds a secret token and must never reach a client bundle. Define each `Ratelimit` instance **once at module scope** (not per-request) so the in-process ephemeral cache (§5) can do its job.

## §3 — Mental model (minimal)

Three ideas; everything else, follow §7.

1. **`Ratelimit` wraps a `Redis` client + a limiter algorithm.** You construct it once with `{ redis, limiter, prefix }`. We use **`Ratelimit.slidingWindow(n, window)`** — the smooth choice that avoids the burst-at-window-edge problem of `fixedWindow`. (`tokenBucket` also exists; we don't need it.)
2. **One call: `await limiter.limit(identifier)`.** It returns `{ success, limit, remaining, reset, pending }`. You branch on **`success`** — `true` = allow, `false` = block. Everything else is for headers/telemetry.
3. **Connectionless HTTP is the whole point.** The Redis client talks over REST, not a persistent TCP socket. On a serverless/edge runtime there is no connection to pool or leak across invocations — which is exactly why it slots in next to our serverless DB driver without a second pool to reason about.

## §4 — How we use it in Valgate

### Where it goes: the edge, before the service — never inside a service

This is the load-bearing rule and it is a direct consequence of [C2](./_conventions.md#c2). Services are **pure of transport**: no `headers()`, no request object, no IP. Rate limiting needs the identifier (userId or IP) and is a transport concern, so it lives **in the Server Action / Route Handler**, runs **before** the service call, and the service stays unaware it exists.

```ts
// app/properties/[id]/actions.ts  — a Server Action (the EDGE)
"use server";
import { authLimiter } from "@/lib/ratelimit";
import { getCtx } from "@/lib/auth/ctx";
import { submitVerification } from "@/lib/services/verification";   // service: knows nothing of limits

export async function submitVerificationAction(input: SubmitInput) {
  const ctx = getCtx();                                    // resolve auth → Ctx (C2 edge step)

  const { success, reset } = await authLimiter.limit(ctx.userId);   // identifier = userId
  if (!success) {
    return { error: "Too many attempts. Try again shortly." };      // generic outward — C5
    // `reset` (ms epoch) is available if we want a "retry after" hint — never leak internals
  }

  return submitVerification(ctx, input);                   // service runs only past the gate
}
```

### Choosing the identifier

- **Signed-in actions → `ctx.userId`.** This is the per-actor key for everything auth-sensitive once a `Ctx` exists.
- **Signed-out actions** (e.g. anything before auth resolves) → **the request IP**, read at the edge: `(await headers()).get("x-forwarded-for") ?? "anon"`. IP is coarse (NAT, shared proxies) but it's the only key available pre-auth.
- We do **not** scope the rate limit by `orgId` — the limit protects *the actor*, not the tenant.

### What to protect

Scope it to the **auth-sensitive** edges and the **verification-submit** action — not every read. From B9: a focused pass over the auth-sensitive actions, plus the verification submit (the expensive, abuse-prone transactional write from B6). High-volume plain reads (list/get) stay ungated; gating them would just add a Redis round-trip to every page load for no security gain.

A separate, tighter limiter instance per concern (distinct `prefix`) keeps their windows independent:

```ts
export const verifyLimiter = new Ratelimit({
  redis,                                                   // reuse the one Redis client
  limiter: Ratelimit.slidingWindow(10, "1 m"),            // verification submits / min
  prefix: "rl:verify",
});
```

## §5 — Gotchas & version traps

- **🔴 Fail-open vs fail-closed — decide on purpose.** If Upstash/Redis is unreachable, what happens? `limit()` can throw, or with the `timeout` option (default **5 s**, e.g. `timeout: 1000`) it **fails open** — lets the request through when Redis is slow. Fail-open favors availability; fail-closed favors protection. For an *auth-sensitive* gate, leaning **fail-closed** (catch, treat as blocked) is the safer default; for low-risk gates, fail-open avoids an outage taking the app down. **Pick per limiter — don't leave it to a default you didn't read.**
- **Define the instance once, at module scope.** Constructing a `Ratelimit` per request defeats the **`ephemeralCache`** (a `new Map()` by default) that short-circuits already-blocked identifiers *without* a Redis call. Per-request construction also wastes connections. Module scope = the cache survives across calls in a warm runtime.
- **`analytics: true` writes to Redis on every `limit()` call.** Cheap, and the Upstash console's Rate Limit dashboard (accepted/blocked/denied per identifier) is worth it during B9 burn-in — but know it's an extra write, not free.
- **`limit()` is `async` — always `await` it.** It's a network call. A missing `await` silently lets every request through (a truthy Promise is not `{ success: false }`).
- **Choosing the identifier is a correctness decision, not a detail.** Key on something the *actor controls weakly* (userId/IP), never on something trivially spoofable from the body. Getting this wrong makes the limit either bypassable or a self-DoS.
- **Env vars go through `@t3-oss/env-nextjs` ([`env-nextjs.md`](./env-nextjs.md)).** `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are validated at boot — a missing token fails the build, not the first request at 2am.

## §6 — Reusable patterns

**Guard an edge (the repeatable recipe):**
1. Pick/define the limiter instance in `lib/ratelimit.ts` (right algorithm, window, unique `prefix`).
2. In the Server Action / Route Handler, resolve `ctx` first, then `await limiter.limit(ctx.userId)` (or IP).
3. On `!success`, return a **generic** error ([C5](./_conventions.md#c5)) — never echo `reset`/internals as an error message.
4. Call the service only past the gate. The service stays untouched ([C2](./_conventions.md#c2)).
5. Goal-test it ([C9](./_conventions.md#c9)): N+1 calls from one identifier → the (N+1)th returns `success: false`.

**Fail-closed wrapper** (for the auth-sensitive gates):

```ts
async function allowed(limiter: Ratelimit, id: string): Promise<boolean> {
  try {
    const { success } = await limiter.limit(id);
    return success;
  } catch {
    return false;   // Redis down → block. Fail-CLOSED for sensitive edges. (Flip to `true` for fail-open.)
  }
}
```

**Route Handler variant** (same rule — gate before the work):

```ts
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "anon";
  const { success } = await authLimiter.limit(ip);
  if (!success) return Response.json({ error: "Rate limited" }, { status: 429 });
  // … proceed
}
```

## §7 — Going deeper

- Overview & `limit()` return shape — https://upstash.com/docs/redis/sdks/ratelimit-ts/overview
- Features: `ephemeralCache`, `analytics`, `timeout` (fail-open), multiple limits, `prefix` — https://upstash.com/docs/redis/sdks/ratelimit-ts/features
- Algorithms (sliding vs fixed window vs token bucket) — https://upstash.com/docs/redis/sdks/ratelimit-ts/algorithms
- Next.js usage example — https://upstash.com/docs/redis/sdks/ratelimit-ts/gettingstarted
- `@upstash/redis` client (REST) — https://upstash.com/docs/redis/sdks/ts/overview
- MultiRegion + `pending`/`waitUntil` (not needed for single-region v1) — https://upstash.com/docs/redis/sdks/ratelimit-ts/methods
- The standing **alternative** (Postgres limiter table) reuses the atomic-counter idiom in [`drizzle.md`](./drizzle.md) §6 / [C8](./_conventions.md#c8).
