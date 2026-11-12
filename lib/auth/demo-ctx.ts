import "server-only";
import { isRealClerkKey } from "@/lib/auth/clerk-check";
import { env } from "@/lib/env";
import type { Ctx } from "@/lib/services/_mapping";

const DEMO_CTX: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" };

export function demoCtxOrNull(): Ctx | null {
  const staging = process.env.STAGING_DEMO_MODE === "true";
  if (!env.DEMO_MODE && !staging) return null;
  if (process.env.NODE_ENV === "production" && !staging)
    throw new Error("DEMO_MODE refused in production");
  if (isRealClerkKey(env.CLERK_SECRET_KEY) && !staging)
    throw new Error("DEMO_MODE refused when a real CLERK_SECRET_KEY is set");
  return DEMO_CTX;
}
