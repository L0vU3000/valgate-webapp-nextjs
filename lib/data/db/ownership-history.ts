import "server-only";
import {
  listMergedRecords,
  readMergedRecord,
  writeRecord,
  deleteRecord,
  nextId,
} from "./_fs";
import { OwnershipHistorySchema, type OwnershipHistory } from "../types/ownership-history";

const COLLECTION = "ownership-history";
const ID_PREFIX = "OWNH";

export type NewOwnershipHistory = Omit<OwnershipHistory, "id">;

export async function list(userId: string): Promise<OwnershipHistory[]> {
  const rows = await listMergedRecords<unknown>(userId, COLLECTION);
  return rows.map((r) => OwnershipHistorySchema.parse(r));
}

export async function listByProperty(userId: string, propertyId: string): Promise<OwnershipHistory[]> {
  return (await list(userId)).filter((r) => r.propertyId === propertyId);
}

export async function get(
  userId: string,
  id: string,
): Promise<OwnershipHistory | null> {
  const row = await readMergedRecord<unknown>(userId, COLLECTION, id);
  return row ? OwnershipHistorySchema.parse(row) : null;
}

export async function create(
  userId: string,
  data: NewOwnershipHistory,
): Promise<OwnershipHistory> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const record = OwnershipHistorySchema.parse({ ...data, id });
  await writeRecord(userId, COLLECTION, id, { core: { ...record } });
  return record;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}
