import "server-only";
import { env } from "@/lib/env";

export const DEMO_USER_ID = "demo-user";

// Returns the FS-layer user key.
// In DEMO_MODE all users share the seed-data path.
// For real users, returns their internal ID so they get their own empty FS space.
export function getFsUserId(internalUserId: string): string {
  return env.DEMO_MODE ? DEMO_USER_ID : internalUserId;
}

// ponytail: kept for callsites in actions/ai-context that aren't fixed yet.
// Remove once all callers are migrated to getFsUserId(authCtx.userId).
export function getCurrentUserId(): string {
  return DEMO_USER_ID;
}
