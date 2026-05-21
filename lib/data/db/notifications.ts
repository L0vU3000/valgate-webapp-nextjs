import "server-only";
import {
  listMergedRecords,
  readMergedRecord,
  writeRecord,
  deleteRecord,
  nextId,
} from "./_fs";
import { NotificationSchema, type Notification } from "../types/notification";

const COLLECTION = "notifications";
const ID_PREFIX = "NOTIF";

export type NewNotification = Omit<Notification, "id" | "userId">;

export async function list(userId: string): Promise<Notification[]> {
  const rows = await listMergedRecords<unknown>(userId, COLLECTION);
  return rows.map((r) => NotificationSchema.parse(r));
}

export async function get(
  userId: string,
  id: string,
): Promise<Notification | null> {
  const row = await readMergedRecord<unknown>(userId, COLLECTION, id);
  return row ? NotificationSchema.parse(row) : null;
}

export async function create(
  userId: string,
  data: NewNotification,
): Promise<Notification> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const record = NotificationSchema.parse({ ...data, id, userId });
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
  const updated = NotificationSchema.parse({ ...current, ...patch, id: current.id, userId: current.userId });
  await writeRecord(userId, COLLECTION, id, { core: { ...updated } });
  return updated;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}
