import "server-only";
import {
  listMergedRecords,
  readMergedRecord,
  writeRecord,
  deleteRecord,
  nextId,
} from "./_fs";
import type { NotificationPreference } from "../types/notification-preference";

const COLLECTION = "notification-preferences";
const ID_PREFIX = "NPREF";

export type NewNotificationPreference = Omit<NotificationPreference, "id" | "userId">;

export async function list(userId: string): Promise<NotificationPreference[]> {
  return listMergedRecords<NotificationPreference>(userId, COLLECTION);
}

export async function get(
  userId: string,
  id: string,
): Promise<NotificationPreference | null> {
  return readMergedRecord<NotificationPreference>(userId, COLLECTION, id);
}

export async function create(
  userId: string,
  data: NewNotificationPreference,
): Promise<NotificationPreference> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const record: NotificationPreference = { ...data, id, userId };
  await writeRecord(userId, COLLECTION, id, { core: { ...record } });
  return record;
}

export async function update(
  userId: string,
  id: string,
  patch: Partial<NotificationPreference>,
): Promise<NotificationPreference | null> {
  const current = await get(userId, id);
  if (!current) return null;
  const updated = { ...current, ...patch, id: current.id, userId: current.userId };
  await writeRecord(userId, COLLECTION, id, { core: { ...updated } });
  return updated;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}
