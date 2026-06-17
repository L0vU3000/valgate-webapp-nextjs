"use server";

import { requireCtx } from "@/lib/auth/ctx";
import type { ActionResult } from "@/app/actions/_result";
import { revalidateFeTag } from "@/app/actions/_result";
import { NewAiSessionSchema, AiSessionPatchSchema } from "@/lib/data/types/ai-session";
import type { AiSession } from "@/lib/data/types/ai-session";
import {
  createAiSession as svcCreateAiSession,
  updateAiSession as svcUpdateAiSession,
  deleteAiSession as svcDeleteAiSession,
} from "@/lib/services/ai-sessions";

export async function createAiSession(data: unknown): Promise<ActionResult<AiSession>> {
  const parsed = NewAiSessionSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: "Invalid session" };
  const ctx = await requireCtx();
  try {
    const result = await svcCreateAiSession(ctx, parsed.data);
    revalidateFeTag("ai-sessions");
    return { ok: true, data: result };
  } catch (err) {
    console.error("createAiSession", err);
    return { ok: false, error: "Could not create session" };
  }
}

export async function updateAiSession(id: string, patch: unknown): Promise<ActionResult<AiSession>> {
  const parsed = AiSessionPatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: "Invalid session" };
  const ctx = await requireCtx();
  try {
    const result = await svcUpdateAiSession(ctx, id, parsed.data);
    if (!result) return { ok: false, error: "Session not found" };
    revalidateFeTag("ai-sessions");
    return { ok: true, data: result };
  } catch (err) {
    console.error("updateAiSession", err);
    return { ok: false, error: "Could not update session" };
  }
}

export async function deleteAiSession(id: string): Promise<ActionResult<void>> {
  const ctx = await requireCtx();
  try {
    await svcDeleteAiSession(ctx, id);
    revalidateFeTag("ai-sessions");
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("deleteAiSession", err);
    return { ok: false, error: "Could not delete session" };
  }
}
