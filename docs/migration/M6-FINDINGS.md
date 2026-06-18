# M6 — Findings log (browser smoke)

Triage of issues found during the M6 walk-through. Three buckets: **migration bug** (the swap broke it,
must fix), **pre-existing** (was like this before the migration — out of scope here), **intentional/expected**.

## Migration bugs — fixed
| # | Symptom | Root cause | Fix | Status |
|---|---|---|---|---|
| F1 | `/profile` shows only "(-)" | M5 mapped `db.userProfiles.get(userId,userId)` → `getUserProfile(ctx, ctx.userId)`, which queries the **`id`** column. But a user-profile's `id` is a separate `UPROF-xxxx`; the *current user's* profile is keyed by **`userId`** (as `upsertUserProfile` does). Seeded row has `id="demo-user"`, `userId="USR-0001"` → query by id="USR-0001" missed. | Added `getMyUserProfile(ctx)` (lookup by `userId`); `/profile` + `/settings` queries use it. No re-seed needed. | ✅ fixed (restart to see) |
| F2 | `/settings` profile fields empty | Same as F1 (same call). | Same fix. | ✅ fixed |

## Pre-existing UX (not caused by the migration — log for the design backlog)
| # | Where | Note |
|---|---|---|
| P1 | `/profile` sub-nav "Security" (and siblings) | Those tab buttons aren't wired to routes — no destination. Pre-existing UI stub. |
| P2 | `/add-property` Step 5 Review shows no details to confirm | The review reads what the wizard captured; the earlier form steps don't collect those fields, so the summary is sparse. Wizard-completeness gap, predates the migration. |
| P3 | New property not on the home map | `add-property` defaults coords to the Cambodia centroid when no location is picked (`actions.ts:44`), so an un-located property plots at the centroid (or is cache-delayed), not missing. Verify after a write with a picked location. Not a migration regression. |
| P4 | `/property/[id]/rental` RecentPaymentStep repeats an input from the prior step | Suggestion: surface already-entered info read-only at the top instead of re-asking. Pre-existing wizard UX. |

## Intentional / expected (no action)
| # | Where | Note |
|---|---|---|
| E1 | Safety tab "Coming soon" / disabled | Deliberate — you set it. |
| E2 | "What's a pillar?" (M6 checklist 2.4/2.5) | A **pillar** = one of the 8 property-completeness dimensions that feed the "Progress" stat: Location, Financials, Rental, Ownership, Valuation, Safety, Estate, Docs. "Verify a pillar" = confirm that dimension's data with evidence docs, which raises the Progress score. Terminology, not a bug. |

## Re-test after restart
Restart `npm run dev` (picks up the F1/F2 fix **and** the `DEMO_ALLOW_WRITES` flag), then:
- `/profile` + `/settings` → show **David Lee** + fields (not dashes).
- Writes (create property, resolve safety risk, edit tenant) → persist on reload.
