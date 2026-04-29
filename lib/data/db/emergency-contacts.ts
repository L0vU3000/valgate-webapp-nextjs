import "server-only";
import {
  listMergedRecords,
  readMergedRecord,
  writeRecord,
  deleteRecord,
  nextId,
} from "./_fs";
import type { EmergencyContact } from "../types/emergency-contact";

const COLLECTION = "emergency-contacts";
const ID_PREFIX = "EMGC";

export type NewEmergencyContact = Omit<EmergencyContact, "id" | "userId">;

export async function list(userId: string): Promise<EmergencyContact[]> {
  return listMergedRecords<EmergencyContact>(userId, COLLECTION);
}

export async function get(
  userId: string,
  id: string,
): Promise<EmergencyContact | null> {
  return readMergedRecord<EmergencyContact>(userId, COLLECTION, id);
}

export async function create(
  userId: string,
  data: NewEmergencyContact,
): Promise<EmergencyContact> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const record: EmergencyContact = { ...data, id, userId };
  await writeRecord(userId, COLLECTION, id, { core: { ...record } });
  return record;
}

export async function update(
  userId: string,
  id: string,
  patch: Partial<EmergencyContact>,
): Promise<EmergencyContact | null> {
  const current = await get(userId, id);
  if (!current) return null;
  const updated = { ...current, ...patch, id: current.id, userId: current.userId };
  await writeRecord(userId, COLLECTION, id, { core: { ...updated } });
  return updated;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}
