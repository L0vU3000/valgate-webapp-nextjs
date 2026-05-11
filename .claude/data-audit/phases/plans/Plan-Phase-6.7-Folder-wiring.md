# Plan — Phase 6.7: Folder wiring (Rank 7, single-page entity, wire-only)

## Context

Folder is **rank 7 in the build order** (`pages/SUMMARY.md`) with 4 surfaces unlocked on `/property/[id]/documents`. Phase 6.7 is **the simplest 6.x phase yet** — Folder entity already exists with full Zod (Batch 3), `documents/queries.ts` already fetches folders, and `<PropertyDocumentsPage>` already accepts the prop. The work is purely about deleting 3 hardcoded folder constants and replacing them with renders from the real folder list.

**The 6.3 boundary is the entire setup for 6.7.** Phase 6.3 (Document wiring) explicitly left these surfaces and constants untouched, calling them out four separate times as "Phase 6.7's lane":

- `mainFolders` constant (lines 65-71) — 4 hardcoded items: "All Documents", "Title", "Sales", "Tax Receipt" (file detail sidebar)
- `FALLBACK_SUBFOLDERS` constant (line 72) — 6 hardcoded strings: "Contract", "Receipts", "Tax", "Rental", "Images", "Videos" (folder tile grid)
- `locationTree` constant (lines 108-137) — 10 nodes forming a 3-level hierarchy (used by both Add Folder and Move To modals)

That boundary discipline now pays off — Phase 6.7 just sweeps in, deletes the three constants, and wires the four surfaces from real Folder data.

**Folder entity shape (verified during 6.3 exploration):**

```
FolderSchema = z.object({
  id, userId, propertyId,
  parentFolderId: idSchema.optional(),  // self-FK enables hierarchy
  name: z.string().min(1),
  createdAt: timestampSchema,
})
```

`parentFolderId` is the key — it lets us derive a tree from a flat list. Rows 19 and 20 (the Add Folder + Move To modals' `locationTree`) BOTH use the same hierarchy derivation, just rendered in different modal contexts. That's why they collapse into one audit (same derivation, same source).

**No new Q-numbers, no PF traps to spring beyond the 3 constants.** The documents page's PFn findings (PF1 prop narrowing, PF3 fallback trap, PF4 inconsistent folder hierarchies) are all either already-resolved (PF3 sprung in 6.3) or out-of-scope (PF1 general optimization). PF4 — three inconsistent folder hierarchies — is implicitly resolved by this phase: deleting all three Folder constants leaves only the real Folder entity as the single source of truth.

**4 surfaces breakdown:**
- Row 7 — Folder tile grid (top of documents page, 6 visible tiles) — derives from filtering Folders to the property, sorted by name. Direct-read of `folder.name` per tile.
- Row 19 — Add Folder modal "Choose location" tree — derives from `folders` array using `parentFolderId` self-FK to nest. Renders as expandable tree.
- Row 20 — Move To modal "Choose destination" tree — **same derivation as row 19**, just opened from a different button (Move-To context vs Add-Folder context).
- Row 23 — File detail sidebar folders (left rail of file detail view, 4 visible) — derives from filtering Folders by some "main folder" rule (current mock uses category "All Documents", "Title", "Sales", "Tax Receipt"). Direct-read of `folder.name`.

**Cross-page consistency:** Phase 6.3 already wired rows 8-13 to read `Document.folderId` and resolve folder names via `folders.find(f => f.id === document.folderId)?.name ?? "—"`. Phase 6.7 adds the folder UI surfaces (the picker/grid/sidebar). Together, the documents page becomes ~95% wired (only Folder + Document UI remains; Q5 follow-ups about Document.category enum and storage backend stay open).

The intended outcome: 4 hardcoded surfaces become real-data reads; 3 module-level Folder constants deleted; PF4 (inconsistent folder hierarchies) implicitly closed; Folder flips from "not built" → "shipped, fully wired" in `pages/INDEX.md` and `SUMMARY.md`; documents page reaches ~95% wired; 3 new per-datapoint audit reports land (per WIRING-PLAYBOOK Step C — see Step C below).

## Prerequisites

- **Phase 6.0, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6 complete.** All upstream entities shipped.
- **Phase 6.3 (Document) MUST be complete.** Folder is gated on Document — the documents page wiring foundation (queries.ts already fetching folders, `<PropertyDocumentsPage>` accepting folders prop) was set up by 6.3.
- **WIRING-PLAYBOOK.md Step C wins read.** Bundling doesn't apply (cluster too small) — the wins still drive the audit-count optimization (3 reports for 4 surfaces).
- **Verified during exploration:**
  - `lib/data/types/folder.ts` exists with full Zod schema (Batch 3 sweep).
  - `lib/data/db/folders.ts` exists with full CRUD + Zod parse on reads.
  - `documents/queries.ts` exists and already fetches folders filtered by propertyId (set up during 6.3).
  - `<PropertyDocumentsPage>` already accepts `folders: Folder[]` prop (from 6.3).
  - Three Folder constants are still in `PropertyDocumentsPage.tsx` (`mainFolders`, `FALLBACK_SUBFOLDERS`, `locationTree`) untouched per 6.3's boundary.
  - PROP-0001 has Folder seeds (FLDR-0001 etc. — count to verify in pre-flight).
  - No Q-numbers block this phase; PF traps either resolved (PF3 in 6.3) or out-of-scope (PF1).

## Step 0 — Pre-flight (~5 min)

Per WIRING-PLAYBOOK.md pre-flight section:

1. **Read entity backlog row.** `pages/property-id-documents/plan.md` §3 Folder entry — confirms 4 surfaces (rows 7, 19, 20, 23) and the PF4 hierarchy-design note.
2. **Verify Folder seed count for PROP-0001.** `ls public/data/users/demo-user/folders/` — note total count and how many for PROP-0001. The current mock shows 6 tile-grid items (Contract, Receipts, Tax, Rental, Images, Videos) and 10 location-tree nodes. If seeds are sparse (e.g. only 2-3 folders), plan a small seed expansion in Step A.1 — same approach as 6.3 expanded Document seeds.
3. **No new Q-numbers.** PF4 (inconsistent hierarchies) is implicitly resolved by deleting the three constants; no design ambiguity to file.
4. **No PII concerns.** Folder names are not sensitive.
5. **Confirm `<PropertyDocumentsPage>` signature** — quick read of the prop type to verify `folders: Folder[]` is accepted (set up in 6.3). If not, add it.

## Scope of this change

**Files to MODIFY (1 source file + maybe seed expansion):**

1. **`app/(shell)/property/[id]/_components/PropertyDocumentsPage.tsx`** —
   - **Delete `mainFolders` constant (lines 65-71).** Force compile errors at consumer sites; use as wiring checklist.
   - **Delete `FALLBACK_SUBFOLDERS` constant (line 72).** Same treatment.
   - **Delete `locationTree` constant (lines 108-137).** Same treatment.
   - Wire row 7 (folder tile grid) from real `folders` prop.
   - Wire row 19 + row 20 (location trees in Add Folder + Move To modals) from a derived hierarchical tree built once at the top of the component (or in queries.ts as a server-side derivation — see A.2 decision).
   - Wire row 23 (file detail sidebar folders) from real `folders` prop, filtered to the "main folder" rule (default: top-level folders only — those with `parentFolderId === undefined`).
2. **`public/data/users/demo-user/folders/FLDR-NNNN/core.json`** (CREATE 4-6 new seeds if PROP-0001 has fewer than ~6) —
   - Mix of root folders and child folders (use `parentFolderId` to nest)
   - Match the visual richness of the current mock (so the documents page shows a similar number of tiles/nodes after wiring)
   - 1-2 seeds for other properties to exercise the propertyId filter

**Files NOT modified:**

- `lib/data/types/folder.ts` — entity is settled.
- `lib/data/db/folders.ts` — settled.
- `documents/queries.ts` — already returns folders correctly (set up in 6.3).
- `lib/data/db/index.ts` — folders already exported.
- No other component files.
- Document-related code (rendered by 6.3) — untouched.

**Files to UPDATE in the audit corpus:**

- `.claude/data-audit/INDEX.md` — append 3 new per-datapoint audit rows.
- `.claude/data-audit/pages/INDEX.md` — Folder row: `not built` → `shipped, fully wired`.
- `.claude/data-audit/pages/SUMMARY.md` — Rank 7 row: same status change.
- `pages/property-id-documents/plan.md` §5 Fix Log — append entry: rows 7, 19, 20, 23 wired; PF4 implicitly closed (3 hierarchies → 1 source of truth); no Q-numbers filed.
- `.claude/data-audit/docs/PHASES.md` — flip 6.7 status (when phase ships); add `Plan-Phase-6.7-Folder-wiring.md` to archived plan files NOW (drafted); bump "Last updated."

## Step A — Wiring (~40 min) with per-surface rule annotations

Broken into 3 sub-steps. Run the ★ self-review pass at the end.

### A.1 — Seed expansion (~10 min, if needed)

1. **Check current Folder seed count** (`ls public/data/users/demo-user/folders/`).
2. **If PROP-0001 has < 6 folders:** create new seeds matching the current mock visual:
   - Root folders (parentFolderId omitted): "Contract", "Receipts", "Tax", "Rental" (matches `FALLBACK_SUBFOLDERS` first 4)
   - Child folders (parentFolderId set): "Lease Templates" under "Rental", "Tax Returns 2025" under "Tax", etc. — exercises the hierarchy
   - Optional: 1-2 folders for PROP-0002 to confirm propertyId filter works
3. **Smoke test:** mentally parse one new seed via `FolderSchema.parse()` to confirm shape (especially `parentFolderId` optional behavior).

### A.2 — Component wiring (~25 min)

**Step A.2.0 — Delete the 3 constants (FIRST, before wiring):**
- Delete `mainFolders` (lines 65-71)
- Delete `FALLBACK_SUBFOLDERS` (line 72)
- Delete `locationTree` (lines 108-137)
- Compiler errors at every consumer site form the wiring checklist.

**Top-of-component derivations (computed once from `folders` prop):**
```
const rootFolders = folders.filter(f => !f.parentFolderId).sort(byName);
const folderTree = buildFolderTree(folders);  // {root: [...], children: Map<parentId, Folder[]>}
```

A small `buildFolderTree(folders)` helper (in the same file, ~10 lines) groups folders by `parentFolderId` for hierarchical render. If preferred, this helper can live in `documents/queries.ts` and the queries function can return the pre-built tree shape — server-side derivation is cleaner. **Default: in-component for v1**, since the tree is small and the component already has the folder list.

**Row 7 — Folder tile grid (was `FALLBACK_SUBFOLDERS`):**
- **Wire:** `rootFolders.map(f => <FolderTile name={f.name} ... />)`. Direct read of `folder.name`.
- **Rule 2:** if `rootFolders.length === 0`, show empty state matching file convention (Phase 6.3 used `EmptyState` component for documents — for folders, either reuse it or render a "No folders yet" message).
- **Lite-template audit candidate.**

**Row 19 — Add Folder modal "Choose location" tree (was `locationTree`):**
- **Wire:** render `folderTree` as a recursive tree component. Each node shows `folder.name`; clicking a node sets the new folder's `parentFolderId`.
- **Rule 3 trigger:** tree-build is a derivation. Walk: 4 root folders + 2 children (1 under Rental, 1 under Tax) → render as 4 top-level nodes, with Rental and Tax being expandable. No orphans (children whose parentFolderId points to a missing parent) — if any exist, render at root level with a console warning (don't crash).
- **Full-template audit** (derivation + same derivation as row 20).

**Row 20 — Move To modal "Choose destination" tree:**
- **Wire:** **identical derivation as row 19** — same `folderTree` data, rendered in a different modal context (Move To button instead of Add Folder button). Reuse the same component or render the same tree from the same prop.
- **Bundleable with row 19** in a single audit report (covered by the same full-template report since they share the derivation).

**Row 23 — File detail sidebar folders (was `mainFolders`):**
- **Wire:** `mainFolders` mock had 4 fixed entries ("All Documents", "Title", "Sales", "Tax Receipt"). With real folders, use `rootFolders` (top-level only) limited to ~4 items — OR add an "All Documents" virtual entry at the top followed by `rootFolders.slice(0, 3)`.
- **Decision: render "All Documents" + `rootFolders.slice(0, 3)`** — matches current mock visual (one virtual + 3 real).
- **Rule 2:** if fewer than 3 root folders, render what's available; don't pad with "—".
- **Lite-template audit candidate.**

### ★ Self-review pass (~10 min)

After A.1-A.2 done:

1. **Rule 1 sweep:** check adjacent claim-strings near wired surfaces. None known — folders are pure name renders, no derived claims (no badges, no counts adjacent).
2. **Rule 2 grep:** in `PropertyDocumentsPage.tsx`, grep for `"—"`, `"None"`, `"No folders"`. Confirm new empty states match file convention (EmptyState component established by 6.3 for documents).
3. **Rule 3 mental walks:**
   - Tree build: walk 4 roots + 2 children → 4 top-level nodes, 2 expandable. Walk 0 folders → empty state. Walk an orphan (child with bad parentFolderId) → renders at root with warning.
   - Sidebar: walk 5 root folders → "All Documents" + first 3. Walk 1 root folder → "All Documents" + 1.
4. **Constant deletion verification:** grep `PropertyDocumentsPage.tsx` for `mainFolders`, `FALLBACK_SUBFOLDERS`, `locationTree`. All three should return zero matches as identifiers. No `?? mainFolders` fallback added.
5. **Document boundary verification:** Phase 6.3's Document wiring (file rows, file count, etc.) STILL EXISTS untouched. Spot-check the file list still renders.

**STOP. Hand back to user for Step B visual verification.**

## Step B — Visual dev-server check (~10 min, you do this)

1. Start dev server.
2. Open `/property/PROP-0001/documents` — confirm:
   - Folder tile grid (top of page) shows real folder names from seeds (Contract, Receipts, Tax, Rental, etc.)
   - Tile count matches `rootFolders.length` (no longer always 6)
   - File list (Phase 6.3) STILL renders documents correctly with folder labels resolved
3. Click "Add Folder" button — modal opens with location tree showing real hierarchical folders (root + children). Click a node — selection works.
4. Click "Move To" on any file — same tree shows in Move To modal.
5. Open file detail (click any file) — left sidebar shows "All Documents" + first 3 root folders.
6. **No `mainFolders`, `FALLBACK_SUBFOLDERS`, `locationTree` in source** (open file, scroll to original line ranges, confirm gone).
7. **Empty-state test (optional):** temporarily move all FLDR-* seeds for PROP-0001 → reload → tile grid shows empty state, sidebar still shows "All Documents", trees in modals render empty. Restore seeds.
8. **Other properties:** open `/property/PROP-0002/documents` — confirm folders for PROP-0002 render (not PROP-0001's).
9. Hand back with notes if anything is wrong; otherwise say "go" for Step C.

## Step C — Audit batch + index updates (~45 min, per WIRING-PLAYBOOK Step C wins)

1. Run `/audit-datapoint` on the **first** newly-wired surface (recommend the combined location-trees audit — covers rows 19 + 20 — since it exercises the hierarchy derivation and validates the "two surfaces, one derivation" pattern).
2. **Spot-check dedup machinery + format:**
   - ☐ Cites `Page-wide: see PFn in pages/property-id-documents/audit.md` instead of restating
   - ☐ Renders **full** template (tree-build is a derivation)
   - ☐ Notes that the same derivation drives both row 19 and row 20 (both surfaces covered by this one report)
   - ☐ Findings use one-liner stubs for systemic findings (Win 2)
   - ☐ TL;DR has the `📄 Page audit:` back-link
3. **If any check fails:** STOP. Investigate; fix coupling if needed.
4. **If passes:** continue with the remaining audits, **applying WIRING-PLAYBOOK Step C wins**:
   - **No bundling opportunity per Win 1.** Cluster of rows 7 + 23 (both lite direct-reads on Folder) is size 2 — below the 4-surface bundle threshold.
   - **Combined-derivation report.** Rows 19 + 20 share the same `folderTree` derivation, just rendered in two modal contexts → ONE full-template report covers both surfaces. Slug: `property-id-documents--folder-location-tree.md`.
   - **Standalone lite reports:** Folder tile grid (row 7), File detail sidebar (row 23) — **2 audits**, compressed lite per Win 3.
   - **Total reports:** 1 combined full + 2 compressed lite = **3 audit files** covering 4 surfaces.
   - **Win 2 — Systemic-finding stub.** F1 (userId leak via PF1) renders as a one-liner stub in all 3 reports.
   - **Win 3 — Compressed lite.** The two lite reports use the compressed format (no Contents, Glossary, Revision history block).
5. Update `INDEX.md` (per-datapoint table) with **3 new rows** (annotate the combined report as covering 2 underlying surfaces).
6. Update `pages/INDEX.md` Folder row.
7. Update `pages/SUMMARY.md` Rank 7 row.
8. Update `docs/PHASES.md`: flip 6.7 status emoji, add archived plan path entry to `(executed)`, bump "Last updated."
9. Append fix-log entry to `pages/property-id-documents/plan.md` §5 with: rows 7, 19, 20, 23 wired; 3 Folder constants deleted; PF4 implicitly closed.

## Verification

After Phase 6.7 lands:

1. **Type check passes.** Zero errors. `tsc --noEmit` clean.
2. **No ZodError in terminal** during dev server boot or page navigation.
3. **Visual check on PROP-0001/documents.** All 4 Folder surfaces show real data; trees render hierarchically; file list (6.3) still works.
4. **3 Folder constants deleted.** `grep -n "mainFolders\|FALLBACK_SUBFOLDERS\|locationTree" PropertyDocumentsPage.tsx` returns zero.
5. **Folder entity unchanged.** No edits to `lib/data/types/folder.ts` or `lib/data/db/folders.ts`. Seed count for PROP-0001 has grown to ~6 if A.1 expansion ran.
6. **Document boundary respected.** Phase 6.3's Document wiring untouched (file rows, file count subtitle, file folder labels still render).
7. **3 new per-datapoint audit reports** under `.claude/data-audit/` (1 combined-derivation full + 2 compressed lite, total 4 surfaces audited). Confirm by `ls .claude/data-audit/*.md | wc -l` (should be ~75, up from ~72 after Phase 6.6 — bundling/combination means fewer files, not fewer surfaces).
8. **Status fields synced.** Folder reads `shipped, fully wired` in BOTH `pages/INDEX.md` and `pages/SUMMARY.md`. PHASES.md row 6.7 reads ✅ and the `Blocked on 6.3 (Document)` caveat is removed.
9. **PF4 implicitly closed** — three inconsistent folder hierarchies are now one source of truth (the Folder entity). Note in plan.md fix log.
10. **Fix log appended** to `pages/property-id-documents/plan.md` §5.
11. **Playbook rules visibly applied.** No P1-grade findings; tree-build derivation walked for 3 cases; empty-state convention matched.
12. **No surprise file changes.** `git status` shows: 1 source file modified (component), 4-6 seed JSONs created if A.1 ran, 3 audit reports created, ~5 corpus files updated.

## What unblocks after Phase 6.7

- **Phase 6.8 — Notification + MaintenanceItem wiring.** Rank 8 in build order; 4 surfaces (overview + rental). Independent of 6.7.
- **Documents page reaches ~95% wired** — Folder + Document UI both real. Remaining gaps: storage layer (thumbnails, Q5 follow-up from 6.3), Document.category enum (Q5 follow-up from 6.3), and upload flow (out of audit scope).
- **PF4 closed** — folder hierarchy now single-sourced.
- **Pattern reinforced for "combined-derivation" audit reports** — when two surfaces share one derivation, one report covers both. Same pattern can apply to other phases with shared logic (e.g. KPI strips that read the same field in different layouts).

## Time estimate

~2 hours total (smallest 6.x phase yet — wire-only, 4 surfaces, no schema build):

- Step 0 (pre-flight + seed verify): ~5 min
- Step A.1 (seed expansion if needed): ~10 min
- Step A.2 (delete 3 constants + wire 4 surfaces + tree-build helper): ~25 min
- ★ self-review: ~10 min
- Step B (visual check + modal opens + empty-state test): ~10 min
- Step C (3-report batch + dedup spot-check + 5 corpus updates): ~45 min
  - 1 combined full (~10 min) + 2 compressed lite (~6 min total) = ~20 min audits
  - Index + SUMMARY + PHASES + plan.md updates: ~15 min
- Buffer (tree-build edge cases, orphan handling, modal interaction): ~20 min

**Realistic: 2 hours. Conservative: 2.5 hours.**

## Out of scope (deliberate)

- **Storage backend for image thumbnails** — Document.thumbStorageId is a Q5 follow-up from 6.3; backend phase.
- **Document.category enum closure** — Q5 follow-up from 6.3; deferred to dedicated schema PR.
- **Upload flow / file upload mechanics** — Document row 22 demoFiles is a UI-demo construct (per 6.3); real upload is its own future phase.
- **Folder CRUD interactivity** — wiring renders folders as data; clicking "Add Folder" opens the modal but doesn't actually create a folder (needs server actions; future phase).
- **Drag-and-drop file-to-folder moves** — Move To modal renders the tree; selecting a destination doesn't actually move files yet (needs server actions).
- **Folder rename / delete** — same; needs server actions.
- **Building or modifying any OTHER entity** — not this phase.
- **Modifying any Zod schema** — Folder is settled; nothing else changes.
- **Property-field promotion on documents page** — there's no significant Property-field surface here (only Document.folderId resolved against Folder.name, already done in 6.3).
- `.context/todo-ui.md` or `deferred-database-migration.md` updates — Phase 7 concern.
- Re-running `/audit-page-datapoints` against documents page — source code changes confined to wiring + 3 constant deletions.
- DDL or ERD generation refresh — separate workstreams; Folder will land in a future ERD refresh.
