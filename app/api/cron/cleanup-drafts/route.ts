import type { NextRequest } from "next/server";
import { env } from "@/lib/env";
import { log } from "@/lib/log";
import { sweepExpiredDrafts } from "@/lib/services/property-drafts";

// Node runtime (not Edge): the sweep uses the Neon WebSocket pool driver, which needs Node.
export const runtime = "nodejs";

// Daily cleanup of abandoned add-property drafts (30-day TTL). Triggered by Vercel Cron
// (see vercel.json). Deletes every org/user's stale drafts and best-effort frees their S3
// objects — see sweepExpiredDrafts (system-level, NOT ctx-scoped).
//
// LOCKED: Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`. We reject anything that
// doesn't match the exact header with 401, so this destructive sweep can NEVER run from an
// unauthenticated request. A missing CRON_SECRET (env unset) also 401s — fail closed, never open.
export async function GET(req: NextRequest) {
  const secret = env.CRON_SECRET;
  const provided = req.headers.get("authorization");

  // No configured secret, or a header that doesn't match it exactly → refuse. Generic 401 only
  // (never echo back what was expected). This is the only gate; there is no other auth on this route.
  if (!secret || provided !== `Bearer ${secret}`) {
    log.warn("cron.cleanup_drafts.unauthorized");
    return new Response("unauthorized", { status: 401 });
  }

  const result = await sweepExpiredDrafts(30);
  log.info("cron.cleanup_drafts.done", result);
  return Response.json(result);
}
