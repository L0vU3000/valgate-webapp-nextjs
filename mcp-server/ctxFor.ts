// The ONE new auth seam (Phase 1 plan: W1 gap). Returns a hardcoded demo identity so the MCP
// server can call lib/services/* without touching Clerk. Phase 3 replaces the body with real
// token validation. Sibling of lib/auth/ctx.ts (which is Clerk-only and cannot run here).
import type { Ctx } from "@/lib/services/_mapping";

// Mirrors DEMO_CTX in lib/auth/ctx.ts:12.
// Safe because DEMO_MODE (or assertCanMutate) refuses writes at the service layer.
export function ctxFor(): Ctx {
  return { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" };
}
