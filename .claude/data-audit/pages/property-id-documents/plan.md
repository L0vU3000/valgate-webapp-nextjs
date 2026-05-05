---
slug: property-id-documents
route: /property/[id]/documents
revision: 1
date: 2026-05-05
verdict: "⚠️ 3 WIRED · 1 PARTIAL · 13 HARDCODED · 5 PFn — top entities to land: Document, Folder"
---

# Page Audit — /property/[id]/documents — plan.md
_Last revised: 2026-05-05 · Revision 1_

_See [audit.md](./audit.md) for the underlying surface inventory and page-wide findings._

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 3 | Entity Backlog | What database concepts are missing, prioritised? | 2 entities |
| 4 | Audit Roadmap | Which rows deserve `/audit-datapoint` and with which template? | 4 rows ready; 13 blocked |
| 5 | Fix Log | What has been fixed since the initial audit? | — |

---

## 3. Entity Backlog (2 entities)

> Two database concepts are missing from this page. Document is the higher-priority entity — it unblocks 9 surfaces here plus 1 from the rental page (10 total across pages). Folder unblocks 4 surfaces here and is brand-new to the cross-page backlog.

---

### Entity needed: Document

- **Required by:** rows 5 (file count in subtitle), 8 (file names), 9 (file type icons + icon colors), 10 (file folder labels, list view), 11 (file sizes), 12 (file dates / "Modified"), 13 (image thumbnails), 14 (file count in section header), 22 (upload demo file list in progress panel)
- **Catalog reference:** [`ref/00 §2`](../../ref/00-entity-catalog.md) — `status: defined`
- **Currently in `lib/data/types/`?** Yes — `lib/data/types/document.ts` (types exist; no Convex backend yet)
- **Land first, then audit:** rows 5, 8, 9, 10, 11, 12, 13, 14, 22 as a batch once `db.documents` is wired; recommend template:
  - Row 8 (file name): lite — direct read of `doc.name`
  - Row 9 (file type icon): lite — `doc.kind === "photo" ? Image : FileText` mapping is simple but the PARTIAL concern about icon extensibility should be noted
  - Rows 10, 11, 12: lite — direct reads of `doc.folderId→name`, `formatBytes(doc.sizeBytes)`, `new Date(doc.uploadedAt)`
  - Row 5 / 14 (counts): lite — derived from `documents.length` / `filteredDocuments.length`; no aggregation formula needed
  - Row 13 (thumbnails): full — `doc.storageId` as URL path vs. Convex `_storage` ref (Q5.C) is a derivation concern
  - Row 22 (upload demo): not worth auditing — it's a UX placeholder, not a data surface; remove per PF3 fix
- **Notes:** Document entity already defined in catalog §2 with 13 fields; the wiring PR also needs to resolve Q5.C (storage ID as URL path vs. Convex `_storage` reference). PF3's fix (remove FALLBACK_FILES) is a prerequisite — once the fallback is removed, rows 5 and 14 will read the real count. Also resolves the single surface from `property-id-rental` (row 31, "Documents card").

---

### Entity needed: Folder

- **Required by:** rows 7 (folder tile grid — 6 flat tiles), 19 (Add Folder modal location tree), 20 (Move To modal location tree), 23 (file detail sidebar folder list)
- **Catalog reference:** [`ref/00 §3`](../../ref/00-entity-catalog.md) — `status: defined`
- **Currently in `lib/data/types/`?** Yes — `lib/data/types/folder.ts` (types exist; no Convex backend yet)
- **Land first, then audit:** rows 7, 19, 20, 23 as a batch; recommend template:
  - Row 7 (tile grid): lite — `dbFolders.map(f => f.name)` flat list
  - Row 19 / 20 (location tree): full — the `locationTree` constant has nested nodes (via `parentFolderId` recursion); the derivation from flat `dbFolders` with `parentFolderId` to a nested tree is non-trivial and merits a full audit for the tree-building logic
  - Row 23 (detail sidebar): lite — top-level folders only, direct list
- **Notes:** PF4 (three inconsistent folder hierarchies) must be resolved before Folder is wired — a design decision is needed on whether the tile grid supports nesting. The Add Folder / Move To modals use `locationTree` with recursive `FolderTreeItem` rendering (already implemented at `PropertyDocumentsPage.tsx:151–225`), so the nesting model is already in the UI; the question is whether the tile grid evolves to match. File this in Q8 before the Folder wiring PR.

---

## 4. Audit Roadmap (17 rows)

> 4 rows are WIRED or PARTIAL and ready for `/audit-datapoint` now. 13 rows are blocked on Document or Folder entities landing first.

| Row | Element | Status | Template | Existing audit |
|---|---|---|---|---|
| 1 | Header breadcrumb: property code + type | ready | lite | _to-do_ (property.code audited in `portfolio--property-id` for portfolio route; this is same field, different surface — a new lite audit for the PropertyLayout surface) |
| 2 | Health score badge | ready | full | _to-do_ (PARTIAL — value text is WIRED but emerald CSS is hardcoded; same pattern as PF3 in `pages/property-id-overview/audit.md`) |
| 4 | In-page breadcrumb: property code | ready | lite | _to-do_ (redundant surface — can batch with row 1 or cite row 1's audit; property.code field is the same) |
| 6 | Subtitle: property code + type | ready | lite | _to-do_ (redundant with rows 1 and 4; batch with them) |
| 5 | Subtitle file count | blocked on Document | — | _wait for entity_ |
| 7 | Folder tile grid | blocked on Folder | — | _wait for entity_ |
| 8 | File name | blocked on Document | — | _wait for entity_ |
| 9 | File type icon + color | blocked on Document | — | _wait for entity_ |
| 10 | File folder label | blocked on Document + Folder | — | _wait for both entities_ |
| 11 | File size | blocked on Document | — | _wait for entity_ |
| 12 | File date ("Modified") | blocked on Document | — | _wait for entity_ |
| 13 | Image thumbnails | blocked on Document | — | _wait for entity_ |
| 14 | Section file count | blocked on Document | — | _wait for entity_ |
| 19 | Add Folder location tree | blocked on Folder | — | _wait for entity_ (resolve PF4 first) |
| 20 | Move To location tree | blocked on Folder | — | _wait for entity_ (resolve PF4 first) |
| 22 | Upload demo file list | blocked on Document | — | _remove per PF3 fix; do not audit_ |
| 23 | File detail sidebar folders | blocked on Folder | — | _wait for entity_ |

**Legend:**
- **ready** — WIRED or PARTIAL; runnable now
- **blocked on \<Entity\>** — HARDCODED; revisit after the entity lands
- **remove per PF3 fix** — this surface should be deleted (it's demo scaffolding, not a real data surface)

---

## 5. Fix Log

> A chronological record of fixes applied after the initial audit. Empty on first write.

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| — | — | — | _No fixes yet._ | — |

---

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-05
- Initial plan (fresh write). 2 entities in backlog. 4 rows ready in Audit Roadmap; 13 blocked.
- Recommended next: land Document entity first (unblocks 10 surfaces across 2 pages); resolve PF3 (remove FALLBACK_FILES) as part of the same PR; then land Folder entity (resolve PF4 design question first).
- Cross-page note: Document jumps from rank 5 (1 surface, rental only) to rank 3 (10 surfaces) after this page. Folder is a new entity at rank 4 (4 surfaces, documents page only so far).

</details>
