#!/usr/bin/env node
// Promote the KLYP extractions into Valgate data. Two halves, deliberately separate:
//
//   1. Document intelligence — every extracted doc gets `aiSummary` / `aiKeyFields` / `aiStatus`
//      (documents table) and an AI category. Additive, nothing existing is overwritten.
//   2. Property fields — only where the property field is still EMPTY, and only from a
//      high/medium-confidence read. A declared value that is already in the database is never
//      replaced by an OCR read; where the two disagree the run prints a discrepancy line instead.
//      This mirrors the boundary rule that measured geometry does not overwrite entered values.
//
//   npm run docs:apply -- --out "<extract dir>"                 # dry run: prints every proposed write
//   npm run docs:apply -- --out "<extract dir>" --write         # apply
//
// Owner names are NOT written to co_owners here: the extracted strings are "Khmer (latin)" pairs with
// no role or share, and inventing those would be worse than leaving the table empty. They are printed
// as a proposal list for a human to accept.
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { properties } from "@/lib/db/schema";
import { listDocuments, saveDocumentSummary, setDocumentCategory } from "@/lib/services/documents";
import { updateProperty } from "@/lib/services/properties";
import { codeFromName } from "@/lib/services/property-boundary";
import { printedArea } from "@/lib/data/derivations/printed-area";
import {
  adjudicate,
  docClass,
  isEvidence,
  type Candidate,
} from "@/lib/data/derivations/doc-precedence";
import { env } from "@/lib/env";
import { assertSafeDatabaseUrl } from "@/lib/db/assert-safe-database-url";
import type { Ctx } from "@/lib/services/_mapping";
import type { DocumentCategory } from "@/lib/data/types/document";

const args = process.argv.slice(2);
const arg = (flag: string, fallback = "") => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] ?? fallback : fallback;
};
const OUT = arg("--out") || join(process.env.HOME ?? ".", "Documents/AIVO/Valgate/klyp-extract");
const ORG = arg("--org") || "ORG-0018";
const WRITE = args.includes("--write");
const PROPOSALS = join(OUT, "..", "klyp-owner-proposals.csv");

type Extract = {
  rel: string;
  file: string;
  model: string;
  doc_type: string;
  doc_number: string;
  sheet_no: string;
  parcel_no: string;
  area_raw: string;
  owners: string[];
  province: string;
  district: string;
  commune: string;
  village: string;
  date_signed: string;
  issuer: string;
  land_use: string;
  confidence: "high" | "medium" | "low";
  unreadable: string[];
  pages_read: number;
};

/** Category for a doc from what the model read, falling back to the filename rules. */
function categoryFor(e: Extract): DocumentCategory {
  const t = `${e.doc_type} ${e.file}`.toLowerCase();
  if (/rental|lease|tenan/.test(t)) return "Rental";
  if (/tax|receipt|invoice/.test(t)) return "Financial";
  if (/title|certificate|ownership|register/.test(t)) return "Title";
  if (/sale|contract|transfer|exchange|owner|seller|id\b|admin/.test(t)) return "Legal";
  if (/map|photo|image/.test(t)) return "Other";
  return "Other";
}

/**
 * The latin spelling of a place name, or "" when there is none.
 *
 * `properties.province` holds English ("Kep", "Prey Veng") in every existing row, so writing the
 * Khmer read into it would make one row disagree in script and language with its siblings. The model
 * usually supplies both — "កែប (Kep)" — so the gloss is taken and a Khmer-only read is skipped rather
 * than transliterated by guesswork. Nothing is lost: the full Khmer location stays in the document's
 * `aiKeyFields`.
 */
function latinPlace(s: string): string {
  const gloss = s.match(/\(([^)]*[A-Za-z][^)]*)\)\s*$/);
  if (gloss) return gloss[1].trim();
  return /[A-Za-z]/.test(s) ? s.trim() : "";
}

const digits = printedArea;

function normalizeCode(code: string): string {
  const m = code.toUpperCase().match(/^([A-Z]+)0*(\d+)$/);
  return m ? `${m[1]}${m[2].padStart(5, "0")}` : code.toUpperCase();
}

function codeForRel(rel: string, overrides: Record<string, string>): string | null {
  const parts = rel.split(/[/\\]/);
  const folder = parts[parts.length - 2] ?? "";
  // Same override file the backfill reads, so the two halves of the intake can never disagree about
  // which property a folder is — that mismatch is how a doc silently ends up unannotated.
  if (overrides[folder]) return normalizeCode(overrides[folder]);
  const m = folder.match(/^[A-Za-z]{1,4}\d{1,6}/);
  return m ? normalizeCode(m[0]) : null;
}

async function main() {
  assertSafeDatabaseUrl(env.DATABASE_URL, "extraction promote");
  const files = readdirSync(OUT).filter((f) => f.endsWith(".json"));
  const extracts = files.map((f) => JSON.parse(readFileSync(join(OUT, f), "utf8")) as Extract);
  const overrides: Record<string, string> = existsSync(
    join(process.cwd(), "scripts/data/klyp-doc-join.json"),
  )
    ? JSON.parse(readFileSync(join(process.cwd(), "scripts/data/klyp-doc-join.json"), "utf8"))
    : {};

  const rows = await db
    .select({
      id: properties.id,
      name: properties.name,
      title: properties.title,
      totalArea: properties.totalArea,
      province: properties.province,
      purchaseDate: properties.purchaseDate,
    })
    .from(properties)
    .where(eq(properties.orgId, ORG));
  const byCode = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    const c = codeFromName(r.name);
    if (c) byCode.set(normalizeCode(c), r);
  }

  const ctx: Ctx = { userId: `system:dms:${ORG}`, orgId: ORG, orgRole: "owner" };
  const docsByProp = new Map<string, Awaited<ReturnType<typeof listDocuments>>>();
  for (const d of await listDocuments(ctx)) {
    const arr = docsByProp.get(d.propertyId) ?? [];
    arr.push(d);
    docsByProp.set(d.propertyId, arr);
  }

  let ai = 0, promoted = 0, proposalRows = 0;
  const proposals: string[] = ["property_id,code,file,owners,confidence"];

  // Every area this property's documents state, so the disagreements can be adjudicated as a set
  // rather than one document at a time. Read-only: nothing here writes a property field.
  const candidatesByProp = new Map<string, { code: string; list: Candidate[] }>();
  for (const e of extracts) {
    const code = codeForRel(e.rel, overrides);
    const prop = code ? byCode.get(code) : undefined;
    if (!prop) {
      console.log(`?  ${e.rel} — no property for folder code ${code ?? "(none)"}`);
      continue;
    }
    const doc = (docsByProp.get(prop.id) ?? []).find((d) => d.name === e.file);
    const where = `${prop.id} ${code}  ${e.file}`;

    // 1. Document intelligence. Key fields are only the ones the doc actually states.
    const keyFields = [
      ["Document type", e.doc_type],
      ["Document number", e.doc_number],
      ["Map sheet", e.sheet_no],
      ["Parcel", e.parcel_no],
      ["Area (as printed)", e.area_raw],
      ["Owners", e.owners.join("; ")],
      ["Location", [e.village, e.commune, e.district, e.province].filter(Boolean).join(", ")],
      ["Date", e.date_signed],
      ["Issuer", e.issuer],
      ["Land use", e.land_use],
    ]
      .filter(([, v]) => v && v.trim())
      .map(([label, value]) => ({ label, value: value.replace(/\s+/g, " ").trim() }));

    const summary =
      `${e.doc_type}${e.doc_number ? ` no. ${e.doc_number}` : ""}` +
      `${e.area_raw ? `, ${e.area_raw}` : ""}` +
      `${e.province ? `, ${e.village || e.commune || e.district || e.province}` : ""}` +
      `${e.owners.length ? `. Holders: ${e.owners.join(", ")}` : ""}` +
      `${e.confidence === "low" || e.unreadable.length ? ` [read: ${e.confidence}${e.unreadable.length ? `; unclear: ${e.unreadable.join(", ")}` : ""}]` : ""}`;

    if (doc) {
      console.log(`ai  ${where} → ${categoryFor(e)} · ${keyFields.length} key fields`);
      if (WRITE) {
        await saveDocumentSummary(ctx, doc.id, {
          summary,
          keyFields,
          pageCount: e.pages_read || 0,
          status: "ready",
        });
        await setDocumentCategory(ctx, doc.id, categoryFor(e));
      }
      ai++;
    } else {
      console.log(`·  ${where} — no stored document row (run docs:backfill --write first)`);
    }

    // 2. Property fields: fill only what is empty.
    const patch: Record<string, unknown> = {};
    const declared = digits(e.area_raw);
    if (/hard\s*title|hardtitle/i.test(e.doc_type) && prop.title === "—") patch.title = "Hard title";
    else if (/soft\s*title|softtitle/i.test(e.doc_type) && prop.title === "—") patch.title = "Soft title";
    if (declared && !prop.totalArea && e.confidence !== "low") patch.totalArea = declared;
    const province = latinPlace(e.province);
    if (province && !prop.province && e.confidence !== "low") patch.province = province;
    if (/sale/i.test(e.doc_type) && e.date_signed && !prop.purchaseDate && e.confidence !== "low")
      patch.purchaseDate = new Date(`${e.date_signed}T00:00:00Z`);

    if (Object.keys(patch).length) {
      console.log(`    fill ${JSON.stringify(patch)}`);
      promoted += Object.keys(patch).length;
      if (WRITE) await updateProperty(ctx, prop.id, patch as never);
    }
    // Collect the areas this property's documents state, next to the value already declared. The set
    // is what a human needs to answer "which do we follow?"; the run itself never changes totalArea.
    if (declared || prop.totalArea) {
      const entry = candidatesByProp.get(prop.id) ?? { code: code ?? "", list: [] as Candidate[] };
      if (prop.totalArea && !entry.list.some((x) => x.declared)) {
        entry.list.push({
          value: Number(String(prop.totalArea).replace(/[^\d.]/g, "")),
          file: "",
          docClass: "unrelated",
          date: "",
          declared: true,
        });
      }
      if (declared) {
        entry.list.push({
          value: Number(declared),
          file: e.file,
          docClass: docClass(e.file, e.doc_type),
          date: e.date_signed,
        });
      }
      candidatesByProp.set(prop.id, entry);
    }
    if (e.owners.length) {
      proposals.push(`${prop.id},${code},${e.file},"${e.owners.join("; ")}",${e.confidence}`);
      proposalRows++;
    }
  }

  // The conflict list. Written next to the extraction cache, not into the repo: it names client
  // properties, areas and documents, and this repository is shared.
  const conflictsPath = join(OUT, "..", "klyp-conflicts.csv");
  const lines = [
    "property_id,code,field,source,value,doc_class,evidence,date,file,verdict,note",
  ];
  let disagreeing = 0, auto = 0, human = 0;
  for (const [id, { code: propCode, list }] of candidatesByProp) {
    const verdict = adjudicate(list);
    if (new Set(list.filter(isEvidence).map((c) => c.value)).size > 1) {
      disagreeing++;
      if (verdict.kind === "auto") auto++;
      if (verdict.kind === "human") human++;
    }
    const winner = verdict.kind === "auto" ? verdict.winner.file : "";
    for (const c of list) {
      lines.push(
        [
          id,
          propCode,
          "totalArea",
          c.declared ? "declared" : "document",
          c.value,
          c.docClass,
          isEvidence(c) ? "yes" : "no",
          c.date,
          `"${c.file}"`,
          verdict.kind,
          c.file && c.file === winner
            ? "follow this document"
            : c.declared && verdict.kind === "auto"
              ? "declared value disagrees with the strongest document"
              : "",
        ].join(","),
      );
    }
  }
  writeFileSync(conflictsPath, lines.join("\n") + "\n");

  writeFileSync(PROPOSALS, proposals.join("\n") + "\n");
  console.log(
    `\n${WRITE ? "applied" : "dry run"} — ${ai} document(s) ${WRITE ? "annotated" : "to annotate"} · ` +
      `${promoted} property field(s) ${WRITE ? "filled" : "to fill"} · ` +
      `${proposalRows} owner name(s) proposed in ${PROPOSALS} · ` +
      `${disagreeing} propert(y/ies) whose documents disagree (${auto} ranked by class, ${human} need a human) in ${conflictsPath}`,
  );
  if (!WRITE) console.log("Re-run with --write to apply.");
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
