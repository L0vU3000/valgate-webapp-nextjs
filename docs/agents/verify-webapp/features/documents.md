# Documents vault

Folders and documents: create a folder that persists, upload a file that
appears in the list, per-file and bulk delete with typed confirms, and folder
delete moves files to root (never destroys them).

## Sub-features
- DOC-1: create folder → persists after reload.
- DOC-2: upload file → appears in list.
- DOC-3: per-file delete → confirm → removed.
- DOC-4: bulk delete → typed DELETE → removed.
- DOC-5: folder delete → files move to root.

## How to get to it (user POV)
Shell documents section (`/documents` and the intake flow).

## Driving it with Playwright
`npx playwright test e2e/documents.spec.ts` (F1–F5).

## Gotchas
Uploaded/created files are throwaway "E2E …" artifacts; bulk-delete dialogs
require typed confirmation — no shortcuts in specs or in manual driving.
