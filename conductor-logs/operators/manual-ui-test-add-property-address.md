# Manual UI test — add-property address search + pin follow (localhost:3001)

Two behaviours to check. **Both are now unblocked** — the `geo-places:ReverseGeocode` grant was
applied and verified 2026-09-29 (4 live coordinates + the app's own `test:db` lane). See
`apply-reversegeocode-grant.md`.

| Behaviour | Needs IAM grant? |
|---|---|
| (A) Search by street **or property name** ("J Tower 2") → suggestion shows the name, selecting it fills the address | No |
| (B) Drag the map pin → address fields follow the pin | Yes — **granted & verified** |

## Prerequisite: the grant (do this first if you want to test B)

Live probe, this machine, just now:

```
$ aws geo-places reverse-geocode --region ap-southeast-1 \
    --query-position 104.9239 11.5454 --language en \
    --query 'ResultItems[0].Address.Street' --output text

AccessDeniedException: ... User: arn:aws:iam::867418408748:user/valgate-storage is not authorized
to perform: geo-places:ReverseGeocode on resource: arn:aws:geo-places:ap-southeast-1::provider/default
```

So the grant is still open. This identity (`valgate-storage`) cannot read or write its own policies.
An admin runs:

```bash
python3 scripts/grant-geo-places-policy.py            # read current ValgateGeoPlacesBakeoff,
                                                       # merge ReverseGeocode, write back, read back
```

The script **fails closed** (exit 1, writes nothing) if it cannot read the policy first — that is
intended, not a bug. Re-run the `aws geo-places reverse-geocode` probe above to confirm; allow ~30s
for IAM propagation. **No server restart is needed** — the app signs a fresh request per call.

## Before you start

- Server: `next dev --turbopack -p 3001`, running since Sep 28 17:21, healthy (`/` → 200).
- Auth is **real Clerk**, not demo: `DEMO_MODE=false`, `DEMO_ALLOW_WRITES=false`,
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_…`. Do not add `USR-0001`-style bypasses.
- `http://localhost:3001/add-property` returns **404** to `curl` — that is Clerk middleware doing a
  `protect-rewrite` to signed-out (`x-clerk-auth-reason: protect-rewrite, dev-browser-missing`).
  It is not a missing route. In a real browser, sign in first and it loads.
- Keep the browser DevTools **Network** tab open, filter `address`. This is how you tell "grant
  missing" from "code broken".

## Part A — search by property name (no grant needed)

1. Open `http://localhost:3001/login` and sign in as yourself.
2. Go to `http://localhost:3001/add-property`.
3. Step 0 ("Start fresh or pick up where you left off") → **start fresh**.
4. Step 1 → pick any property type → **Continue**.
5. You are on **Step 2 of 6: Basic Information → "Confirm property location"**.
6. In the **"Search address…"** input (has a magnifier icon), type: `J Tower 2`
   (wait for the debounce, ~300 ms, spinner in the field).
7. Expect a dropdown **under** the input. The first line of each row must read the **building name**
   (e.g. `J Tower 2 BKK1`), not just a street number like `Street 398`. That name-first display is
   the change under test — before it, the title was discarded and you saw the street.
8. Click the `J Tower 2` row. Expect: **Street address** fills with the building name, **City**,
   **Province**, **Country**, **ZIP code** fill from the provider, and a **pin appears** on the map.
   Province will only fill if the provider's district is in the fixed English province list; if it
   stays empty, that is the guarded no-match path, not a bug.
9. **Also try a plain street query** (e.g. `Street 398`) to confirm ordinary street search still
   works and does not regress to a blank suggestion line.

Network check for A: one `suggest?q=…` request → **200** with `{"items":[…]}`. A 401 means you are
not actually signed in; a 500 means the provider call failed (check the server log line
`GET /api/v1/address/suggest failed`).

## Part B — pin follows the address (grant required)

1. Stay on Step 2 with a pin on the map.
2. **Note the current address fields** — write them down or screenshot. You need to compare.
3. Drag the pin a few hundred metres to somewhere clearly different (a different street/ward).
4. Release. The lookup runs on **drag end**, not while dragging.
5. Expect: **Street address / City / Province / Country / ZIP** update to the new location.
6. Repeat by dragging to an obviously different area — fields must change again. This is the
   real test: one update could be a coincidence of nearby addresses.

Network check for B: each drag-end fires **one** `reverse?lng=…&lat=…` request.

| Response | Meaning |
|---|---|
| **200** `{"item":{…}}` + fields update | **Pass** |
| **200** `{"item":null}` + fields unchanged | Correct — no address near that pin (water, farmland). Drag somewhere populated. |
| **401** | Not signed in. |
| **500** | Provider rejected the call. If the grant is not applied yet, the server log says `GET /api/v1/address/reverse failed` — expect this **today**. |

Deliberate non-behaviour, not a bug: if a pin resolves to nothing, the **typed** address is left
alone rather than blanked. Likewise only the address sub-fields are overwritten — the pin is
treated as the source of truth for the coordinate.

## Also worth a look (secondary)

- **Expand map** (Step 2, `Maximize2` button) opens the fullscreen picker. Confirming there takes the
  **same** code path as dragging, so its confirm must also refresh the address. Worth one pass.
- Two Mapbox runtime `TypeError`s were reported earlier (`applyProjectionUpdate`,
  `images.get(...)`) and are **unverified/unfixed**. If the map or its tiles misbehave, capture the
  console error text verbatim — that is new information.

## What to send back

For each part: pass/fail, the address fields **before → after**, and the `address` network requests
with status codes. If it fails, the server-side log line is the thing that names the cause.

## Not claimed

- Part B is **not verified by me** — no grant, and the wizard needs a signed-in session I do not have.
- Part A is verified at the API/mapping layer (live `SearchText` returns the building title; a parity
  test fails if the hook discards it) and was seen rendering once. The **click-through in a real
  signed-in browser is your test.**
- Do not submit the property. Step 6 writes to the database; stop before it.
