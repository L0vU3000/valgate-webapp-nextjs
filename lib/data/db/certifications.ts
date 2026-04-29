import "server-only";
import {
  listMergedRecords,
  readMergedRecord,
  writeRecord,
  deleteRecord,
  nextId,
} from "./_fs";
import type { Certification } from "../types/certification";

const COLLECTION = "certifications";
const ID_PREFIX = "CERT";

export type NewCertification = Omit<Certification, "id" | "userId">;

export async function list(userId: string): Promise<Certification[]> {
  return listMergedRecords<Certification>(userId, COLLECTION);
}

export async function get(
  userId: string,
  id: string,
): Promise<Certification | null> {
  return readMergedRecord<Certification>(userId, COLLECTION, id);
}

export async function create(
  userId: string,
  data: NewCertification,
): Promise<Certification> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const record: Certification = { ...data, id, userId };
  await writeRecord(userId, COLLECTION, id, { core: { ...record } });
  return record;
}

export async function update(
  userId: string,
  id: string,
  patch: Partial<Certification>,
): Promise<Certification | null> {
  const current = await get(userId, id);
  if (!current) return null;
  const updated = { ...current, ...patch, id: current.id, userId: current.userId };
  await writeRecord(userId, COLLECTION, id, { core: { ...updated } });
  return updated;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}
