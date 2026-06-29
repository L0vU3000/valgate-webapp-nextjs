import "server-only";
import { redis } from "@/lib/cache/redis";

// Delete every Upstash key that belongs to the given cache tag.
//
// When a readThrough helper stores a result in Upstash it also registers the Redis key
// in a tracking set named `tagkeys:<tag>`. bustCache fetches that set, deletes all the
// member keys (the cached data), then deletes the tracking set itself so it does not
// accumulate stale entries.
//
// Call this beside every revalidateFeTag in a mutating action:
//   revalidateFeTag("leases");
//   await bustCache("leases");
//
// If redis is null (env vars unset), this is a no-op — safe in dev and test.
//
// What can go wrong: if Upstash is unreachable the error is caught and logged.
// The mutation still succeeds — the cache will serve stale data until the 1h safety-net
// TTL expires and then self-heals on the next read.
export async function bustCache(tag: string): Promise<void> {
  if (!redis) return;

  try {
    // Retrieve all Upstash keys that were stored under this tag.
    const keys = await redis.smembers(`tagkeys:${tag}`);

    // Delete the cached data for each key.
    if (keys.length > 0) {
      await redis.del(...keys);
    }

    // Delete the tracking set so it does not grow with stale entries.
    await redis.del(`tagkeys:${tag}`);
  } catch (err) {
    // Log but do not rethrow — a failed bust means stale data for up to 1h,
    // which is far less bad than crashing a write action.
    console.error(`bustCache("${tag}") failed — cache will self-heal at TTL:`, err);
  }
}
