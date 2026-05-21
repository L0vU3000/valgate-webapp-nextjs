---
slug: property-id-documents--folder-sidebar
data_point: "File detail sidebar — folder list row 23 ("All Documents" + top-3 root folders)"
route: /property/[id]/documents
revision: 1
date: 2026-05-06
verdict: "✅ Correct · 1 finding (P1 systemic)"
---

# Audit — File Detail Sidebar Folders on /property/[id]/documents
_Last revised: 2026-05-06 · Revision 1_

## TL;DR
- ✅ Correct — sidebar shows virtual "All Documents" entry + up to 3 real root folders (`rootFolders.slice(0, 3)`)
- ⚠️ 1 finding · 1 P1 (`userId` in `Folder[]` shipped to browser via PF1)
- 🔧 Top fix: narrow `Folder[]` in queries (F1, see PF1)
- 📄 Page audit: see [pages/property-id-documents/audit.md](pages/property-id-documents/audit.md)

---

## 1. Snapshot — ✅

> **Plain opener:** When a user opens a file (clicks a row in the file list), the layout switches to a detail view with a narrow sidebar on the left showing a folder list. Before Phase 6.7 this was `mainFolders` — a hardcoded 4-item array: "All Documents", "Title", "Sales", "Tax Receipt". After Phase 6.7, the sidebar renders "All Documents" (a virtual UI entry, always present) followed by up to 3 real root folders from seeds.

| | |
|---|---|
| Where | File detail view sidebar (left rail, visible when `selectedFile` is set) |
| Formula | "All Documents" (virtual) + `rootFolders.slice(0, 3)` |
| `rootFolders` | `dbFolders.filter(f => !f.parentFolderId).sort(localeCompare)` |
| Cap | Max 4 items total (1 virtual + 3 real). If fewer than 3 root folders, shows what's available — no padding |
| Edge case | `rootFolders.length === 0` → sidebar shows only "All Documents" (virtual entry always renders) |

---

## 2. Entity — ✅

| Field | Usage |
|---|---|
| `Folder.id` | React key (`key={f.id}`) |
| `Folder.name` | Sidebar item label — direct read |
| `Folder.parentFolderId` | Filter: `!f.parentFolderId` selects root folders only |

---

## 3. Render — ⚠️

| | |
|---|---|
| Component | `<PropertyDocumentsPage>` — `<aside>` sidebar `<nav>` in file detail layout branch |
| "All Documents" | Hardcoded UX entry — FolderOpen icon, sets `activeFolder = "All Documents"`, clears `activeSubfolder` |
| Real folders | `rootFolders.slice(0, 3)` — each renders FolderOpen icon + `f.name`, sets `activeFolder = f.name` |
| Active state | `activeFolder === f.name` drives highlight style |
| Tree line | Connecting vertical line shown only when `rootFolders.length > 0` |

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
| Root folders (sorted) | Contract · Compliance · Receipts · Rental · Tax · Title |
| `slice(0, 3)` | Contract · Compliance · Receipts |
| Sidebar shows | All Documents (virtual) · Contract · Compliance · Receipts |
| Match? | ✅ — 4 sidebar items, matching original mock item count |

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
