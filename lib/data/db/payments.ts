import "server-only";
import {
  listMergedRecords,
  readMergedRecord,
  writeRecord,
  deleteRecord,
  nextId,
} from "./_fs";
import type { Payment } from "../types/payment";

const COLLECTION = "payments";
const ID_PREFIX = "PMT";

export async function list(userId: string): Promise<Payment[]> {
  return listMergedRecords<Payment>(userId, COLLECTION);
}

export async function get(
  userId: string,
  id: string,
): Promise<Payment | null> {
  return readMergedRecord<Payment>(userId, COLLECTION, id);
}

export async function create(
  userId: string,
  data: Omit<Payment, "id" | "userId">,
): Promise<Payment> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const record: Payment = { ...data, id, userId };
  await writeRecord(userId, COLLECTION, id, { core: { ...record } });
  return record;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}
