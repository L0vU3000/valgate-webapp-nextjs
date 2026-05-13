/**
 * Backfill / health-check for Property lat/lng pairs after the PF1 fix
 * (see .claude/data-audit/pages/add-property/audit.md § PF1).
 *
 * Before the fix, `mapWizardToProperty` destructured `[lat, lng] = form.mapCenter`
 * but the wizard stored `mapCenter` as `[lng, lat]`. Any property submitted via the
 * wizard before the fix has its coordinates swapped on disk.
 *
 * The script walks every Property `core.json` under `public/data/users/<userId>/properties/`
 * and reports:
 *   - definite swaps  → `Math.abs(lat) > 90` (the lat field holds a value outside the valid latitude range)
 *   - likely swaps   → values look like a Cambodia-style swap (lat ∈ Cambodia lng-range AND lng ∈ Cambodia lat-range)
 *
 * Modes:
 *   default      → dry-run; reports findings, makes no writes
 *   --fix        → swaps definite-swap records in place (rewrites JSON)
 *   --fix-likely → also swaps Cambodia-heuristic suspects (use with caution; opt-in)
 *
 * Usage:
 *   npx tsx scripts/backfill-property-coords.ts
 *   npx tsx scripts/backfill-property-coords.ts --fix
 *   npx tsx scripts/backfill-property-coords.ts --fix-likely
 */
import { promises as fs } from "node:fs";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const FIX_DEFINITE = args.has("--fix") || args.has("--fix-likely");
const FIX_LIKELY = args.has("--fix-likely");

const USERS_ROOT = path.join(process.cwd(), "public", "data", "users");

// Cambodia bounding box (loose):
// lat ≈ 10–15, lng ≈ 102–108. We compare both halves of (lat, lng) against the
// opposite range to detect the "swap" signature without false-flagging valid records.
const CAMBODIA_LAT = { min: 9, max: 16 };
const CAMBODIA_LNG = { min: 101, max: 109 };

type Verdict = "ok" | "definite-swap" | "likely-swap" | "unreadable";

interface Row {
  userId: string;
  propId: string;
  lat: number | null;
  lng: number | null;
  verdict: Verdict;
  note?: string;
}

function classify(lat: unknown, lng: unknown): { verdict: Verdict; note?: string } {
  if (typeof lat !== "number" || typeof lng !== "number") {
    return { verdict: "unreadable", note: "lat or lng missing / non-numeric" };
  }
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { verdict: "definite-swap", note: `lat ${lat} or lng ${lng} out of valid range` };
  }
  const latLooksLikeLng = lat > CAMBODIA_LNG.min && lat < CAMBODIA_LNG.max;
  const lngLooksLikeLat = lng > CAMBODIA_LAT.min && lng < CAMBODIA_LAT.max;
  if (latLooksLikeLng && lngLooksLikeLat) {
    return {
      verdict: "likely-swap",
      note: `lat ${lat} looks like a Cambodia longitude; lng ${lng} looks like a Cambodia latitude`,
    };
  }
  return { verdict: "ok" };
}

async function listProperties(userId: string): Promise<string[]> {
  const dir = path.join(USERS_ROOT, userId, "properties");
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

async function loadCore(userId: string, propId: string): Promise<Record<string, unknown> | null> {
  const file = path.join(USERS_ROOT, userId, "properties", propId, "core.json");
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeCore(userId: string, propId: string, data: unknown) {
  const file = path.join(USERS_ROOT, userId, "properties", propId, "core.json");
  await fs.writeFile(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

async function listUsers(): Promise<string[]> {
  try {
    const entries = await fs.readdir(USERS_ROOT, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

async function main() {
  const users = await listUsers();
  const rows: Row[] = [];

  for (const userId of users) {
    const propIds = await listProperties(userId);
    for (const propId of propIds) {
      const core = await loadCore(userId, propId);
      if (!core) {
        rows.push({ userId, propId, lat: null, lng: null, verdict: "unreadable", note: "core.json missing or invalid JSON" });
        continue;
      }
      const lat = core.lat as unknown;
      const lng = core.lng as unknown;
      const { verdict, note } = classify(lat, lng);
      rows.push({
        userId,
        propId,
        lat: typeof lat === "number" ? lat : null,
        lng: typeof lng === "number" ? lng : null,
        verdict,
        note,
      });
    }
  }

  // Report
  const totals = {
    ok: 0,
    "definite-swap": 0,
    "likely-swap": 0,
    unreadable: 0,
  } as Record<Verdict, number>;
  for (const r of rows) totals[r.verdict]++;

  console.log(`Scanned ${rows.length} properties across ${users.length} user(s)\n`);
  console.log(`  ✅ ok:            ${totals.ok}`);
  console.log(`  🔴 definite swap: ${totals["definite-swap"]}`);
  console.log(`  🟡 likely swap:   ${totals["likely-swap"]}`);
  console.log(`  ⚠️  unreadable:    ${totals.unreadable}\n`);

  const problems = rows.filter((r) => r.verdict !== "ok");
  if (problems.length > 0) {
    console.log("Details:");
    for (const r of problems) {
      console.log(`  [${r.verdict}] ${r.userId}/${r.propId}  lat=${r.lat} lng=${r.lng}${r.note ? `  — ${r.note}` : ""}`);
    }
    console.log("");
  }

  // Fix phase
  if (!FIX_DEFINITE) {
    if (totals["definite-swap"] > 0 || totals["likely-swap"] > 0) {
      console.log("Re-run with --fix to swap definite-swap records,");
      console.log("or --fix-likely to additionally swap Cambodia-heuristic suspects.");
    } else {
      console.log("All clean. No backfill needed.");
    }
    return;
  }

  const toFix = rows.filter((r) => {
    if (r.verdict === "definite-swap") return true;
    if (r.verdict === "likely-swap" && FIX_LIKELY) return true;
    return false;
  });

  if (toFix.length === 0) {
    console.log("Nothing to fix at the requested level.");
    return;
  }

  console.log(`Applying swap to ${toFix.length} record(s)...`);
  for (const r of toFix) {
    const core = await loadCore(r.userId, r.propId);
    if (!core) {
      console.log(`  ⚠️  ${r.userId}/${r.propId} — could not reload core.json; skipped`);
      continue;
    }
    const lat = core.lat as number;
    const lng = core.lng as number;
    core.lat = lng;
    core.lng = lat;
    await writeCore(r.userId, r.propId, core);
    console.log(`  ✅ ${r.userId}/${r.propId}: lat ${lat} ↔ lng ${lng}  →  lat ${lng} lng ${lat}`);
  }
  console.log("\nDone. Run again without --fix to verify no remaining issues.");
}

main().catch((err) => {
  console.error("backfill-property-coords failed:", err);
  process.exit(1);
});
