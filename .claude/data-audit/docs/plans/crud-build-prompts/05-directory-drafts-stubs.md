# Phase 5 — Directory edit/delete, draft persistence, stub cleanup

> Paste into a fresh Claude Code session. Agentic prompt with real system access. Requires Phase 0.

## Context (carry forward)
- Backend is **Neon Postgres + Drizzle**, NOT Convex. UI → Server Action → `lib/services/*`
  → Neon. Never touch `convex/`.
- Findings: `.claude/data-audit/docs/plans/Plan-Workflow-Audit.md` journeys 5, 6, 12, 13. Read first.
- Destructive actions MUST use the Phase 0 `<ConfirmAction>` + `logActivity`. Security on every
  mutation: Zod → auth → ownership → generic errors.

## Starting state (verify each path by reading it first)
- **Directory:** `ProfessionalDirectoryPage.tsx` has Add + View + contact actions but
  **no edit, no delete**. Confirm whether directory create/update/delete actions + a service
  module exist; if delete/update are missing on the backend, add them in `lib/services/*` +
  a `*.actions.ts` (mirroring how `createCoOwner` etc. are built).
- **Add-property drafts:** drafts live only in **localStorage** (`use-drafts.ts`); delete is
  localStorage-only and unconfirmed; no cross-device/session persistence.
- **Dashboard alerts:** "Dismiss all" exists but **no per-item dismiss**.
- **Stub buttons:** property overview quick-actions (New Lease / Work Order / Invoice /
  Notify All) and "Export Data" have no handlers (`PropertyOverviewPage.tsx:~41-46`).

## Target state — build
1. **Directory edit + delete.** Add an Edit affordance (reuse the Add wizard in edit mode) and
   a Delete affordance behind `<ConfirmAction tier="confirm">`. Wire to the directory service
   (create the update/delete service + action if absent). `logActivity` on delete.
2. **Draft persistence (DECISION NEEDED — ask the owner first).** Recommended: persist drafts
   server-side in a `property_drafts` table so they survive devices, keeping localStorage as a
   fast cache. This needs a **schema change** → present the option, get approval, THEN build.
   Also make draft delete confirmed (`tier="confirm"`). If the owner prefers to keep
   localStorage-only, just add the confirm and skip persistence.
3. **Per-item alert dismiss** → `<ConfirmAction tier="undo">` (reversible) on each alert,
   alongside the existing dismiss-all. Wire to whatever backing the alerts have (verify).
4. **Stub cleanup (DECISION NEEDED — ask the owner).** For each stub button (quick-actions,
   Export Data): either **build it** or **hide it**. Default recommendation: hide the ones with
   no near-term backend (quick-actions) and implement Export Data as a simple server-side data
   export if cheap. Present the list, get the owner's build-vs-hide call per button, then act.
   No button may remain a visible no-op after this phase.

## UI craft
- `mobbin` MCP: reference directory/contact-card edit-delete + inline dismiss patterns.
- `/impeccable polish` the directory + dashboard after wiring.

## Acceptance criteria
- Directory entries can be edited and deleted (confirmed, ownership-checked, audited).
- Draft delete is confirmed; if persistence was approved, a draft saved on one session is
  retrievable in another.
- Alerts can be dismissed individually with undo.
- No visible no-op buttons remain anywhere touched this phase; `tsc`/build passes.

## Forbidden / stop-and-ask
- No new dependencies, no file deletion, no `convex/` edits.
- **Schema changes** (draft table) require explicit approval first.
- Get the owner's build-vs-hide decision on each stub button before changing it.
- After each task output `✅ [task]`.

## Stop conditions
- Stop when tasks pass acceptance and build is green; summarize files changed + decisions taken.
- Stop and ask before any schema change or before removing/altering a stub the owner hasn't ruled on.
