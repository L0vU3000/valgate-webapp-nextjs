---
slug: property-id-documents
route: /property/[id]/documents
revision: 1
date: 2026-05-05
verdict: "⚠️ 3 WIRED · 1 PARTIAL · 13 HARDCODED · 5 PFn — top entities to land: Document, Folder"
---

# Page Audit — /property/[id]/documents — audit.md
_Last revised: 2026-05-05 · Revision 1_

_See [plan.md](./plan.md) for the entity backlog, audit roadmap, and fix log derived from this audit._

## TL;DR
- ✅ 3 of 24 surfaces are WIRED to real data (all from PropertyLayout header) — the entire documents-specific UI is placeholder
- ⚠️ 13 HARDCODED — top entity to land: Document (unblocks 9 surfaces on this page + 1 from rental = 10 total); Folder unblocks 4
- 🔧 5 page-wide findings filed (PF1–PF5); per-datapoint audits should cite rather than restate

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Surface Inventory | What's on the page and what powers each thing? | 24 rows |
| 2 | Page-wide findings | What systemic problems span the whole page? | 5 PFn |

## Glossary
- **WIRED / HARDCODED / PARTIAL / CHROME / DECORATIVE** — see `.claude/skills/audit-page-datapoints/SKILL.md` § "Surface classification".
- **PFn** — Page-wide finding number (PF1, PF2, …). Filed once at the page level; per-datapoint audits cite instead of restating.
- **Lite template** — 4-section per-datapoint report for trivial direct-reads. Full template at 9 sections for derivations.
- **SSOT** — Single Source of Truth.
- **FALLBACK_FILES / FALLBACK_SUBFOLDERS / locationTree / mainFolders** — four separate hardcoded constants in `PropertyDocumentsPage.tsx` representing different views of a folder/file structure; all replaced by Document + Folder entities when wired.

---

## 1. Surface Inventory

> This page has 24 classifiable surfaces. Only 3 are wired to real data — all in the PropertyLayout wrapper. Everything specific to the documents tab (file names, sizes, dates, folder tiles, folder trees) is driven by hardcoded constants. The component has a wiring scaffold: it accepts `documents: DbDocument[]` and `folders: DbFolder[]` props and maps them to the display type — but falls back to hardcoded data whenever those arrays are empty, which they always are until the backend is built.

| # | Element | Class | Source / Constant | File:line |
|---|---|---|---|---|
| 1 | Header breadcrumb: property code + type (e.g. "PP00016 PH") | WIRED | `property.code` + `property.type` | `PropertyLayout.tsx:50` |
| 2 | Health score badge (e.g. "92% health score") | PARTIAL | `property.health` text WIRED · emerald badge CSS hardcoded regardless of value | `PropertyLayout.tsx:54–59` |
| 3 | Tab nav (7 tabs: Overview, Documents, Safety, Ownership, Rental, Valuation, Location) | CHROME | `tabs[]` constant | `PropertyLayout.tsx:8–16` |
| 4 | In-page breadcrumb: property code | WIRED | `property.code` | `PropertyDocumentsPage.tsx:512` |
| 5 | Page subtitle: file count ("13 files") | HARDCODED | `files.length` from `FALLBACK_FILES` (13 items) when `dbDocuments.length === 0` | `PropertyDocumentsPage.tsx:524` |
| 6 | Page subtitle: property code + type | WIRED | `property.code`, `property.type` | `PropertyDocumentsPage.tsx:524` |
| 7 | Folder tile grid (6 tiles: Contract, Receipts, Tax, Rental, Images, Videos) | HARDCODED | `FALLBACK_SUBFOLDERS` constant · shows when `dbFolders.length === 0` | `PropertyDocumentsPage.tsx:72, 541–566` |
| 8 | File name in list + grid view | HARDCODED | `FALLBACK_FILES[n].name` (13 entries: Title_Deed.pdf, Mortgage_Agreement_2022.pdf, …) | `PropertyDocumentsPage.tsx:75–100` |
| 9 | File type icon + icon color | HARDCODED | `FALLBACK_FILES[n].icon`, `.iconClass` constants (blue for doc, emerald for image, rose for spreadsheet) | `PropertyDocumentsPage.tsx:75–100` |
| 10 | File folder label (list view "Folder" column) | HARDCODED | `FALLBACK_FILES[n].folder` constants | `PropertyDocumentsPage.tsx:75–100` |
| 11 | File size (e.g. "1.2 MB", "890 KB") | HARDCODED | `FALLBACK_FILES[n].size` constants | `PropertyDocumentsPage.tsx:75–100` |
| 12 | File date / "Modified" (e.g. "Jan 12, 2022") | HARDCODED | `FALLBACK_FILES[n].date` constants | `PropertyDocumentsPage.tsx:75–100` |
| 13 | Image thumbnails (3 JPEG files via Unsplash URLs) | HARDCODED | hardcoded Unsplash URLs in `FALLBACK_FILES` entries | `PropertyDocumentsPage.tsx:86–99` |
| 14 | File count in section header ("All Files · 13 files") | HARDCODED | `filteredFiles.length` derived from hardcoded fallback | `PropertyDocumentsPage.tsx:575–577` |
| 15 | "Select" mode toggle button | CHROME | UI state control | `PropertyDocumentsPage.tsx:580–598` |
| 16 | View mode toggle (List / Grid) | CHROME | UI control | `PropertyDocumentsPage.tsx:603–627` |
| 17 | "Upload File" button | CHROME | UI action (opens upload modal) | `PropertyDocumentsPage.tsx:629–637` |
| 18 | "Add Folder" button | CHROME | UI action (opens Add Folder modal) | `PropertyDocumentsPage.tsx:534` |
| 19 | Location tree in Add Folder modal (hierarchical: Compliance/2024, Legal/Contracts, …) | HARDCODED | `locationTree` constant (10 nodes) | `PropertyDocumentsPage.tsx:108–137` |
| 20 | Location tree in Move To modal (same picker) | HARDCODED | `locationTree` constant | `PropertyDocumentsPage.tsx:108–137` |
| 21 | Bulk action bar (Move / Delete buttons + selected count) | CHROME | UI controls; selected count is client state (`selectedFiles.size`) | `PropertyDocumentsPage.tsx:669–701` |
| 22 | Upload demo file list in progress panel (Lease_Agreement_v3.pdf, Inspection_Photos.jpg, Safety_Cert.pdf) | HARDCODED | `demoFiles` constant used when no real files are pending | `PropertyDocumentsPage.tsx:400–404` |
| 23 | File detail sidebar: folder list (All Documents, Title, Sales, Tax Receipt) | HARDCODED | `mainFolders` constant (4 items) | `PropertyDocumentsPage.tsx:65–71` |
| 24 | Upload modal drop zone + progress panel tabs (All/Uploading/Failed/Done) | CHROME | UI interaction; tabs derived from `uploadQueue` client state | `PropertyDocumentsPage.tsx:1057–1168` |

**Tally:** WIRED 3 · PARTIAL 1 · HARDCODED 13 · CHROME 7 · DECORATIVE 0

---

## 2. Page-wide findings (5 PFn)

> Five systemic concerns found while walking the page. None are isolated to a single surface — each affects multiple rows. Per-datapoint audits for this page should cite these by number rather than restating the finding body.

**Severity:** 🔴 PF P0 ship-blocker · 🔴 PF P1 robustness · 🟡 PF P2 schema smell · 🔵 PF P3 nit
**Confidence:** high (verified) · medium (inferred) · low (subjective)
**Tags:** `[schema]` · `[logic]` · `[render]` · `[consistency]` · `[negative-space]`

---

### 🔴 PF1 — Full Document + Folder entities serialized to Client Component without field narrowing
**PF P1 robustness · confidence: medium · `[render]`**

**Where:** `queries.ts:5–16` returns `documents: DbDocument[]` and `folders: DbFolder[]`; `PropertyDocumentsPage.tsx:264–268` accepts them as props and renders in a `"use client"` component.

**Problem:** The component only needs a subset of each entity's fields. From `DbDocument`: `name`, `kind`, `storageId`, `sizeBytes`, `uploadedAt`, and optionally `folderId`. From `DbFolder`: just `name`. The full entity objects (including internal IDs, `thumbStorageId`, `category`, `uploadedBy`, `mimeType`, `extension`) are serialized over the RSC boundary and sent to the browser. Once Document/Folder entities have more fields (e.g. full audit metadata, signed URLs), this gap grows. The `queries.ts` file exists but has no narrowing step — it returns the full DB objects directly.

**Why it matters:** Violates the CLAUDE.md rule "Never send full DB objects as props — `select` only what the UI renders." Over-exposure risks leaking internal IDs and metadata that the browser doesn't need, and increases payload size for every navigation to this tab.

**Fix:** Add a narrowing step in `queries.ts` that maps `DbDocument` → a lean `DocumentListItem` type before returning. Same pattern as `PropertyListItem` in `lib/data/derivations/portfolio.ts`. Applies to Folder too — return `{ id, name }` only.

---

### 🔴 PF2 — Multi-tenant auth shim defers real isolation
**PF P1 robustness · confidence: high · `[render]`**

**Where:** `queries.ts:6`: `const userId = getCurrentUserId()` from `@/lib/data/auth-shim`.

**Problem:** Same auth shim pattern as every other property page — `getCurrentUserId()` returns the hardcoded demo user ID, not a Clerk-authenticated user. Until replaced with Clerk's `auth()`, any user who reaches this route can read documents that belong to the demo user. The property-level `getPropertyByIdParam(id)` in `page.tsx:13` does a `notFound()` guard, but it also uses the same shim — so the guard is only as strong as the shim's user ID.

**Why it matters:** IDOR risk for a page that stores potentially sensitive documents (deeds, mortgage agreements, tax returns). The fix is the same Convex migration that applies to all pages, but this page has higher sensitivity than overview or rental.

**Fix:** Replace `getCurrentUserId()` with `await auth()` from Clerk (or the Convex identity pattern per `convex/_generated/ai/guidelines.md`) in `queries.ts`. Validate `document.userId === identity.subject` AND `document.propertyId.userId === identity.subject` (double ownership as specified in `ref/00 §2`).

---

### 🔴 PF3 — Zero-documents-equals-demo: empty state is suppressed by fallback
**PF P1 robustness · confidence: high · `[logic]`**

**Where:** `PropertyDocumentsPage.tsx:305–320` — fallback logic for both `subFolders` and `files`.

**Problem:** When `dbDocuments.length === 0` (true for every property right now), the component renders 13 fake files from `FALLBACK_FILES` and 6 fake folders from `FALLBACK_SUBFOLDERS`. A real property with genuinely zero documents will also hit this path and display the demo data. The `EmptyState` component at line 641–646 is unreachable as long as the fallback is active — `filteredFiles.length` will always be 13 (or however many fallback entries pass the current subfolder filter) rather than 0.

**Why it matters:** A user who uploads documents to a property will see 13 extra phantom files mixed in until they have at least 1 real document. Conversely, they can't distinguish "I haven't uploaded anything yet" from "demo data." The `startUpload` demo at `PropertyDocumentsPage.tsx:400–404` further blurs this line — it creates a fake progress panel for three hardcoded file names when no real files are pending.

**Fix:** Remove the `FALLBACK_*` constants and the ternary fallback logic. Trust the `EmptyState` to tell users there are no documents yet. The demo data belongs in the seed JSON (`public/data/users/demo-user/`), not in the component.

---

### 🟡 PF4 — Three inconsistent hardcoded folder hierarchies on the same page
**PF P2 schema smell · confidence: high · `[consistency]`**

**Where:**
- `FALLBACK_SUBFOLDERS` (line 72): 6 flat names — Contract, Receipts, Tax, Rental, Images, Videos
- `locationTree` (lines 108–137): 10-node hierarchy — Compliance/2024, Compliance/2025, Legal/Contracts, Legal/Permits, Contract, Receipts, Tax, Rental, Images, Videos
- `mainFolders` (lines 65–71): 4 items — All Documents, Title, Sales, Tax Receipt

**Problem:** The tile grid, the Add Folder / Move To modals, and the file detail sidebar all show different sets of folders with no documented relationship between them. `locationTree` has "Compliance" and "Legal" with nested years/subtypes that don't appear in the tile grid. `mainFolders` has "Title" and "Sales" that don't appear in either other list. When real Folder entities land, all three should derive from `dbFolders` — but the current structure implies three different UX models (flat tiles, hierarchical picker, top-level-only sidebar) that the Folder entity's `parentFolderId` needs to support. The discrepancy should be resolved in design before wiring.

**Why it matters:** `Folder.parentFolderId` (catalog §3) enables nesting, but the tile grid design shows only flat folders — there's no UI affordance to drill into nested folders from the tile grid. If the real user creates nested folders (as `locationTree` implies), the tile grid will need to evolve. A design decision is needed before the wiring PR lands.

**Fix:** Before wiring: consolidate to one folder model and decide whether the tile grid is flat-only or supports nesting. File the UX question in Q8 (`/property/[id]/documents` already has an entry — expand it with "Folder rename UX, nesting in tile grid vs. modal, single vs. multi-level tile grid").

---

### 🔴 PF5 — No audit log for document mutations
**PF P1 robustness · confidence: high · `[negative-space]`**

**Where:** `app/(shell)/property/[id]/documents/actions.ts` (not read in full, but the upload action is `uploadMultipleDocuments`) and the future delete/move server actions implied by the bulk action bar.

**Problem:** Document uploads, deletes, and folder moves leave no audit trail. Q4.P (audit log) applies to all entities, but has special weight here: Valgate's estate-planning use case depends on chain-of-custody — who uploaded a deed, who deleted it, and when. Without an audit log, any document can be silently removed. The delete button in the bulk action bar (`PropertyDocumentsPage.tsx:695–701`) currently has no `onClick` handler (it's a stub), but when wired it must write an audit event.

**Why it matters:** Per Q4.P: "document deletes, ownership changes — log to a separate `auditLog` table. Required for an estate-planning use-case where chain-of-custody matters." Documents are the highest-sensitivity entity on this page.

**Fix:** When wiring document mutations to Convex, every `documents.upload`, `documents.delete`, and `documents.move` mutation should write a row to `auditLog` with `{ userId, action, entityKind: "document", entityId, propertyId, timestamp }`. Implement as a Convex mutation side-effect (not a cron — per Q4.F discussion).

---

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
walked:
  - app/(shell)/property/[id]/documents/page.tsx
  - app/(shell)/property/[id]/documents/queries.ts
  - app/(shell)/property/[id]/_components/PropertyDocumentsPage.tsx
  - components/property/PropertyLayout.tsx
sources:
  - path: app/(shell)/property/[id]/documents/page.tsx
    sha: 641a3dbbdddbe49cf73a8da3183d48757a0f9cf6
  - path: app/(shell)/property/[id]/documents/queries.ts
    sha: 979733a3df42a49f5247461766b735521739604d
  - path: app/(shell)/property/[id]/_components/PropertyDocumentsPage.tsx
    sha: bdc81e7757236840d336e99f2a84dc0d550bca9e
  - path: components/property/PropertyLayout.tsx
    sha: 543f6dc98c411c84cfe562855b487a2146fa48e0
```

**Note:** `DocumentDetailView` (`components/property/DocumentDetailView.tsx`) is imported at line 31 and rendered when `selectedFile` is set, but was not walked in this revision. Its surfaces are not inventoried here. Walk it on re-audit or when auditing the file detail view.

</details>

<details>
<summary>📋 Manual verification commands</summary>

```bash
# Confirm route files exist
ls "app/(shell)/property/[id]/documents/"

# Count FALLBACK_FILES entries
grep -c 'folder:' "app/(shell)/property/[id]/_components/PropertyDocumentsPage.tsx"

# Confirm fallback branching logic
grep -n 'FALLBACK_' "app/(shell)/property/[id]/_components/PropertyDocumentsPage.tsx"

# Check for existing per-datapoint audits for this route (expect 0)
ls .claude/data-audit/property-id-documents--*.md 2>/dev/null || echo "none"
```

</details>

<details>
<summary>🔧 Metric Definition SSOT YAML</summary>

```yaml
# No per-datapoint audits completed yet for this page.
# Paste SSOT blocks here as individual audits are run.
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-05
- Initial audit (fresh write). Verdict: ⚠️ 3 WIRED · 1 PARTIAL · 13 HARDCODED · 5 PFn.
- 24 surface rows inventoried. 5 PFn filed.
- No pre-existing per-datapoint audits found for this route (0 back-links needed).
- New open questions: none filed (Q1.B, Q2.C, Q4.L, Q6.E, Q8 `/property/[id]/documents` entry all pre-exist in ref/05).
- `DocumentDetailView` not walked — surfaces in file detail view not yet inventoried.

</details>
