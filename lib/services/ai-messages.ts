import "server-only"; // C1
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { aiMessages } from "@/lib/db/schema";
import { AiMessageSchema, type AiMessage, type NewAiMessage, type AiMessagePatch } from "@/lib/data/types/ai-message";
import { toDomain, type Ctx } from "@/lib/services/_mapping";
import { scopedInsert, scopedUpdate, scopedDelete } from "@/lib/services/_crud";

const rowToAiMessage = (r: typeof aiMessages.$inferSelect): AiMessage =>
  AiMessageSchema.parse(toDomain(aiMessages, r)); // C6/C7

export async function listAiMessages(ctx: Ctx, sessionId: string): Promise<AiMessage[]> {
  const rows = await db.select().from(aiMessages)
    .where(and(eq(aiMessages.orgId, ctx.orgId), eq(aiMessages.sessionId, sessionId))) // C3
    .orderBy(asc(aiMessages.createdAt), asc(aiMessages.id))
    .limit(500)
  return rows.map(rowToAiMessage);
}

export async function getAiMessage(ctx: Ctx, id: string): Promise<AiMessage | null> {
  const [row] = await db.select().from(aiMessages)
    .where(and(eq(aiMessages.orgId, ctx.orgId), eq(aiMessages.id, id))); // C3
  return row ? rowToAiMessage(row) : null;
}

export async function createAiMessage(ctx: Ctx, input: NewAiMessage): Promise<AiMessage> {
  const now = Date.now();
  return scopedInsert(ctx, aiMessages, "AIM", { ...input, createdAt: now }, rowToAiMessage);
}

export async function updateAiMessage(ctx: Ctx, id: string, patch: AiMessagePatch): Promise<AiMessage | null> {
  return scopedUpdate(ctx, aiMessages, id, patch, rowToAiMessage);
}

export async function deleteAiMessage(ctx: Ctx, id: string): Promise<void> {
  await scopedDelete(ctx, aiMessages, id);
}
