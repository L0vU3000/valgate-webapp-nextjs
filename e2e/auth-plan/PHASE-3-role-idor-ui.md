# Phase 3 — Role + IDOR UI smoke (Playwright + real Clerk)

> Depends on **Phase 0**. Optional/last: a thin browser-level confirmation that the enforcement proven in
> **Phase 1** actually surfaces correctly in the UI. If time is tight and Phase 1 is green, this is a
> nice-to-have, not load-bearing.

## Goal

Confirm in a real browser that:
- a **viewer** sees no destructive controls, and
- **org B** cannot reach **org A**'s pages by URL.

Phase 1 already proves the server enforces both; this phase checks the UI doesn't accidentally expose them.

## Approach

Use the per-role `storageState` files saved in Phase 0 (`viewer-a.json`, `owner-b.json`) so each test starts
already signed in as the right user — no login UI to drive.

```ts
test.describe('viewer cannot delete', () => {
  test.use({ storageState: 'playwright/.clerk/viewer-a.json' })
  test('delete buttons hidden', async ({ page }) => { /* ... */ })
})
```

## Tasks

### Role (signed in as `viewer-a`)
- [ ] **Portfolio** row menu → **no Delete** option (Archive/View/Edit may show; Delete must not).
- [ ] **Documents** → no per-file/bulk delete controls.
- [ ] **Pro clients / work-orders** → no destructive actions.
- [ ] (Server enforcement itself is covered in Phase 1 — no need to forge requests here.)

### IDOR (signed in as `owner-b`, targeting ORG-A's ids)
- [ ] Note an ORG-A id from Phase-0 seed (e.g. `/property/<A-prop-id>`).
- [ ] Navigate there as org B → **not-found / forbidden** page, never A's data.
- [ ] Repeat for a **document**, a **client** (`/pro/clients/<A-client-id>`), and a **work-order** URL.
- [ ] Confirm the portfolio/list pages as org B show **only B's** rows (A's seed property absent).

## Files

- New: `e2e/auth/role-idor.spec.ts` (in the `auth` project).
- Reuse: Phase-0 `storageState` files + seeded per-org data.

## Verification

- Run the `auth` project under Node ≥24 (same command as Phase 2).
- Viewer sees no delete affordances; org B is blocked from every ORG-A URL.

## Risks / notes

- This is **UI confirmation**, not the security test of record — keep it thin. Don't duplicate Phase 1's
  enforcement assertions in the browser (slower, flakier).
- Needs the Phase-0 seed to put a known property/document/client in **each** org.

## Effort: ~1 day (mostly the multi-session plumbing, much of it shared with Phase 0).

---

## When all phases land

Update `e2e/QA-FINDINGS.md`: move Section A / Role / IDOR out of "deferred — manual" into covered, leaving
only the documented exceptions (MFA manual). Add the run command for the `auth` project.
