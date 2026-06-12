import "server-only";
import {
  listMergedRecords,
  readMergedRecord,
  writeRecord,
  deleteRecord,
  nextId,
} from "./_fs";
import { SafetyRiskSchema, type SafetyRisk } from "../types/safety-risk";

const COLLECTION = "safety-risks";
const ID_PREFIX = "RISK";

export type NewSafetyRisk = Omit<SafetyRisk, "id">;

export async function list(userId: string): Promise<SafetyRisk[]> {
  const rows = await listMergedRecords<unknown>(userId, COLLECTION);
  return rows.map((r) => SafetyRiskSchema.parse(r));
}

export async function get(
  userId: string,
  id: string,
): Promise<SafetyRisk | null> {
  const row = await readMergedRecord<unknown>(userId, COLLECTION, id);
  return row ? SafetyRiskSchema.parse(row) : null;
}

export async function create(
  userId: string,
  data: NewSafetyRisk,
): Promise<SafetyRisk> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const record = SafetyRiskSchema.parse({ ...data, id });
  await writeRecord(userId, COLLECTION, id, { core: { ...record } });
  return record;
}

// Applies a partial change to an existing risk (e.g. resolving it) and
// re-validates the whole record through the schema before writing it back.
// Returns the updated risk, or null if no risk with that id exists.
export async function update(
  userId: string,
  id: string,
  patch: Partial<SafetyRisk>,
): Promise<SafetyRisk | null> {
  const current = await get(userId, id);
  if (!current) return null;
  const updated = SafetyRiskSchema.parse({ ...current, ...patch, id: current.id });
  await writeRecord(userId, COLLECTION, id, { core: { ...updated } });
  return updated;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}
