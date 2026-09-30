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

## Q15 RESULT — GrabMaps vs Mapbox (measured 2026-09-28, all 23 addresses)

| Provider | Hits | Street-level | Street number agrees with query |
|---|---|---|---|
| Mapbox v5 (shipped) | 23/23 | **0/23** | 0 — khan centroid only |
| Mapbox v6 (newer) | 22/23 | **0/23** | 0 — khan centroid only |
| **GrabMaps SearchText** | **22/23** | **22/23** | **13/23 exact, 4 wrong street, 6 unparseable** |

Raw data: `conductor-logs/bakeoff-grabmaps.json`

**Verdict: a decisive class improvement, NOT a solved problem.**

- GrabMaps returns a real street address where Mapbox returns a district centroid. Q15's question
  is answered: **yes, GrabMaps is materially better for Cambodia.**
- But it is street/compound-level, not unit-level. The 8 unit-number variants of
  "No. 172xx, Street 215, Veal Vong" all collapse to ONE result (`#146, St.215`). GrabMaps cannot
  distinguish units within a building — the seed's "No. 172AE1" style codes are not resolvable by
  any provider.
- 4/23 returned a DIFFERENT street than asked: PROP-0017 (asked Street 71 → St 63),
  PROP-0019 (Samdech Pan St 2 → St 228), PROP-0023 (Street 106 → Street 172),
  PROP-0002 (no result at all).
- Distances 443 m – 4849 m from bias point; results are not tight.
- PROP-0021 is actually a HIT: `ផ្លូវ6អេ` is Khmer for "Street 6A" (naive ASCII matching scored it
  wrong).

**Implication:** GrabMaps belongs behind a *suggestion list the user picks from*, never as a silent
auto-resolve — which would have written a wrong street for ~4/23 addresses.

**Cost/ops:** free tier 10k Suggest Label + 20k Core/month for 3 months. Region ap-southeast-1.
Server-side SigV4 only; the key is not public and must never reach the browser bundle.

## Build: GET /api/v1/address/suggest (shipped 2026-09-28, commit ec7f88f)

**One hop** — `SearchText` returns `Position` AND `Address` together, so the planned
Suggest -> GetPlace two-step was dropped: it would have been a second billable call and a
place-id round trip for data already in hand.

| File | Role |
|---|---|
| `lib/services/address.ts` | SearchText wrapper. Reuses the S3 `valgate-storage` principal; region pinned to `ap-southeast-1` (a policy in another region cannot see the provider ARN). |
| `app/api/v1/address/suggest/route.ts` | `GET ?q=` -> `{ items: AddressSuggestionDto[] }`. 400 outside 3-200 chars. Generic 500, never the provider message. |
| `docs/api-spec/valgate-api-v1.yaml` | path + `AddressQuery` + `AddressSuggestionDto`. CI lints with redocly. |
| `tests/address-suggest.test.ts` | 6 tests, incl. "never a single resolved address" and "no message leak". |

Verified: typecheck clean; redocly valid (1 pre-existing license warning); **554/554** unit tests;
6/6 new route tests; and a **real** SearchText call through the service layer returned
`#146, St.215, Sangkat Vealvong, Khan 7Makara` with `position [104.9120247, 11.5545411]`.

### Not done, deliberately
- **The web wizard still uses Mapbox** (`_lib/use-geocode.ts`). Swapping it is a user-facing
  behaviour change, and `.env.local` has **no** `STORAGE_ACCESS_KEY_ID`/`STORAGE_SECRET_ACCESS_KEY`
  — a naive swap would 500 locally where Mapbox currently works. Confirm AWS creds exist per
  environment first.
- **Policy is `SearchText` only** — sufficient. Earlier claims that `Autocomplete`/`GetPlace` were
  needed were wrong.

## Three bugs found and fixed in my own harness (mine, not the API's)
1. `--additional-features Address` → `ValidationException`. The enum name is not exposed in the
   CLI help; the default response already carries the full flat Address. Flag removed.
2. `_err()` reported the `--cli-error-format` boilerplate tail instead of the real AWS message,
   which disguised bug 1 as an access denial and nearly made me re-report Q15 as blocked.
3. `classify()` looked for an `AddressComponents[]` array; the real `Address` is FLAT
   (`Label`/`Street`/`District`/`SubDistrict`/`Locality`/`PostalCode`). This bug made every row
   report locality-level — it would have produced a false "GrabMaps is no better" verdict.

## Next actions
1. ~~Admin runs the `put-user-policy` command~~ — **DONE**, grant verified live.
   `geo-places:SearchText` is now callable by `valgate-storage`.
2. Decide whether to build the Suggest → GetPlace endpoint, given the unit-level ceiling above.
3. Decide fate of the **9 properties on the centroid** (all `ORG-0018`). Re-measured this
   session: 9 of 141 rows exact-match the centroid.
4. Commit the harness + result.

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

## IAM: the repo file is aspirational, not a record (2026-09-28, later)

Two traps found while adding `ReverseGeocode`:

1. **The policy file here never matched what was deployed.** This file held four actions
   (SearchText/Autocomplete/GetPlace/ReverseGeocode) at `f048f1d`, but live probes show
   **only `SearchText`** is granted — `Autocomplete`, `GetPlace` and `ReverseGeocode` all return
   `AccessDeniedException`. Do not treat this file as the current state; it is a draft.

2. **`put-user-policy` replaces by policy NAME, not by Sid.** The deployed name recorded below is
   `ValgateGeoPlacesBakeoff`. A first draft of the grant script invented
   `ValgateGeoPlacesAddressLookup`, which would have created a *second* overlapping policy and left
   the original untouched. The script now reuses the deployed name and has `--list`.

**Probed live grant surface** (valgate-storage, 2026-09-28):

| Action | State |
|---|---|
| `s3:PutObject` / `s3:GetObject` / `s3:DeleteObject` | ALLOW |
| `s3:ListBucket` | DENY |
| `geo-places:SearchText` | ALLOW |
| `geo-places:ReverseGeocode` | DENY ← blocks the pin-follows-address feature |
| `iam:GetUserPolicy` / `iam:ListUserPolicies` | DENY (cannot self-audit) |

GetObject/HeadObject must be probed against an **existing** key: without `s3:ListBucket`, S3 answers
`403` for a missing key even when `s3:GetObject` is allowed, so a nonexistent-key probe reports a
false DENY.
