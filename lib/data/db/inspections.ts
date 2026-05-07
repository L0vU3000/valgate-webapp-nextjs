import "server-only";
import {
  listMergedRecords,
  readMergedRecord,
  writeRecord,
  deleteRecord,
  nextId,
} from "./_fs";
import { InspectionSchema, type Inspection } from "../types/inspection";

const COLLECTION = "inspections";
const ID_PREFIX = "INSP";

export type NewInspection = Omit<Inspection, "id" | "userId">;

export async function list(userId: string): Promise<Inspection[]> {
  const rows = await listMergedRecords<unknown>(userId, COLLECTION);
  return rows.map((r) => InspectionSchema.parse(r));
}

export async function get(
  userId: string,
  id: string,
): Promise<Inspection | null> {
  const row = await readMergedRecord<unknown>(userId, COLLECTION, id);
  return row ? InspectionSchema.parse(row) : null;
}

export async function create(
  userId: string,
  data: NewInspection,
): Promise<Inspection> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const record = InspectionSchema.parse({ ...data, id, userId });
  await writeRecord(userId, COLLECTION, id, { core: { ...record } });
  return record;
}

export async function update(
  userId: string,
  id: string,
  patch: Partial<Inspection>,
): Promise<Inspection | null> {
  const current = await get(userId, id);
  if (!current) return null;
  const updated = InspectionSchema.parse({ ...current, ...patch, id: current.id, userId: current.userId });
  await writeRecord(userId, COLLECTION, id, { core: { ...updated } });
  return updated;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}
