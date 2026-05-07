---
slug: property-id-documents--folder-tile-grid
data_point: "Folder tile grid — row 7 (root folder names as clickable tiles)"
route: /property/[id]/documents
revision: 1
date: 2026-05-06
verdict: "✅ Correct · 1 finding (P1 systemic)"
---

# Audit — Folder Tile Grid on /property/[id]/documents
_Last revised: 2026-05-06 · Revision 1_

## TL;DR
- ✅ Correct — tiles show `rootFolders` (top-level `Folder[]` sorted alphabetically); empty state renders when no folders exist
- ⚠️ 1 finding · 1 P1 (`userId` in `Folder[]` shipped to browser via PF1)
- 🔧 Top fix: narrow `Folder[]` in queries (F1, see PF1)
- 📄 Page audit: see [pages/property-id-documents/audit.md](pages/property-id-documents/audit.md)

---

## 1. Snapshot — ✅

> **Plain opener:** Below the page heading is a row of folder tiles — one tile per top-level folder for this property. Before Phase 6.7 this was hardcoded as 6 fixed names ("Contract", "Receipts", etc.). Now each tile reads `folder.name` from real `Folder` seeds. Clicking a tile filters the file list below to documents in that folder.

| | |
|---|---|
| Where | `/property/PROP-0001/documents`, top section, tile grid |
| Formula | `rootFolders.map(f => f.name)` where `rootFolders = dbFolders.filter(f => !f.parentFolderId).sort(localeCompare)` |
| Reads from | `dbFolders: DbFolder[]` filtered to this property before prop handoff |
| Edge case | `rootFolders.length === 0` → `<EmptyState title="No folders yet" ...>` |

---

## 2. Entity — ✅

| Field | Usage |
|---|---|
| `Folder.id` | React key (`key={f.id}`) |
| `Folder.name` | Tile label — direct read |
| `Folder.parentFolderId` | Filter: `!f.parentFolderId` selects root folders only |
| `Folder.propertyId` | Upstream filter in queries — only this property's folders shown |

---

## 3. Render — ⚠️

| | |
|---|---|
| Component | `<PropertyDocumentsPage>` — `<button>` grid in folder section |
| Filter derivation | `rootFolders` is computed at top of component; reacts to `dbFolders` prop |
| Active state | `activeSubfolder === f.name` — clicking a tile sets `activeSubfolder` to `f.name`, filtering the file list |
| Count | Tile count = `rootFolders.length` (no longer fixed at 6) |
| Empty state | `<EmptyState icon=<FolderOpen> title="No folders yet" description="Create a folder…">` |

**PII / IDOR** — `Folder[]` carries `userId` to browser. See **PF1** in [pages/property-id-documents/audit.md](pages/property-id-documents/audit.md).

---

## 4. Findings — 1 item

---

### 🔴 F1 — `userId` in `Folder[]` shipped to browser
**P1 robustness · confidence: high · `[render]`**

Systemic — see **PF1** in [pages/property-id-documents/audit.md](pages/property-id-documents/audit.md).

---

**Golden-value check (PROP-0001, 2026-05-06)**

| Source | Value |
|---|---|
| Root-folder seeds for PROP-0001 | FLDR-0001 Title · FLDR-0002 Compliance · FLDR-0004 Rental · FLDR-0005 Tax · FLDR-0006 Contract · FLDR-0007 Receipts → 6 tiles |
| Rendered tile names (sorted) | Contract · Compliance · Receipts · Rental · Tax · Title |
| Match? | ✅ |

---

<details>
<summary>🔍 Source files & hashes</summary>

```yaml
sources:
  - path: lib/data/types/folder.ts
    sha: a37982988e628b638c009a31abdc7d7d70cb1b4b
  - path: lib/data/db/folders.ts
    sha: ec9c51918cca4ce884de51d4bfe065141edb72c8
  - path: app/(shell)/property/[id]/documents/queries.ts
    sha: 979733a3df42a49f5247461766b735521739604d
  - path: app/(shell)/property/[id]/_components/PropertyDocumentsPage.tsx
    sha: a6be55aa23230a7ffcddf064e43360c61582a7da
```

</details>
