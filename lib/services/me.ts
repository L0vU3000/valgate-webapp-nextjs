import "server-only"; // C1
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, organizations } from "@/lib/db/schema";
import type { Ctx } from "@/lib/services/_mapping";

// Backs GET /api/v1/me. Two org-scoped-by-Ctx reads (never a raw id from the caller) —
// deliberately NOT the DTO shape: this returns the internal profile, and
// lib/api/v1/dto.ts#toMeDto strips it down to the public fields.
export type MeProfile = {
  email: string;
  displayName: string | null;
  role: Ctx["orgRole"];
  orgName: string;
};

export async function getMeProfile(ctx: Ctx): Promise<MeProfile | null> {
  const [userRow] = await db
    .select({ email: users.primaryEmail, displayName: users.displayName })
    .from(users)
    .where(eq(users.id, ctx.userId))
    .limit(1);
  if (!userRow) return null;

  const [orgRow] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, ctx.orgId))
    .limit(1);
  if (!orgRow) return null;

  return { email: userRow.email, displayName: userRow.displayName, orgName: orgRow.name, role: ctx.orgRole };
}
