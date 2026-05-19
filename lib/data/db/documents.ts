import "server-only";
import {
  listMergedRecords,
  readMergedRecord,
  writeRecord,
  deleteRecord,
  nextId,
} from "./_fs";
import { DocumentSchema, type Document } from "../types/document";

const COLLECTION = "documents";
const ID_PREFIX = "DOC";

export type NewDocument = Omit<Document, "id">;

export async function list(userId: string): Promise<Document[]> {
  const rows = await listMergedRecords<unknown>(userId, COLLECTION);
  return rows.map((r) => DocumentSchema.parse(r));
}

export async function get(
  userId: string,
  id: string,
): Promise<Document | null> {
  const row = await readMergedRecord<unknown>(userId, COLLECTION, id);
  return row ? DocumentSchema.parse(row) : null;
}

export async function create(
  userId: string,
  data: NewDocument,
): Promise<Document> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const record = DocumentSchema.parse({ ...data, id });
  await writeRecord(userId, COLLECTION, id, { core: { ...record } });
  return record;
}

export async function update(
  userId: string,
  id: string,
  patch: Partial<Document>,
): Promise<Document | null> {
  const current = await get(userId, id);
  if (!current) return null;
  const updated = DocumentSchema.parse({ ...current, ...patch, id: current.id });
  await writeRecord(userId, COLLECTION, id, { core: { ...updated } });
  return updated;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}
