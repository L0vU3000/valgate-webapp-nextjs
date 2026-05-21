import "server-only";
import {
  listMergedRecords,
  readMergedRecord,
  writeRecord,
  deleteRecord,
  nextId,
} from "./_fs";
import { LandParcelSchema, type LandParcel } from "../types/land-parcel";

const COLLECTION = "land-parcels";
const ID_PREFIX = "LP";

export async function list(userId: string): Promise<LandParcel[]> {
  const rows = await listMergedRecords<unknown>(userId, COLLECTION);
  return rows.map((r) => LandParcelSchema.parse(r));
}

export async function get(
  userId: string,
  id: string,
): Promise<LandParcel | null> {
  const row = await readMergedRecord<unknown>(userId, COLLECTION, id);
  return row ? LandParcelSchema.parse(row) : null;
}

export async function create(
  userId: string,
  data: Omit<LandParcel, "id">,
): Promise<LandParcel> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const record = LandParcelSchema.parse({ ...data, id });
  await writeRecord(userId, COLLECTION, id, { core: { ...record } });
  return record;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}
