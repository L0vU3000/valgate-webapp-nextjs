import "server-only"; // C1
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { emergencyContacts } from "@/lib/db/schema";
import { EmergencyContactSchema, type EmergencyContact } from "@/lib/data/types/emergency-contact";
import type { NewEmergencyContact, EmergencyContactPatch } from "@/lib/data/types/emergency-contact";
import { toDomain, type Ctx } from "@/lib/services/_mapping";
import { scopedInsert, scopedUpdate, scopedDelete } from "@/lib/services/_crud";

const rowToEmergencyContact = (r: typeof emergencyContacts.$inferSelect): EmergencyContact =>
  EmergencyContactSchema.parse(toDomain(emergencyContacts, r)); // C6/C7

export async function listEmergencyContacts(ctx: Ctx, propertyId?: string): Promise<EmergencyContact[]> {
  const rows = await db.select().from(emergencyContacts)
    .where(propertyId
      ? and(eq(emergencyContacts.orgId, ctx.orgId), eq(emergencyContacts.propertyId, propertyId))
      : eq(emergencyContacts.orgId, ctx.orgId)) // C3
    .orderBy(asc(emergencyContacts.createdAt), asc(emergencyContacts.id))
    .limit(500)
  return rows.map(rowToEmergencyContact);
}

export async function getEmergencyContact(ctx: Ctx, id: string): Promise<EmergencyContact | null> {
  const [row] = await db.select().from(emergencyContacts)
    .where(and(eq(emergencyContacts.orgId, ctx.orgId), eq(emergencyContacts.id, id))); // C3
  return row ? rowToEmergencyContact(row) : null;
}

export async function createEmergencyContact(ctx: Ctx, input: NewEmergencyContact): Promise<EmergencyContact> {
  const now = Date.now();
  return scopedInsert(ctx, emergencyContacts, "EMGC", { ...input, createdAt: now, updatedAt: now }, rowToEmergencyContact);
}

export async function updateEmergencyContact(ctx: Ctx, id: string, patch: EmergencyContactPatch): Promise<EmergencyContact | null> {
  return scopedUpdate(ctx, emergencyContacts, id, patch, rowToEmergencyContact, true);
}

export async function deleteEmergencyContact(ctx: Ctx, id: string): Promise<void> {
  await scopedDelete(ctx, emergencyContacts, id);
}
