#!/usr/bin/env node
// KLYP document extraction: read each stored property document with a Khmer-capable vision model and
// write one JSON per document. Read-only against Valgate (no DB writes); this is the "understand the
// doc" half of the intake, and the artifact a human reviews before anything is promoted to a column.
//
//   npm run docs:extract -- --dir "…/Valgate-Klyp-Docs copy"                    # all docs
//   npm run docs:extract -- --dir "…" --only PV/PV00001 --limit 2               # smoke test
//
// Model choice (see the runbook in docs/runbooks/klyp-document-intake.md): Google Gemini Flash via
// OpenRouter read every field on the pages we benched — including the owner names and the printed
// issue date that the app's default scan model (gpt-5.6-terra) returned empty for — at roughly a
// quarter of the input tokens. Provider is OpenRouter because it is the only vision credential this
// repository holds; the model slug is a flag so the bench can be repeated on new document types.
//
// Pages are rendered to PNG here rather than handing the PDF to the provider: the same render serves
// every provider (no per-provider PDF plumbing), the DPI is ours to tune for small Khmer script, and
// the corpus's own embedded OCR layer is unusable — most of these files were OCR'd with an
// English-only engine, so their text layer is noise.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative } from "node:path";
import { z } from "zod";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

const args = process.argv.slice(2);
const arg = (flag: string, fallback = "") => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] ?? fallback : fallback;
};
const DIR = arg("--dir");
const ONLY = arg("--only");
const LIMIT = Number(arg("--limit", "0")) || 0;
const MAX_PAGES = Number(arg("--max-pages", "4")) || 4;
const DPI = arg("--dpi", "200");
const MODEL = arg("--model", "google/gemini-3.8-flash");
// Which credential and endpoint. Default is the shipped path (OpenRouter); the flags exist so a bench
// can also reach a provider whose key lives outside this repo, e.g.
//   --base-url https://ollama.com/v1 --key-env OLLAMA_API_KEY --model qwen3.5:397b-cloud
const BASE_URL = arg("--base-url", "https://openrouter.ai/api/v1");
const KEY_ENV = arg("--key-env", "OPENROUTER_API_KEY");
const OUT = arg("--out") || join(process.env.HOME ?? ".", "Documents/AIVO/Valgate/klyp-extract");
// One hung provider must not stall the whole run: without this, a model that accepts the request and
// never answers holds a worker open forever and the bench silently stops progressing.
const TIMEOUT_MS = Number(arg("--timeout", "180")) * 1000;

if (!DIR || !existsSync(DIR)) {
  console.error('Usage: npm run docs:extract -- --dir "<folder>" [--only SUBSTR] [--limit N] [--model SLUG] [--out DIR]');
  process.exit(1);
}

// The fields a Cambodian land/title/contract document actually states. Everything is a string or
// empty array: this is transcription, not interpretation, and a typed number would invite the
// "digits only" guessing the app's own scan schema has to warn against.
const KlypDocSchema = z.object({
  doc_type: z.string().describe("English label, e.g. Hard title, Soft title, Sale contract, Tax receipt, Lease"),
  doc_number: z.string().describe("Certificate / contract / receipt number exactly as printed"),
  sheet_no: z.string().describe("Cadastral map sheet number (សន្លឹកផែនទី) if printed"),
  parcel_no: z.string().describe("Land parcel number (ក្បាលដី) if printed"),
  area_raw: z.string().describe("Land area exactly as printed, digits and unit"),
  owners: z.array(z.string()).describe("Owner / lessor / lessee / seller full names, Khmer plus latin transliteration"),
  province: z.string(),
  district: z.string(),
  commune: z.string(),
  village: z.string(),
  date_signed: z.string().describe("YYYY-MM-DD if a signing/issue date is legible, else empty"),
  issuer: z.string().describe("Issuing office or signatory if printed"),
  land_use: z.string().describe("Land use / land category if printed"),
  confidence: z.enum(["high", "medium", "low"]),
  unreadable: z.array(z.string()).describe("Field names you could not read on these pages"),
});

type KlypDoc = z.infer<typeof KlypDocSchema>;

const PROMPT = [
  "This is a Cambodian property document — a land title, ownership certificate, sale contract, lease,",
  "tax receipt or cadastral map. The Khmer script may be handwritten or a poor scan, and the page may",
  "also carry French, Chinese or English text.",
  "Transcribe only what is actually printed. Leave a field empty when the document does not show it,",
  "and list it in `unreadable` when it is present but you cannot read it reliably. Never guess a name,",
  "a number or a date; an empty field is the correct answer for a blank field.",
  "Owner names matter most: give the Khmer spelling and a latin transliteration for each person,",
  "including spouses listed together and any lessor/lessee pair on a lease.",
].join(" ");

/** Retry a call on transient transport failure with escalating backoff. */
async function withRetry<T>(fn: () => Promise<T>, label: string, attempts = 4): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (i < attempts - 1) {
        const wait = 2000 * 3 ** i; // 2s, 6s, 18s
        console.log(`…  retry ${i + 1}/${attempts - 1} in ${wait / 1000}s  ${label}  (${(err as Error).message.slice(0, 60)})`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
  throw last;
}

function render(file: string): string[] {
  const dir = mkdtempSync(join(tmpdir(), "klyp-"));
  execFileSync("pdftoppm", ["-png", "-r", DPI, "-f", "1", "-l", String(MAX_PAGES), file, join(dir, "p")]);
  return readdirSync(dir).sort().map((f) => join(dir, f));
}

async function main() {
  const key = process.env[KEY_ENV];
  if (!key) throw new Error(`${KEY_ENV} is required for ${BASE_URL}`);
  const provider = createOpenAI({ baseURL: BASE_URL, apiKey: key });

  const docs: { path: string; rel: string }[] = [];
  for (const province of readdirSync(DIR, { withFileTypes: true })) {
    if (!province.isDirectory()) continue;
    for (const entry of readdirSync(join(DIR, province.name), { withFileTypes: true })) {
      // A PDF sitting directly in the province folder is unfiled — `Rental/` holds four such leases
      // that name people and addresses but no property code. They are read here anyway so the
      // attribution question is answered from evidence instead of a filename.
      if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) {
        const path = join(DIR, province.name, entry.name);
        docs.push({ path, rel: relative(DIR, path) });
        continue;
      }
      if (!entry.isDirectory()) continue;
      for (const f of readdirSync(join(DIR, province.name, entry.name), { withFileTypes: true })) {
        if (f.isFile() && f.name.toLowerCase().endsWith(".pdf") && !/\s+ocr\.pdf$/i.test(f.name)) {
          const path = join(DIR, province.name, entry.name, f.name);
          docs.push({ path, rel: relative(DIR, path) });
        }
      }
    }
  }
  const todo = docs.filter((d) => !ONLY || d.rel.includes(ONLY)).slice(0, LIMIT || undefined);
  mkdirSync(OUT, { recursive: true });
  const CONC = Math.max(1, Number(arg("--concurrency", "4")) || 4);
  console.log(`model ${MODEL} · ${todo.length} doc(s) · concurrency ${CONC} · out ${OUT}\n`);

  let done = 0, skipped = 0, failed = 0;
  const queue = [...todo];

  // One doc: render, read, cache. Sequential per doc — the model call is the whole cost, so a few
  // workers in flight turn ~25 s/doc into wall-clock/N without touching the per-doc logic.
  async function one(d: { path: string; rel: string }) {
    const outFile = join(OUT, `${d.rel.replace(/[/\\]/g, "__").replace(/\.pdf$/i, "")}.json`);
    if (existsSync(outFile)) {
      skipped++;
      return;
    }
    const pages = render(d.path);
    try {
      // Transport, not the model: a run of 200 docs over a home uplink reset the HTTP/2 stream
      // (NGHTTP2_INTERNAL_ERROR) on ~20% of calls, and the SDK's own fast retries all landed in the
      // same dead window. Backing off past it is the difference between a clean pass and a manual
      // mopping-up pass. The cache makes a retry cheap: nothing already read is re-sent.
      const { object, usage } = await withRetry(async () => {
        return await generateObject({
          model: provider(MODEL),
          schema: KlypDocSchema,
          abortSignal: AbortSignal.timeout(TIMEOUT_MS),
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: PROMPT },
                ...pages.map((p) => ({ type: "image" as const, image: readFileSync(p), mediaType: "image/png" })),
              ],
            },
          ],
        });
      }, d.rel);
      const record = {
        rel: d.rel,
        file: basename(d.path),
        model: MODEL,
        pages_read: pages.length,
        // Tokens the call actually cost. A bench needs this to weigh a better read against its price.
        usage,
        extracted_at: new Date().toISOString(),
        ...(object as KlypDoc),
      };
      writeFileSync(outFile, JSON.stringify(record, null, 2));
      console.log(
        `✓ ${d.rel.padEnd(52)} ${object.doc_type.slice(0, 18).padEnd(18)} ` +
          `owners=${object.owners.length} area="${object.area_raw}" conf=${object.confidence}`,
      );
      done++;
    } catch (err) {
      console.log(`✗ ${d.rel}: ${(err as Error).message.slice(0, 160)}`);
      failed++;
    } finally {
      rmSync(join(pages[0] ?? "/nonexistent", ".."), { recursive: true, force: true });
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONC, queue.length) }, async () => {
      while (queue.length) await one(queue.shift()!);
    }),
  );
  console.log(`\nextracted ${done} · cached ${skipped} · failed ${failed}`);
  if (failed) process.exitCode = 1;
}

main().then(
  () => process.exit(process.exitCode ?? 0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
