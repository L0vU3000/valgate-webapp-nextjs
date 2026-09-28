# Manual test plan — address required + pin (Q14 fix)

Branch `L0vU3000/seafan`, worktree `.../orca/workspaces/valgate-webapp-nextjs/seafan`.

## What changed

| File | Change |
|---|---|
| `app/_shared/add-property/Step2BasicInfo.tsx` | Address label is now **required** (was "optional"); renders the error; manual entry geocodes on blur of the Country field and sets the pin |
| `app/(shell)/add-property/_components/AddPropertyFlow.tsx` | Step-2 gate blocks Continue when address is blank or unpinned; demo fixture got a `mapCenter` |
| `app/(shell)/add-property/actions.ts` | Server guard: refuses to create a property with no `mapCenter` |
| `app/_shared/add-property/_lib/use-geocode.ts` | Extracted `geocodeQuery()`; added `lookup()` for the manual path |
| `tests/add-property-coords-guard.test.ts` | 3 tests (RED-verified) |

**Two pre-existing bugs found and fixed while testing:**

1. `AddPropertyFlow.tsx` — `useEffect(() => setStepErrors(null), [form])` also ran **on mount**, so any
   validation error was wiped before it could render. My guard would have blocked with *no message*.
   Now uses a prev-form ref and clears only on real edits.
2. `Step2BasicInfo.tsx` — the address error was rendered **only in the search-mode block**, so manual
   mode blocked silently. Added to the manual block.

**Root cause fixed:** `map-to-property.ts:17` — `form.mapCenter ?? CAMBODIA_CENTROID` silently placed
properties with no picked location at `104.991, 12.5657` (Kampong Thom countryside). 9 of 141 live
rows sit on that exact centroid.

## Setup

Server: demo mode (`DEMO_MODE=true`, `DEMO_ALLOW_WRITES=true`) on **<http://localhost:3002>**,
run from this worktree so the changes are live.

Three gotchas that cost real debugging time:

- Use **`localhost`**, *not* `127.0.0.1` — Next blocks cross-origin `/_next/*` on the IP form and
  hydration silently breaks.
- Go straight to **`/add-property?step=2`**; the "Get Started" button is covered by a Clerk dev modal
  that intercepts clicks.
- `.env.local` was edited for this (backup at `.env.local.seafan-backup`): `CLERK_SECRET_KEY`
  commented out (it forced the Clerk middleware path → 404 instead of DEMO_MODE) and
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` emptied (Clerk's "Organizations feature required" modal
  covered the UI). **Restore with `cp .env.local.seafan-backup .env.local` when done.**

Automated check (already passing 6/6): `node scripts/verify-guard.mjs http://localhost:3002`

## T1 — blank address is blocked (main path)

1. Open `/add-property`, pick a property type, Continue to **Step 2**.
2. Fill **Property Name** only. Leave the address search box empty.
3. Press **Continue**.

**Expect:** blocked, stays on Step 2. Search box shows an amber ring and reads
*"Please enter the property address"*. Footer says *"Please fix the highlighted fields to continue"*.

- [ ] pass  - [ ] fail

## T2 — typed-but-unpicked address is blocked

1. On Step 2, type a partial address into the search box (e.g. `No. 172 Street 215`) but
   **do not** click any suggestion.
2. Press **Continue**.

**Expect:** blocked. Message reads *"Please enter the property address"*.

> Note: typing in the search box does **not** set `addressLine` — only clicking a suggestion does.
> So the message is the *empty-address* one, not the pick-a-suggestion one. (Verified in the browser;
> an earlier draft of this doc wrongly expected the latter.)

- [ ] pass  - [ ] fail

## T3 — picking a suggestion pins it, and Continue works

1. In the search box type `Street 215 Phnom Penh`, wait for the dropdown, **click a suggestion**.
2. **Expect:** the dropdown fills Address/City/Province/Country/ZIP; the green banner reads
   *"Location pinned at 11.xxxx°, 104.xxxx°"*; the map moves to the pin.
3. Press **Continue** → proceeds to Step 3.

- [ ] pass  - [ ] fail

## T4 — manual entry geocodes on blur (the dead end that was fixed)

1. On Step 2, click **Enter address manually**.
2. Fill: Street address `No. 12, Street 106`, City `Phnom Penh`, Province `Phnom Penh`,
   Country `Cambodia`. (Country is the last field.)
3. **Click out of the Country field** (tab or click elsewhere).

**Expect:** within ~1s the green *"Location pinned at …"* banner appears (the hint text
*"Fill in the address above — we'll pin it on the map automatically."* is showing before that).
The address fields keep **your** text — they are not rewritten.
4. Press **Continue** → proceeds to Step 3.

- [ ] pass  - [ ] fail

## T5 — manual entry that cannot be geocoded still blocks (no centroid)

1. Enter a nonsense address manually (e.g. Street `zzzzqqq`, City `zzzz`).
2. Blur the Country field, then press **Continue**.

**Expect:** stays blocked with the *"Select your address from the suggestions…"* message.
**Critically:** no property is created. Before this fix it would have been created silently at the
Cambodia centroid.

- [ ] pass  - [ ] fail

## T6 — the pin can still be dragged, and the map fallback is gone

1. Pick a suggestion (T3), then drag the map pin to a different spot.
2. **Expect:** the coordinate in the green banner changes to match the drag, and Continue still works.

- [ ] pass  - [ ] fail

## T7 — submit with a pin creates the property normally

1. Complete Steps 3–5 with any values, press **Submit**.
2. **Expect:** property created, success screen. Check the property's location on the map is
   somewhere sane in Cambodia — **not** at `12.5657, 104.991`.

- [ ] pass  - [ ] fail

## Regression checks

- [ ] `/add-property` → **Load demo** (dev-only) reaches and passes Submit (fixture now carries a `mapCenter`).
- [ ] Resuming a **saved draft** into Step 2 still works, and its address/pin state is as saved.
- [ ] The **scan** path (upload a document on Step 1) still fills the address fields and badges them.
- [ ] Editing an existing property (`/property/<id>/edit`) still saves — including one of the
      **17 rows with a blank address**, which is why this was *not* made required in the zod schema.

## Known limits (not bugs — deliberate)

- Pin precision is a **khan/commune centroid**, not a street address. Measured: Mapbox v5 returns
  `locality`-type results for 22/23 real Khmer addresses, and tightening `types=address` returns
  **0/23**. This is the ceiling that GrabMaps (Q15) is meant to lift — still blocked on AWS access.
- Manual-entry geocoding is **silent on failure** (no spinner, no error). The step-2 gate explains it.
- The blur lookup fires once, on leaving the Country field, and is skipped if a pin already exists.

## How to report back

Say e.g. `T1 pass, T3 fail: <what you saw>`. Then I'll fix and re-run.
