import "server-only";
import {
  listMergedRecords,
  readMergedRecord,
  writeRecord,
  deleteRecord,
  nextId,
} from "./_fs";
import { MaintenanceItemSchema, type MaintenanceItem } from "../types/maintenance-item";

const COLLECTION = "maintenance-items";
const ID_PREFIX = "MAINT";

export type NewMaintenanceItem = Omit<MaintenanceItem, "id">;

export async function list(userId: string): Promise<MaintenanceItem[]> {
  const rows = await listMergedRecords<unknown>(userId, COLLECTION);
  return rows.map((r) => MaintenanceItemSchema.parse(r));
}

export async function get(
  userId: string,
  id: string,
): Promise<MaintenanceItem | null> {
  const row = await readMergedRecord<unknown>(userId, COLLECTION, id);
  return row ? MaintenanceItemSchema.parse(row) : null;
}

export async function create(
  userId: string,
  data: NewMaintenanceItem,
): Promise<MaintenanceItem> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const record = MaintenanceItemSchema.parse({ ...data, id });
  await writeRecord(userId, COLLECTION, id, { core: { ...record } });
  return record;
}

export async function update(
  userId: string,
  id: string,
  patch: Partial<MaintenanceItem>,
): Promise<MaintenanceItem | null> {
  const current = await get(userId, id);
  if (!current) return null;
  const updated = MaintenanceItemSchema.parse({ ...current, ...patch, id: current.id });
  await writeRecord(userId, COLLECTION, id, { core: { ...updated } });
  return updated;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}
