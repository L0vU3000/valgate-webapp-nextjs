import "server-only";
import {
  listMergedRecords,
  readMergedRecord,
  writeRecord,
  deleteRecord,
  nextId,
} from "./_fs";
import type { Professional } from "../types/professional";

const COLLECTION = "professionals";
const ID_PREFIX = "PROF";

export type NewProfessional = Omit<Professional, "id" | "userId">;

export async function list(userId: string): Promise<Professional[]> {
  return listMergedRecords<Professional>(userId, COLLECTION);
}

export async function get(
  userId: string,
  id: string,
): Promise<Professional | null> {
  return readMergedRecord<Professional>(userId, COLLECTION, id);
}

export async function create(
  userId: string,
  data: NewProfessional,
): Promise<Professional> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const record: Professional = { ...data, id, userId };
  await writeRecord(userId, COLLECTION, id, { core: { ...record } });
  return record;
}

export async function update(
  userId: string,
  id: string,
  patch: Partial<Professional>,
): Promise<Professional | null> {
  const current = await get(userId, id);
  if (!current) return null;
  const updated = { ...current, ...patch, id: current.id, userId: current.userId };
  await writeRecord(userId, COLLECTION, id, { core: { ...updated } });
  return updated;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}
