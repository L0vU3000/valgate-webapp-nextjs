import "server-only"; // C1
import { cache } from "react";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { userProfiles } from "@/lib/db/schema";
import { UserProfileSchema, type UserProfile } from "@/lib/data/types/user-profile";
import type { UserProfilePatch } from "@/lib/data/types/user-profile";
import { toDomain, nextId, type Ctx } from "@/lib/services/_mapping";
import { convertRowToDb } from "@/lib/db/column-classifier";
import { scopedInsert, scopedUpdate, scopedDelete, requireMember } from "@/lib/services/_crud";

const rowToUserProfile = (r: typeof userProfiles.$inferSelect): UserProfile =>
  UserProfileSchema.parse(toDomain(userProfiles, r)); // C6/C7

export async function listUserProfiles(ctx: Ctx): Promise<UserProfile[]> {
  const rows = await db.select().from(userProfiles)
    .where(eq(userProfiles.orgId, ctx.orgId)) // C3
    .orderBy(asc(userProfiles.createdAt), asc(userProfiles.id))
    .limit(500)
  return rows.map(rowToUserProfile);
}

export const getUserProfile = cache(
  async (ctx: Ctx, id: string): Promise<UserProfile | null> => {
    const [row] = await db.select().from(userProfiles)
      .where(and(eq(userProfiles.orgId, ctx.orgId), eq(userProfiles.id, id))); // C3
    return row ? rowToUserProfile(row) : null;
  },
);

// The current user's own profile. Keyed by userId (not the UPROF id) — same lookup upsertUserProfile uses.
export async function getMyUserProfile(ctx: Ctx): Promise<UserProfile | null> {
  const [row] = await db.select().from(userProfiles)
    .where(and(eq(userProfiles.orgId, ctx.orgId), eq(userProfiles.userId, ctx.userId))); // C3
  return row ? rowToUserProfile(row) : null;
}

export async function upsertUserProfile(ctx: Ctx, patch: UserProfilePatch): Promise<UserProfile> {
  requireMember(ctx);
  const [existingRow] = await db.select().from(userProfiles)
    .where(and(eq(userProfiles.orgId, ctx.orgId), eq(userProfiles.userId, ctx.userId)));
  const existing = existingRow ? rowToUserProfile(existingRow) : null;
  const now = Date.now();
  if (existing) {
    const updated = await scopedUpdate(ctx, userProfiles, existing.id, { ...patch, updatedAt: now }, rowToUserProfile, true);
    return updated!;
  }
  const id = await nextId("UPROF");
  const base = UserProfileSchema.parse({
    firstName: "",
    lastName: "",
    createdAt: now,
    updatedAt: now,
    ...patch,
    id,
    userId: ctx.userId,
  });
  const [row] = await db.insert(userProfiles).values({
    ...convertRowToDb(userProfiles, base as Record<string, unknown>),
    orgId: ctx.orgId,
  } as never).returning();
  return rowToUserProfile(row!);
}
