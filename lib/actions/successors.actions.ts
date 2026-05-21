"use server";

import { revalidateTag } from "next/cache";
import * as db from "@/lib/data/db/successors";
import * as estateActivityDb from "@/lib/data/db/estate-activity-events";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import type { Successor } from "@/lib/data/types/successor";
import type { ActionResult } from "./properties.actions";

export async function createSuccessor(
  data: db.NewSuccessor,
): Promise<ActionResult<Successor>> {
  const userId = getCurrentUserId();
  const successor = await db.create(userId, data);
  await estateActivityDb.create(userId, {
    kind: "successor.created",
    title: "Beneficiary added",
    description: `${successor.name} was added to estate planning.`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  revalidateTag("successors");
  return { ok: true, data: successor };
}

export async function updateSuccessor(
  id: string,
  patch: Partial<Successor>,
): Promise<ActionResult<Successor>> {
  const userId = getCurrentUserId();
  const updated = await db.update(userId, id, patch);
  if (!updated) return { ok: false, error: "Successor not found" };
  await estateActivityDb.create(userId, {
    kind: "successor.updated",
    title: "Beneficiary updated",
    description: `${updated.name} was updated.`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  revalidateTag("successors");
  return { ok: true, data: updated };
}

export async function deleteSuccessor(
  id: string,
): Promise<ActionResult<void>> {
  const userId = getCurrentUserId();
  const existing = await db.get(userId, id);
  await db.remove(userId, id);
  if (existing) {
    await estateActivityDb.create(userId, {
      kind: "successor.deleted",
      title: "Beneficiary removed",
      description: `${existing.name} was removed from estate planning.`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
  revalidateTag("successors");
  return { ok: true, data: undefined };
}
