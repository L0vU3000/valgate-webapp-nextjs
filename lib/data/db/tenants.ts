import "server-only";
import {
  listMergedRecords,
  readMergedRecord,
  writeRecord,
  deleteRecord,
  nextId,
} from "./_fs";
import type { Tenant } from "../types/tenant";

const COLLECTION = "tenants";
const ID_PREFIX = "TEN";

export type NewTenant = Omit<Tenant, "id" | "userId">;

export async function list(userId: string): Promise<Tenant[]> {
  return listMergedRecords<Tenant>(userId, COLLECTION);
}

export async function get(
  userId: string,
  id: string,
): Promise<Tenant | null> {
  return readMergedRecord<Tenant>(userId, COLLECTION, id);
}

export async function create(
  userId: string,
  data: NewTenant,
): Promise<Tenant> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const record: Tenant = { ...data, id, userId };
  await writeRecord(userId, COLLECTION, id, { core: { ...record } });
  return record;
}

export async function update(
  userId: string,
  id: string,
  patch: Partial<Tenant>,
): Promise<Tenant | null> {
  const current = await get(userId, id);
  if (!current) return null;
  const updated = { ...current, ...patch, id: current.id, userId: current.userId };
  await writeRecord(userId, COLLECTION, id, { core: { ...updated } });
  return updated;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}
