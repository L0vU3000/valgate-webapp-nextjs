#!/usr/bin/env node
// Backfill: store the KLYP property-document set in Valgate Documents, one row per property.
//
//   npm run docs:backfill -- --dir "/path/Valgate-Klyp-Docs copy"                    # dry run
//   npm run docs:backfill -- --dir "…" --org ORG-0018 --write                        # store them
//
// The source tree is <PROVINCE>/<CLIENTCODE>[_suffix]/<doc>.pdf — the folder name carries the
// client's own property code, which is also the prefix of `properties.name` ("KPP00036 — Land, …").
// `properties.code` holds Valgate's own id, not the client's, so the join is by code-from-name,
// the same join the boundary backfill uses. Codes whose folder spelling does not survive
// normalization go in scripts/data/klyp-doc-join.json, reviewed once, by hand.
//
// Duplicates: these folders hold byte-identical copies and "… ocr.pdf" re-OCR renditions of the
// same scan. Storing both would present the same deed twice in the Documents tab, so a byte-identical
// file is skipped, and when a "<name> ocr.pdf" twin exists the OCR rendition is the one kept.
//
// Idempotent: a property+filename pair already in `documents` is skipped, so re-running after a
// partial failure does not double-store.
//
// Ids/keys come from the service layer (createDocument) and storage layer (putDocumentBytes) — this
// script never writes SQL directly, so an operator backfill and the app's own upload path agree on
// counters, org scoping and the audit columns.
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { properties } from "@/lib/db/schema";
import { createDocument } from "@/lib/services/documents";
import { putDocumentBytes } from "@/lib/services/storage";
import { codeFromName } from "@/lib/services/property-boundary";
import { listDocuments } from "@/lib/services/documents";
import { env } from "@/lib/env";
import { assertSafeDatabaseUrl } from "@/lib/db/assert-safe-database-url";
import type { Ctx } from "@/lib/services/_mapping";
import type { DocumentCategory } from "@/lib/data/types/document";

const args = process.argv.slice(2);
const arg = (flag: string, fallback = "") => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] ?? fallback : fallback;
};
const DIR = arg("--dir");
const ORG = arg("--org") || "ORG-0018";
const WRITE = args.includes("--write");
const ONLY = arg("--only"); // substring filter on the relative path, for single-doc re-runs

if (!DIR || !existsSync(DIR)) {
  console.error('Usage: npm run docs:backfill -- --dir "<folder>" [--org ORG-0018] [--only SUBSTR] [--write]');
  process.exit(1);
}

const PDF_MIME = "application/pdf";

// Filename → Valgate's document category. Deterministic and auditable: the client's own file names
// already say what the document is, so this costs nothing and can be reviewed line by line, which a
// model call cannot. Order matters — first match wins. `document-classify.ts` (Jev) is the runtime
// equivalent for uploads whose names say nothing; it is not needed here.
const CATEGORY_RULES: [RegExp, DocumentCategory][] = [
  [/rental/, "Rental"],
  [/tax|receipt/, "Financial"],
  [/hard ?tit|hardtitle|soft ?tit|softtitle|sotf ?title|land ?tit|land ?tile|title ?land|title ?hard|previous ?tit|previoustitle/, "Title"],
  [/sale|contract|ex ?change|previous/, "Legal"],
  [/owner|seller|admindoc|name ?change| id /, "Legal"],
  [/map/, "Other"],
];

function categorize(fileName: string): DocumentCategory {
  // Normalize separators first: the client's names mix `_`, `-`, spaces and case ("Hard_Title",
  // "SR04-Land_Title", "SotfTitle"), and a rule that only matched spaces silently dropped every
  // underscored title into "Other".
  const s = ` ${fileName.toLowerCase().replace(/\.pdf$/, "").replace(/[^a-z0-9]+/g, " ")} `;
  for (const [re, cat] of CATEGORY_RULES) if (re.test(s)) return cat;
  return "Other";
}

type Found = { path: string; rel: string; folder: string; fileName: string; size: number; hash: string };

function collect(root: string): Found[] {
  const out: Found[] = [];
  const push = (path: string, folder: string) => {
    out.push({
      path,
      rel: relative(root, path),
      folder,
      fileName: path.split("/").pop() ?? "",
      size: readFileSync(path).length,
      hash: createHash("sha256").update(readFileSync(path)).digest("hex"),
    });
  };
  for (const province of readdirSync(root, { withFileTypes: true })) {
    if (!province.isDirectory()) continue;
    const pDir = join(root, province.name);
    for (const entry of readdirSync(pDir, { withFileTypes: true })) {
      // A PDF directly in the province folder (the `Rental/` leases) has no property folder. It is
      // collected rather than skipped so the run reports it as unmatched instead of dropping it
      // silently — an intake that quietly ignores files is how documents go missing.
      if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) {
        push(join(pDir, entry.name), province.name);
        continue;
      }
      if (!entry.isDirectory()) continue;
      const cDir = join(pDir, entry.name);
      for (const f of readdirSync(cDir, { withFileTypes: true })) {
        if (!f.isFile() || !f.name.toLowerCase().endsWith(".pdf")) continue;
        push(join(cDir, f.name), entry.name);
      }
    }
  }
  return out;
}

/** Client code for a folder name ("KPC0005", "PP000013_House13_14", "PVH01"), via overrides first. */
function codeForFolder(folder: string, overrides: Record<string, string>): string | null {
  if (overrides[folder]) return normalizeCode(overrides[folder]);
  const m = folder.match(/^[A-Za-z]{1,4}\d{1,6}/);
  return m ? normalizeCode(m[0]) : null;
}

/**
 * `<letters><digits>` → digits without leading zeros, padded to the client's 5-digit width.
 * The folder spellings are inconsistent ("KPC0005", "SR000012", "PVH01") while the client's own
 * code — and therefore `properties.name` — is always 5 digits, so both sides are funnelled through
 * this one function rather than trusting either spelling.
 */
function normalizeCode(code: string): string {
  const m = code.toUpperCase().match(/^([A-Z]+)0*(\d+)$/);
  if (!m) return code.toUpperCase();
  return `${m[1]}${m[2].padStart(5, "0")}`;
}

async function main() {
  assertSafeDatabaseUrl(env.DATABASE_URL, "document backfill");

  const overrides = existsSync(join(process.cwd(), "scripts/data/klyp-doc-join.json"))
    ? (JSON.parse(readFileSync(join(process.cwd(), "scripts/data/klyp-doc-join.json"), "utf8")) as Record<string, string>)
    : {};

  const rows = await db
    .select({ id: properties.id, name: properties.name })
    .from(properties)
    .where(eq(properties.orgId, ORG));
  const byCode = new Map<string, { id: string; name: string }>();
  for (const r of rows) {
    const code = codeFromName(r.name);
    if (code) byCode.set(normalizeCode(code), { id: r.id, name: r.name });
  }

  const found = collect(DIR).filter((f) => !ONLY || f.rel.includes(ONLY));
  console.log(`${found.length} PDF(s) under ${DIR}`);
  console.log(`org ${ORG}: ${rows.length} properties, ${byCode.size} carry a client code\n`);

  // Dedupe 1: byte-identical files WITHIN one property folder. Scoped to the folder on purpose —
  // scrubbing on the hash alone deleted 13 files the client had deliberately filed under different
  // properties: one sale contract covering PP00030–33, `SR_01-02-03_*` covering three parcels, and
  // two copied map sheets. Those are the property's own documents; only a repeat inside the same
  // property folder is meaningless.
  const seenHash = new Set<string>();
  const byHash: Found[] = [];
  for (const f of [...found].sort((a, b) => a.rel.localeCompare(b.rel))) {
    const key = `${f.folder}\u0000${f.hash}`;
    if (seenHash.has(key)) {
      console.log(`= dup bytes  ${f.rel}  (repeat inside ${f.folder})`);
      continue;
    }
    seenHash.add(key);
    byHash.push(f);
  }
  // Dedupe 2: an "X ocr.pdf" rendition supersedes its "X.pdf" original. The check runs on the PLAIN
  // name and asks whether its OCR twin is present — the earlier version tested the file's own name,
  // so it kept the plain scan and dropped the readable rendition, the exact opposite of the intent.
  const kept: Found[] = [];
  for (const f of byHash) {
    if (/\s+ocr\.pdf$/i.test(f.fileName)) { kept.push(f); continue; }
    const ocrTwin = f.fileName.replace(/\.pdf$/i, " ocr.pdf");
    const hasOcrTwin = byHash.some(
      (o) => o.folder === f.folder && o.fileName.toLowerCase() === ocrTwin.toLowerCase(),
    );
    if (hasOcrTwin) {
      console.log(`= superseded  ${f.rel}  (OCR rendition kept)`);
      continue;
    }
    kept.push(f);
  }

  const ctx: Ctx = { userId: `system:klyp-docs:${ORG}`, orgId: ORG, orgRole: "owner" };
  const existing = new Set(
    (await listDocuments(ctx)).map((d) => d.propertyId + "\u0000" + d.name),
  );

  let stored = 0, skipped = 0, failed = 0, unmatched = 0;
  for (const f of kept) {
    const code = codeForFolder(f.folder, overrides);
    const target = code ? byCode.get(code) : undefined;
    if (!target) {
      console.log(`?  ${f.rel} — folder "${f.folder}" (${code ?? "no code"}) matches no property`);
      unmatched++;
      continue;
    }
    const category = categorize(f.fileName);
    const label = `${target.id} ${code}  ${category.padEnd(9)} ${(f.size / 1024 / 1024).toFixed(1)} MB  ${f.rel}`;
    if (existing.has(target.id + "\u0000" + f.fileName)) {
      console.log(`·  exists  ${label}`);
      skipped++;
      continue;
    }

    if (!WRITE) {
      console.log(`→  ${label}`);
      continue;
    }
    try {
      const { storageId } = await putDocumentBytes(ctx, readFileSync(f.path), f.fileName, PDF_MIME);
      await createDocument(ctx, {
        propertyId: target.id,
        name: f.fileName,
        kind: "document",
        mimeType: PDF_MIME,
        extension: "pdf",
        sizeBytes: f.size,
        storageId,
        category,
        description: `KLYP intake — ${f.rel.replace(/^[^/]+\//, "")}`,
        uploadedAt: Date.now(),
      });
      console.log(`✓  stored  ${label}`);
      stored++;
    } catch (err) {
      console.log(`✗  ${f.rel}: ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(
    `\n${WRITE ? `stored ${stored}` : `dry run — would store ${kept.length - skipped - unmatched}`}` +
      ` · existing ${skipped} · unmatched ${unmatched} · failed ${failed}` +
      (WRITE ? "" : "\n\nRe-run with --write to store."),
  );
  if (failed || unmatched) process.exitCode = 1;
}

main().then(
  () => process.exit(process.exitCode ?? 0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
