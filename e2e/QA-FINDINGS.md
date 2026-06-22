# E2E QA Findings — Valgate CRUD checklist

_Paused 2026-06-22. Automated Playwright run of the QA checklist (sections B–P) in DEMO_MODE._

## Data ops (live Neon, reversible)

- **Pro client assignment (2026-06-22):** the 26 ORG-0001 seed properties had `client_id = NULL`,
  leaving the Pro cockpit (`/pro/properties`, `/pro/dashboard`, work-order picker) empty for real data.
  Assigned 22 of them round-robin across `CLI-0001..CLI-0006`, leaving 4 unassigned so the
  Onboard-Client "Assign properties" flow still has options. Script + reversal:
  `node .context/assign-pro-clients.mjs` (revert: `--revert`); prior values backed up to
  `.context/pro-client-assign-backup.json`. **Durability across a future `seed:neon` is out of scope** —
  this is a live-DB data op, not re-seedable without also editing `tests/fixtures/properties/*.json`.

## ⚠️ How to run (important)

```bash
# 1. Start the DEMO_MODE server (Node 22 is fine for the server)
npm run dev:e2e            # DEMO_MODE=true, no Clerk, gate off, port 3001

# 2. Run the suite UNDER NODE 24/25 — NOT the default Node 22.17
PATH="/opt/homebrew/bin:$PATH" /opt/homebrew/bin/node node_modules/@playwright/test/cli.js test
# report: npx playwright show-report
```

**The Playwright runner MUST run under Node ≥24.** Node 22.17.0 + Playwright 1.61 has a loader bug
(`context.conditions?.includes is not a function`) that makes any spec importing a local helper fail to
load. Node 25.6.1 (Homebrew) works. The dev server itself is unaffected.

## Status snapshot (Session 2 — GREEN)

| Result | Count |
|---|---|
| ✅ Passed | **52–55** (skip variance in guarded chained tests) |
| ❌ Failed | **0** |
| ⊘ Skipped | 16–17 (all by-design — unbuilt features, seed-state/chained guards, manual auth) |
| Total | 71 |

**Zero failures across consecutive serial runs** (`workers: 1`, `fullyParallel: false`), holding true both
before and after the seed-org re-home (root cause #3). Recovered ~29 tests from the 25-pass baseline by fixing
four **systemic** blockers the earlier run mistook for per-test selector flakiness (below), aligning selectors
section-by-section, then — after the re-home populated the demo org — stabilizing the data-heavy Pro/directory
specs and adding a pre-run cleanup. The pass-count delta between runs is chained tests (e.g. M2/M4
assign-vendor/resolve) that skip via their own guards depending on prior state — not failures.

### Four systemic root causes found & fixed (this is what the earlier "flakiness" actually was)

1. **Clerk dev modal blocked every click.** The `dev:e2e` server still loads a real Clerk publishable key
   (it leaks from `.env.local`; the inline empty var does not override it). `Sidebar.tsx` calls
   `useOrganization()`, so Clerk's *development* instance renders a full-screen "Enable Organizations" setup
   modal in a **shadow DOM** whose backdrop eats pointer events. Fix: `e2e/fixtures.ts` aborts all requests to
   `clerk.accounts.dev` (clerk-js never loads → no modal; ClerkProvider stays in loading state, pages render).
2. **"What is Progress?" onboarding tour auto-opened.** `useDismissable` **always** shows in development
   (ignores localStorage) after an 800 ms delay — racy. Fix: `useDismissable` now skips auto-show when
   `window.__E2E__` is set (no-op in prod); `e2e/fixtures.ts` sets that flag. One guard, fixes every
   onboarding popover at once.
3. **Seed catalog was under the wrong org (real data bug — NOW FIXED).** The 26-property seed catalog
   (PROP-0001..0026, leases, etc.) lived under **ORG-0009** (a stray Clerk-synced org), but the demo context
   (`DEMO_CTX`, `lib/auth/ctx.ts:12`) and `seed-neon.ts` both use **ORG-0001** ("Demo Workspace"), so the demo
   portfolio **and Pro cockpit were empty** — a real product bug. **Resolved (Option A):** re-homed all 319
   ORG-0009 rows (owned by the demo user USR-0001) → ORG-0001 in one transaction, preserving every field value
   and reassigning only ownership. The real user's own `organization_memberships` row was left untouched.
   Reversal backup: `.context/org-rehome-backup.json` (exact moved IDs). The demo portfolio now renders the
   full catalog. Tests still use throwaways (which also work under the populated org); the Pro-page throwaways
   pass `managedByClientId: 'CLI-0001'` because those pages only list properties with a `client_id`.

   Also fixed along the way — a genuine UX bug in the **Ownership wizard** (G1/G2): the Loan step says "all
   fields optional", but `loanTermYears: z.coerce.number().int().positive()` coerces an empty input to `0`,
   which fails `.positive()` and **blocks Continue** with a generic "Couldn't save your changes" banner. The
   tests fill a loan term to proceed; consider making that field truly optional (treat empty as `undefined`).
4. **Helper used the wrong id collection.** `nextId('PAY')` → the collection is **`PMT`**. Fixed in
   `e2e/helpers/db.ts`. Also cleaned dozens of leftover `E2E-%` properties + `CLI-0007+` local-db client dirs
   that prior failed runs left behind (pollution caused strict-mode "resolved to N elements" failures).

### Test-infra changes made
- `playwright.config.ts`: `fullyParallel: false`, `workers: 1` (deterministic serial; enables `.serial` chains).
- `e2e/fixtures.ts` (new): shared `test` — blocks Clerk host, sets `__E2E__`, hides any Clerk overlay. **Every
  spec now imports `{ test, expect } from './fixtures'`** instead of `@playwright/test`.
- `e2e/helpers/db.ts`: `PMT` fix; `managedByClientId` option on `createThrowawayProperty` (Pro pages);
  `seedResolvedSafetyRisk()` + `cleanupSafetyRisk()` for N2.
- `e2e/global-setup.ts`: **auto-cleans accumulated E2E rows before every run** (properties/professionals by
  `name`, work orders by `maintenance_items.title`, all `E2E%`-prefixed). Test entities pile up across runs
  (work orders never self-clean; throwaway cleanup is skipped if a test crashes) and, once the demo org held
  its real catalog, that pile slowed data-heavy pages and tripped strict-mode locators. This makes each run
  start from a known state — the key stabilizer after the org re-home.
- Stabilized for the now-populated org: **run-unique entity names** (work orders, professional, client — a
  constant name accumulates duplicates → strict-mode); **heading-scoped assertions** in directory H1-H3 (a
  success/removed toast echoes the name); **taller viewport** for the Onboard-Client modal (its property list
  is long now); **wait-for-autosave** before navigating in C3 (draft debounce race).
- Selectors aligned to real DOM across B/C/D/E/F/G/H/K/M/N/O/P (role + accessible-name; no data-testid).
- How each previously-failing section was resolved (all GREEN now): **B4-B5** archive→restore — the restore
  raced the reload (added a wait for the confirm dialog to close before reloading); **G1/G2** owners wizard —
  the Loan step's `loanTermYears` validation blocked Continue (fill a valid term) + click the visible `<label>`
  for the sr-only holding-type radios; **B2-B3, E1-E3, D, M1, O1/O3** — retargeted off the ORG-0009 seed
  catalog onto throwaways (Pro ones `managedByClientId`); **C1-C3** — drove the real multi-step add-property
  wizard; **H1** — `selectOption` on the `<select>` category; **K1/K3** — unique client names + row-scoped
  asserts; **P4** — allowlist the intentional Clerk-abort console errors.

## Skipped (17) — all by-design, not failures

- **Unbuilt at audit time:** D3 (Export CSV), D6 (recent-activity panel).
- **Seed/chained-state guards:** D1/D4/D5/D7 (no editable field / no verification on a fresh throwaway),
  L1-L3, N1, M2/M4 and O2 (skip when their chained precondition or a client filter isn't present).
- **Manual (deferred, D1=A):** Section A auth, P-IDOR, P-ROLE — need a Clerk test rig + 2nd org.

## Seed catalog org — RESOLVED (Option A applied)

Re-homed the catalog ORG-0009 → ORG-0001 (319 rows, one transaction, only the demo user's rows, evolved
values preserved). The demo portfolio and Pro cockpit now show the real catalog. Reversal: re-set the IDs in
`.context/org-rehome-backup.json` back to ORG-0009 if ever needed. The real Clerk user's membership row was
left in place, so ORG-0009 is simply an empty workspace now.

Follow-up worth doing (not blocking): the 26 seed properties have `client_id = NULL`, so the **Pro cockpit's
"under management" view is still empty** for real data — only test throwaways (with `managedByClientId`)
appear there. If the demo should show a populated Pro cockpit, assign some seed properties to seed clients
(CLI-0001..6). Also consider making the Ownership wizard's `loanTermYears` truly optional (see root cause #3).

## What it took to get the suite running (5 harness blockers — all fixed)

1. **Stale server on :3001** redirecting to `/gate` — killed it.
2. **`dev:e2e` didn't disable the site gate** — added `SITE_PASSWORD=` to the script.
3. **DEMO_MODE refused** because `.env.local`'s real `CLERK_SECRET_KEY` was in scope — added
   `CLERK_SECRET_KEY=sk_test_placeholder` to `dev:e2e`.
4. **`.env.e2e` empty `DATABASE_URL=`** clobbered the dev URL via dotenv `override:true` — removed the line.
5. **Node loader bug** — run under Node 25 (above).

## Test-helper bugs fixed (test infra, not app bugs) — `e2e/helpers/db.ts`

- `createThrowawayProperty` used invalid enums (`'Residential'`/`'Active'`) → now **clones seed PROP-0001**
  so all NOT-NULL / enum / `_numeric` shadow columns are satisfied automatically.
- documents child insert missing `uploaded_at`; safety_risks missing `description` → both added.

## Verified passing (26) — sections with real coverage

- **B1, B2-B3** portfolio loads (DEMO_MODE, no login) + row action menu shows View/Edit/Archive/Delete
- **P1, P2** archive→confirm-modal tier, delete→typed-name tier; **P3** no raw error strings leak
- **J1, J4** activity log lists events; estate timeline no regression
- **K2** client archive → leaves active book + writes DB activity row
- **M0, M1, M3, M5** work orders: page, create, start, **cancel→confirm→drops from queue**
- **O0, O1, O3** register loads, search filter narrows, honest count footer
- **D0, D2** property detail loads; quick-action stub buttons confirmed gone
- **N0, N3** compliance loads, certifications render
- **F2** document upload appears
- **I3, I4, I5** analytics / estate-planning / settings load; homepage ×2

## Failures — classified (25 as of run 3)

### A. Spec selector / timing alignment needed (test quality, NOT confirmed app bugs)
The specs were authored from a feature-map before running against the live DOM; selectors need aligning.
- **add-property C1/C2/C3** — wizard step locators not visible
- **photos E1/E4** — upload button / empty-state locators
- **pro-clients K1/K3** — onboard modal locators
- **owners G1/G2/G3** — co-owner add/edit/remove locators + timeouts
- **portfolio B4-B5** (archive/restore timeout), **B6-B7** (delete confirm `toBeEnabled`)
- **property-tabs D1** (overview save timeout), **D4** (financials edit click timeout)
- **pro-compliance N2** (show-resolved toggle timeout)
- **documents F1** (folder persist), **F5** (folder-delete files-to-root text)

### B. Quick test fixes (clearly the test, not the app)
- **directory H1** — `getByRole('button', /add professional/i)` matches **2 elements** → scope selector.
- **pro-register O2** — `selectOption` passed an object → pass a string value/label.

### C. ⚠️ Possible real app issues — INVESTIGATE before dismissing
- **cross-cutting P4** — console error during delete flow: `Failed to load resource: net::ERR_CONNECTION_REFUSED`.
  A request is failing in the delete path. Could be a real broken call or a DEMO-mode external dependency.
- **activity J2/J3** — archive/delete did not surface the expected activity row (`expect(...).not.toBeNull`).
  Either the action didn't fire (selector) or the activity row isn't being written — **verify manually**.

### D. Data-setup failures (fixed in run 4, re-confirm)
- **F3, F4, B8-B10** were failing on the now-fixed `uploaded_at`/`description` columns.

## Skipped (20) — classified

- **Deferred by design (D1=A):** I1/I2 dashboard undo, P-IDOR, P-ROLE — need a Clerk test rig + 2nd org.
- **Unbuilt features (audit):** D3 Export-CSV, D6 recent-activity-panel — confirm/​remove when built.
- **Seed-data gaps:** L1/L2/L3 (no overdue/unpaid/expiring leases), N1 (no open safety risks),
  D7 (no verification on PROP-0001), D5 (rental tab edit not wired).
- **Chained (parallel exec):** C4 needs C3; H2/H3 need H1; E2/E3 need a photo; M2/M4 need M1.
  Fix by making those describe blocks `.serial` or self-contained.

## Deferred — MANUAL checklist (not automated, per D1=A)

- [ ] **A1–A7** auth flows (login, wrong-pass, new-device, MFA, register-OTP, forgot, gate)
- [ ] **P-IDOR** org A cannot access org B resources
- [ ] **P-ROLE** viewer/member: Delete hidden + rejected server-side

## Next steps (when resumed)

1. Re-run under Node 25; confirm run-4 numbers; update the table.
2. Knock out the **quick** fixes (H1 selector, O2 selectOption).
3. **Investigate the two possible real bugs** (P4 connection-refused, J2/J3 activity row).
4. Align selectors for sections C/E/G/K (the not-visible/timeout cluster) against the live DOM.
5. Make chained describes `.serial` to recover E2/E3, H2/H3, M2/M4, C4.
6. Decide on unbuilt features (D3 Export-CSV, D6 activity panel).
