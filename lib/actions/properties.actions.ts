"use server";

import { revalidateTag } from "next/cache";
import * as db from "@/lib/data/db/properties";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import type { Property } from "@/lib/data/types/property";

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function createProperty(
  data: db.NewProperty,
): Promise<ActionResult<Property>> {
  const userId = getCurrentUserId();
  const property = await db.create(userId, data);
  revalidateTag("properties");
  return { ok: true, data: property };
}

export async function updateProperty(
  id: string,
  patch: Partial<Property>,
): Promise<ActionResult<Property>> {
  const userId = getCurrentUserId();
  const updated = await db.update(userId, id, patch);
  if (!updated) return { ok: false, error: "Property not found" };
  revalidateTag("properties");
  return { ok: true, data: updated };
}

export async function deleteProperty(id: string): Promise<ActionResult<void>> {
  const userId = getCurrentUserId();
  await db.remove(userId, id);
  revalidateTag("properties");
  return { ok: true, data: undefined };
}
