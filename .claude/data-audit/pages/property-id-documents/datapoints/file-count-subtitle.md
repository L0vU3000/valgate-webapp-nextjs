---
slug: property-id-documents--file-count-subtitle
data_point: "Page subtitle — file count (\"7 files · PP00001 House\")"
route: /property/[id]/documents
revision: 1
date: 2026-05-06
verdict: "✅ Correct · 2 findings (1 P1, 1 P3)"
---

# Audit — File Count Subtitle on /property/[id]/documents
_Last revised: 2026-05-06 · Revision 1_

## TL;DR
- ✅ Correct — shows `files.length` (count of all real documents for the property); PF3 trap sprung so count is no longer capped at 13
- ⚠️ 2 findings · 1 P1 (Document[] userId to browser) · 1 P3 (subtitle count vs section count subtle difference)
- 🔧 Top fix: narrow Document[] in `documents/queries.ts` (F1, see PF1)
- 📄 Page audit: see [pages/property-id-documents/audit.md](pages/property-id-documents/audit.md)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What triggers the file count? | — |
| 2 | Entity | Is the data well-organised? | ✅ |
| 3 | Formula | Does the count match real data? | ✅ |
| 4 | Render | How does the count reach the user? | ⚠️ |
| 5 | Consistency | Does the subtitle count agree with the section header? | ✅ |
| 6 | Missing safeties | What should exist but doesn't? | 1 gap |
| 7 | Meaning | Does "N files" promise what the count delivers? | ⚠️ |
| 8 | Findings | What to fix | 2 items |
| 9 | Fix Log | What has been fixed since the initial audit? | — |

---

## 1. Snapshot — ✅

> **Plain opener:** Below the "Documents" heading is a subtitle showing how many files belong to this property: "7 files · PP00001 House" for PROP-0001. Before Phase 6.3, this count was always 13 because it derived from the `FALLBACK_FILES` constant — it never reflected reality. Now it reads `files.length`, which comes from the `dbDocuments` prop passed from the server.

| | |
|---|---|
| Where | `/property/PROP-0001/documents`, below the "Documents" heading |
| Label | `{files.length} files · {property.code} {property.type}` |
| Main formula | `files.length` where `files = dbDocuments.map(...)` |
| Reads from | `dbDocuments: DbDocument[]` — documents for this property, passed as prop |
| Edge cases | 0 documents → shows "0 files · ..." + EmptyState renders in the list panel |

## 2. Entity — ✅

| Field | Notes |
|---|---|
| `Document[]` (length) | Count of all documents for this property — no filter |

## 3. Formula — ✅

**Derivation (verbatim):**
```ts
// PropertyDocumentsPage.tsx:292–304
const folderMap = new Map(dbFolders.map((f) => [f.id, f.name]));
const files: FileEntry[] = dbDocuments.map((doc) => { ... });

// JSX (line ~507):
<p className="text-slate-500 text-base mt-2">
  {files.length} files · {property.code} {property.type}
</p>
```

`files` is a 1:1 map of `dbDocuments` — no filter, no deduplication. So `files.length === dbDocuments.length`.

**Golden-value check (PROP-0001, 2026-05-06)**

| Source | Value |
|---|---|
| Seeds for PROP-0001 | DOC-0001, 0002, 0004, 0005, 0006, 0007, 0008 → 7 documents |
| `dbDocuments.length` | 7 |
| `files.length` | 7 |
| Subtitle | "7 files · PROP-0001 House" |
| Match? | ✅ |

## 4. Render — ⚠️

| | |
|---|---|
| Component | `<PropertyDocumentsPage>` — `<p>` in the page header `<div>` |
| Prop chain | `documents/queries.ts` → `db.documents.list(userId)` → filter by propertyId → `dbDocuments[]` → `files[]` → `.length` → subtitle |
| Hidden state | Always rendered — even with 0 files ("0 files ·") |

**PII / IDOR**
- `Document[]` + `Folder[]` carry `userId` to browser. See **PF1** in [pages/property-id-documents/audit.md](pages/property-id-documents/audit.md).
- Auth shim: see **PF2** in [pages/property-id-documents/audit.md](pages/property-id-documents/audit.md).

## 5. Consistency — ✅

| Identity | Verification | Holds? |
|---|---|---|
| Subtitle count (`files.length`) ≥ section count (`filteredFiles.length`) | `filteredFiles = activeSubfolder ? files.filter(...) : files` — always ≤ `files.length` | ✅ |
| When no subfolder active: subtitle = section | Both use `files` / `filteredFiles = files` | ✅ |
| No double-counting | `files` is a `map()`, not `flatMap()` or concat | ✅ |

## 6. Missing safeties — 1 gap

| Gap | Status | Link |
|---|---|---|
| `userId` in `Document[]` shipped to browser | ❌ | F1 |

## 7. Meaning — ⚠️

```
Subtitle renders:          "7 files"
Formula:                   files.length (all documents for property, no filter)
User's inference:          total documents stored for this property
Match when no filter:      ✅
Match when subfolder active: ⚠️ subtitle still shows total (7), section shows filtered (e.g. 2) — see F2
```

The two counts diverge intentionally when a subfolder is active (subtitle = all files, section = files in subfolder). This is standard file-manager UX ("X total · Y in this folder") but is not labelled — see F2.

## 8. Findings — 2 items

---

### 🔴 F1 — `userId` in `Document[]` + `Folder[]` shipped to browser
**P1 robustness · confidence: high · `[render]`**

Systemic — see **PF1** in [pages/property-id-documents/audit.md](pages/property-id-documents/audit.md).

---

### 🔵 F2 — Subtitle count and section header count diverge silently when a subfolder filter is active
**P3 nit · confidence: medium · `[semantic]`**

When a subfolder tile is clicked, `filteredFiles` narrows to that subfolder's documents. The section header correctly shows `filteredFiles.length` (e.g., "2 files"). The page subtitle still shows `files.length` (e.g., "7 files"). There is no "X of Y" framing or label change to indicate the filter is active. A user who clicked "Tax" and sees "Tax · 1 file" in the section but "7 files" in the subtitle will not immediately understand the relationship. Low severity today (the folder tile highlight provides context), but worth a label tweak ("7 files total") in a future polish pass.

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
- Golden-value check ✅: 7 documents for PROP-0001; subtitle shows "7 files".
- 2 findings: F1 (userId leak), F2 (subtitle/section divergence during filter — P3 nit).

</details>
