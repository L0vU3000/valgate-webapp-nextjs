import "server-only";
import {
  listMergedRecords,
  readMergedRecord,
  writeRecord,
  deleteRecord,
  nextId,
} from "./_fs";
import { SuccessorSchema, type Successor } from "../types/successor";

const COLLECTION = "successors";
const ID_PREFIX = "SUCC";

export type NewSuccessor = Omit<Successor, "id" | "userId">;

export async function list(userId: string): Promise<Successor[]> {
  const rows = await listMergedRecords<unknown>(userId, COLLECTION);
  return rows.map((r) => SuccessorSchema.parse(r));
}

export async function get(
  userId: string,
  id: string,
): Promise<Successor | null> {
  const row = await readMergedRecord<unknown>(userId, COLLECTION, id);
  return row ? SuccessorSchema.parse(row) : null;
}

export async function create(
  userId: string,
  data: NewSuccessor,
): Promise<Successor> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const record = SuccessorSchema.parse({ ...data, id, userId });
  await writeRecord(userId, COLLECTION, id, { core: { ...record } });
  return record;
}

export async function update(
  userId: string,
  id: string,
  patch: Partial<Successor>,
): Promise<Successor | null> {
  const current = await get(userId, id);
  if (!current) return null;
  const updated = SuccessorSchema.parse({ ...current, ...patch, id: current.id, userId: current.userId });
  await writeRecord(userId, COLLECTION, id, { core: { ...updated } });
  return updated;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}
