# KLYP document intake — process record

How the client's document set was read, joined to properties, stored in Valgate, and turned into
data — plus what the production version needs that this operator pass did not have.

Scripts: `scripts/backfill-klyp-docs.ts` (store), `scripts/klyp-extract-docs.ts` (read),
`scripts/klyp-apply-extraction.ts` (promote). Runbook numbers were measured on 2026-10-12.

## 1. The source set

`~/Documents/AIVO/Valgate/Valgate-Klyp-Docs copy` — 222 PDFs, 381 MB, in a two-level tree:

```
<PROVINCE>/<CLIENTCODE>[_suffix]/<doc>.pdf      e.g. PP/PP000013_House13_14/Sale.pdf
```

15 province folders (KD, KEP, KK, KP, KPC, KPCH, KPS, KPT, MDK, PP, PU, PV, PVH, SR, Rental),
94 property folders. The folder name carries **the client's own property code**; the filename
carries the document type in the client's words (`Hard_title`, `KPS_07_Sale`, `SR004_Tax`,
`Adobe Scan 3 Dec 2025 (55)`, …). Type mix: ~87 title deeds (hard/soft/previous), 59 legal
(sale/contract/owner ID), 37 financial (tax/receipt), 17 other (maps, scans).

Two structural defects, both real:

- **8 PDFs sit directly in `Rental/` with no property folder** — `PH Rental #1/#2`, `Ox Club
  Rental`, `60m Land Rental`, each also as an `ocr` copy. They name people and addresses, not a
  property code, so they cannot be joined by path (see §8).
- **The client's OCR copies are the only machine-readable ones.** All four `Rental/… ocr.pdf`
  files carry a correct Khmer text layer. Every other file's text layer is noise from an
  English-only OCR pass — `PV/PV00001/Hard_title.pdf` extracts as `w~m:~nmt;w~~~ ~~ M€\Sm w~mmnj~`.
  Five files have no text layer at all. **Any pipeline that trusts `pdftotext` on this corpus is
  reading garbage**; that is why extraction renders pages and uses a vision model (§5).

## 2. Housekeeping rules the scripts apply

| Condition | Rule | Measured |
|---|---|---|
| Byte-identical files **within one property folder** | keep the first by sorted path, skip the rest | 2 files |
| `<name>.pdf` + `<name> ocr.pdf` | keep the OCR rendition, skip the plain twin | 4 files (1 pair is byte-identical) |
| Folder code spelling | normalize: strip leading zeros, pad digits to 5 (`KPC0005`→`KPC00005`, `SR000012`→`SR00012`, `PVH01`→`PVH00001`) | 13 folders would otherwise not match |
| Folder name that still fails | one reviewed override in `scripts/data/klyp-doc-join.json` | 1 (`pPP00036` → `PP00036`) |
| File over `MAX_BYTES` (10 MB) | refused by the storage layer, same as a browser upload | 0 (the two 11 MB leases are not attributable, so they were never attempted) |

**Dedupe is folder-scoped, and that mattered.** A first pass scrubbed on the file hash alone and
dropped 13 files the client had deliberately filed under *different* properties: one sale contract
covering PP00030–33 (a single document for four parcels), `SR_01-02-03_{Map,Previous,Sale}.pdf`
covering three, and two copies of a map sheet. Only one of the 14 candidates was a genuine repeat —
`SR00015/Soft_title.pdf` duplicating `SR00015/Adobe Scan 3 Dec 2025 (54).pdf` inside the same folder.
A cross-property byte match is the client's own filing, not a duplicate.

213 documents stored from 218 in-scope files: 14 deduped (2 same-folder repeats + 4 OCR twins + 8 OCR
twins of the unfiled leases) and 4 unfiled leases left unattributed (§8).

## 3. Join: document folder → Valgate property

The client code is the prefix of `properties.name` (`"KPS00002 — Land, …"`), **not**
`properties.code` — that column holds Valgate's own id. So the join goes through
`codeFromName()` (`lib/services/property-boundary.ts`), the same function the KMZ boundary
backfill uses, with both sides passed through `normalizeCode()`.

Result: 94 folders → 93 matched (after the one override), 0 unmatched. 93 of the 109 ORG-0018
properties have documents; 16 have none.

A production upload must never guess this join. The KMZ backfill keeps the same discipline: an
exact filename or code match, otherwise ask the user.

## 4. Storage — `npm run docs:backfill`

```bash
npm run docs:backfill -- --dir "…/Valgate-Klyp-Docs copy"                    # dry run, prints the table
npm run docs:backfill -- --dir "…" --org ORG-0018 --write                    # store
npm run docs:backfill -- --dir "…" --only PV/PV00001 --write                 # one doc (smoke test)
```

Per file: `putDocumentBytes()` (new in `lib/services/storage.ts`, mirrors the existing `putKmz` —
server-side `PutObject`, no presign because the operator already holds the bytes) then
`createDocument()`. Ids, counters, org scoping and the audit columns therefore come from the same
service layer the app uses; the script never writes SQL.

- **Category** is derived from the client's own filename, deterministically, first match wins:
  `rental`→Rental, `tax|receipt`→Financial, `hard/soft/land/title/previous title`→Title,
  `sale|contract|exchange|previous`→Legal, `owner|seller|admindoc|name change| id `→Legal,
  `map`→Other. Names are normalized (`_`/`-`/spaces/case) before matching — a rule that only
  matched spaces silently filed every underscored title under Other.
- **Provenance**: `description = "KLYP intake — <folder>/<file>"`, so a row can always be traced
  back to the folder it came from.
- **Idempotent**: a property+filename pair already in `documents` is skipped, so a partial run is
  safe to repeat.

## 5. Reading the documents — `npm run docs:extract`

```bash
npm run docs:extract -- --dir "…" --only PV/PV00001 --limit 2   # smoke
npm run docs:extract -- --dir "…" --out "$HOME/Documents/AIVO/Valgate/klyp-extract"
```

Render pages with `pdftoppm` at 200 dpi (up to `--max-pages`, default 4), hand the images to a
vision model with a Zod schema, write **one JSON per document**. Rendering rather than sending the
PDF keeps the DPI ours (small Khmer script), works for every provider, and sidesteps the corpus's
unusable embedded text layer.

### Model chosen: `google/gemini-3.8-flash` via OpenRouter

Benched on page 1 and page 2 of `PV/PV00001/Hard_title.pdf` (a real issued certificate with
handwritten Khmer), three models, same prompt:

| Model | tokens in/out (p1) | Page 1 (number, sheet, parcel, area, province) | Page 2 (owner names, date) | Verdict |
|---|---|---|---|---|
| `openai/gpt-5.6-terra` | 4734 / 1378 | read all of them | **owners `[]`**, sheet hallucinated as `6` | the repo's current `SCAN_MODEL` default; missed exactly what a title is for |
| `google/gemini-3.8-flash` | 1228 / 2610 | read all of them, plus district/commune/village | **both owners read**, date `2020-05-19`, `confidence: high` | chosen |
| `anthropic/claude-sonnet-5.5` | 4993 / 1053 | read them, flagged uncertainty | both owners + latin transliteration, `confidence: low` | good second opinion |

Gemini Flash read every field the others did, recovered the owner names and the printed district /
commune / village that gpt-5.6-terra returned empty for, at ~¼ of the input tokens. OpenRouter is
the only vision credential in this repository (`OPENROUTER_API_KEY`); the app's default scan path
wants `OPENAI_API_KEY`, which is not configured here.

Extracted per document: doc type, document number, map sheet, parcel number, area as printed,
owner/lessor/lessee names (Khmer + transliteration), province/district/commune/village, signing
date, issuer, land use, model confidence, and the list of fields it could not read. Nothing is
inferred: empty when the page is blank, listed in `unreadable` when present but illegible.

Cost: ~1k–5k input tokens per document-page; 200 documents came to a few dollars, run once.

## 6. Promoting the reads into Valgate — `npm run docs:apply`

```bash
npm run docs:apply -- --out "…/klyp-extract"            # dry run, prints every proposed write
npm run docs:apply -- --out "…" --write                 # apply
```

Two halves, deliberately separate:

1. **Document intelligence** (additive, nothing overwritten): `saveDocumentSummary()` writes
   `aiSummary` + `aiKeyFields` + `aiStatus=ready`, and `setDocumentCategory()` writes the category
   — both existing service functions, so the Documents tab shows what the doc says without a
   schema change.
2. **Property fields** (fill-empty-only): `title` (from a hard/soft title doc, only when still
   `—`), `totalArea`, `province`, `purchaseDate` (from a sale contract) — **only where the column
   is empty and the read is not low-confidence**. A declared value already in the database is
   never replaced by an OCR read; where the two disagree the run prints
   `! declared 86548 vs stored totalArea …` and leaves the stored value. This mirrors the boundary
   rule that measured geometry does not overwrite entered values.
3. **Owner names** are *not* written to `co_owners`: the extracted strings are `Khmer (latin)`
   pairs with no role and no share. They are emitted as a proposal CSV
   (`klyp-owner-proposals.csv`) for a human, because `co_owners` in ORG-0018 is empty today and
   inventing roles/shares would be worse than leaving it empty.

## 7. What the production intake version still needs

| Step | Today (this pass) | Production version |
|---|---|---|
| Upload | operator script, server-side `PutObject` | `presignUpload` → browser `POST` → `/api/v1/properties/[id]/documents/complete` (already built), or a **per-property bulk drop** in the property's Documents card — today there is only a single-file picker and the KMZ bulk panel |
| Join doc → property | folder code + `normalizeCode` + one override file | never guess: exact code match from the filename/folder, else the user picks the property in the review table (the `/add-property/import` wizard already works this way) |
| Read | `klyp-extract-docs.ts` + OpenRouter | `scanDocument()` (`lib/services/document-scan.ts`) already does model + Zod + 3-sample reconciliation; it needs a configured vision provider (`SCAN_MODEL` default is benched on *handwritten consular* samples and missed the owner names on a land title — re-bench against printed Khmer titles and set the default from that) |
| Store the read | `saveDocumentSummary` / `setDocumentCategory` | same calls, from the upload route |
| Promote fields | `klyp-apply-extraction.ts`, dry run | the wizard's AI-draft-then-human-confirm step, extended with the fill-empty-only rule above |
| Review | printed table + proposal CSV | review UI showing per-field confidence and the `unreadable` list; the scan route already returns `lowConfidence` |
| Limits | 2 files refused at 11 MB vs the 10 MB cap | decide: raise `MAX_BYTES`, or down-sample scans on the way in. Real lease scans already exceed it |
| Price on sale contracts | not in schema v1 | add `price_raw` + currency to the extraction schema; the sale contracts state both |

## 8. Open items

- **4 unfiled leases unattributed** (`Rental/60m Land Rental`, `Ox Club Rental`, `PH Rental #1/#2`,
  8 files with their OCR twins). They name people and addresses, not a property code, so neither join
  works and neither does a name match: the lessor `គិត ហុងយី (Kith/Kit Hongyi)` appears as holder in
  **85 of the 222 documents**, so matching on her name selects the whole portfolio. Location is the
  only other evidence, and it conflicts:
  - `PH Rental #1` (2025-07-17) and `PH Rental #2` (2025-07-06): Phnom Penh, Mean Chey, Chak Angre
    Krom, Tuol Roka 3. The `PH` prefix reads like **PengHuot**, i.e. `PP00015`/`PP00016`, but those
    sit at village *Tuol Roka 1* and the leases are for a *house* in Mean Chey.
  - `Ox Club Rental` (2020-10-02): Boeung Keng Kang 1, village 8/9 — the lessor's *own* address
    (223, street 63, village 1) is `PP00014`'s address, which is not necessarily the leased premises.
  - `60m Land Rental` (2024-11-25): Mean Chey, Chak Angre *Leu*, Prek Ta Nu — no ORG-0018 property
    records that commune.
  One human decision per lease, then they can be stored with `--dir` pointed at a folder named for the
  code (or extend `klyp-doc-join.json` with a lease override).
- **Two 11 MB leases** exceed `MAX_BYTES`; they are among the four above, so this is not yet blocking.
- **45 area discrepancies** were printed and intentionally left alone: e.g. `KPS00007` doc 1,800 vs
  stored 6,808; `KPN…` etc. Some will be unit or scale differences, some real. They are the useful
  output of the run, not a failure.
- **Reads that are not an area are excluded**, not converted: a title printing
  `34,4 ម៉ែត្រ x 70,5 ម៉ែត្រ` yields no `totalArea` (multiplying would be our arithmetic, not the
  document's) and no discrepancy line. `printedArea()` in the apply script owns that rule.
- **Place fills are latin-only**: `properties.province` holds English in every existing row
  ("Kep", "Prey Veng"), so a Khmer-only read is skipped rather than transliterated by guesswork; a
  read that carries a gloss ("កែប (Kep)") fills as `Kep`. The full Khmer location is never lost — it
  is in the document's `aiKeyFields`.
- **Low-confidence reads** (1 low, 6 medium of 222) are listed in each JSON's `unreadable`; re-run
  just those with `--limit` after raising `--max-pages` or `--dpi`.
- **Pre-existing repo state**: `maplibre-gl` is declared in `package.json` but not installed in
  this checkout, so `npm run typecheck` fails on 8 unrelated map files. Nothing in this intake
  touches them.

## 8b. Result of the run (2026-10-12)

| | |
|---|---|
| Stored documents | **213** across 93 properties (Title 101 · Legal 63 · Financial 37 · Other 12) |
| S3 payload | ~295 MB, every row with a non-null `storage_id` and `size_bytes` |
| Documents read | **222** (218 in-scope + 4 lease OCR twins) — 215 high / 6 medium / 1 low confidence, 213 with holder names, 180 with a printed area |
| Documents annotated | **213 / 213** with `ai_summary`, `ai_key_fields` (1–10 per doc, avg 7.6), `page_count`, `ai_status=ready` |
| Property fields filled | **25** on 18 properties (`total_area`, `purchase_date`) — fill-empty-only, so nothing declared was overwritten |
| Owner names proposed | **205** rows in `klyp-owner-proposals.csv` |
| Failures | 0 stored, 0 read, 0 annotated |

## 9. Re-running end to end

```bash
npm run docs:backfill -- --dir "<src>"                 # see the join + category table, writes nothing
npm run docs:backfill -- --dir "<src>" --write         # S3 + documents rows
npm run docs:extract  -- --dir "<src>" --out "<out>"   # resumable: existing JSONs are skipped
npm run docs:apply    -- --out "<out>"                 # see every proposed change
npm run docs:apply    -- --out "<out>" --write         # annotate documents + fill empty fields
```

Verify in the app: a property's Documents tab shows the file with its category and AI summary, and
`properties` gained nothing that was already set. Spot check used here: `PV00001` → `PROP-0582`,
hard title `14040604-0001`, sheet `6132-III 80`, parcel `1`, `86548 m²`, owners read on page 2.
