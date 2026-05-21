---
slug: property-id-documents--section-file-count
data_point: "Files section header — filtered file count (\"All Files · 7 files\" / \"Tax · 1 file\")"
route: /property/[id]/documents
revision: 1
date: 2026-05-06
verdict: "✅ Correct · 1 finding (1 P1)"
---

# Audit — Section File Count on /property/[id]/documents
_Last revised: 2026-05-06 · Revision 1_

## TL;DR
- ✅ Correct — shows `filteredFiles.length`; correctly narrows to subfolder when one is selected; pluralises correctly
- ⚠️ 1 finding · 1 P1 (Document[] userId to browser)
- 🔧 Top fix: narrow Document[] in `documents/queries.ts` (F1, see PF1)
- 📄 Page audit: see [pages/property-id-documents/audit.md](pages/property-id-documents/audit.md)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What triggers the section count? | — |
| 2 | Entity | Is the data well-organised? | ✅ |
| 3 | Formula | Does the count match real data with and without a filter? | ✅ |
| 4 | Render | How does the count reach the user? | ⚠️ |
| 5 | Consistency | Does the section count agree with the document list? | ✅ |
| 6 | Missing safeties | What should exist but doesn't? | 1 gap |
| 7 | Meaning | Does the count promise what the filter delivers? | ✅ |
| 8 | Findings | What to fix | 1 item |
| 9 | Fix Log | What has been fixed since the initial audit? | — |

---

## 1. Snapshot — ✅

> **Plain opener:** Above the file list, a section header label shows "All Files · 7 files" when no subfolder is selected, or "Tax · 1 file" when the Tax folder tile is clicked. This count drives the empty-state trigger: when `filteredFiles.length === 0`, the `EmptyState` component is rendered instead of the list. Before Phase 6.3, the count was always 13 (derived from the `FALLBACK_FILES` fallback), making the EmptyState unreachable. Now it reflects real data.

| | |
|---|---|
| Where | `/property/PROP-0001/documents`, section header above file list/grid |
| Label | `{activeSubfolder ? activeSubfolder : "All Files"} · {filteredFiles.length} file(s)` |
| Main formula | `filteredFiles = activeSubfolder ? files.filter(f => f.folder === activeSubfolder) : files` |
| Reads from | `files` array (derived from `dbDocuments`) filtered by `activeSubfolder` client state |
| Edge cases | 0 results → `filteredFiles.length === 0` → `EmptyState` renders |

## 2. Entity — ✅

| Field | Notes |
|---|---|
| `Document[]` (count) | Filtered by `activeSubfolder` when set — cross-referenced via `folderMap` FK lookup |

## 3. Formula — ✅

**Derivation (verbatim):**
```ts
// PropertyDocumentsPage.tsx:407-409
const filteredFiles = activeSubfolder
  ? files.filter((f) => f.folder === activeSubfolder)
  : files;

// JSX (line ~560):
{filteredFiles.length} {filteredFiles.length === 1 ? "file" : "files"}
```

**Multi-record mental walk:**

| Scenario | `activeSubfolder` | `filteredFiles.length` | Section label |
|---|---|---|---|
| No filter | `null` | 7 (all PROP-0001 docs) | "All Files · 7 files" |
| Tax selected | `"Tax"` | 1 (DOC-0007 only) | "Tax · 1 file" |
| Insurance selected | `"Insurance"` | 0 (Insurance is Compliance folder, not "Insurance" subfolder name) | "Insurance · 0 files" → EmptyState |

**Note on subfolder matching:** `f.folder` is the resolved `Folder.name` string (e.g. "Tax", "Compliance", "Rental"). The subfolder tiles also show `Folder.name` values from `subFolders = dbFolders.map(f => f.name)`. So clicking a tile sets `activeSubfolder = folder.name` and `f.folder === activeSubfolder` is an exact string equality on the same resolved name. The filter is correct as long as `Folder.name` values are unique per property — currently true in seed data.

**Golden-value check (PROP-0001, no filter active):**

| Source | Value |
|---|---|
| `files.length` | 7 |
| `filteredFiles.length` (no filter) | 7 |
| Section label | "All Files · 7 files" |
| Match? | ✅ |

## 4. Render — ⚠️

| | |
|---|---|
| Component | `<PropertyDocumentsPage>` — section header `<p>` |
| Prop chain | `dbDocuments[]` → `files[]` → filtered by `activeSubfolder` → `filteredFiles.length` |
| Hidden state | `filteredFiles.length === 0` → `<EmptyState>` renders in list panel; section header label still shows "0 files" |

**PII / IDOR**
- `Document[]` + `Folder[]` carry `userId` to browser. See **PF1** in [pages/property-id-documents/audit.md](pages/property-id-documents/audit.md).

## 5. Consistency — ✅

| Identity | Verification | Holds? |
|---|---|---|
| Section count = visible rows in list (no filter) | `filteredFiles.length === files.length` when no subfolder active | ✅ |
| Section count = visible rows in list (filter active) | `filteredFiles` is the same array passed to `<ListView>` and `<GridView>` | ✅ |
| EmptyState triggers at correct threshold | `filteredFiles.length === 0` in JSX conditional | ✅ |
| Pluralisation | `filteredFiles.length === 1 ? "file" : "files"` — correct | ✅ |

## 6. Missing safeties — 1 gap

| Gap | Status | Link |
|---|---|---|
| `userId` in `Document[]` shipped to browser | ❌ | F1 |

## 7. Meaning — ✅

```
Section renders:           "All Files · 7 files" / "Tax · 1 file"
Formula:                   filteredFiles.length — count after subfolder filter
User's inference:          number of files visible in the current view
Match?                     ✅
```

## 8. Findings — 1 item

---

### 🔴 F1 — `userId` in `Document[]` + `Folder[]` shipped to browser
**P1 robustness · confidence: high · `[render]`**

Systemic — see **PF1** in [pages/property-id-documents/audit.md](pages/property-id-documents/audit.md).

---

## 9. Fix Log

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| — | — | — | _No fixes yet._ | — |

---

<details>
<summary>🔍 Source files & hashes</summary>

```yaml
sources:
  - path: lib/data/types/document.ts
    sha: f5839bbe034bf437a08fd3ddf06292a3aed13373
  - path: lib/data/db/documents.ts
    sha: 2d6ecf3ddea37acfe3e59ddcc16ec7e75c8af2ee
  - path: app/(shell)/property/[id]/documents/queries.ts
    sha: 979733a3df42a49f5247461766b735521739604d
  - path: app/(shell)/property/[id]/documents/page.tsx
    sha: 641a3dbbdddbe49cf73a8da3183d48757a0f9cf6
  - path: app/(shell)/property/[id]/_components/PropertyDocumentsPage.tsx
    sha: 4f00c5acabd59f23a2d4190212944cc978cc842d
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-06
- Initial audit. Surface wired in Phase 6.3 (PF3 trap sprung — FALLBACK_FILES deleted).
- Golden-value check ✅: 7 documents for PROP-0001; no-filter shows 7; Tax subfolder shows 1.
- Multi-record walk confirms filter + EmptyState path are correct.
- 1 finding: F1 (userId leak).

</details>
