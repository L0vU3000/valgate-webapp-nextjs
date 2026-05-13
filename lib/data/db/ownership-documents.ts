import "server-only";
import {
  listMergedRecords,
  readMergedRecord,
  writeRecord,
  deleteRecord,
  nextId,
} from "./_fs";
import { OwnershipDocumentSchema, type OwnershipDocument } from "../types/ownership-document";

const COLLECTION = "ownership-documents";
const ID_PREFIX = "ODOC";

export type NewOwnershipDocument = Omit<OwnershipDocument, "id" | "userId">;

export async function list(userId: string): Promise<OwnershipDocument[]> {
  const rows = await listMergedRecords<unknown>(userId, COLLECTION);
  return rows.map((r) => OwnershipDocumentSchema.parse(r));
}

export async function listByProperty(userId: string, propertyId: string): Promise<OwnershipDocument[]> {
  return (await list(userId)).filter((r) => r.propertyId === propertyId);
}

export async function get(
  userId: string,
  id: string,
): Promise<OwnershipDocument | null> {
  const row = await readMergedRecord<unknown>(userId, COLLECTION, id);
  return row ? OwnershipDocumentSchema.parse(row) : null;
}

export async function create(
  userId: string,
  data: NewOwnershipDocument,
): Promise<OwnershipDocument> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const record = OwnershipDocumentSchema.parse({ ...data, id, userId });
  await writeRecord(userId, COLLECTION, id, { core: { ...record } });
  return record;
}

export async function update(
  userId: string,
  id: string,
  patch: Partial<OwnershipDocument>,
): Promise<OwnershipDocument | null> {
  const current = await get(userId, id);
  if (!current) return null;
  const updated = OwnershipDocumentSchema.parse({ ...current, ...patch, id: current.id, userId: current.userId });
  await writeRecord(userId, COLLECTION, id, { core: { ...updated } });
  return updated;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}
