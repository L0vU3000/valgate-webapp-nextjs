import "server-only";
import {
  listMergedRecords,
  readMergedRecord,
  writeRecord,
  deleteRecord,
  nextId,
} from "./_fs";
import type { UserProfile } from "../types/user-profile";

const COLLECTION = "user-profiles";
const ID_PREFIX = "UPROF";

export type NewUserProfile = Omit<UserProfile, "id" | "userId">;

export async function list(userId: string): Promise<UserProfile[]> {
  return listMergedRecords<UserProfile>(userId, COLLECTION);
}

export async function get(
  userId: string,
  id: string,
): Promise<UserProfile | null> {
  return readMergedRecord<UserProfile>(userId, COLLECTION, id);
}

export async function create(
  userId: string,
  data: NewUserProfile,
): Promise<UserProfile> {
  const id = await nextId(userId, COLLECTION, ID_PREFIX);
  const record: UserProfile = { ...data, id, userId };
  await writeRecord(userId, COLLECTION, id, { core: { ...record } });
  return record;
}

export async function update(
  userId: string,
  id: string,
  patch: Partial<UserProfile>,
): Promise<UserProfile | null> {
  const current = await get(userId, id);
  if (!current) return null;
  const updated = { ...current, ...patch, id: current.id, userId: current.userId };
  await writeRecord(userId, COLLECTION, id, { core: { ...updated } });
  return updated;
}

export async function remove(userId: string, id: string): Promise<void> {
  await deleteRecord(userId, COLLECTION, id);
}

// Upsert: always stores the profile with userId as the record ID
export async function upsert(
  userId: string,
  patch: Partial<UserProfile>,
): Promise<UserProfile> {
  const current = await get(userId, userId);
  const now = Date.now();
  const record: UserProfile = {
    firstName: "",
    lastName: "",
    createdAt: now,
    ...current,
    ...patch,
    id: userId,
    userId,
    updatedAt: now,
  };
  await writeRecord(userId, COLLECTION, userId, { core: { ...record } });
  return record;
}
