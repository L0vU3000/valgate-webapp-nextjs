"use server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import * as db from "@/lib/data/db";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import {
  DbdiagramNodeStateSchema,
  DbdiagramNoteSchema,
} from "@/lib/data/types/dbdiagram-state";

const SaveStateSchema = z.object({
  nodes: z.record(z.string(), DbdiagramNodeStateSchema),
  notes: z.array(DbdiagramNoteSchema),
});

export type SaveStateResult = { ok: true } | { ok: false; error: string };

export async function saveDiagramState(input: unknown): Promise<SaveStateResult> {
  const parsed = SaveStateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid diagram state" };
  const userId = getCurrentUserId();
  await db.dbdiagramState.save(userId, parsed.data);
  revalidateTag("dbdiagram-state");
  return { ok: true };
}

export async function resetDiagramState(): Promise<SaveStateResult> {
  const userId = getCurrentUserId();
  await db.dbdiagramState.save(userId, { nodes: {}, notes: [] });
  revalidateTag("dbdiagram-state");
  return { ok: true };
}
