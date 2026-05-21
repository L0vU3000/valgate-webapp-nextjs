import "server-only";
import {
  listMergedRecords,
  readMergedRecord,
  writeRecord,
  deleteRecord,
  nextId,
} from "./_fs";
import { PropertyValuationSchema, type PropertyValuation } from "../types/property-valuation";

const COLLECTION = "property-valuations";
const ID_PREFIX = "VAL";

export type NewPropertyValuation = Omit<PropertyValuation, "id">;

export async function list(userId: string): Promise<PropertyValuation[]> {
  const rows = await listMergedRecords<unknown>(userId, COLLECTION);
  return rows.map((r) => PropertyValuationSchema.parse(r));
}

export async function get(
  userId: string,
  id: string,
): Promise<PropertyValuation | null> {
  const row = await readMergedRecord<unknown>(userId, COLLECTION, id);
  return row ? PropertyValuationSchema.parse(row) : null;
}

export async function create(
  userId: string,
  data: NewPropertyValuation,
): Promise<PropertyValuation> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const record = PropertyValuationSchema.parse({ ...data, id });
  await writeRecord(userId, COLLECTION, id, { core: { ...record } });
  return record;
}

export async function update(
  userId: string,
  id: string,
  patch: Partial<PropertyValuation>,
): Promise<PropertyValuation | null> {
  const current = await get(userId, id);
  if (!current) return null;
  const updated = PropertyValuationSchema.parse({ ...current, ...patch, id: current.id });
  await writeRecord(userId, COLLECTION, id, { core: { ...updated } });
  return updated;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}
