import "server-only";
import {
  listMergedRecords,
  readMergedRecord,
  writeRecord,
  deleteRecord,
  nextId,
} from "./_fs";
import { AiMessageSchema, type AiMessage } from "../types/ai-message";

const COLLECTION = "ai-messages";
const ID_PREFIX = "AIM";

export type NewAiMessage = Omit<AiMessage, "id" | "createdAt">;

export async function list(userId: string): Promise<AiMessage[]> {
  const rows = await listMergedRecords<unknown>(userId, COLLECTION);
  return rows.map((r) => AiMessageSchema.parse(r));
}

export async function listBySession(
  userId: string,
  sessionId: string,
): Promise<AiMessage[]> {
  return (await list(userId))
    .filter((m) => m.sessionId === sessionId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function get(
  userId: string,
  id: string,
): Promise<AiMessage | null> {
  const row = await readMergedRecord<unknown>(userId, COLLECTION, id);
  return row ? AiMessageSchema.parse(row) : null;
}

export async function create(
  userId: string,
  data: NewAiMessage,
): Promise<AiMessage> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const record = AiMessageSchema.parse({
    ...data,
    id,
    createdAt: Date.now(),
  });
  await writeRecord(userId, COLLECTION, id, { core: { ...record } });
  return record;
}

export async function removeBySession(
  userId: string,
  sessionId: string,
): Promise<void> {
  const messages = await listBySession(userId, sessionId);
  for (const message of messages) {
    await deleteRecord(userId, COLLECTION, message.id);
  }
}
