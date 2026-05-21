import "server-only";
import { readMergedRecord, writeRecord } from "./_fs";
import {
  DbdiagramStateSchema,
  type DbdiagramState,
} from "../types/dbdiagram-state";

const COLLECTION = "dbdiagram-state";
const RECORD_ID = "STATE";

function emptyState(userId: string): DbdiagramState {
  return {
    id: RECORD_ID,
    userId,
    version: 1,
    updatedAt: 0,
    nodes: {},
    notes: [],
  };
}

export async function get(userId: string): Promise<DbdiagramState> {
  const row = await readMergedRecord<unknown>(userId, COLLECTION, RECORD_ID);
  if (!row) return emptyState(userId);
  return DbdiagramStateSchema.parse(row);
}

export async function save(
  userId: string,
  patch: Pick<DbdiagramState, "nodes" | "notes">,
): Promise<DbdiagramState> {
  const record = DbdiagramStateSchema.parse({
    id: RECORD_ID,
    userId,
    version: 1,
    updatedAt: Date.now(),
    nodes: patch.nodes,
    notes: patch.notes,
  });
  await writeRecord(userId, COLLECTION, RECORD_ID, { core: { ...record } });
  return record;
}
