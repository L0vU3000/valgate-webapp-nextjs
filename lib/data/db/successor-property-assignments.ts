import "server-only";
import {
  deleteRecord,
  listMergedRecords,
  nextId,
  readMergedRecord,
  writeRecord,
} from "./_fs";
import {
  SuccessorPropertyAssignmentSchema,
  type SuccessorPropertyAssignment,
} from "../types/successor-property-assignment";

const COLLECTION = "successor-property-assignments";
const ID_PREFIX = "SPA";

export type NewSuccessorPropertyAssignment = Omit<SuccessorPropertyAssignment, "id">;

export async function list(userId: string): Promise<SuccessorPropertyAssignment[]> {
  const rows = await listMergedRecords<unknown>(userId, COLLECTION);
  return rows.map((row) => SuccessorPropertyAssignmentSchema.parse(row));
}

export async function get(
  userId: string,
  id: string,
): Promise<SuccessorPropertyAssignment | null> {
  const row = await readMergedRecord<unknown>(userId, COLLECTION, id);
  return row ? SuccessorPropertyAssignmentSchema.parse(row) : null;
}

export async function create(
  userId: string,
  data: NewSuccessorPropertyAssignment,
): Promise<SuccessorPropertyAssignment> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const record = SuccessorPropertyAssignmentSchema.parse({ ...data, id });
  await writeRecord(userId, COLLECTION, id, { core: { ...record } });
  return record;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}
