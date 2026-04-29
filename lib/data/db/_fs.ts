import "server-only";
import { readdir, readFile, writeFile, mkdir, rm, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const ID_PATTERN = /^[A-Za-z0-9_-]+$/;

function assertSafeId(value: string, label: string): void {
  if (!ID_PATTERN.test(value)) {
    throw new Error(`Invalid ${label}: must match ${ID_PATTERN}`);
  }
}

function dataRoot(): string {
  return path.join(process.cwd(), "public", "data");
}

export function collectionDir(userId: string, collection: string): string {
  assertSafeId(userId, "userId");
  assertSafeId(collection, "collection");
  return path.join(dataRoot(), "users", userId, collection);
}

export function recordDir(
  userId: string,
  collection: string,
  recordId: string,
): string {
  assertSafeId(recordId, "recordId");
  return path.join(collectionDir(userId, collection), recordId);
}

async function listJsonFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && e.name.endsWith(".json"))
      .map((e) => e.name)
      .sort((a, b) => {
        if (a === "core.json") return -1;
        if (b === "core.json") return 1;
        return a.localeCompare(b);
      });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function readJson<T extends object>(filePath: string): Promise<T | null> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export async function readMergedRecord<T>(
  userId: string,
  collection: string,
  recordId: string,
): Promise<T | null> {
  const dir = recordDir(userId, collection, recordId);
  const files = await listJsonFiles(dir);
  if (files.length === 0) return null;

  const merged: Record<string, unknown> = {};
  for (const file of files) {
    const slice = await readJson<Record<string, unknown>>(path.join(dir, file));
    if (slice) Object.assign(merged, slice);
  }
  return merged as T;
}

export async function listMergedRecords<T>(
  userId: string,
  collection: string,
): Promise<T[]> {
  const dir = collectionDir(userId, collection);
  let entries: string[];
  try {
    const dirents = await readdir(dir, { withFileTypes: true });
    entries = dirents.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }

  const records: T[] = [];
  for (const id of entries.sort()) {
    const rec = await readMergedRecord<T>(userId, collection, id);
    if (rec) records.push(rec);
  }
  return records;
}

export async function writeRecord(
  userId: string,
  collection: string,
  recordId: string,
  splits: Record<string, Record<string, unknown>>,
): Promise<void> {
  const dir = recordDir(userId, collection, recordId);
  await mkdir(dir, { recursive: true });

  for (const [name, payload] of Object.entries(splits)) {
    assertSafeId(name, "splitName");
    const finalPath = path.join(dir, `${name}.json`);
    const tmpPath = `${finalPath}.tmp`;
    await writeFile(tmpPath, JSON.stringify(payload, null, 2), "utf8");
    await rename(tmpPath, finalPath);
  }
}

export async function deleteRecord(
  userId: string,
  collection: string,
  recordId: string,
): Promise<void> {
  const dir = recordDir(userId, collection, recordId);
  if (!existsSync(dir)) return;
  await rm(dir, { recursive: true, force: true });
}

export async function nextId(
  userId: string,
  collection: string,
  prefix: string,
): Promise<string> {
  assertSafeId(prefix, "prefix");
  const dir = collectionDir(userId, collection);
  let max = 0;
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const re = new RegExp(`^${prefix}-(\\d+)$`);
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const match = entry.name.match(re);
      if (match) {
        const n = Number(match[1]);
        if (Number.isFinite(n) && n > max) max = n;
      }
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}

export async function writeUploadedFile(
  userId: string,
  recordId: string,
  filename: string,
  buffer: Buffer,
): Promise<string> {
  assertSafeId(userId, "userId");
  assertSafeId(recordId, "recordId");
  // sanitize filename: strip path separators, collapse to safe chars
  const safeName = path.basename(filename).replace(/[^A-Za-z0-9._-]/g, "_");
  const storageDir = path.join(
    dataRoot(),
    "users",
    userId,
    "_storage",
    recordId,
  );
  await mkdir(storageDir, { recursive: true });
  const finalPath = path.join(storageDir, safeName);
  const tmpPath = `${finalPath}.tmp`;
  await writeFile(tmpPath, buffer);
  await rename(tmpPath, finalPath);
  return `_storage/${recordId}/${safeName}`;
}

export async function deleteUploadedFile(
  userId: string,
  storageId: string,
): Promise<void> {
  // storageId is a relative path like "_storage/PROP-0001/file.pdf"
  const fullPath = path.join(dataRoot(), "users", userId, storageId);
  try {
    await rm(fullPath, { force: true });
  } catch {
    // ignore missing files
  }
}
