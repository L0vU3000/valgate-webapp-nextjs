import "server-only";
import {
  listMergedRecords,
  readMergedRecord,
  writeRecord,
  deleteRecord,
  nextId,
} from "./_fs";
import { EmergencyContactSchema, type EmergencyContact } from "../types/emergency-contact";

const COLLECTION = "emergency-contacts";
const ID_PREFIX = "EMGC";

export type NewEmergencyContact = Omit<EmergencyContact, "id">;

export async function list(userId: string): Promise<EmergencyContact[]> {
  const rows = await listMergedRecords<unknown>(userId, COLLECTION);
  return rows.map((r) => EmergencyContactSchema.parse(r));
}

export async function get(
  userId: string,
  id: string,
): Promise<EmergencyContact | null> {
  const row = await readMergedRecord<unknown>(userId, COLLECTION, id);
  return row ? EmergencyContactSchema.parse(row) : null;
}

export async function create(
  userId: string,
  data: NewEmergencyContact,
): Promise<EmergencyContact> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const record = EmergencyContactSchema.parse({ ...data, id });
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
  const updated = EmergencyContactSchema.parse({ ...current, ...patch, id: current.id });
  await writeRecord(userId, COLLECTION, id, { core: { ...updated } });
  return updated;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}
