import "server-only";
import {
  listMergedRecords,
  readMergedRecord,
  writeRecord,
  deleteRecord,
  nextId,
} from "./_fs";
import type { SafetyRisk } from "../types/safety-risk";

const COLLECTION = "safety-risks";
const ID_PREFIX = "RISK";

export type NewSafetyRisk = Omit<SafetyRisk, "id" | "userId">;

export async function list(userId: string): Promise<SafetyRisk[]> {
  return listMergedRecords<SafetyRisk>(userId, COLLECTION);
}

export async function get(
  userId: string,
  id: string,
): Promise<SafetyRisk | null> {
  return readMergedRecord<SafetyRisk>(userId, COLLECTION, id);
}

export async function create(
  userId: string,
  data: NewSafetyRisk,
): Promise<SafetyRisk> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const record: SafetyRisk = { ...data, id, userId };
  await writeRecord(userId, COLLECTION, id, { core: { ...record } });
  return record;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}
