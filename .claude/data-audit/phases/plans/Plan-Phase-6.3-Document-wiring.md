# Plan — Phase 6.3: Document wiring (Rank 3, multi-page entity)

## Context

Document is **rank 3 in the build order** (`pages/SUMMARY.md`) with 10 surfaces unlocked across 2 pages: 1 on `/property/[id]/rental` (row 31, the small Documents card) and 9 on `/property/[id]/documents` (rows 5, 8-14, 22 — file metadata, counts, thumbnails, upload demo). Document already exists with full Zod (Batch 3) — no schema-build half this phase, unlike 6.2.

**Critical scope discipline — the Folder boundary.** Folder is Phase 6.7, gated on Document landing. Folder also already exists with full Zod (Batch 3, surprise discovery during pre-flight). This phase **uses Folder data for FK lookups** (resolving `Document.folderId → Folder.name` for row 10 file labels) but **does NOT wire any Folder surfaces** — folder tile grid (row 7), location trees (rows 19, 20), file detail sidebar folders (row 23). Those four surfaces stay hardcoded; Phase 6.7 owns them. The boundary rule: delete `FALLBACK_FILES` (Document), leave `mainFolders` / `FALLBACK_SUBFOLDERS` / `locationTree` (Folder) alone.

**Two PF traps to spring (both Rule 1 territory at the file level):**
- **PF3 on documents page** — the documents page renders `FALLBACK_FILES` (13 hardcoded entries, lines 74-100) whenever `dbDocuments.length === 0`, which is true today even after fetching. EmptyState is unreachable. This phase must **delete the fallback** and trust EmptyState; demo data belongs in seeds, not in components.
- **Rental page row 31** — 3-item array literal inline at `PropertyRentalPage.tsx:383-386`. Same anti-pattern as Phase 6.2's PF4 (`chartData` / `payments` constants); explicit delete-then-wire, not prop-fallback.

**Untyped `Document.category` — file as new Q-number.** The Zod schema has `category: z.string().optional()` with no enum. The documents page filters and labels by category implicitly (Title, Photos, Rental, Insurance, Tax, Receipts seen in mock data). Wiring exposes the inconsistency risk (typos like "title" vs "Title" produce ghost categories). **Decision for 6.3:** wire as-is (untyped); file as **Q5.\<next\>** — "Should `Document.category` be a closed enum, and what are the values?" — do not block this phase on the answer. Seeds will use a consistent capitalized set (Title, Sales, Tax, Rental, Photos, Insurance) so the UI looks coherent today.

**Seed expansion needed.** Only 2 documents seeded for PROP-0001 today (DOC-0001 Title PDF + DOC-0002 Photos JPEG). The documents page card pattern wants 6-12 entries to look realistic. This phase will add 4-6 more seed records for PROP-0001 covering the categories the UI shows. Mirrors Phase 6.2's Expense seed creation step but lighter (entity already exists).

The intended outcome: 10 hardcoded surfaces become real-data reads; PF3 and the rental row 31 array literal both deleted; 10 new per-datapoint audit reports land; Document flips from "not built" → "shipped, fully wired" in `pages/INDEX.md` and `SUMMARY.md`; Folder remains correctly listed as `not wired` (only its FK is consumed, not its surfaces).

## Prerequisites

- **Phase 6.0, 6.1, 6.2 complete.** Overview + rental have valuations, leases, tenants, payments, expenses fetched and wired.
- **Document Zod schema settled** (Batch 3). `DocumentSchema` validates at FS boundary.
- **Folder Zod schema settled** (Batch 3, surprise existing). `FolderSchema` validates folders for the FK lookup.
- **`WIRING-PLAYBOOK.md` rules read.** Rule 2 (empty-state convention) is critical here — the file has its own EmptyState component that's currently dead code; reactivating it cleanly matters more than introducing yet another empty-state pattern.
- **Verified during exploration:**
  - `lib/data/types/document.ts` — full Zod, kind enum (photo/document), category as untyped `.optional()`, folderId as optional FK
  - `lib/data/db/documents.ts` — full CRUD with Zod parse on reads
  - 3 document seeds total (DOC-0001..0003); 2 for PROP-0001, 1 for PROP-0006
  - `lib/data/types/folder.ts` exists; `lib/data/db/folders.ts` exists; both Zod'd — **no Folder schema work in this phase**
  - `app/(shell)/property/[id]/documents/queries.ts` exists; fetches `{ userId, documents, folders }` filtered by propertyId — **already correct, no extension needed**
  - `app/(shell)/property/[id]/rental/queries.ts` post-6.2 fetches leases/tenants/payments/expenses — **needs documents + folders added**

## Step 0 — Pre-flight (~5 min)

Per WIRING-PLAYBOOK.md pre-flight section:

1. **Read entity backlog rows.** `pages/property-id-rental/plan.md` §3 (Document covers row 31 — 1 surface) and `pages/property-id-documents/plan.md` §3 (Document covers rows 5, 8-14, 22 — 9 surfaces).
2. **Re-read PF traps.** PF3 on documents (delete `FALLBACK_FILES` + remove fallback ternary; trust EmptyState) and the rental row 31 array literal (same delete-then-wire pattern as 6.2's PF4). Both must be sprung in Step A.
3. **Scan blocking Q-numbers.** Two relevant:
   - **Q5.\<next\>** (NEW) — `Document.category` enum question. File at the start of Step A; do not block on resolution. Default behavior: wire untyped; UI groups by category-as-string; seeds use a consistent capitalized set.
   - **No Folder Q-numbers in scope** — Folder surfaces explicitly out of scope.
4. **Commit Folder boundary discipline now.** Write the four out-of-scope Folder surfaces (rows 7, 19, 20, 23 on documents page) on a sticky note. They stay hardcoded. The grep step in self-review confirms no accidental edits.
5. **Plan seed expansion shape:** add 4-6 documents for PROP-0001 across categories Title (1 already), Photos (1 already), Rental (add 2), Insurance (add 1), Tax (add 1), Sales (add 1). Use existing FLDR-* folder IDs from current seeds where possible to exercise the FK lookup. Mix kinds (photo + document). Realistic file sizes (50KB-5MB), recent-ish dates.

## Scope of this change

**Files to CREATE (4-6 seed records + 10 audit reports):**

1. **`public/data/users/demo-user/documents/DOC-0004..00NN/core.json`** — 4-6 new seed records for PROP-0001, mixing kinds + categories per Step 0 plan.
2. **10 per-datapoint audit reports** under `.claude/data-audit/`:
   - `property-id-rental--documents-card.md` (1)
   - `property-id-documents--file-count-subtitle.md`, `--file-name.md`, `--file-type-icon.md`, `--file-folder-label.md`, `--file-size.md`, `--file-date.md`, `--image-thumbnails.md`, `--section-file-count.md`, `--upload-demo-files.md` (9)

**Files to MODIFY (4 source files):**

1. **`app/(shell)/property/[id]/rental/queries.ts`** — extend `RentalPageData` with `documents: Document[]` and `folders: Folder[]`; extend `Promise.all`; filter both by propertyId.
2. **`app/(shell)/property/[id]/_components/PropertyRentalPage.tsx`** — accept `documents` + `folders` props; **delete the inline 3-item array (lines 383-386)**; render real Documents (filter by category-or-take-most-recent-N to keep the small card visually similar).
3. **`app/(shell)/property/[id]/_components/PropertyDocumentsPage.tsx`** — accept Documents + Folders props (queries.ts already returns them; verify the page.tsx passes them through); **delete `FALLBACK_FILES` constant (lines 74-100) and the fallback ternary that selects it when `dbDocuments.length === 0`**; render real Documents resolved against Folder.name for row 10 labels. **Do NOT touch `mainFolders`, `FALLBACK_SUBFOLDERS`, or `locationTree`** — Folder phase territory.
4. **`app/(shell)/property/[id]/rental/page.tsx`** — spread the new documents + folders props into `<PropertyRentalPage>`.

**Files to UPDATE in the audit corpus:**

- `.claude/data-audit/INDEX.md` — append 10 new per-datapoint audit rows.
- `.claude/data-audit/pages/INDEX.md` — Document row: `not built` → `shipped, fully wired`. Folder row: stays `not built` (correct — surfaces still hardcoded).
- `.claude/data-audit/pages/SUMMARY.md` — Rank 3 row: `not built` → `shipped, fully wired`.
- `pages/property-id-rental/plan.md` §5 Fix Log — append entry: row 31 wired, inline array literal deleted.
- `pages/property-id-documents/plan.md` §5 Fix Log — append entry: rows 5, 8-14, 22 wired; PF3 sprung (FALLBACK_FILES deleted, EmptyState reactivated); document Q5.\<next\> Document.category decision.
- `ref/05-open-questions.md` — append new Q5.\<next\> for `Document.category` enum question.
- `.claude/data-audit/docs/PHASES.md` — flip 6.3 status emoji 🔜 → ✅ (when phase ships); add `Plan-Phase-6.3-Document-wiring.md` to archived plan files NOW (drafted) and bump status on completion.

**Files NOT touched (out-of-scope by design):**

- `lib/data/types/document.ts` or `lib/data/db/documents.ts` — entity is settled.
- `lib/data/types/folder.ts` or `lib/data/db/folders.ts` — Phase 6.7 territory.
- `mainFolders`, `FALLBACK_SUBFOLDERS`, `locationTree` constants in `PropertyDocumentsPage.tsx` — Folder surfaces (rows 7, 19, 20, 23). Hands off.
- `documents/queries.ts` — already returns the right shape.
- No new Zod schemas, no `_common.ts` changes.

## Step A — Wiring (~85 min) with per-surface rule annotations

Broken into 4 sub-steps. Run the ★ self-review pass at the end.

### A.1 — Seed expansion (~15 min)

1. **File Q5.\<next\>** in `ref/05-open-questions.md` immediately so the seeds reference an open decision rather than committing to a closed enum.
2. **Create 4-6 new seed records** under `public/data/users/demo-user/documents/DOC-0004..00NN/core.json`:
   - Mix of kind=document and kind=photo
   - Categories: Rental (×2), Insurance (×1), Tax (×1), Sales (×1) — realistic distribution
   - Reuse existing FLDR-* folderIds where appropriate (exercises the FK-to-Folder.name lookup); leave 1-2 with `folderId` omitted (exercises the optional FK render path)
   - File sizes 50KB-5MB, dates spanning 2024-2026
3. **Smoke test:** mentally parse one new seed via `DocumentSchema.parse()` to confirm shape matches.

### A.2 — Query layer extension (~10 min)

1. **Extend `rental/queries.ts`:**
   - Add `Document` and `Folder` imports
   - Extend `RentalPageData` type with `documents: Document[]; folders: Folder[]`
   - Extend `Promise.all` to include `db.documents.list(userId)` and `db.folders.list(userId)`
   - Filter both by propertyId
2. **Update `rental/page.tsx`** to spread the new props into `<PropertyRentalPage>`.
3. **Verify `documents/page.tsx`** passes documents + folders through to `<PropertyDocumentsPage>` already (queries.ts already returns them; if the page wasn't passing them, fix that here too).

### A.3 — Rental wiring (1 surface, ~10 min)

- **Row 31 — Documents card (3-item array, lines 383-386):**
  - **Delete the inline array first** (force compile errors that point at the consumer site).
  - **Wire:** select most-recent N documents for this property (e.g. top 3 by `uploadedAt DESC`). For each, render `name`, derive a `statusLabel` from category (e.g. "Active" for Rental category, "Expiring" for Insurance with old date, "" otherwise — keep it simple, document the rule in the audit), format date.
  - **Rule 1 trigger:** the "Active" / "Expiring" labels in the original mock claim status that the schema doesn't directly model. Either: (a) derive labels from category + date (good — wire it), or (b) drop the status labels entirely (acceptable — simpler, less hidden logic). **Default to (a) with simple rules; document in audit.**
  - **Rule 2 trigger:** if no documents for property, show an empty state matching the file's existing convention (Phase 6.1/6.2 used `"—"`).

### A.4 — Documents page wiring (9 surfaces, ~50 min)

**Step A.4.0 — Spring PF3 trap (FIRST, before any wiring):**
   - Delete `FALLBACK_FILES` constant (lines 74-100).
   - Remove the fallback ternary (the `dbDocuments.length === 0 ? FALLBACK_FILES : dbDocuments` pattern — exact form to verify in source).
   - Trust the existing `EmptyState` component (lines 641-646 per audit).
   - This forces compile errors at every consumer of `FALLBACK_FILES`; use them as a wiring checklist.
   - **Do NOT delete `mainFolders` or `FALLBACK_SUBFOLDERS`** — Folder phase 6.7 will spring those.

- **Row 5 — File count in subtitle:**
  - **Wire:** `documents.length` (or `filteredDocuments.length` if a filter is active).
  - **Rule 2:** if 0, the EmptyState replaces the entire list region; verify the subtitle still renders coherently ("0 files" vs absent).
- **Row 8 — File name (in list + grid views):**
  - **Wire:** direct read `document.name`. **Lite-template** material.
- **Row 9 — File type icon + color:**
  - **Wire:** mapping from `document.kind` + `document.extension` to icon component + color class. Reuse existing icon set (FileText, FileSpreadsheet, FileImage, etc.). Build a small switch helper at top of the component or extract to a `getFileIconStyle(doc)` util in the same file.
  - **Rule 1 trigger:** the original mock varied `iconClass` per type; preserve the mapping by extension/mime to avoid a regression in visual differentiation.
- **Row 10 — File folder label:**
  - **Wire:** look up `folders.find(f => f.id === document.folderId)?.name ?? "—"`. Builds an inline lookup; for hot loops consider a `Map` keyed by folderId, but with seed data sizes (~10 folders) inline is fine.
  - **Rule 2:** if document has no folderId or the folder doesn't exist, render `"—"` (matches file convention).
- **Row 11 — File size:**
  - **Wire:** `formatBytes(document.sizeBytes)` — write a small formatter (bytes → KB/MB/GB) or use an existing one if there's a util. Direct read.
  - **Rule 2:** if `sizeBytes` undefined, render `"—"`.
- **Row 12 — File date / "Modified":**
  - **Wire:** format `document.uploadedAt` to "MMM D, YYYY". Direct read.
- **Row 13 — Image thumbnails:**
  - **Wire:** for `kind === "photo"` documents, render thumbnail using `thumbStorageId` if present, else `storageId`. Today there's no real storage layer (storageIds are just strings in seeds); render a placeholder image OR conditionally skip thumbnails (defer to a future storage phase). **Default: skip thumbnail rendering, show file icon for photos too.** Document this trade-off in the audit (the original mock used Unsplash URLs; with no storage layer, real seeds can't produce real thumbnails today).
  - **Rule 1 trigger:** "image thumbnails" claim a visual; if we render the same icon as documents, the kind distinction is lost. Acceptable for now — annotate as a known gap blocked on storage phase.
- **Row 14 — Section file count:**
  - **Wire:** `filteredDocuments.length` (where filter is the active folder/category).
  - **Rule 1 trigger:** must be consistent with row 5 subtitle count when no filter is active.
- **Row 22 — Upload demo file list:**
  - **Wire:** the upload modal currently shows a hardcoded `demoFiles` array (per audit) used to demonstrate the upload UX. **Decision:** this is a UI-demo construct, not real data — leave as-is in 6.3 and document as out-of-scope (a real upload flow is its own phase). Mark this row as **"intentionally hardcoded — UI demo, not data"** in the audit. **One exception:** if `demoFiles` is referenced as if it were real Documents anywhere (cross-rendering), strip that coupling.

### ★ Self-review pass (~10 min)

After A.1-A.4 done:

1. **Rule 1 sweep across both files:** check any adjacent claim-strings near wired surfaces. Three known: rental row 31 status labels (Active/Expiring), documents page section header counts (rows 5 and 14 must match), file type icon mapping (row 9). Each addressed in Step A.4 — verify nothing slipped.
2. **Rule 2 grep:** in both component files, grep for `"—"`, `"None"`, `"N/A"`, `"0 files"`. Confirm new empty states match the most-used existing convention. EmptyState reactivation on documents page is the big one.
3. **Rule 3 mental walks:** documents page has ~no aggregations (mostly direct reads + a folder lookup map). Walk the folder lookup with 2 cases: `folderId=FLDR-0001` (resolves to "Contract") and `folderId=undefined` (resolves to "—"). Walk file count with 0 documents (EmptyState renders, count shows 0).
4. **Folder boundary verification:** grep `PropertyDocumentsPage.tsx` for `mainFolders`, `FALLBACK_SUBFOLDERS`, `locationTree`. All three must STILL EXIST untouched. If any was accidentally deleted, restore.
5. **PF3 verification:** grep for `FALLBACK_FILES` — should return zero matches. Especially check no `?? FALLBACK_FILES` fallback was added.
6. **PF4-equivalent verification (rental row 31):** grep `PropertyRentalPage.tsx` for the inline document object names ("Lease Agreement", "Move-in Checklist", "Insurance Certificate"). Should return zero matches as literals.

**STOP. Hand back to user for Step B visual verification.**

## Step B — Visual dev-server check (~15 min, you do this)

1. Start dev server.
2. Open `/property/PROP-0001/rental` — confirm:
   - Documents card (right column) shows 3 real Documents from the property
   - Status labels render coherently (or are absent if the no-derivation path was chosen)
   - Empty state is `"—"` if there are zero documents (manually empty seed file to test if curious)
3. Open `/property/PROP-0001/documents` — confirm:
   - File list renders 6-8 real documents (the expanded seeds)
   - File count subtitle (row 5) matches actual count
   - Each row shows real name, type icon, folder label (resolved via FK to Folder.name), size, date
   - Photo documents render with their icon (no thumbnails — known gap)
   - Folder tile grid (top of page) STILL shows hardcoded folder tiles (correct — Folder phase 6.7 owns those)
   - Section file count (row 14) matches subtitle (row 5) when no filter active
   - **EmptyState test (optional):** temporarily delete all DOC-* seeds for PROP-0001 → reload → EmptyState component should render. Restore seeds afterward.
   - **No `FALLBACK_FILES` in source** (open file, scroll lines 74-100, confirm gone)
   - **No 3-item inline array on rental** (open file, scroll lines 380-390, confirm wired)
4. Hand back with notes if anything is wrong; otherwise say "go" for Step C.

## Step C — Audit batch + index updates (~2 hours)

1. Run `/audit-datapoint` on the **first** newly-wired surface (recommend documents page row 8 — File name — since it's the canonical lite-template direct read of the Document entity).
2. **Spot-check dedup machinery:**
   - ☐ Cites `Page-wide: see PFn in pages/property-id-documents/audit.md` instead of restating PF3
   - ☐ Renders **lite** template (file name is a direct read; full template would be overkill)
   - ☐ TL;DR has the `📄 Page audit:` back-link
3. **If any check fails:** STOP. Investigate; fix coupling if needed.
4. **If passes:** continue with the remaining audits, **applying WIRING-PLAYBOOK Step C wins**:
   - **Win 1 — Bundle direct-read cluster.** File name (8), File type icon (9), File folder label (10, with FK lookup), File size (11), File date (12), Image thumbnails (13) — all read `Document.<field>` on the same row of the documents page list/grid, all share PF1/PF3 systemic findings → write ONE bundle: `property-id-documents--file-row-direct-reads.md` covering 6 surfaces with a per-field table.
   - **Full template (standalone):** rental documents card (derivation: filter + sort + status label), file count subtitle (count derivation), section file count (filtered count), upload demo files (intentionally hardcoded — short explainer audit) — **4 audits**.
   - **Total reports:** 1 bundle + 4 full = **5 audit files** covering 10 surfaces.
   - **Win 2 — Systemic-finding stub.** F1 (userId leak via PF1) and the PF3 fallback-trap finding render as one-liner stubs in the bundle's §8 — no Where/Problem/Why/Fix block.
   - **Win 3 — Compressed lite.** The bundle uses the compressed format (no Contents, Glossary, or Revision history block).
5. Update `INDEX.md` (per-datapoint table) with **5 new rows** (annotate the bundle row as covering 6 underlying surfaces).
6. Update `pages/INDEX.md` Document row.
7. Update `pages/SUMMARY.md` Rank 3 row.
8. Update `docs/PHASES.md`: flip 6.3 status, add archived plan path entry to `(executed)`, bump "Last updated."
9. Append fix-log entries to both affected `plan.md` files. Include Q5.\<next\> note.

## Verification

After Phase 6.3 lands:

1. **Type check passes.** Zero errors. `tsc --noEmit` clean.
2. **No ZodError in terminal** during dev server boot or page navigation.
3. **Visual check on both pages.** All 10 surfaces show real data; folder labels resolve correctly via FK; EmptyState reachable.
4. **No new entity created** (Document + Folder were both pre-built); seed count for PROP-0001 documents is 6-8.
5. **PF3 trap sprung.** No `FALLBACK_FILES` constant or fallback ternary in `PropertyDocumentsPage.tsx` (`grep -n "FALLBACK_FILES" PropertyDocumentsPage.tsx` returns zero).
6. **Rental row 31 wired.** No inline document object literal in `PropertyRentalPage.tsx` rows 380-390.
7. **Folder boundary respected.** `mainFolders`, `FALLBACK_SUBFOLDERS`, `locationTree` constants in `PropertyDocumentsPage.tsx` STILL EXIST untouched. Folder row in `pages/INDEX.md` still reads `not built` (correct — Phase 6.7 territory).
8. **5 new per-datapoint audit reports** under `.claude/data-audit/` (1 bundle covering 6 surfaces + 4 full standalone, total 10 surfaces audited). Confirm by `ls .claude/data-audit/*.md | wc -l` (should be ~57, up from ~52 after Phase 6.2 — bundling means fewer files, not fewer surfaces).
9. **Status fields synced.** Document reads `shipped, fully wired` in BOTH `pages/INDEX.md` and `pages/SUMMARY.md`. PHASES.md row 6.3 reads ✅.
10. **Q5.\<next\> filed.** New entry in `ref/05-open-questions.md` for `Document.category` enum question, cross-linked from the documents page audit reports that touch the field.
11. **Fix logs appended** to both plan.md files with PF3 + Q5.\<next\> notes.
12. **Playbook rules visibly applied.** No P1-grade adjacent-hardcode findings; no "$0"-style placeholder findings; no silent fallback-trap regressions.
13. **No surprise file changes.** `git status` shows: 4 source files modified (rental queries + page, both component files), 4-6 seed JSONs created, 10 audit reports created, ~6 corpus files updated.

## What unblocks after Phase 6.3

- **Phase 6.7 — Folder wiring.** Now formally unblocked. 4 surfaces (folder tile grid, 2 location trees, file detail sidebar). Folder entity already exists; this is wire-only. Likely a quick 2-hour phase given the Document FK pattern is now established.
- **Documents page is fully real for the data half.** Only Folder surfaces (4) remain hardcoded; everything else flows from real seeds.
- **Rental page documents card is real** — combined with 6.1 (Lease+Tenant) and 6.2 (Payment+Expense), the rental page is ~90% wired. Remaining hardcoded items: maintenance section (Phase 6.8 MaintenanceItem), a few activity feed items.
- **`Document.category` enum decision (Q5.\<next\>)** — decoupled from wiring; can be revisited as a discrete schema PR when business clarifies the controlled vocabulary.
- **Storage layer gap visible** — the photo thumbnail "skip" in row 13 makes the missing storage backend concrete; future phase can address (Convex storage or similar).

## Time estimate

~3 hours total (Step C bundling per WIRING-PLAYBOOK saves ~50 min vs naive per-surface audits):

- Step 0 (pre-flight): ~5 min
- Step A.1 (seed expansion + Q5 file): ~15 min
- Step A.2 (query layer extension): ~10 min
- Step A.3 (rental wiring, 1 surface): ~10 min
- Step A.4 (documents wiring, 9 surfaces + PF3 deletion): ~50 min
- ★ self-review: ~10 min
- Step B (visual check, 2 pages with optional EmptyState test): ~15 min
- Step C (5-report batch + dedup spot-check + 6 corpus updates): ~1 hour
  - 1 bundled lite (~10 min) + 4 full (~40 min) = ~50 min audits
  - Index + SUMMARY + PHASES + plan.md + Q5 file: ~15 min
  - 10 audits × ~10 min average (mostly lite, 3-4 full) = ~100 min
  - Index + SUMMARY + PHASES + plan.md + Q5 file: ~15 min
- Buffer (folder lookup edge cases, EmptyState wiring nuances, Q5 wording): ~30 min

**Realistic: 4 hours. Conservative: 4.5 hours.**

## Out of scope (deliberate)

- **Wiring any Folder surfaces** — rows 7, 19, 20, 23 on documents page (folder tile grid, location trees, sidebar folders). All four stay hardcoded; Phase 6.7 owns them.
- **Closing `Document.category` to an enum** — file as Q5.\<next\>; do not block this phase. Wire as untyped string today.
- **Real storage backend for thumbnails** — image thumbnail rendering (row 13) explicitly skipped pending a storage phase. Show file icon for photos as the interim.
- **Real upload flow** — row 22 `demoFiles` constant stays as a UI demo; building real upload is its own future phase.
- **Building or modifying any OTHER entity** (MaintenanceItem, etc.) — not this phase.
- **Wiring any OTHER constant on the affected pages** — Maintenance section (rental Phase 6.8), activity feed items, etc.
- **Adding rich Document derivations** — e.g. "expiring soon" badges that scan all categories — out-of-scope; keep status logic minimal in row 31.
- **Modifying `Document` or `Folder` Zod schemas** — both settled.
- `.context/todo-ui.md` or `deferred-database-migration.md` updates — Phase 7 concern.
- Re-running `/audit-page-datapoints` against either page — source code changes confined to wiring.
- DDL or ERD generation refresh — separate workstreams.
