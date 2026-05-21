import "server-only";
import {
  deleteRecord,
  listMergedRecords,
  nextId,
  readMergedRecord,
  writeRecord,
} from "./_fs";
import {
  EstateAssignmentSchema,
  type EstateAssignment,
} from "../types/successor-property-assignment";

const COLLECTION = "estate-assignments";
const ID_PREFIX = "EA";

export type NewEstateAssignment = Omit<EstateAssignment, "id">;

export async function list(userId: string): Promise<EstateAssignment[]> {
  const rows = await listMergedRecords<unknown>(userId, COLLECTION);
  return rows.map((row) => EstateAssignmentSchema.parse(row));
}

export async function get(
  userId: string,
  id: string,
): Promise<EstateAssignment | null> {
  const row = await readMergedRecord<unknown>(userId, COLLECTION, id);
  return row ? EstateAssignmentSchema.parse(row) : null;
}

export async function create(
  userId: string,
  data: NewEstateAssignment,
): Promise<EstateAssignment> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const record = EstateAssignmentSchema.parse({ ...data, id });
  await writeRecord(userId, COLLECTION, id, { core: { ...record } });
  return record;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}
