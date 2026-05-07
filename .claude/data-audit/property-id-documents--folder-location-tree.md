---
slug: property-id-documents--folder-location-tree
data_point: "Add Folder + Move To modals — location tree (rows 19 + 20, shared derivation)"
route: /property/[id]/documents
revision: 1
date: 2026-05-06
verdict: "✅ Correct · 3 findings (1 P1, 1 P2, 1 P3) · rows 19 + 20 share one folderTree derivation"
---

# Audit — Folder Location Tree on /property/[id]/documents
_Last revised: 2026-05-06 · Revision 1_

> **Covers two surfaces (rows 19 + 20) in one report.** Both the "Add Folder" modal and the "Move To" modal render a hierarchical folder picker from the same `folderTree` derivation — same data, same `FolderTreeItem` component, different modal context. One audit covers both.

## TL;DR
- ✅ Correct — both modals render the same `folderTree` (built from `dbFolders` via `buildFolderTree()`; hierarchy via `parentFolderId` self-FK)
- ⚠️ 3 findings · 1 P1 (`userId` in `Folder[]` shipped to browser via PF1) · 1 P2 (orphan handling — no guard if child's `parentFolderId` misses a parent row) · 1 P3 (virtual root "Documents" node is always selected on open, even if user previously selected a child)
- 🔧 Top fix: narrow `Folder[]` in queries (F1, see PF1)
- 📄 Page audit: see [pages/property-id-documents/audit.md](pages/property-id-documents/audit.md)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What drives the location tree in both modals? | — |
| 2 | Entity | Is the source entity clean? | ✅ |
| 3 | Derivation | How is the flat Folder[] converted to a tree? | ✅ with P2 gap |
| 4 | Render | How does the tree reach the user? | ⚠️ |
| 5 | Consistency | Do both modals show the same tree? | ✅ |
| 6 | Missing safeties | What should exist but doesn't? | 1 gap |
| 7 | Meaning | Does the tree reflect real folder structure? | ✅ |
| 8 | Findings | What to fix | 3 items |
| 9 | Fix Log | What has been fixed since the initial audit? | — |

---

## 1. Snapshot — ✅

> **Plain opener:** When a user clicks "Add Folder" or selects files and clicks "Move to…", a modal opens with a folder picker showing a hierarchical list. Before Phase 6.7, this tree was a hardcoded constant (`locationTree`) with fake folder names. After Phase 6.7, it is derived from the real `Folder[]` passed from the server — the tree is built by `buildFolderTree()`, a helper that groups folders by `parentFolderId` and recursively nests children under their parents.

| | |
|---|---|
| Where — Row 19 | "Add Folder" modal → "Location" dropdown → `FolderTreeItem` recursive tree |
| Where — Row 20 | "Move To" modal → "Destination Folder" dropdown → same `FolderTreeItem` recursive tree |
| Both modals use | `folderTree` — computed once at top of `PropertyDocumentsPage` via `buildFolderTree(dbFolders)` |
| Default selection | Virtual root node `{id: "root", label: "Documents"}` — wraps all real folders as children |
| Reset on open | Add Folder button resets to `folderTree[0]`; Move To button also resets to `folderTree[0]` |

---

## 2. Entity — ✅

| Field | Usage | Notes |
|---|---|---|
| `Folder.id` | Node id in `TreeNode` | Used for selection state (`selected === node.id`) and expand/collapse (`Set<string>`) |
| `Folder.name` | Node label in `TreeNode` | Direct read — `label: f.name` |
| `Folder.parentFolderId` | Hierarchy key | `undefined` → root; present → child of that parent. Self-FK pattern. |
| `Folder.propertyId` | Upstream filter | `documents/queries.ts` filters by `propertyId` before passing `folders` prop — only this property's folders appear |

No derivation involves `Folder.userId`, `Folder.createdAt`, or other non-display fields.

---

## 3. Derivation — ✅ with P2 gap

**`buildFolderTree` helper (PropertyDocumentsPage.tsx lines 96–113):**
```ts
function buildFolderTree(folders: DbFolder[]): TreeNode[] {
  const byParent = new Map<string | undefined, DbFolder[]>();
  for (const f of folders) {
    const key = f.parentFolderId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(f);
  }
  function makeNodes(parentId?: string): TreeNode[] {
    return (byParent.get(parentId) ?? [])
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((f) => {
        const children = makeNodes(f.id);
        return { id: f.id, label: f.name, ...(children.length ? { children } : {}) };
      });
  }
  const rootNodes = makeNodes(undefined);
  return [{ id: "root", label: "Documents", children: rootNodes.length ? rootNodes : undefined }];
}
```

**Mental walk — 3 cases:**

| Case | Input | Expected output | Verified |
|---|---|---|---|
| Normal (PROP-0001 seeds) | 8 folders: 6 roots + FLDR-0008 (child of FLDR-0002 Compliance) + FLDR-0009 (child of FLDR-0004 Rental) | Root: Documents > [Contract, Compliance▶{2025}, Receipts, Rental▶{Lease Templates}, Tax, Title] — 6 top-level, 2 expandable | ✅ |
| Empty | `[]` | `[{id:"root", label:"Documents", children: undefined}]` — tree shows one node, no children | ✅ |
| Orphan child (bad `parentFolderId`) | A folder with `parentFolderId: "FLDR-MISSING"` | `byParent.get("FLDR-MISSING")` is populated; `makeNodes("FLDR-MISSING")` is never called (no parent maps to it); orphan silently disappears from tree | ⚠️ P2 gap — see F2 |

**Sort order:** `localeCompare` — alphabetical within each level. For PROP-0001 seeds: Contract, Compliance, Receipts, Rental, Tax, Title at root; 2025 under Compliance; Lease Templates under Rental.

**Golden-value check (PROP-0001, 2026-05-06):**

| Seed | parentFolderId | Appears at | Sorted position |
|---|---|---|---|
| FLDR-0001 Title | — | root | 6th (after Tax) |
| FLDR-0002 Compliance | — | root | 2nd |
| FLDR-0004 Rental | — | root | 4th |
| FLDR-0005 Tax | — | root | 5th |
| FLDR-0006 Contract | — | root | 1st |
| FLDR-0007 Receipts | — | root | 3rd |
| FLDR-0008 2025 | FLDR-0002 | child of Compliance | only child |
| FLDR-0009 Lease Templates | FLDR-0004 | child of Rental | only child |

Tree structure: `Documents > [Contract, Compliance▶[2025], Receipts, Rental▶[Lease Templates], Tax, Title]`

---

## 4. Render — ⚠️

| | |
|---|---|
| Component | `<PropertyDocumentsPage>` — `FolderTreeItem` recursive component in both modal dropdowns |
| Prop chain | `documents/queries.ts` → `db.folders.list(userId)` → filter by propertyId → `dbFolders[]` → `buildFolderTree()` → `folderTree` → modal dropdown |
| Initial state — Add Folder | `selectedLocation = folderTree[0]` (virtual root); `expandedNodes = new Set(["root"])` — root expanded, children collapsed |
| Initial state — Move To | `moveSelectedLocation = folderTree[0]`; `moveExpandedNodes = new Set(["root"])` — same |
| Selection UI | Clicking a node sets `selectedLocation`/`moveSelectedLocation` and closes dropdown if node has no children |
| Breadcrumb | `findPath(folderTree, selectedLocation.id)` renders path as crumbs in the picker trigger button |

**PII / IDOR**
- `Folder[]` carries `userId` to browser. See **PF1** in [pages/property-id-documents/audit.md](pages/property-id-documents/audit.md).
- Auth shim: see **PF2** in [pages/property-id-documents/audit.md](pages/property-id-documents/audit.md).

---

## 5. Consistency — ✅

| Identity | Verification | Holds? |
|---|---|---|
| Add Folder modal tree = Move To modal tree | Both read `folderTree` — same object, same derivation, both computed at component top | ✅ |
| Tree nodes match tile grid folders | Tile grid shows `rootFolders` (top-level sorted); tree shows same folders as children of virtual root | ✅ |
| Selection reset on open | Both modals reset selection to `folderTree[0]` on open — no stale selection persists across opens | ✅ |

---

## 6. Missing safeties — 1 gap

| Gap | Status | Link |
|---|---|---|
| Orphan folders silently dropped (child with bad `parentFolderId`) | ❌ — orphan disappears with no console warning | F2 |

---

## 7. Meaning — ✅

```
Tree renders:         "Documents" > real folder names from seeds
User's inference:     hierarchical folder structure for this property
Actual data:          Folder[] filtered to this property, parentFolderId self-FK → hierarchy
Match?                ✅ — virtual "Documents" root is a clear UX entry point; real folders beneath it
```

The virtual root node `{id: "root", label: "Documents"}` is an intentional UX affordance — it gives the user a "top level" option for placing a new folder at the root. It is not a real Folder entity row; it is always present even when `dbFolders` is empty.

---

## 8. Findings — 3 items

---

### 🔴 F1 — `userId` in `Folder[]` shipped to browser
**P1 robustness · confidence: high · `[render]`**

Systemic — see **PF1** in [pages/property-id-documents/audit.md](pages/property-id-documents/audit.md).

---

### 🟡 F2 — Orphan folders silently disappear from tree
**P2 correctness · confidence: medium · `[derivation]`**

If a `Folder` seed has a `parentFolderId` pointing to a folder that doesn't exist (missing parent row — e.g. deleted parent, wrong seed data), `buildFolderTree` will add it to `byParent.get(that-id)` but `makeNodes(that-id)` will never be called, because the parent folder was never added as a node. The orphan folder simply doesn't appear in the tree. No console warning is emitted and no error is thrown.

**Fix:** Add a post-build pass that checks for keys in `byParent` that were never traversed, and either renders them at root level with a console warning, or logs a `console.warn("Folder orphan: ...")`. For now, seeds are authoritative and orphans are unlikely in practice, so this is a medium-priority robustness gap rather than a production bug.

---

### 🔵 F3 — Virtual root is re-selected on every modal open, even if user had previously navigated to a child
**P3 nit · confidence: high · `[UX]`**

When the user selects a child folder (e.g. "Compliance > 2025") and closes the Add Folder modal, then opens it again, the selection resets to the virtual "Documents" root. This is because the modal's `onClick` calls `setSelectedLocation(folderTree[0])` unconditionally. For a power user who frequently creates folders in the same subfolder, this creates extra clicks per session.

**Fix:** Only reset if explicitly needed (e.g. after successful folder creation). In this phase, Folder CRUD is intentionally out of scope; this is filed as a future UX polish note.

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
  - path: lib/data/types/folder.ts
    sha: a37982988e628b638c009a31abdc7d7d70cb1b4b
  - path: lib/data/db/folders.ts
    sha: ec9c51918cca4ce884de51d4bfe065141edb72c8
  - path: app/(shell)/property/[id]/documents/queries.ts
    sha: 979733a3df42a49f5247461766b735521739604d
  - path: app/(shell)/property/[id]/documents/page.tsx
    sha: 641a3dbbdddbe49cf73a8da3183d48757a0f9cf6
  - path: app/(shell)/property/[id]/_components/PropertyDocumentsPage.tsx
    sha: a6be55aa23230a7ffcddf064e43360c61582a7da
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-06
- Initial audit. Rows 19 + 20 wired in Phase 6.7 (deleted `locationTree` hardcoded constant; replaced with `buildFolderTree(dbFolders)` derivation using `parentFolderId` self-FK).
- Combined-derivation report: rows 19 + 20 share `folderTree` — one report covers both surfaces.
- Golden-value check ✅: PROP-0001 tree = Documents > [Contract, Compliance▶{2025}, Receipts, Rental▶{Lease Templates}, Tax, Title].
- 3 findings: F1 (userId leak, systemic PF1), F2 (orphan folders silently dropped — P2), F3 (reset-to-root on every open — P3 nit).

</details>
