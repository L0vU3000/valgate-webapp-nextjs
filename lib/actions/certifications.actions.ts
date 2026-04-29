"use server";

import { revalidateTag } from "next/cache";
import * as db from "@/lib/data/db/certifications";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import type { Certification } from "@/lib/data/types/certification";
import type { ActionResult } from "./properties.actions";

export async function createCertification(
  data: db.NewCertification,
): Promise<ActionResult<Certification>> {
  const userId = getCurrentUserId();
  const cert = await db.create(userId, data);
  revalidateTag("certifications");
  return { ok: true, data: cert };
}

export async function updateCertification(
  id: string,
  patch: Partial<Certification>,
): Promise<ActionResult<Certification>> {
  const userId = getCurrentUserId();
  const updated = await db.update(userId, id, patch);
  if (!updated) return { ok: false, error: "Certification not found" };
  revalidateTag("certifications");
  return { ok: true, data: updated };
}

export async function deleteCertification(
  id: string,
): Promise<ActionResult<void>> {
  const userId = getCurrentUserId();
  await db.remove(userId, id);
  revalidateTag("certifications");
  return { ok: true, data: undefined };
}
