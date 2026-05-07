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

export type NewSafetyRisk = Omit<SafetyRisk, "id" | "userId">;

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
  const record = SafetyRiskSchema.parse({ ...data, id, userId });
  await writeRecord(userId, COLLECTION, id, { core: { ...record } });
  return record;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}
