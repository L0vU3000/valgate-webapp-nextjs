---
slug: property-id-documents--file-row-direct-reads
data_point: "File list row — name, type icon, folder label, size, date, thumbnails (rows 8–13, bundle of 6)"
route: /property/[id]/documents
revision: 1
date: 2026-05-06
verdict: "✅ Correct · 3 findings (1 P1, 1 P2, 1 P3) — thumbnails deferred (storage phase)"
---

# Audit — File Row Direct Reads (bundle) on /property/[id]/documents
_Last revised: 2026-05-06 · Revision 1_

## TL;DR
- ✅ Correct — file name, type icon, folder label (via FK), size, and date all read from real `Document` seeds; thumbnails intentionally skipped pending storage phase
- ⚠️ 3 findings · 1 P1 (Document[]+Folder[] userId to browser) · 1 P2 (PF3 now resolved — confirmed gone) · 1 P3 (thumbnail deferred — known storage gap)
- 🔧 Top fix: narrow Document[]+Folder[] in `documents/queries.ts` to exclude userId (F1, see PF1)
- 📄 Page audit: see [pages/property-id-documents/audit.md](pages/property-id-documents/audit.md)

---

## Surface bundle

All 6 surfaces read from the same `files: FileEntry[]` array derived from `dbDocuments` in `PropertyDocumentsPage.tsx:292–304`. One systemic finding (F1: PF1 userId leak) applies to all rows; findings are filed once here rather than repeated.

**Derivation:**
```ts
const folderMap = new Map(dbFolders.map((f) => [f.id, f.name]));

const files: FileEntry[] = dbDocuments.map((doc) => {
  const { type, icon, iconClass } = getFileIconStyle(doc);
  return {
    name:     doc.name,
    type,
    icon,
    iconClass,
    thumb:    null,                                               // row 13 — storage deferred
    folder:   doc.folderId ? (folderMap.get(doc.folderId) ?? "—") : "—",  // row 10
    size:     doc.sizeBytes ? formatBytes(doc.sizeBytes) : "—",  // row 11
    date:     new Date(doc.uploadedAt).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric"  // row 12
              }),
  };
});
```

**Per-surface table:**

| Row | Surface | Source field | Empty-state | Wired? |
|---|---|---|---|---|
| 8 | File name | `doc.name` | N/A — always present (Zod `min(1)`) | ✅ |
| 9 | File type icon + color | `doc.kind` + `doc.extension` via `getFileIconStyle()` | defaults to `FileText` / `text-blue-600` | ✅ |
| 10 | Folder label | `doc.folderId → folderMap → folder.name` | `"—"` if no folderId or id not in map | ✅ |
| 11 | File size | `doc.sizeBytes` → `formatBytes()` | `"—"` if `sizeBytes` undefined | ✅ |
| 12 | File date | `doc.uploadedAt` → `toLocaleDateString` | N/A — always present (Zod required) | ✅ |
| 13 | Image thumbnail | `doc.thumbStorageId` / `doc.storageId` | `null` — icon shown instead (storage deferred) | ⚠️ known gap |

**`getFileIconStyle` mapping:**
```ts
function getFileIconStyle(doc: DbDocument): { type: string; icon: React.ElementType; iconClass: string } {
  const ext = doc.extension?.toLowerCase();
  if (doc.kind === "photo" || ext === "jpg" || ext === "jpeg" || ext === "png" || ...) {
    return { type: "image", icon: Image, iconClass: "text-emerald-600" };
  }
  if (ext === "xlsx" || ext === "xls" || ext === "csv") {
    return { type: "spreadsheet", icon: FileSpreadsheet, iconClass: "text-rose-600" };
  }
  return { type: "doc", icon: FileText, iconClass: "text-blue-600" };
}
```

**Golden-value check (PROP-0001 — first 3 of 7 docs, list sorted by uploadedAt DESC)**

| Name | type | icon | iconClass | folder | size | date |
|---|---|---|---|---|---|---|
| Property_Tax_Return_2026.xlsx | spreadsheet | FileSpreadsheet | text-rose-600 | Tax | 120 KB | Mar 28, 2025 |
| Insurance_Policy_2025.pdf | doc | FileText | text-blue-600 | Compliance | 2.1 MB | Mar 1, 2025 |
| Move_In_Checklist_2025.pdf | doc | FileText | text-blue-600 | Rental | 340 KB | Feb 27, 2025 |

Result: ✅

---

## Findings — 3 items

### 🔴 F1 — `userId` in `Document[]` + `Folder[]` shipped to browser
**P1 robustness · confidence: high · `[render]`**

Systemic — see **PF1** in [pages/property-id-documents/audit.md](pages/property-id-documents/audit.md).

---

### ✅ F2 — PF3 (FALLBACK_FILES fallback trap) — resolved in Phase 6.3
**Previously P1 · now resolved**

`FALLBACK_FILES` constant and the `dbDocuments.length === 0 ? FALLBACK_FILES : dbDocuments` ternary were deleted in Phase 6.3. `files` is now always derived from `dbDocuments`; `EmptyState` is reachable when `dbDocuments.length === 0`. No action needed — noted here because PF3 directly applies to all rows 8–13 (they consumed `FALLBACK_FILES`).

---

### 🔵 F3 — Image thumbnails intentionally deferred — storage phase blocked
**P3 nit · confidence: high · `[render]`**

`thumb: null` is hard-coded for all file rows (row 13). `Document.storageId` and `Document.thumbStorageId` are stored in seed JSON as placeholder strings, not real object-store references. The `ImageWithFallback` component imported at the top of `PropertyDocumentsPage.tsx` is not used for document rows today. Photo documents (`kind === "photo"`) render the same `FileText` / `Image` icon as non-photo documents, losing the visual distinction. Acceptable for v1 — annotated as a known gap blocked on a real storage backend (Convex File Storage or equivalent). No action needed in this phase.

---

<details>
<summary>🔍 Source files & hashes</summary>

```yaml
sources:
  - path: lib/data/types/document.ts
    sha: f5839bbe034bf437a08fd3ddf06292a3aed13373
  - path: lib/data/types/folder.ts
    sha: a37982988e628b638c009a31abdc7d7d70cb1b4b
  - path: lib/data/db/documents.ts
    sha: 2d6ecf3ddea37acfe3e59ddcc16ec7e75c8af2ee
  - path: lib/data/db/folders.ts
    sha: ec9c51918cca4ce884de51d4bfe065141edb72c8
  - path: app/(shell)/property/[id]/documents/queries.ts
    sha: 979733a3df42a49f5247461766b735521739604d
  - path: app/(shell)/property/[id]/documents/page.tsx
    sha: 641a3dbbdddbe49cf73a8da3183d48757a0f9cf6
  - path: app/(shell)/property/[id]/_components/PropertyDocumentsPage.tsx
    sha: 4f00c5acabd59f23a2d4190212944cc978cc842d
```

</details>
