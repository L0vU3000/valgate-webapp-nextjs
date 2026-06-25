# Phase 0 — Foundations: shared confirm/undo system + audit logging

> Paste into a fresh Claude Code session. Agentic prompt with real system access — review
> scope locks and stop conditions before approving actions. This phase BLOCKS phases 1–6.

## Context (carry forward — do not re-derive)
- Backend is **Neon Postgres + Drizzle**, NOT Convex. Data path: UI → Server Action
  (`app/**/*.actions.ts`) → `lib/services/*` (Drizzle) → Neon. Schema `lib/db/schema/*`,
  client `lib/db/client.ts`. The `convex/` dir is dead — never touch it.
- Full plan + audit: `.claude/data-audit/docs/plans/Plan-Workflow-Audit.md` (§4 Phase 0).
- This codebase already uses **shadcn/ui** (Radix) for UI and **sonner** for toasts
  (`Toaster` is mounted in the auth layout + root). Reuse them — do NOT add a new toast or
  dialog library.
- An **`activities` table already exists** in the schema (used as an immutable audit log).
  Find it in `lib/db/schema/*` and reuse it.

## Backend decision — RESOLVED
The earlier "confirm the backend" question is answered: it is **Neon + Drizzle**. No
decision needed — proceed straight to building.

## Starting state
There is no shared confirmation component. Destructive actions across the app are
inconsistent: some have a thin modal, most have none, none have undo. There is no single
helper to write an audit row when something is created/changed/deleted.

## Target state — build these four things
1. **`<ConfirmAction>`** — one reusable component (find the shared UI dir, likely
   `components/ui/` or `components/`) with a `tier` prop:
   - `tier="undo"` — renders nothing blocking; the action fires immediately and a sonner
     toast with an "Undo" button appears for ~5s (low-risk, reversible).
   - `tier="confirm"` — a shadcn `AlertDialog`: title, "This can't be undone.", Cancel /
     Confirm. (medium-risk, single item)
   - `tier="typed"` — an `AlertDialog` where the Confirm button stays disabled until the
     user types a required string (e.g. the property name, or `DELETE`); the dialog body
     lists exactly what will be removed. (irreversible + sensitive + cascading)
   - Props: `tier`, `title`, `description`, `confirmLabel`, `typedConfirmValue` (for typed),
     `onConfirm` (async), `children` (the trigger). Handle loading state on Confirm.
2. **`useDestructiveAction` hook** — wraps a server action call: optimistic update +
   error rollback + sonner success/undo toast. Used by the `undo` tier.
3. **Error + toast helper** — a small `lib/client/action-result.ts` (or similar) that maps
   a Server Action result `{ ok: false, error }` to a generic toast, and `{ ok: true }` to
   a success toast. Never surface raw error strings.
4. **Audit-log helper** — `lib/services/activity.ts` exporting `logActivity(ctx, { entity,
   entityId, action, summary })` that inserts one row into the existing `activities` table.
   This will be called by every destructive mutation in later phases.

## Tier policy (document this in a comment block inside ConfirmAction)
| Tier | Use for |
|---|---|
| undo | reversible, low stakes (dismiss alert, mark-paid) |
| confirm | irreversible single item (delete one document, remove co-owner, resolve work order) |
| typed | irreversible + sensitive + cascading (delete property, bulk-delete docs, revoke verification) |

## Constraints
- Reuse shadcn/ui + sonner. Add NO new dependency. If you think you need one, stop and ask.
- Comment every new function in plain English — the owner is a backend beginner.
- Long, simple, readable code over clever abstractions.
- Do not wire any existing button to this system yet — that's phases 1–5. Phase 0 only
  builds the primitives + one usage example in a comment or a throwaway demo you remove.

## Acceptance criteria
- `<ConfirmAction>` renders all three tiers; typed tier disables Confirm until the string matches.
- `logActivity` inserts a row into the real `activities` table (verify the table + columns first).
- One runnable self-check exists for the non-trivial logic (the tier gating + undo timing) —
  a tiny `*.test.ts(x)` or an assert-based check. No new test framework if one isn't present.
- `npm run build` (or `tsc`) passes for the new files.

## Forbidden / stop-and-ask
- Do NOT install dependencies, change the DB schema or migrations, delete files, or touch `convex/`.
- Do NOT refactor existing components. Only add the new primitives.
- After each of the 4 deliverables, output `✅ [deliverable]`.

## Stop conditions
- Stop when the 4 primitives exist, the self-check passes, and the build is green — then
  summarize the files added and the exact import paths phases 1–5 should use.
- Stop and ask before anything in the forbidden list.
