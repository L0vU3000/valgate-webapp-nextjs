import "server-only";
import {
  listMergedRecords,
  readMergedRecord,
  writeRecord,
  deleteRecord,
  nextId,
} from "./_fs";
import { FolderSchema, type Folder } from "../types/folder";

const COLLECTION = "folders";
const ID_PREFIX = "FLDR";

export type NewFolder = Omit<Folder, "id">;

export async function list(userId: string): Promise<Folder[]> {
  const rows = await listMergedRecords<unknown>(userId, COLLECTION);
  return rows.map((r) => FolderSchema.parse(r));
}

export async function get(
  userId: string,
  id: string,
): Promise<Folder | null> {
  const row = await readMergedRecord<unknown>(userId, COLLECTION, id);
  return row ? FolderSchema.parse(row) : null;
}

export async function create(
  userId: string,
  data: NewFolder,
): Promise<Folder> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const record = FolderSchema.parse({ ...data, id });
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
  const updated = FolderSchema.parse({ ...current, ...patch, id: current.id });
  await writeRecord(userId, COLLECTION, id, { core: { ...updated } });
  return updated;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}
