#!/usr/bin/env node
// Backfill: attach a KMZ land boundary to every property it belongs to.
//
//   npm run boundary:backfill -- --dir /path/to/KMZ_Properties          # dry run, prints a table
//   npm run boundary:backfill -- --dir /path/to/KMZ_Properties --write  # actually attaches
//
// Reads scripts/data/kmz-join.json for the filename → client-code mapping, because the reference
// filenames are NOT the codes Valgate stores (they are an older survey prefix: `08130701-1212` is
// `08060101-1212` in the client's own sheet) and 5 Kep files are bare numbers. That mapping was
// derived once and reviewed; re-guessing it here on every run would be a silent way to attach a
// parcel to the wrong property. `--write` refuses to run for a file the map doesn't cover.
//
// Matching (this script only): the client code lives at the start of `properties.name`
// ("KPS00002 — Land, …"). That is how the client's 109 properties were imported — `properties.code`
// holds Valgate's own id, not theirs. The production upload path never guesses like this: it matches
// an exact filename or asks the user to pick.
//
// Idempotent: re-running replaces the same boundary rather than adding a second one.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { properties } from "@/lib/db/schema";
import { parseKmz } from "@/lib/services/kmz";
import { attachBoundary, codeFromName, metresBetween } from "@/lib/services/property-boundary";
import { listLandParcels } from "@/lib/services/land-parcels";
import { env } from "@/lib/env";
import { assertSafeDatabaseUrl } from "@/lib/db/assert-safe-database-url";
import type { Ctx } from "@/lib/services/_mapping";

const args = process.argv.slice(2);
const dirIdx = args.indexOf("--dir");
const KMZ_DIR = dirIdx >= 0 ? args[dirIdx + 1] : "";
const WRITE = args.includes("--write");
const ORG = (args.indexOf("--org") >= 0 ? args[args.indexOf("--org") + 1] : "") || "";

if (!KMZ_DIR || !existsSync(KMZ_DIR)) {
  console.error("Usage: npm run boundary:backfill -- --dir <KMZ folder> [--org ORG-0018] [--write]");
  process.exit(1);
}

const JOIN_MAP = JSON.parse(
  readFileSync(join(process.cwd(), "scripts", "data", "kmz-join.json"), "utf8"),
) as Record<string, { code: string; folder: string; how: string }>;

/** Every KMZ under the folder tree, as {path, stem}. */
function collect(root: string): { path: string; stem: string }[] {
  const out: { path: string; stem: string }[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const p = join(root, entry.name);
    if (entry.isDirectory()) out.push(...collect(p));
    else if (entry.name.toLowerCase().endsWith(".kmz")) out.push({ path: p, stem: entry.name.replace(/\.kmz$/i, "") });
  }
  return out;
}

async function main() {
  // Same dev-URL guard the seed pipeline uses: a boundary backfill moves pins, and pointing this
  // at a hosted prod branch by accident would be a real data change. Override with ALLOW_DESTRUCTIVE_DB=1.
  assertSafeDatabaseUrl(env.DATABASE_URL, "boundary backfill");

  const files = collect(KMZ_DIR);
  console.log(`${files.length} KMZ file(s) under ${KMZ_DIR}\n`);

  // One org's properties, once. The org holding the boundary data is addressed explicitly:
  // this script is run by an operator, not a signed-in user, so there is no session org to inherit.
  const orgId = ORG || (await db.select({ orgId: properties.orgId }).from(properties).limit(1))[0]?.orgId;
  if (!orgId) throw new Error("no properties in this database");
  const rows = await db.select({ id: properties.id, name: properties.name }).from(properties)
    .where(eq(properties.orgId, orgId));

  const byCode = new Map<string, { id: string; name: string }>();
  for (const r of rows) {
    const code = codeFromName(r.name);
    if (code) byCode.set(code, { id: r.id, name: r.name });
  }
  console.log(`org ${orgId}: ${rows.length} properties, ${byCode.size} carry a client code\n`);

  // A Ctx the service layer accepts. The operator running this owns the data being written.
  const ctx: Ctx = { userId: "system:backfill", orgId, orgRole: "owner" };

  let attached = 0, skipped = 0, failed = 0;
  for (const { path, stem } of files) {
    const mapping = JOIN_MAP[stem];
    if (!mapping?.code) { console.log(`?  ${stem} — not in the join map, skipped`); skipped++; continue; }
    const target = byCode.get(mapping.code);
    if (!target) { console.log(`?  ${stem} → ${mapping.code} — no property with that code, skipped`); skipped++; continue; }

    let parsed;
    try {
      parsed = parseKmz(readFileSync(path));
    } catch (err) {
      console.log(`✗  ${stem} → ${mapping.code}: ${(err as Error).message}`);
      failed++;
      continue;
    }

    const [pin] = await db.select({ lat: properties.lat, lng: properties.lng }).from(properties)
      .where(eq(properties.id, target.id));
    const shift = pin ? metresBetween([pin.lat, pin.lng], parsed.centroid) : 0;
    const existing = (await listLandParcels(ctx, target.id)).some((p) => p.boundary != null);

    console.log(
      `${WRITE ? "→" : "·"}  ${stem} → ${mapping.code} ${target.id}  ` +
      `${parsed.sizeM2.toFixed(0)} m²  ${parsed.geometry.type}  ` +
      `pin${shift > 1 ? ` moves ${shift.toFixed(0)} m` : " unchanged"}${existing ? "  (replaces)" : ""}  ` +
      `[${mapping.how}]`,
    );
    if (!WRITE) continue;

    try {
      await attachBoundary(ctx, target.id, parsed, { movePin: true });
      attached++;
    } catch (err) {
      console.log(`✗  ${stem}: ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(
    `\n${WRITE ? `attached ${attached}` : "dry run"} · skipped ${skipped} · failed ${failed}` +
    (WRITE ? "" : "\n\nRe-run with --write to attach."),
  );
  if (failed) process.exit(1);
}

main().then(
  () => process.exit(0),
  (err) => { console.error(err); process.exit(1); },
);
