import "server-only";
import {
  listMergedRecords,
  readMergedRecord,
  writeRecord,
  deleteRecord,
  nextId,
} from "./_fs";
import type { Lease } from "../types/lease";

const COLLECTION = "leases";
const ID_PREFIX = "LEASE";

export type NewLease = Omit<Lease, "id" | "userId">;

export async function list(userId: string): Promise<Lease[]> {
  return listMergedRecords<Lease>(userId, COLLECTION);
}

export async function get(userId: string, id: string): Promise<Lease | null> {
  return readMergedRecord<Lease>(userId, COLLECTION, id);
}

export async function create(
  userId: string,
  data: NewLease,
): Promise<Lease> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const record: Lease = { ...data, id, userId };
  await writeRecord(userId, COLLECTION, id, { core: { ...record } });
  return record;
}

export async function update(
  userId: string,
  id: string,
  patch: Partial<Lease>,
): Promise<Lease | null> {
  const current = await get(userId, id);
  if (!current) return null;
  const updated = { ...current, ...patch, id: current.id, userId: current.userId };
  await writeRecord(userId, COLLECTION, id, { core: { ...updated } });
  return updated;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}
