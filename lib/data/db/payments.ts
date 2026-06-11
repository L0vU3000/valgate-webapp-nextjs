import "server-only";
import {
  listMergedRecords,
  readMergedRecord,
  writeRecord,
  deleteRecord,
  nextId,
} from "./_fs";
import { PaymentSchema, type Payment } from "../types/payment";

const COLLECTION = "payments";
const ID_PREFIX = "PMT";

export async function list(userId: string): Promise<Payment[]> {
  const rows = await listMergedRecords<unknown>(userId, COLLECTION);
  return rows.map((r) => PaymentSchema.parse(r));
}

export async function get(
  userId: string,
  id: string,
): Promise<Payment | null> {
  const row = await readMergedRecord<unknown>(userId, COLLECTION, id);
  return row ? PaymentSchema.parse(row) : null;
}

export async function create(
  userId: string,
  data: Omit<Payment, "id">,
): Promise<Payment> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const record = PaymentSchema.parse({ ...data, id });
  await writeRecord(userId, COLLECTION, id, { core: { ...record } });
  return record;
}

export async function update(
  userId: string,
  id: string,
  patch: Partial<Payment>,
): Promise<Payment | null> {
  const current = await get(userId, id);
  if (!current) return null;
  const record = PaymentSchema.parse({
    ...current,
    ...patch,
    id: current.id,
  });
  await writeRecord(userId, COLLECTION, id, { core: { ...record } });
  return record;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}
