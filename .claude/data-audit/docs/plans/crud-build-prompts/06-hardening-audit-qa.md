# Phase 6 — Hardening, audit-log surface, QA

> Paste into a fresh Claude Code session. Agentic prompt with real system access. Requires Phases 0–5.

## Context (carry forward)
- Backend is **Neon Postgres + Drizzle**, NOT Convex. UI → Server Action → `lib/services/*`
  → Neon. Never touch `convex/`.
- Findings + P2/P3 backlog: `.claude/data-audit/docs/plans/Plan-Workflow-Audit.md` (§2, §4 Phase 6).
- By now every destructive action uses `<ConfirmAction>` and writes via `logActivity` to the
  `activities` table. This phase surfaces that history and does the final quality pass.

## Starting state
- The `activities` audit table is being written to but has **no UI** (sensitive-data apps need
  a visible "who did what, when" trail).
- Known P2/P3 leftovers: Pro properties register is client-side filtered with a 500-row cap
  (no pagination); lease renewal uses `getUTCMonth()` math that can drift near month boundaries;
  empty/error/loading states are inconsistent; the MFA login path throws "not supported".

## Target state — build
1. **Activity-log surface.** A read-only view (a page or a per-property panel — confirm the best
   spot with the owner) that lists recent `activities` rows: actor, action, entity, timestamp.
   Scope by org/ownership. Paginated or capped with a clear "showing latest N" note.
2. **Pagination on the Pro properties register** — replace the 500-row client cap with real
   server-side pagination (or at minimum surface a clear "showing first 500 of N" notice if
   full pagination is out of scope; do NOT silently truncate).
3. **Lease renewal date fix** — make the renewal end-date math timezone-safe (avoid month-boundary
   drift in `getUTCMonth()`). Add one self-check around the date logic.
4. **MFA decision (ask the owner)** — either implement the MFA login path or disable Clerk MFA so
   users can't hit the "not supported" dead end. Don't leave it throwing.
5. **`/impeccable harden` pass** across the surfaces touched in phases 1–5: empty states, error
   states, loading states, text overflow.
6. **`/impeccable critique`** on every new `<ConfirmAction>` usage for consistency.

## QA — run and fix
- Run `/qa` over all destructive flows built in phases 1–5.
- **IDOR test (critical):** for each mutation, attempt it against another org's resource and
  confirm it is rejected server-side. Document the result per entity.
- Confirm no raw `err.message` reaches the client anywhere; confirm rate-limits on sensitive actions.

## Acceptance criteria
- Activity log is visible, org-scoped, and shows real rows from phases 1–5 actions.
- Properties register no longer silently caps results; renewal date math has a passing self-check.
- MFA path no longer dead-ends (implemented or cleanly disabled).
- `/qa` is green on destructive flows; IDOR attempts are rejected for every entity (documented).
- `tsc`/build passes.

## Forbidden / stop-and-ask
- No new dependencies, no file deletion, no `convex/` edits.
- Schema changes require approval first.
- Get the owner's call on MFA (implement vs disable) and on where the activity log lives.
- After each task output `✅ [task]`.

## Stop conditions
- Stop when acceptance is met, `/qa` is green, and the IDOR results are documented; produce a
  short final report: what shipped across phases 1–6, what's deferred, and any residual risk.
- Stop and ask before anything forbidden.
