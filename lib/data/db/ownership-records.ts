import "server-only";
import {
  listMergedRecords,
  readMergedRecord,
  writeRecord,
  deleteRecord,
  nextId,
} from "./_fs";
import type { OwnershipRecord } from "../types/ownership-record";

const COLLECTION = "ownership-records";
const ID_PREFIX = "OWNR";

export type NewOwnershipRecord = Omit<OwnershipRecord, "id" | "userId">;

export async function list(userId: string): Promise<OwnershipRecord[]> {
  return listMergedRecords<OwnershipRecord>(userId, COLLECTION);
}

export async function get(
  userId: string,
  id: string,
): Promise<OwnershipRecord | null> {
  return readMergedRecord<OwnershipRecord>(userId, COLLECTION, id);
}

export async function create(
  userId: string,
  data: NewOwnershipRecord,
): Promise<OwnershipRecord> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const record: OwnershipRecord = { ...data, id, userId };
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
  const updated = { ...current, ...patch, id: current.id, userId: current.userId };
  await writeRecord(userId, COLLECTION, id, { core: { ...updated } });
  return updated;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}
