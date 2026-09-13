import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";
import { log } from "@/lib/log";

// B9 rate limiting. Applied at the EDGE (server action / route), before the service call (C2) —
// never inside lib/services. When UPSTASH_* is set we use Upstash (serverless HTTP, shared state);
// otherwise an in-memory sliding window so dev/test work and the edge degrades safely.
export type Limiter = { limit: (id: string) => Promise<{ success: boolean }> };

// ponytail: per-instance Map — meaningless across serverless invocations. Prod MUST set UPSTASH_*
// (this is the dev/test path only); the makeLimiter switch upgrades automatically when creds exist.
function inMemoryLimiter(limit: number, windowMs: number): Limiter {
  const hits = new Map<string, number[]>();
  return {
    limit: async (id: string) => {
      const now = Date.now();
      const recent = (hits.get(id) ?? []).filter((t) => now - t < windowMs);
      hits.set(id, recent);
      if (recent.length >= limit) return { success: false };
      recent.push(now);
      return { success: true };
    },
  };
}

export function makeLimiter(prefix: string, limit: number, window: `${number} m`, windowMs: number): Limiter {
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    return new Ratelimit({
      redis: new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN }),
      limiter: Ratelimit.slidingWindow(limit, window),
      prefix,
      analytics: true,
    });
  }
  return inMemoryLimiter(limit, windowMs);
}

// Sensitive mutations: 5 / minute / user. Used on the verification submit + revoke edges.
export const verifyLimiter = makeLimiter("rl:verify", 5, "1 m", 60_000);

// Phase 5 (M3) — MCP endpoint: 60 / minute / user. AI agents loop; this is the outer guard
// on the programmatic surface. Keyed on Clerk userId in the route handler (after auth succeeds,
// so only authenticated traffic counts against the quota).
export const mcpLimiter = makeLimiter("rl:mcp", 60, "1 m", 60_000);

// HTTP API v1 reads: 120 / minute / user. Looser than mcpLimiter since GET routes have no
// write amplification risk, but still bounded so a buggy or abusive client can't hammer the
// DB unthrottled. Keyed on the resolved internal userId (see lib/api/v1/auth.ts), after auth
// succeeds — unauthenticated requests never reach the limiter.
export const apiReadLimiter = makeLimiter("rl:api-v1-read", 120, "1 m", 60_000);

// HTTP API v1 writes (POST/PATCH/DELETE): 30 / minute / user. Same mutation budget as
// actionLimiter. Tighter than the read limiter because each call actually changes data.
// Uses its own Redis prefix so iPhone write traffic does not share the website action bucket.
export const apiWriteLimiter = makeLimiter("rl:api-v1-write", 30, "1 m", 60_000);

// TM1-64 — general mutation edges: 30 / minute / user. Wide enough that no human doing real
// work hits it (a burst of form saves is fine), tight enough that a scripted loop against any
// write action is capped. Keyed on ctx.userId at the action edge, after requireCtx() resolves.
export const actionLimiter = makeLimiter("rl:action", 30, "1 m", 60_000);

// TM1-64 — paid-model edges: 10 / minute / user. Deliberately far tighter than actionLimiter:
// these call OpenAI/Anthropic and cost real money per invocation, so an authenticated user
// looping them bills us directly. 10/min is still generous for a human uploading documents.
// The document scan is the worst case — one request triggers several model runs (self-consistency).
export const aiLimiter = makeLimiter("rl:ai", 10, "1 m", 60_000);

// Fail-CLOSED for sensitive edges: a Redis/network error blocks rather than fails open.
//
// Logging lives here rather than at ~100 call sites: every gate gets identical, structured
// output for free, and no action file needs a `log` import just to report a block. `edge` names
// the gated operation so a drain can tell "one user looping extractAll" from "everyone blocked".
//
// The catch arm logs too. It used to be silent, which meant an Upstash outage would fail every
// request closed across the whole app with zero signal — indistinguishable from a quiet product.
export async function allowed(limiter: Limiter, id: string, edge?: string): Promise<boolean> {
  try {
    const { success } = await limiter.limit(id);
    if (!success) log.warn("ratelimit.block", { edge, userId: id });
    return success;
  } catch (err) {
    log.error("ratelimit.unavailable", err, { edge, userId: id });
    return false;
  }
}
