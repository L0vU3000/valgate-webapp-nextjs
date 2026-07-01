import "server-only";
import {
  listMergedRecords,
  readMergedRecord,
  writeRecord,
  deleteRecord,
  nextId,
} from "./_fs";
import { ClientSchema, type Client } from "../types/client";

const COLLECTION = "clients";
const ID_PREFIX = "CLI";

export type NewClient = Omit<Client, "id" | "createdAt" | "updatedAt"> &
  Partial<Pick<Client, "createdAt" | "updatedAt">>;

export async function list(userId: string): Promise<Client[]> {
  const rows = await listMergedRecords<unknown>(userId, COLLECTION);
  return rows.map((r) => ClientSchema.parse(r));
}

export async function get(
  userId: string,
  id: string,
): Promise<Client | null> {
  const row = await readMergedRecord<unknown>(userId, COLLECTION, id);
  return row ? ClientSchema.parse(row) : null;
}

export async function create(
  userId: string,
  data: NewClient,
  overrideId?: string,
): Promise<Client> {
  const id = overrideId ?? await nextId(userId, COLLECTION, ID_PREFIX);
  const now = Date.now();
  const record = ClientSchema.parse({
    ...data,
    id,
    userId,
    createdAt: data.createdAt ?? now,
    updatedAt: data.updatedAt ?? now,
  });
  await writeRecord(userId, COLLECTION, id, { core: { ...record } });
  return record;
}

export async function update(
  userId: string,
  id: string,
  patch: Partial<Client>,
): Promise<Client | null> {
  const current = await get(userId, id);
  if (!current) return null;
  const record = ClientSchema.parse({
    ...current,
    ...patch,
    id: current.id,
    userId: current.userId,
    createdAt: current.createdAt,
    updatedAt: Date.now(),
  });
  await writeRecord(userId, COLLECTION, id, { core: { ...record } });
  return record;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}
