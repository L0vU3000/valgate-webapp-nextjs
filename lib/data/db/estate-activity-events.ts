import "server-only";
import {
  deleteRecord,
  listMergedRecords,
  nextId,
  readMergedRecord,
  writeRecord,
} from "./_fs";
import {
  EstateActivityEventSchema,
  type EstateActivityEvent,
} from "../types/estate-activity-event";

const COLLECTION = "estate-activity-events";
const ID_PREFIX = "EACT";

export type NewEstateActivityEvent = Omit<EstateActivityEvent, "id" | "userId">;

export async function list(userId: string): Promise<EstateActivityEvent[]> {
  const rows = await listMergedRecords<unknown>(userId, COLLECTION);
  const events = rows.map((row) => EstateActivityEventSchema.parse(row));
  return events.sort((a, b) => b.createdAt - a.createdAt);
}

export async function get(
  userId: string,
  id: string,
): Promise<EstateActivityEvent | null> {
  const row = await readMergedRecord<unknown>(userId, COLLECTION, id);
  return row ? EstateActivityEventSchema.parse(row) : null;
}

export async function create(
  userId: string,
  data: NewEstateActivityEvent,
): Promise<EstateActivityEvent> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const record = EstateActivityEventSchema.parse({ ...data, id, userId });
  await writeRecord(userId, COLLECTION, id, { core: { ...record } });
  return record;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}
