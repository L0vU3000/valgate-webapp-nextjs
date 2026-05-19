import "server-only";
import {
  listMergedRecords,
  readMergedRecord,
  writeRecord,
  deleteRecord,
  nextId,
} from "./_fs";
import { CoOwnerSchema, type CoOwner } from "../types/co-owner";

const COLLECTION = "co-owners";
const ID_PREFIX = "CO";

export async function list(userId: string): Promise<CoOwner[]> {
  const rows = await listMergedRecords<unknown>(userId, COLLECTION);
  return rows.map((r) => CoOwnerSchema.parse(r));
}

export async function listByProperty(userId: string, propertyId: string): Promise<CoOwner[]> {
  return (await list(userId)).filter((r) => r.propertyId === propertyId);
}

export async function get(userId: string, id: string): Promise<CoOwner | null> {
  const row = await readMergedRecord<unknown>(userId, COLLECTION, id);
  return row ? CoOwnerSchema.parse(row) : null;
}

export async function create(
  userId: string,
  data: Omit<CoOwner, "id">,
): Promise<CoOwner> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const record = CoOwnerSchema.parse({ ...data, id });
  await writeRecord(userId, COLLECTION, id, { core: { ...record } });
  return record;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}
