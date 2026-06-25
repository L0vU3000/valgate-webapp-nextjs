import "server-only"; // C1
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { aiSessions } from "@/lib/db/schema";
import { AiSessionSchema, type AiSession, type NewAiSession, type AiSessionPatch } from "@/lib/data/types/ai-session";
import { toDomain, type Ctx } from "@/lib/services/_mapping";
import { scopedInsert, scopedUpdate, scopedDelete } from "@/lib/services/_crud";

const rowToAiSession = (r: typeof aiSessions.$inferSelect): AiSession =>
  AiSessionSchema.parse(toDomain(aiSessions, r)); // C6/C7

export async function listAiSessions(ctx: Ctx): Promise<AiSession[]> {
  const rows = await db.select().from(aiSessions)
    .where(eq(aiSessions.orgId, ctx.orgId)) // C3
    .orderBy(asc(aiSessions.createdAt), asc(aiSessions.id))
    .limit(500)
  return rows.map(rowToAiSession);
}

export async function getAiSession(ctx: Ctx, id: string): Promise<AiSession | null> {
  const [row] = await db.select().from(aiSessions)
    .where(and(eq(aiSessions.orgId, ctx.orgId), eq(aiSessions.id, id))); // C3
  return row ? rowToAiSession(row) : null;
}

export async function createAiSession(ctx: Ctx, input: NewAiSession): Promise<AiSession> {
  const now = Date.now();
  return scopedInsert(ctx, aiSessions, "AI", { ...input, createdAt: now, updatedAt: now }, rowToAiSession);
}

export async function updateAiSession(ctx: Ctx, id: string, patch: AiSessionPatch): Promise<AiSession | null> {
  return scopedUpdate(ctx, aiSessions, id, patch, rowToAiSession, true);
}

export async function deleteAiSession(ctx: Ctx, id: string): Promise<void> {
  await scopedDelete(ctx, aiSessions, id);
}
