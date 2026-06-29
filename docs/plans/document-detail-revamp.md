# Revamp the Document detail view (Phase 1)

**Plan:** `plan-e843871968a64a74` ·
https://plan.agent-native.com/plans/plan-e843871968a64a74

**Status:** 🟢 Phase 1 shipped (2026-06-29, `tsc` clean). Phase 2 (AI summaries) is a
separate plan: [ai-document-summaries.md](./ai-document-summaries.md).

---

## Objective

The document detail view (`/property/[id]/documents`, open a file) looked finished but
was almost entirely mocked: `DocumentDetailView` received only the filename string and
hardcoded everything else — `documentPages = [1,2,3,4]`, the `documentMeta` financials
($420,000 / $8,400 …), and the `summary` about "SR00015"; the preview pane always said
"Preview unavailable". That broke the project's own no-mocks rule. Rebuilt as a real
file viewer + a Details/Summary rail.

## Feedback → fix (the 5 page notes)

| Note | Fix | Phase |
|---|---|---|
| "section is meant to see files too" | Left rail lists the files in the folder so you can switch documents | 1 |
| "Folders — rename" | Renamed label to **In this folder** | 1 |
| "how to actually see the page of the document" | Render the real file: PDF via native `<iframe>`, images via `<img>` | 1 |
| "work on the layout" | Two-pane viewer: big preview + Details/Summary rail (Deel/Dropbox pattern) | 1 |
| "why is this still data — make real AI summaries" | Remove the fake data now; real summary generated later | 1 removes / 2 generates |

## Locked decisions

1. **Ship Phase 1 alone first** — real viewer + honest empty summary. Phase 2 follows.
2. **Rail uses tabs** — Details | Summary.
3. **Summary generates only on click** — Phase 1 leaves a disabled teaser button; Phase 2
   wires it. Nothing runs on upload.

## Design language (.impeccable.md)

Light mode; data is the hero; borders over shadows; blue precious. The file fills the
left pane; the rail carries only real `DbDocument` fields. Summary tab is an honest empty
state ("No summary yet") — no fake text. Reference pattern from Mobbin: Deel / Dropbox /
Aboard / Sana AI / NotebookLM all make **the file the page** + a right-rail Details/AI
panel.

## What shipped (4 files, `tsc` clean)

1. `app/(shell)/property/[id]/_components/PropertyDocumentsPage.tsx` — selected-file
   state changed from filename string to **document id**; `selectedDocument` derived from
   `dbDocuments`; `openDocument(docId)` fetches the signed URL; left file-page rail
   renamed **In this folder** and now lists files sharing the open doc's `folderId`
   ("All Documents" closes the detail view).
2. `app/(shell)/property/[id]/documents/actions.ts` — **new** `getDocumentFileUrl(documentId)`
   server action: `requireCtx()` → org-scoped `getDocument()` (no IDOR) →
   `resolveDocumentUrl()` → `ActionResult<string>`.
3. `components/property/DocumentPreviewPane.tsx` — **new**: images via `<img object-contain>`,
   PDFs via native `<iframe>` (no PDF.js / new dependency), other types via real
   Download + Open-in-new-tab using the signed URL; skeleton while `fileUrl` is null.
4. `components/property/DocumentDetailView.tsx` — rebuilt two-pane: toolbar (back, name,
   Download, Open) · left `<DocumentPreviewPane>` · right rail tabs **Details | Summary**.
   Takes `document: DbDocument` + `fileUrl`. Details = category, extension+size,
   uploadedAt, uploadedBy, Verifies chip (rows omitted when a field is missing). Summary =
   "No summary yet" + disabled button. **All mock literals deleted.**

## The core wiring change

Detail view previously got only a filename string; now it gets the typed document + its
signed URL (fetched on open via the new action; never embedded in the initial HTML).

## Verification (as shipped)

- `npx tsc --noEmit` → exit 0.
- Opening a document shows the real file; Details shows only real fields; Summary shows
  the empty state with a disabled button.

### Gut-checks worth confirming in the running app

- **PDF `<iframe>` + signed S3 URLs**: confirm PDFs render inline (some S3 responses send
  `Content-Disposition: attachment`, which forces a download). If so, set a
  response-content-disposition param on the presigned URL.
- **Renamed rail filters by `folderId`**: confirm a document at the folder root
  (`folderId` null) still shows a sensible list, not an empty rail.

> The interactive canvas (Before mock / After viewer / After-summary / renamed file rail)
> lives in the hosted plan — open the URL above.
