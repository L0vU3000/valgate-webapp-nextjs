import "server-only";
import {
  listMergedRecords,
  readMergedRecord,
  writeRecord,
  deleteRecord,
  nextId,
} from "./_fs";
import { AiSessionSchema, type AiSession } from "../types/ai-session";

const COLLECTION = "ai-sessions";
const ID_PREFIX = "AI";

export type NewAiSession = Omit<AiSession, "id" | "createdAt" | "updatedAt">;

export async function list(userId: string): Promise<AiSession[]> {
  const rows = await listMergedRecords<unknown>(userId, COLLECTION);
  return rows
    .map((r) => AiSessionSchema.parse(r))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function listActive(userId: string): Promise<AiSession[]> {
  return (await list(userId)).filter((s) => s.status === "active");
}

export async function get(
  userId: string,
  id: string,
): Promise<AiSession | null> {
  const row = await readMergedRecord<unknown>(userId, COLLECTION, id);
  return row ? AiSessionSchema.parse(row) : null;
}

export async function create(
  userId: string,
  data: NewAiSession,
): Promise<AiSession> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const now = Date.now();
  const record = AiSessionSchema.parse({
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  });
  await writeRecord(userId, COLLECTION, id, { core: { ...record } });
  return record;
}

export async function update(
  userId: string,
  id: string,
  patch: Partial<AiSession>,
): Promise<AiSession | null> {
  const current = await get(userId, id);
  if (!current) return null;
  const updated = AiSessionSchema.parse({
    ...current,
    ...patch,
    id: current.id,
    updatedAt: Date.now(),
  });
  await writeRecord(userId, COLLECTION, id, { core: { ...updated } });
  return updated;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}
