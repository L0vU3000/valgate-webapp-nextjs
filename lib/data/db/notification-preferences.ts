import "server-only";
import {
  listMergedRecords,
  readMergedRecord,
  writeRecord,
  deleteRecord,
  nextId,
} from "./_fs";
import { NotificationPreferenceSchema, type NotificationPreference } from "../types/notification-preference";

const COLLECTION = "notification-preferences";
const ID_PREFIX = "NPREF";

export type NewNotificationPreference = Omit<NotificationPreference, "id" | "userId">;

export async function list(userId: string): Promise<NotificationPreference[]> {
  const rows = await listMergedRecords<unknown>(userId, COLLECTION);
  return rows.map((r) => NotificationPreferenceSchema.parse(r));
}

export async function get(
  userId: string,
  id: string,
): Promise<NotificationPreference | null> {
  const row = await readMergedRecord<unknown>(userId, COLLECTION, id);
  return row ? NotificationPreferenceSchema.parse(row) : null;
}

export async function create(
  userId: string,
  data: NewNotificationPreference,
): Promise<NotificationPreference> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const record = NotificationPreferenceSchema.parse({ ...data, id, userId });
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
  const updated = NotificationPreferenceSchema.parse({ ...current, ...patch, id: current.id, userId: current.userId });
  await writeRecord(userId, COLLECTION, id, { core: { ...updated } });
  return updated;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}
