import "server-only";
import {
  listMergedRecords,
  readMergedRecord,
  writeRecord,
  deleteRecord,
  nextId,
} from "./_fs";
import { OwnershipRecordSchema, type OwnershipRecord } from "../types/ownership-record";

const COLLECTION = "ownership-records";
const ID_PREFIX = "OREC";

export type NewOwnershipRecord = Omit<OwnershipRecord, "id" | "userId">;

export async function list(userId: string): Promise<OwnershipRecord[]> {
  const rows = await listMergedRecords<unknown>(userId, COLLECTION);
  return rows.map((r) => OwnershipRecordSchema.parse(r));
}

export async function listByProperty(userId: string, propertyId: string): Promise<OwnershipRecord[]> {
  return (await list(userId)).filter((r) => r.propertyId === propertyId);
}

export async function get(
  userId: string,
  id: string,
): Promise<OwnershipRecord | null> {
  const row = await readMergedRecord<unknown>(userId, COLLECTION, id);
  return row ? OwnershipRecordSchema.parse(row) : null;
}

export async function create(
  userId: string,
  data: NewOwnershipRecord,
): Promise<OwnershipRecord> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const record = OwnershipRecordSchema.parse({ ...data, id, userId });
  await writeRecord(userId, COLLECTION, id, { core: { ...record } });
  return record;
}

export async function update(
  userId: string,
  id: string,
  patch: Partial<OwnershipRecord>,
): Promise<OwnershipRecord | null> {
  const current = await get(userId, id);
  if (!current) return null;
  const updated = OwnershipRecordSchema.parse({ ...current, ...patch, id: current.id, userId: current.userId });
  await writeRecord(userId, COLLECTION, id, { core: { ...updated } });
  return updated;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}
