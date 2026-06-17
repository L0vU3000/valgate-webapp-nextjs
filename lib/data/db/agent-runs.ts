import "server-only";
import {
  listMergedRecords,
  readMergedRecord,
  writeRecord,
  deleteRecord,
  nextId,
} from "./_fs";
import { AgentRunSchema, type AgentRun } from "../types/agent-run";

const COLLECTION = "agent-runs";
const ID_PREFIX = "RUN";

export type NewAgentRun = Omit<AgentRun, "id" | "createdAt" | "updatedAt">;

export async function list(userId: string): Promise<AgentRun[]> {
  const rows = await listMergedRecords<unknown>(userId, COLLECTION);
  return rows
    .map((r) => AgentRunSchema.parse(r))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function get(userId: string, id: string): Promise<AgentRun | null> {
  const row = await readMergedRecord<unknown>(userId, COLLECTION, id);
  return row ? AgentRunSchema.parse(row) : null;
}

export async function create(userId: string, data: NewAgentRun): Promise<AgentRun> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const now = Date.now();
  const record = AgentRunSchema.parse({ ...data, id, createdAt: now, updatedAt: now });
  await writeRecord(userId, COLLECTION, id, { core: { ...record } });
  return record;
}

export async function update(
  userId: string,
  id: string,
  patch: Partial<AgentRun>,
): Promise<AgentRun | null> {
  const current = await get(userId, id);
  if (!current) return null;
  const updated = AgentRunSchema.parse({ ...current, ...patch, id: current.id, updatedAt: Date.now() });
  await writeRecord(userId, COLLECTION, id, { core: { ...updated } });
  return updated;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}

// Creates a new agent-run for a chat proposal if one doesn't already exist
// for the given proposalMessageId. Idempotent — safe to call after every send.
export async function upsertForProposal(
  userId: string,
  proposalMessageId: string,
  data: NewAgentRun,
): Promise<AgentRun> {
  const existing = (await list(userId)).find(
    (r) => r.proposalMessageId === proposalMessageId,
  );
  if (existing) return existing;
  return create(userId, data);
}
