import "server-only";
import {
  listMergedRecords,
  readMergedRecord,
  writeRecord,
  deleteRecord,
  nextId,
} from "./_fs";
import type { OwnershipHistory } from "../types/ownership-history";

const COLLECTION = "ownership-history";
const ID_PREFIX = "OWNH";

export type NewOwnershipHistory = Omit<OwnershipHistory, "id" | "userId">;

export async function list(userId: string): Promise<OwnershipHistory[]> {
  return listMergedRecords<OwnershipHistory>(userId, COLLECTION);
}

export async function get(
  userId: string,
  id: string,
): Promise<OwnershipHistory | null> {
  return readMergedRecord<OwnershipHistory>(userId, COLLECTION, id);
}

export async function create(
  userId: string,
  data: NewOwnershipHistory,
): Promise<OwnershipHistory> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const record: OwnershipHistory = { ...data, id, userId };
  await writeRecord(userId, COLLECTION, id, { core: { ...record } });
  return record;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}
