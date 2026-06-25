# Phase 2 — Portfolio + property lifecycle (row menu, archive, guarded delete)

> Paste into a fresh Claude Code session. Agentic prompt with real system access. Requires Phase 0.

## Context (carry forward)
- Backend is **Neon Postgres + Drizzle**, NOT Convex. UI → Server Action → `lib/services/*`
  → Neon. Never touch `convex/`.
- Findings: `.claude/data-audit/docs/plans/Plan-Workflow-Audit.md` journey 8. Read it first.
- Destructive actions MUST use the Phase 0 `<ConfirmAction>` + `logActivity`.
- Security on every mutation: Zod → auth → ownership (IDOR) + **role** → generic errors.

## Starting state (verify each path by reading it first)
- `PortfolioPage.tsx` + `PropertyTable.tsx` (~`:380`) — rows are clickable but there is
  **no `(…)` row-action menu and no delete affordance**. Archived rows show "Restore".
- Backend exists: archive/restore is `updateProperty(ctx, id, { isArchived })`
  (`app/actions/properties.ts` / `app/(shell)/property/actions.ts` — verify which is live);
  hard delete is `deleteProperty` (~`app/actions/properties.ts:60-70`) and is currently
  **unreachable from the UI**. The hard delete cascades (removes leases/payments/documents).

## Target state — build
1. **Row `(…)` menu** on each portfolio row (shadcn `DropdownMenu`): **View**, **Edit**,
   **Archive** (or **Restore** if already archived), **Delete**.
2. **Archive / Restore** → `<ConfirmAction tier="confirm">` (reversible, so a simple modal),
   wired to `updateProperty({ isArchived })`. Optimistic + toast.
3. **Delete (hard)** → `<ConfirmAction tier="typed">`: the user must type the **property
   name** to enable Confirm; the dialog lists the cascade scope ("This will also remove
   N leases, N payments, N documents"). Compute those counts server-side or pass them in.
   - **Role gate:** only `admin`/`owner` roles may hard-delete. Enforce server-side in the
     action (reject others with a generic error) AND hide/disable the menu item for lower roles.
4. Both archive and delete call `logActivity`. Confirm ownership + role server-side on delete.

## Recommended policy (the owner should confirm)
- **Archive is the default, primary action** (reversible). **Hard delete is rare, gated**
  (typed confirm + admin/owner only) because the cascade is destructive. If the owner prefers
  archive-only with no hard delete, skip task 3's UI and leave the backend handler unused —
  ask before removing it.

## UI craft
- `mobbin` MCP: reference table row-action menu (kebab) + destructive typed-confirm patterns.
- `/impeccable polish` the menu + table after wiring.

## Acceptance criteria
- Every row has a `(…)` menu with the right items for its state (active vs archived).
- Archive → restore round-trips without a manual reload; both write an activity row.
- Delete requires typing the exact property name, shows the cascade counts, is admin/owner-only
  (verified by attempting it as a viewer — rejected server-side), and writes an activity row.
- `tsc`/build passes.

## Forbidden / stop-and-ask
- No new dependencies, no schema/migration changes, no file deletion, no `convex/` edits.
- Confirm the delete policy (archive-only vs gated-hard-delete) with the owner before shipping task 3.
- After each task output `✅ [task]`.

## Stop conditions
- Stop when the menu + archive/restore + guarded delete pass acceptance and build is green;
  summarize files changed and the policy chosen.
- Stop and ask before anything forbidden, or if you can't find a server-side role check to reuse.
