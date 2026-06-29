# Folder Rename & Delete — wire the missing CRUD

**Plan:** `plan-49495c6076174abb` ·
https://plan.agent-native.com/plans/plan-49495c6076174abb

**Status:** ✅ complete (shipped). Mirror of the hosted visual plan.

---

## Objective

Make folders fully manageable from the property **Documents** page. Create + Read
existed; **Rename** and **Delete** had working server actions (`updateFolder`,
`deleteFolder` in `app/actions/folders.ts`) but no UI. This added a per-folder `⋯`
overflow menu → **Rename** modal and **Delete** confirm, each wired to the existing
action and followed by `router.refresh()`.

## Locked decisions

1. **Delete is admin-only** — capability computed server-side
   (`roleAtLeast(ctx.orgRole, "admin")` in `lib/services/_mapping.ts`) and passed to
   the client as one boolean prop `canDeleteFolders`. No role logic on the client; the
   server action stays the enforcement point.
2. **Non-empty folders are blocked in the UI** — there is no DB `onDelete` cascade
   (`documents.folderId` and `folders.parentFolderId` both reference `folders.id` with
   no cascade), so the Delete dialog shows a "not empty" state instead of calling the
   action.
3. **Rename uses a modal** that reuses the New Folder chrome.

## Design language (.impeccable.md)

- `⋯` is supporting cast: hidden until card hover/focus on desktop
  (`sm:opacity-0 sm:group-hover:opacity-100`), always visible on touch; slate-400 →
  slate-600.
- Blue is precious: only Save uses `var(--val-primary-dark)`; **Delete is rose**
  (`text-rose-600` / rose fill), matching the existing bulk-delete bar.
- Borders over shadows; elevation reserved for the modal overlay.
- Copy is specific: every dialog names the folder; the blocked state says what to do next.
- Motion: reuse the existing `fade-slide-up` modal animation.

## Grounded in Mobbin

Folder overflow menus (Gamma, Copilot, Skiff, Google Drive, Dropbox, Proton) converge
on: Rename near the top, **Delete last, separated, red**. Delete confirms (Slite,
Qatalog, Reddit, Medium, AutoSend) use a question title naming the item + "can't be
undone" + a red button. Type-to-confirm (Lindy "Delete workspace") was deliberately
NOT used — we only ever delete EMPTY folders, so a one-tap confirm is correctly
calibrated.

## Implementation (all in `PropertyDocumentsPage.tsx` + 1 line in `documents/queries.ts`)

1. Imports: `updateFolder, deleteFolder`; `DropdownMenu*` incl. `DropdownMenuSeparator`;
   `MoreVertical`.
2. Server gate: `queries.ts` returns `canDeleteFolders: roleAtLeast(authCtx.orgRole, "admin")`;
   `page.tsx` already spreads `{...documentsData}` → add `canDeleteFolders` to Props.
3. State: `renameTarget`/`renameValue`/`isRenaming`/`renameError`,
   `deleteTarget`/`isDeleting`/`deleteError`.
4. Card restructure: single `<button>` → `group` `<div>` (body toggle + sibling `⋯`),
   menu = Rename then (admins) separator + rose Delete.
5. `handleRenameFolder` / `handleDeleteFolder`: guard → action → ok: close +
   `router.refresh()`; fail: inline error; `try/finally` clears loading.
6. `folderContents(id)` from props → Delete dialog renders confirm (empty) vs blocked
   (non-empty).
7. Rename `Dialog` (clone of New Folder, name selected on open) + one Delete `Dialog`
   with two states.

`router.refresh()` is required after each mutation — `getDocumentsPageData` is a plain
server fetch (not cached under the `folders` tag), so the action's
`revalidateFeTag("folders")` alone won't repaint the page.

## Verification (as shipped)

- `npx tsc --noEmit` → exit 0.
- `eslint` on the file → 0 errors (pre-existing warnings only).

> The interactive canvas (5 states: grid `⋯`, menu, rename modal, delete empty,
> delete blocked) lives in the hosted plan — open the URL above.
