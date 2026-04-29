"use server";

import { revalidateTag } from "next/cache";
import * as db from "@/lib/data/db/emergency-contacts";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import type { EmergencyContact } from "@/lib/data/types/emergency-contact";
import type { ActionResult } from "./properties.actions";

export async function createEmergencyContact(
  data: db.NewEmergencyContact,
): Promise<ActionResult<EmergencyContact>> {
  const userId = getCurrentUserId();
  const contact = await db.create(userId, data);
  revalidateTag("emergency-contacts");
  return { ok: true, data: contact };
}

export async function updateEmergencyContact(
  id: string,
  patch: Partial<EmergencyContact>,
): Promise<ActionResult<EmergencyContact>> {
  const userId = getCurrentUserId();
  const updated = await db.update(userId, id, patch);
  if (!updated) return { ok: false, error: "Emergency contact not found" };
  revalidateTag("emergency-contacts");
  return { ok: true, data: updated };
}

export async function deleteEmergencyContact(
  id: string,
): Promise<ActionResult<void>> {
  const userId = getCurrentUserId();
  await db.remove(userId, id);
  revalidateTag("emergency-contacts");
  return { ok: true, data: undefined };
}
