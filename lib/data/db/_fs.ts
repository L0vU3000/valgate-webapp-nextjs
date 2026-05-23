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

// The seed data root — always readable (bundled into the deployment)
function seedRoot(): string {
  return path.join(process.cwd(), "public", "data");
}

// The writable root — on Vercel serverless the main filesystem is read-only,
// so we redirect writes to /tmp which is always writable.
function writableRoot(): string {
  if (process.env.VERCEL) return "/tmp/valgate-data";
  return seedRoot();
}

// Returns roots to check for reads, most-recent-writes first.
// On Vercel: [/tmp/valgate-data, public/data]
// Locally:   [public/data]
function readRoots(): string[] {
  const w = writableRoot();
  const s = seedRoot();
  return w === s ? [s] : [w, s];
}

export function collectionDir(userId: string, collection: string): string {
  assertSafeId(userId, "userId");
  assertSafeId(collection, "collection");
  return path.join(seedRoot(), "users", userId, collection);
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

// Reads a record by scanning all read roots in order (writable first, then seed).
// The first root that contains the record wins.
export async function readMergedRecord<T>(
  userId: string,
  collection: string,
  recordId: string,
): Promise<T | null> {
  assertSafeId(userId, "userId");
  assertSafeId(collection, "collection");
  assertSafeId(recordId, "recordId");

  for (const root of readRoots()) {
    const dir = path.join(root, "users", userId, collection, recordId);
    const files = await listJsonFiles(dir);
    if (files.length === 0) continue;

    const merged: Record<string, unknown> = {};
    for (const file of files) {
      const slice = await readJson<Record<string, unknown>>(path.join(dir, file));
      if (slice) Object.assign(merged, slice);
    }
    return merged as T;
  }

  return null;
}

// Lists all records across all read roots, deduplicating by ID.
// When the same ID exists in multiple roots, the writable root wins.
export async function listMergedRecords<T>(
  userId: string,
  collection: string,
): Promise<T[]> {
  assertSafeId(userId, "userId");
  assertSafeId(collection, "collection");

  const allIds = new Set<string>();

  for (const root of readRoots()) {
    const dir = path.join(root, "users", userId, collection);
    try {
      const dirents = await readdir(dir, { withFileTypes: true });
      for (const e of dirents) {
        if (e.isDirectory()) allIds.add(e.name);
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }

  const records: T[] = [];
  for (const id of Array.from(allIds).sort()) {
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
  assertSafeId(userId, "userId");
  assertSafeId(collection, "collection");
  assertSafeId(recordId, "recordId");

  const dir = path.join(writableRoot(), "users", userId, collection, recordId);
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
  assertSafeId(userId, "userId");
  assertSafeId(collection, "collection");
  assertSafeId(recordId, "recordId");

  // Can only delete from the writable root (seed data is read-only on Vercel)
  const dir = path.join(writableRoot(), "users", userId, collection, recordId);
  if (!existsSync(dir)) return;
  await rm(dir, { recursive: true, force: true });
}

// Scans all read roots to find the highest existing numeric ID suffix,
// so newly created records never collide with seed data or existing writes.
export async function nextId(
  userId: string,
  collection: string,
  prefix: string,
): Promise<string> {
  assertSafeId(prefix, "prefix");
  assertSafeId(userId, "userId");
  assertSafeId(collection, "collection");

  const re = new RegExp(`^${prefix}-(\\d+)$`);
  let max = 0;

  for (const root of readRoots()) {
    const dir = path.join(root, "users", userId, collection);
    try {
      const entries = await readdir(dir, { withFileTypes: true });
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
  const safeName = path.basename(filename).replace(/[^A-Za-z0-9._-]/g, "_");
  const storageDir = path.join(
    writableRoot(),
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
  const fullPath = path.join(writableRoot(), "users", userId, storageId);
  try {
    await rm(fullPath, { force: true });
  } catch {
    // ignore missing files
  }
}
