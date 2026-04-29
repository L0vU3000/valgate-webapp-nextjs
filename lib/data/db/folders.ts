import "server-only";
import {
  listMergedRecords,
  readMergedRecord,
  writeRecord,
  deleteRecord,
  nextId,
} from "./_fs";
import type { Folder } from "../types/folder";

const COLLECTION = "folders";
const ID_PREFIX = "FLDR";

export type NewFolder = Omit<Folder, "id" | "userId">;

export async function list(userId: string): Promise<Folder[]> {
  return listMergedRecords<Folder>(userId, COLLECTION);
}

export async function get(
  userId: string,
  id: string,
): Promise<Folder | null> {
  return readMergedRecord<Folder>(userId, COLLECTION, id);
}

export async function create(
  userId: string,
  data: NewFolder,
): Promise<Folder> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const record: Folder = { ...data, id, userId };
  await writeRecord(userId, COLLECTION, id, { core: { ...record } });
  return record;
}

export async function update(
  userId: string,
  id: string,
  patch: Partial<Folder>,
): Promise<Folder | null> {
  const current = await get(userId, id);
  if (!current) return null;
  const updated = { ...current, ...patch, id: current.id, userId: current.userId };
  await writeRecord(userId, COLLECTION, id, { core: { ...updated } });
  return updated;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}
