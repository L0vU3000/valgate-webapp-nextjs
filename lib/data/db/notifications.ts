import "server-only";
import {
  listMergedRecords,
  readMergedRecord,
  writeRecord,
  deleteRecord,
  nextId,
} from "./_fs";
import type { Notification } from "../types/notification";

const COLLECTION = "notifications";
const ID_PREFIX = "NOTIF";

export type NewNotification = Omit<Notification, "id" | "userId">;

export async function list(userId: string): Promise<Notification[]> {
  return listMergedRecords<Notification>(userId, COLLECTION);
}

export async function get(
  userId: string,
  id: string,
): Promise<Notification | null> {
  return readMergedRecord<Notification>(userId, COLLECTION, id);
}

export async function create(
  userId: string,
  data: NewNotification,
): Promise<Notification> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const record: Notification = { ...data, id, userId };
  await writeRecord(userId, COLLECTION, id, { core: { ...record } });
  return record;
}

export async function update(
  userId: string,
  id: string,
  patch: Partial<Notification>,
): Promise<Notification | null> {
  const current = await get(userId, id);
  if (!current) return null;
  const updated = { ...current, ...patch, id: current.id, userId: current.userId };
  await writeRecord(userId, COLLECTION, id, { core: { ...updated } });
  return updated;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}
