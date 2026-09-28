---
date: 2026-09-28
project: valgate-webapp
task: Required address + no-centroid guard, and the GrabMaps address bake-off (Q14/Q15)
status: completed
related_files:
  - app/(shell)/add-property/actions.ts
  - app/(shell)/add-property/_components/AddPropertyFlow.tsx
  - app/(shell)/add-property/_components/Step0NewOrDraft.tsx
  - app/_shared/add-property/Step2BasicInfo.tsx
  - app/_shared/add-property/_lib/use-geocode.ts
  - tests/add-property-coords-guard.test.ts
  - scripts/bakeoff-mapbox.py
  - scripts/bakeoff-mapbox-variants.py
  - scripts/bakeoff-grabmaps.py
  - conductor-logs/iam-geo-places-policy.json
  - conductor-logs/bakeoff-mapbox.json
  - conductor-logs/bakeoff-mapbox-v6.json
blockers:
  - "geo-places not callable: valgate-storage lacks geo-places:SearchText, and iam:PutUserPolicy is denied to it too. Q15 cannot run without an admin grant."
next_actions:
  - "Admin: aws iam put-user-policy --user-name valgate-storage --policy-name ValgateGeoPlacesBakeoff --policy-document file://conductor-logs/iam-geo-places-policy.json"
  - "Then: python3 scripts/bakeoff-grabmaps.py  (one command, corpus already staged)"
  - "Decide fate of 9 properties on the Cambodia centroid (all ORG-0018)"
workspace_state:
  repo: valgate-webapp-nextjs
  branch: L0vU3000/seafan
  commit: 6b806bc
  clean: false
  mac_path: /Users/mintrose/orca/workspaces/valgate-webapp-nextjs/seafan
---

# Conductor Session — Required address + no-centroid guard, and the GrabMaps bake-off

## Goal
Stop the add-property flow from saving a property with no user-chosen location, and
find out whether Amazon Location Service's GrabMaps address data beats Mapbox for
Cambodian addresses.

## What changed
- **Two commits on `L0vU3000/seafan`:**
  - `b8538c3` fix(add-property): unique React key for method sub-links.
  - `6b806bc` feat(add-property): require a picked address so no property lands on the centroid.
- Root cause: `map-to-property.ts:17` uses `form.mapCenter ?? CAMBODIA_CENTROID`. Since
  `lat`/`lng` are `NOT NULL`, an unlocated property was written at
  `[104.991, 12.5657]` and the insert still succeeded.
- Guard added at the **server boundary** (`submitPropertyAction`), not just the wizard
  step, so resumed drafts that jump past step 2 are covered too.
- Manual entry now geocodes on blur and sets the pin, so requiring an address does not
  create a dead end. `geocodeQuery()` is shared with the typeahead instead of duplicated.
- Fixed a pre-existing bug that would have made the guard block with **no message**:
  `useEffect(() => setStepErrors(null), [form])` ran on mount and wiped the errors the
  step validation had just set. Now keyed on a previous-form ref.
- Fixed missing error markup so the address error renders in manual mode, not only search mode.
- **Address bake-off (measurement only, no product change):**
  - Mapbox v5 (shipped): 23/23 hit, **0/23 street-level**.
  - Mapbox v6 (newer): 22/23 hit, **0/23 street-level**.
  - `country=kh` + proximity == current behaviour byte-for-byte; `types=address` gives 0/23.
  - GrabMaps half written but **not run** (blocked).

## Decisions made
- **Maps stay on Mapbox.** GrabMaps is for address lookup only (user decision, Q13).
- GrabMaps design is settled as one-hop **`SearchText`**: `Suggest` results cannot be
  stored and GrabMaps `GetPlace` does not support its `IntendedUse` parameter, so
  `SearchText` is the only operation that is both storable and single-hop.
  An AWS documentation reading is **not** legal approval — verify intended-use before shipping.
- I **withdrew** an earlier recommendation that `country=kh` + proximity would improve
  Mapbox precision. Measured: byte-identical results. My earlier advice was based on a
  metric I had not measured.
- The `CAMBODIA_CENTROID` fallback is deliberately **left in place**: three import paths
  call `mapWizardToProperty` legitimately without a `mapCenter`.

## Blockers
- **Q15 cannot run.** Re-tested 2026-09-28 with **Claude Code 2.1.283**
  (`claude -p --allowedTools Bash`) to rule out a Hermes-side limitation. Same principal,
  same verdict — exit 254 both times:
  ```
  aws iam put-user-policy --user-name valgate-storage ...
   → AccessDenied: iam:PutUserPolicy  (authz id 2607qwd9k1otsuwhmnzk47ivi)

  aws geo-places search-text --region ap-southeast-1 --query-text "Phnom Penh"
   → AccessDeniedException: geo-places:SearchText on
     arn:aws:geo-places:ap-southeast-1::provider/default
  ```
  Audited the credentials on this Mac: `~/.aws/credentials` holds **only `[default]`**
  (`valgate-storage`, AIDA4T5RKQ4WCGSCRSDBX) — no SSO, no admin profile, no AWS keys in
  `~/.hermes/.env` or the project env. Infisical holds **no GrabMaps key and no Mapbox
  secret token** (only the public `pk.`). Nothing on this machine can grant the permission.
  Policy JSON is staged at `conductor-logs/iam-geo-places-policy.json`. Nothing was provisioned.
- Note: granting this widens `valgate-storage` past object storage. A dedicated user for
  address lookups would be cleaner.

## Next actions
1. Admin runs the `put-user-policy` command above. **Only this unblocks Q15** — no local
   workaround exists (verified with Claude Code and a credential audit).
2. `python3 scripts/bakeoff-grabmaps.py` — one command; the 23-address corpus is staged
   and the script fails cleanly when blocked (verified).
3. Decide fate of the **9 properties on the centroid** (all `ORG-0018`). Re-measured this
   session: 9 of 141 rows exact-match the centroid.
4. Commit or drop the diagnostic/harness scripts; they are untracked.

## Notes
- **Verification evidence:** typecheck pass, eslint pass, 450 unit tests pass
  (7 pre-existing `lib/api/v1/auth.test.ts` failures reproduce with my changes stashed),
  guard test 3/3 and RED-confirmed, 6/6 browser checks against a live dev server.
- **Unrelated finding, still open:** the user signed in as `12w83b37@` sees 0 properties
  because that account owns `ORG-0054`, not the `ORG-0018` that holds the 108–141 records.
  Correct behaviour, not a bug; it is an account/org question.
- **Env trap encountered:** `.env.local` with real Clerk keys requires `DEMO_MODE=false`
  — `lib/auth/ctx.ts` throws if both are set. `CLERK_SECRET_KEY=demo-no-clerk` is the
  sanctioned no-auth sentinel, but it makes Clerk's script URL `https:///…` and **breaks
  login**. One server cannot serve both modes.
- Dev server left running on **port 3001 only** (user request: one port to avoid confusion),
  on real Clerk keys.
