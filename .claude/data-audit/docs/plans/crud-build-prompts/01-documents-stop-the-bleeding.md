# Phase 1 — Stop the bleeding: documents delete + storage leak

> Paste into a fresh Claude Code session. Agentic prompt with real system access. Requires
> Phase 0 (`<ConfirmAction>`, `logActivity`) to be merged first.

## Context (carry forward)
- Backend is **Neon Postgres + Drizzle**, NOT Convex. UI → Server Action (`app/**/*.actions.ts`)
  → `lib/services/*` (Drizzle) → Neon. Never touch `convex/`.
- This phase fixes the two highest-severity findings in
  `.claude/data-audit/docs/plans/Plan-Workflow-Audit.md` (journey 10). Read that section first.
- Destructive actions MUST use the Phase 0 `<ConfirmAction>` and call `logActivity`.
- Security on every mutation: Zod → auth → ownership (IDOR) → generic errors → soft-delete
  where it makes sense. Comment every new function in plain English.

## Starting state (verify each path by reading it first)
- `PropertyDocumentsPage.tsx` — bulk-delete button (~`:707-712`) has **no onClick handler**
  (dead button, P0). "Create Folder" button (~`:869-878`) only closes the modal — never
  calls the backend. No per-file delete UI. No folder delete UI.
- Backend already exists: `app/actions/documents.ts` (`deleteDocument`, `uploadDocument`,
  `getDocumentUrl`), `app/actions/folders.ts` (`createFolder`, `deleteFolder`), and the
  matching `lib/services/documents.ts` / `lib/services/folders.ts`.
- Files are stored in S3 (uploads go through a presign flow in `app/actions/documents.ts`).
  Deleting a document row currently does **not** delete the stored S3 object (leak, P1).

## Target state — build, in order
1. **Wire bulk delete.** Add the missing handler to the bulk-delete button. Gate it behind
   `<ConfirmAction tier="typed">` — the dialog lists the file count and warns it can't be
   undone; require typing `DELETE`. On confirm, call the delete action for each selected
   file (or a new `deleteDocuments` batch action in `lib/services/documents.ts` if cleaner),
   then toast + refresh.
2. **Storage cleanup on delete.** In `lib/services/documents.ts` (and any batch path),
   delete the S3 object(s) when the document row is deleted. Find the existing S3 client
   used by the presign/upload flow and reuse it. If a file fails to delete from S3, log it
   but don't fail the whole request — leave a clear comment.
3. **Per-file delete.** Add a delete affordance per file row (icon or row menu), behind
   `<ConfirmAction tier="confirm">`.
4. **Folder delete.** Add a delete affordance per folder, behind `<ConfirmAction tier="confirm">`.
   If the folder is non-empty, the dialog warns how many files it contains. Decide with the
   user (or default to) move-children-to-root vs block-delete — leave a comment on the choice.
5. **Wire Create Folder.** Make the Create Folder button actually call `createFolder()`,
   show a success/error toast, and refresh the list.

Every mutation above calls `logActivity` and enforces ownership server-side (the file/folder
must belong to the caller's org/property — verify the service layer already does this; if not,
add the check).

## UI craft
- Use the `mobbin` MCP to reference file-manager delete + bulk-action patterns before building.
- Run `/impeccable harden` on the documents page after wiring (empty/error/loading states).

## Acceptance criteria
- Selecting files → Delete → typed confirm → files removed from DB **and** S3 → toast → list refreshes.
- Per-file and per-folder delete both work, both confirm, both write an activity row.
- Create Folder persists and the new folder appears without a manual reload.
- No dead/no-op buttons remain on the documents page.
- `tsc`/build passes; ownership enforced on every delete (cross-org delete is rejected).

## Forbidden / stop-and-ask
- No new dependencies, no schema/migration changes, no file deletion, no `convex/` edits — stop and ask.
- Don't redesign the documents page; only add the missing affordances + wiring.
- After each of the 5 tasks output `✅ [task]`.

## Stop conditions
- Stop when all 5 tasks pass acceptance and the build is green; summarize files changed.
- Stop and ask before anything forbidden, or if the S3 client / ownership check isn't where expected.
