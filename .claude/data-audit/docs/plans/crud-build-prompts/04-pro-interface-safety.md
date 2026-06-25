# Phase 4 — Pro interface safety (confirm one-click actions, vendor check, soft-delete)

> Paste into a fresh Claude Code session. Agentic prompt with real system access. Requires Phase 0.

## Context (carry forward)
- Backend is **Neon Postgres + Drizzle**, NOT Convex. Pro mutations live in
  `app/(pro)/pro/actions.ts` → `lib/services/*` → Neon. Never touch `convex/`.
- Findings: `.claude/data-audit/docs/plans/Plan-Workflow-Audit.md` journeys 17–23. Read first.
- The Pro backend is already solid (validation, ownership, generic errors). This phase is
  almost entirely **UX safety** on irreversible actions, plus one server-side check.
- Destructive/irreversible actions MUST use the Phase 0 `<ConfirmAction>` + `logActivity`.

## Starting state (verify each path by reading it first)
- **Mark Rent Paid** — one-click, immediate, no confirm/undo
  (`OverdueList.tsx:~90-100` → `markRentPaid` `actions.ts:~36-52`).
- **Log Payment** — submits immediately, no confirm (`LogPaymentModal.tsx` → `logRentPayment`).
- **Work Order Resolve** — one-click Open→InProgress→Resolved, no confirm
  (`WorkOrdersTable.tsx:~169-178` → `updateWorkOrder` `actions.ts:~164-188`).
- **Safety Risk Resolve** — one-click, no confirm
  (`SafetyRisksCard.tsx:~88-95` → `resolveSafetyRisk` `actions.ts:~271-288`); resolved items
  then vanish with no way to review them.
- **Assign Vendor** — `updateWorkOrder` does NOT verify the vendor exists / belongs to the org
  before saving (`actions.ts:~181`).

## Target state — build
1. **Mark Rent Paid** → `<ConfirmAction tier="undo">` (reversible: store prior status, show a
   5s undo toast that flips it back). Uses the Phase 0 `useDestructiveAction` hook.
2. **Log Payment** → keep the modal; add a clear confirm summary ("Record $X for [lease]?")
   before submit, or a Tier-1 undo toast after. Pick one; comment the choice.
3. **Work Order Resolve** → `<ConfirmAction tier="confirm">` ("Mark this work order resolved?").
4. **Safety Risk Resolve** → `<ConfirmAction tier="confirm">` ("Mark this risk resolved?").
5. **Vendor existence check** — in `updateWorkOrder`, before saving a `vendorId`, look the
   vendor up via the service layer and confirm it exists AND belongs to the caller's org;
   reject with a generic error otherwise.
6. **Soft-delete / lifecycle** — add a **"Cancelled"** terminal status for work orders and an
   **"Inactive"/archive** state for clients (status flag + UI affordance behind `tier="confirm"`).
   If adding a status value requires a schema/enum change, **stop and ask first.**
7. **Audit visibility** — add a "Show resolved" toggle on the compliance safety-risks list so
   resolved items remain reviewable (read-only). 
8. Every state change above calls `logActivity`.

## UI craft
- `mobbin` MCP: reference confirm-before-irreversible + undo-toast patterns.
- `/impeccable polish` the rent + work-order + compliance surfaces after wiring.

## Acceptance criteria
- Mark-Paid shows an undo toast that actually reverts; Resolve actions both confirm first.
- Assigning a non-existent or cross-org vendorId is rejected server-side.
- Work orders can be Cancelled; clients can be set Inactive; resolved risks are viewable via the toggle.
- Every action writes an activity row; ownership still enforced; `tsc`/build passes.

## Forbidden / stop-and-ask
- No new dependencies, no file deletion, no `convex/` edits.
- **Schema/enum changes** (new statuses) require stop-and-ask before you make them.
- After each task output `✅ [task]`.

## Stop conditions
- Stop when tasks pass acceptance and build is green; summarize files changed + any schema
  changes the owner approved.
- Stop and ask before anything forbidden, or if a status enum needs widening.
