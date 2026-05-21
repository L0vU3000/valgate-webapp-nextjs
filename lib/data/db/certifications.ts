import "server-only";
import {
  listMergedRecords,
  readMergedRecord,
  writeRecord,
  deleteRecord,
  nextId,
} from "./_fs";
import { CertificationSchema, type Certification } from "../types/certification";

const COLLECTION = "certifications";
const ID_PREFIX = "CERT";

export type NewCertification = Omit<Certification, "id">;

export async function list(userId: string): Promise<Certification[]> {
  const rows = await listMergedRecords<unknown>(userId, COLLECTION);
  return rows.map((r) => CertificationSchema.parse(r));
}

export async function get(
  userId: string,
  id: string,
): Promise<Certification | null> {
  const row = await readMergedRecord<unknown>(userId, COLLECTION, id);
  return row ? CertificationSchema.parse(row) : null;
}

export async function create(
  userId: string,
  data: NewCertification,
): Promise<Certification> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const record = CertificationSchema.parse({ ...data, id });
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
  const updated = CertificationSchema.parse({ ...current, ...patch, id: current.id });
  await writeRecord(userId, COLLECTION, id, { core: { ...updated } });
  return updated;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}
