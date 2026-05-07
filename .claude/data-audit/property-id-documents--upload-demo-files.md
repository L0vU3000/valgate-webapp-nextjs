---
slug: property-id-documents--upload-demo-files
data_point: "Upload progress panel — demo file list (Lease_Agreement_v3.pdf, Inspection_Photos.jpg, Safety_Cert.pdf)"
route: /property/[id]/documents
revision: 1
date: 2026-05-06
verdict: "✅ Intentionally hardcoded — UI demo construct, not a data surface"
---

# Audit — Upload Demo Files on /property/[id]/documents
_Last revised: 2026-05-06 · Revision 1_

## TL;DR
- ✅ Intentionally hardcoded — the `demoFiles` array is a UI demo fallback used only when no real files are pending in the upload modal; it is not a data surface
- 0 findings — the hardcoded `demoFiles` constant does not cross-render with real Document entities
- Building a real upload flow is a separate future phase; this audit closes the row in the audit roadmap
- 📄 Page audit: see [pages/property-id-documents/audit.md](pages/property-id-documents/audit.md) row 22

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What is `demoFiles`? | — |
| 2 | Scope | Is this a data surface? | ✅ No — UI demo only |
| 3 | Coupling check | Does `demoFiles` cross-render with real Documents? | ✅ No coupling |
| 4 | Findings | What to fix | 0 items |
| 5 | Fix Log | What has been fixed since the initial audit? | — |

---

## 1. Snapshot

> **Plain opener:** Clicking "Upload File" opens an upload modal with a drag-and-drop zone. If the user clicks "Upload" without dropping real files, a progress panel appears showing three hardcoded filenames cycling through a simulated upload animation. These three filenames — `Lease_Agreement_v3.pdf`, `Inspection_Photos.jpg`, `Safety_Cert.pdf` — are a demo UX pattern only: they exist so a reviewer can see what the upload panel looks like with files in it. They are never mixed into the real `files[]` array and never persist beyond the client's current session.

| | |
|---|---|
| Where | Upload progress panel (`showUploadPanel = true`), triggered by `startUpload()` |
| Label | Three rows: filename + simulated size |
| Source | `demoFiles` const array in `startUpload` callback |
| Reads from | Nothing — static strings |

## 2. Scope — ✅ not a data surface

**Code (verbatim):**
```ts
// PropertyDocumentsPage.tsx:383–397
const startUpload = useCallback(() => {
  const demoFiles = [
    { name: "Lease_Agreement_v3.pdf", size: "2.4 MB" },
    { name: "Inspection_Photos.jpg",  size: "4.1 MB" },
    { name: "Safety_Cert.pdf",        size: "1.2 MB" },
  ];
  const source = pendingFiles.length > 0
    ? pendingFiles.map((f, i) => ({
        id:       `file-${i}`,
        name:     f.name,
        size:     formatFileSize(f.size),
        status:   i === 0 ? "uploading" : "queued",
        progress: i === 0 ? 0 : 0,
      }))
    : demoFiles.map((f, i) => ({
        ...
      }));
  setUploadQueue(source);
  setShowUploadPanel(true);
  setShowUploadModal(false);
}, [pendingFiles]);
```

`demoFiles` is only used when `pendingFiles.length === 0`. When the user drops real files (via the drag zone or file picker), `source` is built from `pendingFiles` — the real File objects. `demoFiles` is a fallback for interactive demo contexts only.

## 3. Coupling check — ✅ no coupling

`uploadQueue` (client state driven by `demoFiles`) is entirely separate from `files` (server-derived from `dbDocuments`):
- `files[]` comes from `dbDocuments.map(...)` — real seed data
- `uploadQueue[]` comes from `pendingFiles` or `demoFiles` — client-side upload progress
- No code path mixes `uploadQueue` items into `files` or vice versa

**Rule 1 (adjacent hardcode) check:** The three demo filenames do not appear anywhere in the `files[]` array or the list/grid views. A real upload flow would call a Server Action that writes a new `Document` to the DB and triggers `revalidateTag` — at that point the new document would appear via `dbDocuments` on the next server render. The `demoFiles` constant would never be part of that flow. No coupling found.

## 4. Findings — 0 items

No findings. This surface is intentionally a UI demo construct. The real upload flow (Server Action → Convex mutation → `revalidateTag`) is a separate future phase. Wiring `demoFiles` to real data is out of scope until that phase is designed.

---

## 5. Fix Log

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| — | — | — | _No fixes._ | — |

---

<details>
<summary>🔍 Source files & hashes</summary>

```yaml
sources:
  - path: app/(shell)/property/[id]/_components/PropertyDocumentsPage.tsx
    sha: 4f00c5acabd59f23a2d4190212944cc978cc842d
```

</details>
