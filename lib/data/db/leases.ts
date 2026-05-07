import "server-only";
import {
  listMergedRecords,
  readMergedRecord,
  writeRecord,
  deleteRecord,
  nextId,
} from "./_fs";
import { LeaseSchema, type Lease } from "../types/lease";

const COLLECTION = "leases";
const ID_PREFIX = "LEASE";

export type NewLease = Omit<Lease, "id" | "userId">;

export async function list(userId: string): Promise<Lease[]> {
  const rows = await listMergedRecords<unknown>(userId, COLLECTION);
  return rows.map((r) => LeaseSchema.parse(r));
}

export async function get(userId: string, id: string): Promise<Lease | null> {
  const row = await readMergedRecord<unknown>(userId, COLLECTION, id);
  return row ? LeaseSchema.parse(row) : null;
}

export async function create(
  userId: string,
  data: NewLease,
): Promise<Lease> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const record = LeaseSchema.parse({ ...data, id, userId });
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
  const updated = LeaseSchema.parse({ ...current, ...patch, id: current.id, userId: current.userId });
  await writeRecord(userId, COLLECTION, id, { core: { ...updated } });
  return updated;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}
