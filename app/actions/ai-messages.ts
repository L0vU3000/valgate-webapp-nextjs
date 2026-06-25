"use server";

import { requireCtx } from "@/lib/auth/ctx";
import type { ActionResult } from "@/app/actions/_result";
import { revalidateFeTag } from "@/app/actions/_result";
import { NewAiMessageSchema } from "@/lib/data/types/ai-message";
import type { AiMessage } from "@/lib/data/types/ai-message";
import {
  createAiMessage as svcCreateAiMessage,
  deleteAiMessage as svcDeleteAiMessage,
} from "@/lib/services/ai-messages";

export async function createAiMessage(data: unknown): Promise<ActionResult<AiMessage>> {
  const parsed = NewAiMessageSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: "Invalid message" };
  const ctx = await requireCtx();
  try {
    const result = await svcCreateAiMessage(ctx, parsed.data);
    revalidateFeTag("ai-messages");
    return { ok: true, data: result };
  } catch (err) {
    console.error("createAiMessage", err);
    return { ok: false, error: "Could not create message" };
  }
}

export async function deleteAiMessage(id: string): Promise<ActionResult<void>> {
  const ctx = await requireCtx();
  try {
    await svcDeleteAiMessage(ctx, id);
    revalidateFeTag("ai-messages");
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("deleteAiMessage", err);
    return { ok: false, error: "Could not delete message" };
  }
}
