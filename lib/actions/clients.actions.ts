"use server";

import { revalidateTag } from "next/cache";
import * as clientsDb from "@/lib/data/db/clients";
import * as propertiesDb from "@/lib/data/db/properties";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import type { Client } from "@/lib/data/types/client";
import type { ActionResult } from "./properties.actions";

export async function createClient(
  data: clientsDb.NewClient,
): Promise<ActionResult<Client>> {
  const userId = getCurrentUserId();
  const client = await clientsDb.create(userId, data);
  revalidateTag("clients");
  return { ok: true, data: client };
}

export async function updateClient(
  id: string,
  patch: Partial<Client>,
): Promise<ActionResult<Client>> {
  const userId = getCurrentUserId();
  const updated = await clientsDb.update(userId, id, patch);
  if (!updated) return { ok: false, error: "Client not found" };
  revalidateTag("clients");
  return { ok: true, data: updated };
}

// Points each property's clientId at the given client (ownership of the
// engagement, not legal ownership — that stays in OwnershipRecord).
export async function assignPropertiesToClient(
  clientId: string,
  propertyIds: string[],
): Promise<ActionResult<void>> {
  const userId = getCurrentUserId();

  const client = await clientsDb.get(userId, clientId);
  if (!client) return { ok: false, error: "Client not found" };

  for (const propertyId of propertyIds) {
    const updated = await propertiesDb.update(userId, propertyId, {
      clientId,
    });
    if (!updated) return { ok: false, error: "Property not found" };
  }

  revalidateTag("properties");
  return { ok: true, data: undefined };
}
