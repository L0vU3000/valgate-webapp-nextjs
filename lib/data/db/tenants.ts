import "server-only";
import {
  listMergedRecords,
  readMergedRecord,
  writeRecord,
  deleteRecord,
  nextId,
} from "./_fs";
import { TenantSchema, type Tenant } from "../types/tenant";

const COLLECTION = "tenants";
const ID_PREFIX = "TEN";

export type NewTenant = Omit<Tenant, "id">;

export async function list(userId: string): Promise<Tenant[]> {
  const rows = await listMergedRecords<unknown>(userId, COLLECTION);
  return rows.map((r) => TenantSchema.parse(r));
}

export async function get(
  userId: string,
  id: string,
): Promise<Tenant | null> {
  const row = await readMergedRecord<unknown>(userId, COLLECTION, id);
  return row ? TenantSchema.parse(row) : null;
}

export async function create(
  userId: string,
  data: NewTenant,
): Promise<Tenant> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const record = TenantSchema.parse({ ...data, id });
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
  const updated = TenantSchema.parse({ ...current, ...patch, id: current.id });
  await writeRecord(userId, COLLECTION, id, { core: { ...updated } });
  return updated;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}
