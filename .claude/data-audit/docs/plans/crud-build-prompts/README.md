# CRUD / Workflow-Hardening — Build Prompts

Each file here is a **standalone, paste-ready Claude Code prompt** for one phase of the
workflow-hardening rollout in `../Plan-Workflow-Audit.md` (§4). Run them in order — later
phases depend on the shared `<ConfirmAction>` system built in Phase 0.

| File | Phase | Goal | Depends on |
|---|---|---|---|
| `00-foundations.md` | 0 | Shared confirm/undo system + audit logging | — |
| `01-documents-stop-the-bleeding.md` | 1 | Fix the P0 dead delete + storage leak | 0 |
| `02-portfolio-lifecycle.md` | 2 | Portfolio row menu: archive + guarded delete | 0 |
| `03-property-sub-entities.md` | 3 | Photos, remove co-owner, verification revoke | 0 |
| `04-pro-interface-safety.md` | 4 | Confirm one-click Pro actions, vendor check | 0 |
| `05-directory-drafts-stubs.md` | 5 | Directory edit/delete, draft persistence, kill stubs | 0 |
| `06-hardening-audit-qa.md` | 6 | Audit-log UI, harden, QA, IDOR test | 0–5 |

## Deferred-decision plans (post phases 0–6 — approved schema changes)
These finish the items the autonomous run deferred. Overview of all 5 in
`../Plan-CRUD-Deferred-Decisions.md`; #1–#3 have detailed build plans here. Owner decisions
locked: **D1 = gated hard-delete**, **D2 = activity log on both per-property + org-wide**.
Unlike phases 0–6 these DO change the schema — each has a migration gate (generate → review SQL →
Neon dev branch → human approval before the real DB).

| File | Item | Goal | Run order |
|---|---|---|---|
| `item-3-statuses-cancelled-inactive.md` | 3 | WO "Cancelled" (enum) + Client "Inactive" (FS) | **1st** (lowest risk) |
| `item-1-activities-audit-log.md` | 1 | General `activities` table + activity-log UI | **2nd** |
| `item-2-property-hard-delete.md` | 2 | Cascade FKs + S3 cleanup → full gated hard-delete | **3rd** (needs item-1 live) |

## How to use
1. Open the phase file, copy the whole thing, paste into a fresh Claude Code session.
2. Review the scope locks + stop conditions before approving any action.
3. Each prompt is **agentic with real system access** — confirm file paths match before it edits.

## Conventions shared by every phase
- **Backend = Neon Postgres + Drizzle** (UI → Server Action → `lib/services/*` → Neon). Never Convex.
- **All destructive actions** route through the Phase 0 `<ConfirmAction>` (Tier 1 undo / 2 modal / 3 typed).
- **Security on every mutation**: Zod validate → auth → ownership (IDOR) → generic errors → rate-limit → soft-delete preferred.
- **UI craft**: `mobbin` MCP for patterns, `/impeccable` for polish/harden.
- **Code style**: long, simple, readable; comment each new function (owner is a backend beginner).
- Paths in these prompts come from the audit and are **approximate — verify by reading first.**
