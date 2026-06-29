"use server";


import { requireCtx } from "@/lib/auth/ctx";
import type { ActionResult } from "@/app/actions/_result";
import { revalidateFeTag, NOT_IMPLEMENTED_UNTIL_B6 } from "@/app/actions/_result";
import { NewEmergencyContactSchema, EmergencyContactPatchSchema } from "@/lib/data/types/emergency-contact";
import type { EmergencyContact } from "@/lib/data/types/emergency-contact";
import {
  createEmergencyContact as svcCreateEmergencyContact,
  updateEmergencyContact as svcUpdateEmergencyContact,
  deleteEmergencyContact as svcDeleteEmergencyContact,
} from "@/lib/services/emergency-contacts";
import { bustCache } from "@/lib/cache/bust";

export async function createEmergencyContact(data: unknown): Promise<ActionResult<EmergencyContact>> {
  const parsed = NewEmergencyContactSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: "Invalid emergency contact" };
  const ctx = await requireCtx();
  try {
    const result = await svcCreateEmergencyContact(ctx, parsed.data);
    revalidateFeTag("emergency-contacts");
    await bustCache("emergency-contacts");
    return { ok: true, data: result };
  } catch (err) {
    console.error("createEmergencyContact", err);
    return { ok: false, error: "Could not create emergency contact" };
  }
}

export async function updateEmergencyContact(id: string, patch: unknown): Promise<ActionResult<EmergencyContact>> {
  const parsed = EmergencyContactPatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: "Invalid emergency contact" };
  const ctx = await requireCtx();
  try {
    const result = await svcUpdateEmergencyContact(ctx, id, parsed.data);
    if (!result) return { ok: false, error: "Emergency contact not found" };
    revalidateFeTag("emergency-contacts");
    await bustCache("emergency-contacts");
    return { ok: true, data: result };
  } catch (err) {
    console.error("updateEmergencyContact", err);
    return { ok: false, error: "Could not update emergency contact" };
  }
}

export async function deleteEmergencyContact(id: string): Promise<ActionResult<void>> {
  const ctx = await requireCtx();
  try {
    await svcDeleteEmergencyContact(ctx, id);
    revalidateFeTag("emergency-contacts");
    await bustCache("emergency-contacts");
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("deleteEmergencyContact", err);
    return { ok: false, error: "Could not delete emergency contact" };
  }
}
