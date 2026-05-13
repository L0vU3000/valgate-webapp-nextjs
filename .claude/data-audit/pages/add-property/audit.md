---
slug: add-property
route: /add-property
revision: 3
date: 2026-05-13
verdict: "🟢 14 COLLECTED · 13 DEFERRED-BY-DESIGN · 11 PFn (6 resolved: PF1–PF5, PF9; 5 open) — both P0 bugs + schema + status field landed; remaining work is dead-drafts-clean (PF4 done), persistence model (PF6), address search (PF8), 14 deferred-by-design fields (PF10), file storage (PF7), RHF (PF11)"
---

# Page Audit — /add-property
_Last revised: 2026-05-13 · Revision 3 (PF4 + PF5 + PF9 resolved)_

_See [plan.md](./plan.md) for the action items derived from this audit._

## TL;DR

- ✅ **PF1 (P0) — Lat/Lng swap bug — RESOLVED in Revision 2.** `actions.ts:37` now destructures `[lng, lat]` and `CAMBODIA_CENTROID` is reordered to `[104.991, 12.5657]` to match the UI's `[lng, lat]` convention.
- ✅ **PF2 (P0) — Step 4 file inputs unwired — RESOLVED in Revision 2.** `Step4PhotosDocs.tsx` now has `handlePhotoChange` and `handleDocChange` handlers wired to both `<input type="file">` elements. Selecting files pushes filenames into `form.photos` / `form.documents`.
- ✅ **PF3 (P1) — `buyNumeric` defaults to 0 — RESOLVED in Revision 2 (interim).** `actions.ts:36-39` now falls back to `currentMarketValue` when `purchasePrice` is unset. Until a proper acquisition flow exists on `/property/[id]/ownership`, this prevents portfolio KPIs from undercounting.
- ✅ **PF4 (P1) — dead drafts file + dual storage keys — RESOLVED in Revision 3.** Deleted `_lib/drafts-storage.ts`. `_lib/use-drafts.ts` now uses namespaced key `valgate:add-property:drafts:v1`, strips File blobs on persist, and migrates legacy `add-property-drafts` entries on first read.
- ✅ **PF5 (P1) — validation too permissive — RESOLVED in Revision 3.** `fullPropertySchema` now requires `propertyType` (8-value enum), `propertyName`, `addressLine`, `totalArea` (numeric), `status` (3-value enum), and `currentMarketValue` (digit-only). Submit returns the first field-level message (e.g. "Please enter a property name") instead of a generic banner.
- ✅ **PF9 (P2) — `status` hardcoded — RESOLVED in Revision 3.** New `WizardStatus` enum (`Rented | Vacant | Owner-Occupied`); `Step3Financial.tsx` renders a 3-button selector at the top of Step 3 (heading changed to "Status and value"); `actions.ts` uses `form.status` with a "Vacant" fallback for safety. `title` field remains hardcoded `"—"` (decision: low priority — title-deed status doesn't belong in the wizard).
- 🔴 **PF4 (P1) — Two competing drafts implementations.** `_lib/use-drafts.ts` (key `"add-property-drafts"`) is the live one; `_lib/drafts-storage.ts` (key `"valgate:add-property:drafts:v1"`) is dead code.
- ✅ **13 COLLECTED fields reach the Property entity** (propertyType, propertyName, totalArea, addressLine, addressLine2, city, province, zip, country, mapCenter→lat/lng, currentMarketValue, photos[], documents[]).
- 📋 **14 DEFERRED-BY-DESIGN fields** are transformed in `mapWizardToProperty` but never captured in the UI — by user direction, these belong to later routes (see PF11).
- 🟡 **7 additional PFn (P1–P3)** cover validation gaps, dead drafts code, address search non-functionality, hardcoded `status`/`title`, draft persistence model, file storage model, form-state framework choice.

## Contents

| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Surface Inventory | What does each step ask for, and where does it land? | 7 step tables |
| 2 | Page-wide findings | What systemic problems span the whole wizard? | 11 PFn |

## Glossary

This audit uses an **input-form taxonomy** (display-page audits keep the standard WIRED/HARDCODED/PARTIAL/CHROME/DECORATIVE classification):

- **COLLECTED** — Field captures user input · destination entity+field known · write path exists
- **COLLECTED-PARTIAL** — Captured but destination or write path incomplete (e.g. file blobs filtered before persist, or transform mishandles the value)
- **COLLECTED-UNMAPPED** — Captured but no destination
- **DEFERRED-BY-DESIGN** — `Property` field exists in schema + transform, but intentionally not in wizard UI (later route owns it)
- **VALIDATION-GAP** — Captured but no Zod / client validation enforces correctness (overlay attribute on a COLLECTED row)
- **CHROME** — Step labels, button copy, section headers
- **DECORATIVE** — Animations, gates, icons, sparkles, success confetti
- **BROKEN** — Element appears interactive but does not work (e.g. file input without `onChange`)

**PFn** — Page-wide finding number. Filed once at the page level; per-datapoint audits cite instead of restating.

---

## 1. Surface Inventory

> **Plain opener:** The wizard has 7 steps (0 through 6) on a single route. Across those steps the user can fill in 13 fields that actually get saved to the database. Another 14 fields exist in the data transform but no step asks for them — these are intentionally deferred to other parts of the app. Several controls look interactive but do nothing (file inputs, address search). Step 6 is a celebration screen with no inputs.

### Step 0 — New or Draft (`Step0NewOrDraft.tsx`)

| # | Element | Class | Source / Destination | File:line |
|---|---|---|---|---|
| 0.1 | "Back to Portfolio" button | CHROME | `router.push("/portfolio")` | `Step0NewOrDraft.tsx:184-205` |
| 0.2 | "Add a property" h1 + subtitle | CHROME | static labels | `Step0NewOrDraft.tsx:207-222` |
| 0.3 | Method card: "Take a photo" | CHROME | sets `form.method = "photo"`, opens hidden file input | `Step0NewOrDraft.tsx:128-140` |
| 0.4 | Method card: "Upload document" | CHROME | sets `form.method = "upload"`, opens hidden file input | `Step0NewOrDraft.tsx:141-152` |
| 0.5 | Method card: "Enter manually" | CHROME | sets `form.method = "manual"` | `Step0NewOrDraft.tsx:153-164` |
| 0.6 | Photo file picker → `form.photoFile`, `form.photoFileName` | COLLECTED-PARTIAL | `photoFileName` eventually becomes `photoStorageIds[0]` on submit, but actual blob is filtered in `drafts-storage.ts:7-8`; storage upload doesn't exist | `Step0NewOrDraft.tsx:99-109, 224-231`; `actions.ts:65` |
| 0.7 | Upload file picker → `form.uploadFile`, `form.uploadFileName` | COLLECTED-PARTIAL | same as 0.6 → `documentStorageIds[0]` | `Step0NewOrDraft.tsx:111-121, 232-238`; `actions.ts:66` |
| 0.8 | "Resume a draft" section | WIRED | reads `localDrafts` (from `useDrafts()`) + server `drafts` prop | `Step0NewOrDraft.tsx:284-321` |
| 0.9 | Per-draft: title, type icon, "Nh ago" timestamp | WIRED | `draft.title`, `draft.form.propertyType`, `draft.updatedAt` | `Step0NewOrDraft.tsx:285-300, 462, 566-571` |
| 0.10 | Delete confirmation row | CHROME | local component state | `Step0NewOrDraft.tsx:465-531` |
| 0.11 | "Load demo data" button | CHROME | calls `handleLoadDemo` → injects 22-field demo `FormData`, jumps to Step 5 | `Step0NewOrDraft.tsx:606-632`; `AddPropertyFlow.tsx:130-167` |
| 0.12 | Advisor modal (first-visit) | DECORATIVE | overlay; both CTAs just close it | `AdvisorModal.tsx`; `AddPropertyFlow.tsx:264-269` |
| 0.13 | HowItWorksGate (interstitial before Step 1) | DECORATIVE | static education content | `how-it-works/index.tsx`; `AddPropertyFlow.tsx:229-237` |

### Step 1 — Property Type (`Step1PropertyType.tsx`)

| # | Element | Class | Source / Destination | File:line |
|---|---|---|---|---|
| 1.1 | "What type of property…" heading + subtitle | CHROME | static labels | `Step1PropertyType.tsx:75-82` |
| 1.2 | 8 property-type cards (Residential, Commercial, Multi-Unit, Retail, Land, Industrial, Construction, Other) | COLLECTED | click → `form.propertyType = t.key` → `goNext()` | `Step1PropertyType.tsx:85-126` |
| 1.3 | Per-card icon + label + sub-label | CHROME | `propertyTypes` constant + `lucide-react` icons | `Step1PropertyType.tsx:58-67, 114-120` |
| 1.4 | Card gradient backgrounds | DECORATIVE | `TYPE_ACCENT` constant | `Step1PropertyType.tsx:15-56` |

**Validation:** `step1Schema.propertyType` is `.optional()` (`schemas.ts:3-15`) — user can advance past Step 1 with no type selected. VALIDATION-GAP.

### Step 2 — Basic Information (`Step2BasicInfo.tsx`)

| # | Element | Class | Source / Destination | File:line |
|---|---|---|---|---|
| 2.1 | "Confirm property location" heading + subtitle | CHROME | static labels | `Step2BasicInfo.tsx:43-49` |
| 2.2 | "Property Name" label + input | COLLECTED | → `form.propertyName` → `Property.name` | `Step2BasicInfo.tsx:55-66`; `actions.ts:40` |
| 2.3 | "Total Area (m²)" label + input | COLLECTED | → `form.totalArea` → `Property.totalArea` | `Step2BasicInfo.tsx:69-81`; `actions.ts:67` |
| 2.4 | "Address" label + "Enter address manually" toggle | CHROME | toggles `showManualAddress` | `Step2BasicInfo.tsx:85-94` |
| 2.5 | Address search input (default mode) | COLLECTED-PARTIAL | writes ONLY to `form.addressLine` — no geocoding, city/province/zip/country aren't parsed from the search string; displayed value combines `addressLine + city + province` but typing into it only edits `addressLine` (see PF8) | `Step2BasicInfo.tsx:96-107` |
| 2.6 | Manual: street address input | COLLECTED | → `form.addressLine` → `Property.addressLine` | `Step2BasicInfo.tsx:113-114` |
| 2.7 | Manual: apt/suite input | COLLECTED | → `form.addressLine2` → `Property.addressLine2` | `Step2BasicInfo.tsx:115-116` |
| 2.8 | Manual: city input | COLLECTED | → `form.city` → `Property.city` | `Step2BasicInfo.tsx:118-119` |
| 2.9 | Manual: province `<select>` (CAMBODIA_PROVINCES) | COLLECTED | → `form.province` → `Property.province`. **Only required field** in entire schema (`schemas.ts:22`) | `Step2BasicInfo.tsx:120-131` |
| 2.10 | Manual: ZIP input | COLLECTED | → `form.zip` → `Property.zip` | `Step2BasicInfo.tsx:135-136` |
| 2.11 | Manual: country input | COLLECTED | → `form.country` → `Property.country` | `Step2BasicInfo.tsx:137-138` |
| 2.12 | PropertyLocationMap (Mapbox interactive) | COLLECTED-PARTIAL | drag pin → `setMapCenter([lng, lat])` → `form.mapCenter`. **Bug:** transform destructures `[lat, lng]` from this — see PF1 | `Step2BasicInfo.tsx:142-149, 146`; `actions.ts:37` |
| 2.13 | "Drag the pin…" floating hint | CHROME | static | `Step2BasicInfo.tsx:174-178` |
| 2.14 | "Expand map" button → modal | CHROME | opens `LocationPickerModal` | `Step2BasicInfo.tsx:183-190` |
| 2.15 | "Pinned at X°, Y°" coordinate readout | CHROME | display of `mapCenter[1].toFixed(4)` (lat) + `[0].toFixed(4)` (lng) — note: this display IS correct because it reads positionally; the bug only manifests on save | `Step2BasicInfo.tsx:199-200` |
| 2.16 | Map loading overlay + progress bar | DECORATIVE | conditional on `mapLoaded` | `Step2BasicInfo.tsx:152-170` |

**Validation:** every Step 2 field is `.optional()` except `province` (`schemas.ts:17-31`). VALIDATION-GAP on `propertyName`, `addressLine`, `totalArea`, `city`, `mapCenter`.

### Step 3 — Financial Information (`Step3Financial.tsx`)

| # | Element | Class | Source / Destination | File:line |
|---|---|---|---|---|
| 3.1 | "What is this property worth?" heading + subtitle | CHROME | static | `Step3Financial.tsx:66-72` |
| 3.2 | Currency input ($ prefix) | COLLECTED | → `form.currentMarketValue` (digits-only) → `Property.currentMarketValue` (via `parseCurrency`) | `Step3Financial.tsx:80-94`; `actions.ts:55` |
| 3.3 | "Estimated market value" label | CHROME | static | `Step3Financial.tsx:98-100` |
| 3.4 | "I'll add this later" skip button | CHROME | sets `currentMarketValue = ""`, advances | `Step3Financial.tsx:101-106` |

**Note:** Step 3 collects **only** `currentMarketValue`. It does NOT collect `purchasePrice`, despite `mapWizardToProperty` reading `form.purchasePrice` and `Step5Review` displaying "Purchase Price" as a primary card field. See PF3, PF11.

### Step 4 — Photos & Documents (`Step4PhotosDocs.tsx`)

| # | Element | Class | Source / Destination | File:line |
|---|---|---|---|---|
| 4.1 | "Add photos and documents" heading + subtitle | CHROME | static | `Step4PhotosDocs.tsx:39-50` |
| 4.2 | Photos section header + count | CHROME | static + dynamic count of `form.photos` | `Step4PhotosDocs.tsx:60-73` |
| 4.3 | "Add more" / empty-state "Add photos" button | BROKEN | opens hidden file input via `photoInputRef.current?.click()`, but the `<input type="file">` at line 72 has **no `onChange` handler** — file selections are discarded. See PF2 | `Step4PhotosDocs.tsx:62-73, 117-133` |
| 4.4 | Photos grid (existing photos) | WIRED | renders `form.photos[]` (only populated by demo-data button) | `Step4PhotosDocs.tsx:75-113` |
| 4.5 | Per-photo: filename text + Cover badge (idx 0) + remove button | CHROME (display) | reads `form.photos[i]`; remove button works | `Step4PhotosDocs.tsx:78-110` |
| 4.6 | Documents section header | CHROME | static | `Step4PhotosDocs.tsx:143-156` |
| 4.7 | "Upload" / "Upload documents" button | BROKEN | same as 4.3 — `<input>` at line 155 has no `onChange` | `Step4PhotosDocs.tsx:145-156, 203-221` |
| 4.8 | Documents list (existing) | WIRED | renders `form.documents[]` | `Step4PhotosDocs.tsx:158-201` |
| 4.9 | Per-document: filename + type badge (PDF/Word/Excel) + remove | CHROME | `getDocMeta(filename).label`; remove button works | `Step4PhotosDocs.tsx:161-200` |

### Step 5 — Review & Submit (`Step5Review.tsx`)

| # | Element | Class | Source / Destination | File:line |
|---|---|---|---|---|
| 5.1 | "Review your property details" heading + subtitle | CHROME | static | `Step5Review.tsx:168-173` |
| 5.2 | Section "Property Type": icon + label + sub | WIRED | `PROPERTY_TYPES[form.propertyType]` lookup | `Step5Review.tsx:180-193` |
| 5.3 | Section "Name & Location": propertyName + address lines + city/province/zip | WIRED | direct reads from `form.*` | `Step5Review.tsx:196-207` |
| 5.4 | ReviewMap static image | WIRED | Mapbox static URL using `form.mapCenter[0], [1]` (lng, lat) — **note:** Step 5 reads `mapCenter` positionally correctly; only `actions.ts` has the swap bug | `Step5Review.tsx:56-95, 209` |
| 5.5 | Section "Status & Ownership": ownershipStatus chip + purchaseDate | WIRED (but values empty) | `form.ownershipStatus` (never collected → always "—") + `form.purchaseDate` (never collected → always "—") | `Step5Review.tsx:213-238` |
| 5.6 | Section "Financial Details": purchasePrice + currentMarketValue + (conditional) interestRate + monthlyPayment | WIRED (with gaps) | Purchase Price renders `formatCurrency(form.purchasePrice)` → always "—" (PF3). Market Value renders correctly. Interest & monthly conditionally hidden because never collected | `Step5Review.tsx:241-273` |
| 5.7 | Section "Photos" (conditional on length > 0) — first 4 + "+N more" overlay | WIRED | `form.photos.slice(0, 4)` + `extraPhotos` count | `Step5Review.tsx:276-313` |
| 5.8 | Section "Documents" (conditional) | WIRED | `form.documents[]` | `Step5Review.tsx:316-344` |
| 5.9 | Edit buttons (5×) | CHROME | `goToStep(N)` callback | `Step5Review.tsx:124-131` |

### Step 6 — Success (`Step6Success.tsx`)

| # | Element | Class | Source / Destination | File:line |
|---|---|---|---|---|
| 6.1 | Map hero (Mapbox static, no pin marker in URL) + animated pin + sonar pulse | WIRED | uses `form.mapCenter` positionally (no swap on display path) | `Step6Success.tsx:302-349, 422-476` |
| 6.2 | Tooltip with property name + price | WIRED | `propertyName`, `priceFallback` | `Step6Success.tsx:399-401, 446-449` |
| 6.3 | Checkmark + sparkles animation | DECORATIVE | SVG + Motion | `Step6Success.tsx:101-129, 483-515` |
| 6.4 | "Your property is on Valgate" h1 | CHROME | static | `Step6Success.tsx:518-526` |
| 6.5 | "Live, secured, and ready to manage" subtitle | CHROME | static | `Step6Success.tsx:529-537` |
| 6.6 | Property card preview (image, badges, name, location, price, ID) | WIRED | `form.photos[0]` OR gradient lookup; `form.ownershipStatus` (defaults to "Listed"); `form.propertyType` label; animated `useCountUp(currentMarketValue || purchasePrice)`; `useTypewriter("ID: " + form.confirmedCode)` | `Step6Success.tsx:540-581` |
| 6.7 | "Complete your property profile" feature unlock card + 5 pills | CHROME | static labels (Equity Tracking, Cash-Flow Reports, Lease Management, Document Vault, Security Monitoring) | `Step6Success.tsx:584-617` |
| 6.8 | "Go to My Portfolio" + "Add more details" CTAs | CHROME | `router.push("/portfolio")` / `router.back()` | `Step6Success.tsx:620-649` |

### Flow shell + persistence (`AddPropertyFlow.tsx` + `_lib/use-drafts.ts`)

| # | Element | Class | Source / Destination | File:line |
|---|---|---|---|---|
| S.1 | "Valgate / Add Property" breadcrumb (Steps 1–5) | CHROME | static | `AddPropertyFlow.tsx:243-247` |
| S.2 | Progress bar (`progressPercent = step / 6 * 100`) | CHROME | derived from step state | `AddPropertyFlow.tsx:218, 248-253` |
| S.3 | "Step N of 6: Label" text | CHROME | `stepLabels[step]` | `AddPropertyFlow.tsx:254-256`; `types.ts:3-11` |
| S.4 | Footer: Back / Save Draft / Continue / Submit | CHROME | navigation callbacks + `handleSubmit()` | `FlowFooter.tsx`; `AddPropertyFlow.tsx:303-313` |
| S.5 | Autosave on form/step change (Steps 1–5) | COLLECTED-PARTIAL | writes `DraftRecord` to `localStorage["add-property-drafts"]` via `useDrafts.upsert`. **Note:** localStorage-only, no server persistence (PF6). Separate dead file `_lib/drafts-storage.ts` uses a different key (PF4) | `AddPropertyFlow.tsx:86-89`; `use-drafts.ts:48-58` |
| S.6 | URL params `?step=N&draftId=X` | CHROME | hydration on mount; replaced on advance | `AddPropertyFlow.tsx:63-83, 97, 187` |
| S.7 | Submit path: `submitPropertyAction(form)` → `fullPropertySchema.safeParse` → `mapWizardToProperty` → `createProperty` | WRITE-PATH | persists Property to local-db FS layer | `AddPropertyFlow.tsx:197-216`; `actions.ts:12-33` |
| S.8 | `confirmedCode` write-back | WIRED | server returns `propertyCode`; client sets into form for Step 6 display | `AddPropertyFlow.tsx:202-204` |

### Hardcoded values in transform (`actions.ts`)

| # | Field | Source | File:line |
|---|---|---|---|
| T.1 | `status = "Vacant"` | hardcoded literal | `actions.ts:42` |
| T.2 | `title = "—"` | hardcoded literal | `actions.ts:73` |
| T.3 | `buyNumeric = parseCurrency(form.purchasePrice) ?? 0` | falls to 0 because `purchasePrice` is never collected (PF3) | `actions.ts:36, 63` |

---

**Tally (audit-relevant classes only — CHROME/DECORATIVE listed for completeness):**

| Class | Count | Notes |
|---|---|---|
| COLLECTED | 13 | propertyType, propertyName, totalArea, addressLine, addressLine2, city, province, zip, country, mapCenter, currentMarketValue, photos[], documents[] |
| COLLECTED-PARTIAL | 4 | photoFile/uploadFile (0.6–0.7), address-search 2.5, mapCenter 2.12 (swap bug), autosave S.5 |
| BROKEN | 2 | Step 4 photo input (4.3), Step 4 document input (4.7) |
| DEFERRED-BY-DESIGN | 14 | purchasePrice, purchaseDate, ownershipStatus, outstandingMortgage, monthlyPayment, interestRate, annualPropertyTax, taxAssessmentValue, annualInsurance, yearBuilt, bedrooms, bathrooms, parkingSpaces, storageUnit |
| VALIDATION-GAP | 24 | every `Property` field except `province` is `.optional()` in `fullPropertySchema` |
| CHROME | ~45 | labels, headings, navigation, edit buttons, success card chrome, feature pills |
| DECORATIVE | ~12 | gates, sparkles, sonar, shimmer, gradients, animations |

---

## 2. Page-wide findings (11 PFn)

> **Plain opener:** Eleven systemic problems span the wizard rather than any single field. Two are silent correctness bugs (lat/lng swap and unwired file inputs) that affect every submission. Four are P1 issues including a financial value that always saves as 0 and a dead-code drafts file. The remaining five cover the planned audit topics: hardcoded defaults, deferred-by-design fields, validation, persistence model, and form-state framework.

**Severity:** 🔴 PF P0 ship-blocker · 🔴 PF P1 robustness · 🟡 PF P2 schema smell · 🔵 PF P3 nit
**Confidence:** high (verified) · medium (inferred) · low (subjective)
**Tags:** `[bug]` · `[schema]` · `[logic]` · `[render]` · `[consistency]` · `[negative-space]` · `[styling]`

---

### ~~🔴 PF1 — Lat/Lng swap in `mapWizardToProperty` (P0 silent correctness)~~ — ✅ resolved in Revision 2
**PF P0 ship-blocker · confidence: high · `[bug]` · `[logic]`**

**Where:** `app/(shell)/add-property/actions.ts:37`

```ts
const [lat, lng] = form.mapCenter ?? CAMBODIA_CENTROID;
```

But `mapCenter` is stored `[lng, lat]` per `Step2BasicInfo.tsx:146`:

```ts
onLocationChange={(lat, lng) => setMapCenter([lng, lat])}
```

And `DEFAULT_CENTER` in Step 2 is `[104.9282, 11.5564]` (`lng, lat` — Phnom Penh has lat ~11.5°, lng ~104.9°).

**Problem:** Every user-pinned property has its lat and lng swapped when persisted to the FS. A pin at Phnom Penh (lng=104.9, lat=11.5) is saved as `lat=104.9, lng=11.5` — a point ~5000 km off the coast of Antarctica. Properties render at wrong locations on every map across the app.

**Why it matters:** Affects `/portfolio` map cluster, `/property/[id]/overview` map card, `/property/[id]/location` page, the home map, and the success-screen pin (Step 6 reads `mapCenter` positionally and is unaffected). Critically, **the `CAMBODIA_CENTROID` fallback in `actions.ts:10` is itself `[12.5657, 104.991]` which is `[lat, lng]`** — so the fallback path is correct, but the user-input path is broken. Anyone who never drags the pin gets a valid default; anyone who interacts gets wrong coordinates.

**Fix:** Either:
- Change `actions.ts:37` to `const [lng, lat] = form.mapCenter ?? [104.991, 12.5657]` and flip `CAMBODIA_CENTROID` ordering, OR
- Standardize `mapCenter` to `[lat, lng]` everywhere (touches Step2BasicInfo onLocationChange + Step5Review ReviewMap + Step6Success SuccessMapBackground which all read positionally).

The second option is preferable since `[lat, lng]` matches `Property.lat` / `Property.lng` field ordering.

**Resolved:** Applied the minimal-touch fix instead — kept the UI's `[lng, lat]` convention (consistent across Step2/5/6 and matches Mapbox's native order) and only changed the wizard's persistence boundary:
- `actions.ts:10` — `CAMBODIA_CENTROID` reordered from `[12.5657, 104.991]` to `[104.991, 12.5657]`
- `actions.ts:37` — destructure changed from `[lat, lng]` to `[lng, lat]`

Wizard-submitted properties now save with correct coordinates.

**Backfill (2026-05-13):** Wrote `scripts/backfill-property-coords.ts` (npm: `backfill:property-coords`). Scans every `public/data/users/<userId>/properties/*/core.json` and classifies each into `ok` / `definite-swap` (lat or lng out of valid range) / `likely-swap` (Cambodia heuristic — lat in lng-range and vice versa) / `unreadable`. Default is dry-run; `--fix` swaps definite-swap rows; `--fix-likely` also swaps Cambodia-heuristic suspects. **Initial run: 20 properties, 0 anomalies.** All persisted records came from `scripts/seed.ts` (which writes lat/lng directly), so the bug never reached disk. Script retained for future use.

---

### ~~🔴 PF2 — Step 4 file inputs are unwired (P0 functional gap)~~ — ✅ resolved in Revision 2
**PF P0 ship-blocker · confidence: high · `[bug]` · `[negative-space]`**

**Where:** `app/(shell)/add-property/_components/Step4PhotosDocs.tsx:72` and `:155`

```tsx
<input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" />
<input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" multiple className="hidden" />
```

Neither input has an `onChange` handler. The visible "Add more" / "Add photos" / "Upload" / "Upload documents" buttons call `photoInputRef.current?.click()` to open the picker, but selected files are discarded.

**Problem:** `form.photos[]` and `form.documents[]` can only be populated by the demo-data button (`handleLoadDemo` in `AddPropertyFlow.tsx:159-160`) which injects predetermined filename strings. A real user clicking "Add photos" sees the OS file picker, selects files, and nothing happens — no error, no preview, no array growth.

**Why it matters:** Step 4 is non-functional. The only path through Step 4 with non-empty arrays is the demo path. Step 5 then hides Photos and Documents sections (`form.photos.length > 0 &&`), so the user never sees a way to recover. The submit succeeds with empty `photoStorageIds` / `documentStorageIds`.

**Fix:** Wire `onChange={(e) => setForm({ ...form, photos: [...form.photos, ...Array.from(e.target.files ?? []).map(f => f.name)] })}` on both inputs (and analogously for documents). This is the minimum to make Step 4 functional with filenames. The full storage upload remains gated by PF7 (Q5.C).

**Resolved:** `Step4PhotosDocs.tsx` now declares `handlePhotoChange` and `handleDocChange` helpers (lines 30–43) that push selected filenames into `form.photos` / `form.documents` and clear the input value to allow re-selecting the same file. Both `<input type="file">` elements have `onChange={handlePhotoChange}` / `onChange={handleDocChange}` wired. Step 4 is now functional with filenames. Full storage upload remains gated by PF7 (Q5.C).

---

### ~~🔴 PF3 — `buyNumeric` always defaults to 0 (P1 silent data integrity)~~ — ✅ resolved in Revision 2 (interim)
**PF P1 robustness · confidence: high · `[bug]` · `[logic]`**

**Where:** `app/(shell)/add-property/actions.ts:36`

```ts
const buyNumeric = parseCurrency(form.purchasePrice) ?? 0;
```

`form.purchasePrice` is **never collected** in any step. Step 3 only asks `currentMarketValue`. The default value is `""` → `parseCurrency` returns `undefined` → `buyNumeric` becomes `0`.

**Problem:** Every wizard-submitted property has `buyNumeric = 0`. This field powers `/portfolio` KPI "Total Purchase Price" (`PortfolioPage.tsx:141`, `derivations/portfolio.ts:reduce((s,p) => s + p.buyNumeric, 0)`) and the YoY-growth heuristic. New properties drag the portfolio total down to zero contribution and confuse YoY.

**Why it matters:** A user adds a $400K house — and the dashboard ignores it. Compounded with PF11 (purchasePrice is DEFERRED-BY-DESIGN to `/property/[id]/ownership`), the fix isn't to ask in Step 3 — it's to remove the dependency. Decide: either (a) prompt for `purchasePrice` in Step 3 (de-defer it), or (b) have `buyNumeric` derive from `currentMarketValue` until `purchasePrice` is captured elsewhere, or (c) drop `buyNumeric` from `NewProperty` and require ownership-tab data entry before the portfolio KPI counts the row.

**Fix:** Tied to PF11 resolution. Cheapest interim fix: `parseCurrency(form.currentMarketValue) ?? 0` (still wrong semantics but at least non-zero for properties with market value entered).

**Resolved (interim):** `actions.ts:36-39` now chains `parseCurrency(form.purchasePrice) ?? parseCurrency(form.currentMarketValue) ?? 0`. Wizard-submitted properties now have a non-zero `buyNumeric` whenever the user enters a market value in Step 3. This is an **interim fix** — the semantic gap (buy price ≠ market value) remains until `purchasePrice` gains a UI input on `/property/[id]/ownership` (see PF10). The Portfolio "Total Purchase Price" KPI now reflects market value for wizard-created rows; until the ownership tab is wired, expect a small but real difference between this KPI and ground-truth acquisition prices.

---

### ~~🔴 PF4 — Two competing drafts implementations (P1 dead code / confusion)~~ — ✅ resolved in Revision 3
**PF P1 robustness · confidence: high · `[consistency]`**

**Where:**
- `app/(shell)/add-property/_lib/use-drafts.ts:7` — `STORAGE_KEY = "add-property-drafts"` — **this is the live hook** used by `AddPropertyFlow.tsx:28`
- `app/(shell)/add-property/_lib/drafts-storage.ts:3` — `STORAGE_KEY = "valgate:add-property:drafts:v1"` — **dead code**, not imported anywhere in the wizard

Both files declare a `STORAGE_KEY`, both implement read/write/delete helpers, both type their records as `DraftRecord`. Only `use-drafts.ts` is wired in.

**Problem:** Confusion for future maintainers. The `drafts-storage.ts` file uses the namespaced key pattern (`valgate:add-property:drafts:v1`) which is the more durable production-quality convention, and includes the `File` blob filter (`serializeDraft`); the live `use-drafts.ts` uses an unnamespaced key (`add-property-drafts`) and would happily try to serialize `File` objects (which would just stringify to `{}` and not crash, but is sloppy). Q4.A (drafts → Convex) is currently scoped against the wrong file.

**Why it matters:** When Q4.A is resolved and someone migrates drafts to Convex, they will either (a) read `drafts-storage.ts`, port its logic, miss the live hook, and silently lose all client state, or (b) read `use-drafts.ts` and miss the better File-blob filter. Either path produces a regression.

**Fix:** Delete `_lib/drafts-storage.ts` entirely. Update `use-drafts.ts` to use the namespaced key (`valgate:add-property:drafts:v1`) — migrate existing localStorage entries on first read. Add a `serializeDraft`-equivalent step that strips `photoFile` / `uploadFile` blobs before persist.

**Resolved:** Deleted `_lib/drafts-storage.ts`. `_lib/use-drafts.ts` rewritten to use namespaced keys (`valgate:add-property:drafts:v1` for drafts, `valgate:add-property:active-draft:v1` for active id). On first read, legacy `add-property-drafts` and `add-property-active-draft` entries are migrated to the new keys (with `photoFile`/`uploadFile` blobs stripped) and the legacy entries are deleted. Future Q4.A migration (drafts → Convex) now has one storage shape to port.

---

### ~~🔴 PF5 — Validation too permissive (P1 — Q5.B)~~ — ✅ resolved in Revision 3
**PF P1 robustness · confidence: high · `[schema]`**

**Where:** `app/(shell)/add-property/_components/schemas.ts:3-56`

Every field across all 4 step schemas is `.optional()` EXCEPT `province: z.string().min(1, "Please select a province")` at line 22.

**Problem:** `submitPropertyAction` runs `fullPropertySchema.safeParse(form)` and accepts the submission as long as `province` is set. A user can:
- Skip Step 1 with no `propertyType` → `Property.type` becomes `""` (cast as `PropertyTypeChoice`)
- Skip Step 2 except for province → `Property.name = ""`, `addressLine = undefined`, `totalArea = ""`
- Skip Step 3 entirely → `currentMarketValue` undefined, `buyNumeric = 0`
- Skip Step 4 → empty arrays

The wizard succeeds, persists a near-empty Property row, and routes to Step 6 "Your property is on Valgate." Portfolio renders a row with name="", type icon falling back, totalArea=0, status="Vacant", buy=$0.

**Why it matters:** Every UI surface across the app that reads Property fields must defend against empty strings and `undefined`. Most UI today assumes at least a name. Tracked as Q5.B.

**Fix:** Tighten `fullPropertySchema`:
- `propertyType`: `.min(1, "Please select a property type")` (also remove the `""` variant from `step1Schema` enum)
- `propertyName`: `.min(1, "Please enter a name")`
- `addressLine`: `.min(1, "Please enter an address")` (or require either addressLine OR a pinned mapCenter)
- `totalArea`: `.min(1, "Please enter a total area").regex(/^\d+(\.\d+)?$/)`
- `currentMarketValue`: `.min(1, "Please enter a market value").regex(/^\d+$/)`

Leave the 14 DEFERRED-BY-DESIGN fields `.optional()` — those belong to later routes.

**Resolved:** `schemas.ts` rewritten. `fullPropertySchema` now enforces:
- `propertyType` — required enum (8 values, no `""` variant)
- `propertyName` — `min(1, "Please enter a property name")`
- `addressLine` — `min(1, "Please enter an address")`
- `totalArea` — numeric (`/^\d+(\.\d+)?$/`) and non-empty
- `province` — was already required
- `status` — required enum (Rented / Vacant / Owner-Occupied) [also closes PF9]
- `currentMarketValue` — `min(1)` + digit-only regex

The 14 DEFERRED-BY-DESIGN fields stay `.optional()`. `submitPropertyAction` now surfaces the first Zod issue's `message` to the user instead of a generic banner — since the messages were authored by hand, they're user-readable ("Please enter a property name", etc.). Step navigation still doesn't block on per-step validity (would be a larger UX change tied to PF11 / Q7); submit-time enforcement is the safety net.

---

### 🟡 PF6 — Draft persistence is localStorage-only (P2 — Q4.A)
**PF P2 schema smell · confidence: high · `[negative-space]`** — _see Q4.A_

**Where:** `_lib/use-drafts.ts:38` (`localStorage.getItem`); `AddPropertyFlow.tsx:88` (autosave on form change)

**Problem:** Drafts live in `localStorage["add-property-drafts"]` on the current browser. A user starting an add-property flow on mobile cannot resume on desktop. Clearing browser data loses all in-progress drafts. The page reads `drafts: PropertyDraftSummary[]` from the server prop (line 25 of AddPropertyFlow), but the server-drafts list is read-only — server drafts can only be displayed (`Step0NewOrDraft.tsx:301-318`), not resumed.

**Why it matters:** A multi-step wizard with a 3–5 minute completion time benefits substantially from cross-device sync. The UI shows drafts as "Resume a draft" rows but doesn't communicate the local-only constraint.

**Fix:** Tracked as Q4.A. Migrate to a Convex `propertyDrafts` collection scoped to `userId`. Migration plan:
1. Add `convex/schema.ts` table `propertyDrafts` with fields matching `DraftRecord`
2. Add `convex/propertyDrafts.ts` mutations (`upsert`, `remove`)
3. Replace `useDrafts` hook with Convex live-query subscription
4. One-time client migration: read localStorage drafts, batch-upsert to Convex, clear local

---

### 🟡 PF7 — File upload model incomplete (P1 — Q5.C)
**PF P1 robustness · confidence: high · `[negative-space]`** — _see Q5.C_

**Where:** `actions.ts:65-66` writes `photoStorageIds: form.photoFileName ? [form.photoFileName] : []` — a single filename string, no actual storage upload occurs.

**Problem:** The wizard's storage model is fundamentally a placeholder. File blobs from Step 0 file inputs reach `form.photoFile` / `form.uploadFile`, are filtered before localStorage (`drafts-storage.ts:7-8` if/when used), and on submit only the **filename** is persisted as a fake storage ID. Step 4's file inputs are not wired at all (PF2), so Step 4 cannot even reach this broken-but-present persistence path.

**Why it matters:** Documents tab (`/property/[id]/documents`) renders `Document` entities with `storageId` fields that are similarly placeholder. No real storage provider is integrated. Image thumbnails fall to `null` placeholders. Tracked as Q5.C.

**Fix:** Storage provider decision (Convex `_storage` is the default — see `ai-data-ref/migration.md`). Once chosen:
1. Add a "presigned upload URL" mutation
2. In Step 4 `onChange` handler (PF2 fix), upload each file to storage and replace the filename with the returned `storageId`
3. Replace `form.photoStorageIds` typing from `string[]` of filenames to `string[]` of `Id<"_storage">`
4. Update `Document` and `Property` schemas accordingly

---

### 🟡 PF8 — Address search is non-functional (P2)
**PF P2 schema smell · confidence: high · `[render]` · `[consistency]`**

**Where:** `Step2BasicInfo.tsx:96-107`

```tsx
<input
  type="text"
  value={combinedAddress || form.addressLine}
  onChange={(e) => update("addressLine", e.target.value)}
  placeholder="Search address…"
/>
```

The input has a `<Search />` icon, search-style placeholder, and the displayed value is `combinedAddress = [addressLine, city, province].join(", ")`. But the `onChange` writes only to `addressLine`. There is no geocoder, no autocomplete dropdown, no Mapbox Search Box, no Google Places integration.

**Problem:** The control implies geocoding via UI affordances (search icon, placeholder, combined-value display). In reality, typing edits a single string field. Users who never toggle to manual mode can't capture city/province/zip/country. Province is the only required field — so users hit a validation block they can't resolve in search mode.

**Why it matters:** This is an inconsistency between the UI's promise and its actual behavior. Combined with PF5 (province required), users get stuck.

**Fix:** Either (a) wire Mapbox Search Box API + reverse geocoding on pin drag — parse city/province/zip/country into the right fields; or (b) drop the search affordances entirely (remove icon, change placeholder to "Street address", remove `combinedAddress` display) and force manual mode. Option (a) is closer to user intent and aligns with the existing Mapbox dependency.

---

### ~~🟡 PF9 — `status` and `title` hardcoded in transform (P2)~~ — ✅ `status` resolved in Revision 3; `title` deferred
**PF P2 schema smell · confidence: high · `[schema]` · `[render]`**

**Where:** `actions.ts:42, 73`

```ts
status: "Vacant",
// ...
title: "—",
```

**Problem:**
- **`status = "Vacant"`** is set on every property submission. The `Property.status` field is an enum that can be Occupied / Vacant / Under Renovation. A user adding a property that's already occupied by a tenant has no way to indicate it. Until they later add a Lease via `/property/[id]/rental`, the property is misclassified — affecting `/portfolio` Status column, occupancy KPI, and rental dashboard counts.
- **`title = "—"`** is a placeholder for a missing field. `Property.title` (title-deed status) is displayed as a badge on `/portfolio` PropertyTable. Today every wizard-created row shows "—".

**Why it matters:** Both fields appear in the table and affect derivations. `status` is the more pressing case because it drives occupancy %.

**Fix:**
- **`status`**: Add a UI field in Step 3 or a new Step 2-bis ("Is this property occupied?"). Three radio options (Occupied / Vacant / Under Renovation). Default to Vacant.
- **`title`**: Decide whether title-deed status belongs in the wizard at all. If yes, add a field (likely Step 3 or Step 4); if no, remove `title: "—"` from `mapWizardToProperty` and let `createProperty` apply the schema default (which is currently absent — would need a `.default("—")` on `PropertySchema.title`).

**Resolved (status only):** Step 3 heading changed to "Status and value." A new 3-button selector appears above the currency input — options align with the Property status enum: **Rented · Owner-occupied · Vacant** (matched to the seed data's most common values; "Under Renovation" isn't in the enum so was dropped from the audit's original suggestion). `actions.ts:42` now reads `form.status || "Vacant"` (the `||` is a defensive default — the new Zod constraint already requires a selection, so the fallback is only reached if someone calls `mapWizardToProperty` outside the validated path). `WizardStatus` type added to `types.ts`; `defaultForm.status` is `""`; demo-data button now sets `status: "Rented"`.

**Deferred (`title`):** `title = "—"` left in place. Title-deed status (Hard / Soft / —) is genuinely a later-flow concern (legal classification, not initial capture). Will be input on a future ownership-tab document panel — already in `ref/10-input-data-map.md` § Gaps as part of OwnershipDocument's UI work. PropertyTable's "Title deed badge" already handles `—` correctly.

---

### 🟡 PF10 — 14 `Property` fields are DEFERRED-BY-DESIGN (P2)
**PF P2 schema smell · confidence: high · `[schema]` · `[negative-space]`**

**Where:** `actions.ts:53-72` reads 14 fields that no step collects:

| Field | Read in transform | Target route (per user direction) |
|---|---|---|
| `purchasePrice` | line 53 | `/property/[id]/ownership` (acquisition panel) |
| `purchaseDate` | line 54 (`parseDateMs`) | `/property/[id]/ownership` |
| `ownershipStatus` | line 62 | `/property/[id]/ownership` (holding type) |
| `outstandingMortgage` | line 56 | `/property/[id]/ownership` (equity panel) |
| `monthlyPayment` | line 57 | `/property/[id]/ownership` (mortgage terms) |
| `interestRate` | line 58 (`parseFloatSafe`) | `/property/[id]/ownership` (mortgage terms) |
| `annualPropertyTax` | line 59 | `/property/[id]/valuation` or future finance tab |
| `taxAssessmentValue` | line 60 | `/property/[id]/valuation` |
| `annualInsurance` | line 61 | `/property/[id]/valuation` or future finance tab |
| `yearBuilt` | line 68 | `/property/[id]/overview` (specs section, editable) |
| `bedrooms` | line 69 | `/property/[id]/overview` (specs) |
| `bathrooms` | line 70 | `/property/[id]/overview` (specs) |
| `parkingSpaces` | line 71 | `/property/[id]/overview` (specs) |
| `storageUnit` | line 72 | `/property/[id]/overview` (specs) |

**Problem:** The wizard captures the **core** of a Property record, by design. The other 14 fields are entered later via property tabs. But today none of those tabs has an edit UI for these fields — they're seed-only. So the fields exist in transform, exist in schema, exist in seed JSON, but have no UI input path either in the wizard or anywhere else.

**Why it matters:** This is the page-level statement of the gap that the cross-app input map (`ref/10-input-data-map.md`) will track. Every per-datapoint audit on `/property/[id]/*` pages that touches one of these fields should cite **PF10** rather than restate the wiring gap.

**Fix:** Track each field's target-route assignment in `ref/10-input-data-map.md` § Gaps. Build the create/edit UI for each on its target route as part of follow-up phases. The wizard itself stays focused on core fields — do not add these 14 to `/add-property`.

---

### 🔵 PF11 — Form state managed manually, not RHF (P3 — Q7)
**PF P3 nit · confidence: high · `[consistency]`** — _see Q7_

**Where:** `AddPropertyFlow.tsx:43` owns `useState<FormData>(defaultForm)` and passes `(form, setForm)` down to each step.

**Problem:** No React Hook Form, no field-level dirty/touched tracking, no per-field validation surfacing. Step components manage their own local UI state (showManualAddress, displayValue, mapLoaded, etc.) and call `setForm({ ...form, [key]: val })` on every keystroke. Re-renders are unoptimized — typing in `propertyName` re-renders all 7 step components.

**Why it matters:** Tracked as Q7. Maintenance concern, not correctness. The current pattern is fine for 27 fields but will get awkward at 40+.

**Fix:** Migrate to RHF + `zodResolver(fullPropertySchema)` as a future phase. Each step becomes a uncontrolled `<form>` with `register` calls; the wizard owns the root form and step components consume it via context. Out of scope for Phase 9.

---

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
walked:
  - app/(shell)/add-property/page.tsx
  - app/(shell)/add-property/actions.ts
  - app/(shell)/add-property/_components/AddPropertyFlow.tsx
  - app/(shell)/add-property/_components/Step0NewOrDraft.tsx
  - app/(shell)/add-property/_components/Step1PropertyType.tsx
  - app/(shell)/add-property/_components/Step2BasicInfo.tsx
  - app/(shell)/add-property/_components/Step3Financial.tsx
  - app/(shell)/add-property/_components/Step4PhotosDocs.tsx
  - app/(shell)/add-property/_components/Step5Review.tsx
  - app/(shell)/add-property/_components/Step6Success.tsx
  - app/(shell)/add-property/_components/schemas.ts
  - app/(shell)/add-property/_components/types.ts
  - app/(shell)/add-property/_lib/drafts-storage.ts
  - app/(shell)/add-property/_lib/use-drafts.ts
sources:
  - path: app/(shell)/add-property/page.tsx
    sha: 3d8fe0671104360da1dd419c6d529dc29675a34d
  - path: app/(shell)/add-property/actions.ts
    sha: 0fec68b2a02b32070abd44c25e3b24372ca63537  # Rev 3 (was 2b300fc Rev 2, 4510939 Rev 1)
  - path: app/(shell)/add-property/_components/AddPropertyFlow.tsx
    sha: c65073c03c70d4e0f49f95df5a4cb5e4fb3a32b5  # Rev 3 (was 154e089) — demo-data status field
  - path: app/(shell)/add-property/_components/Step0NewOrDraft.tsx
    sha: de69f4048f911e9a46d9b4698a72d55b8040779d
  - path: app/(shell)/add-property/_components/Step1PropertyType.tsx
    sha: 6be55c6332e2f77afd2f104d0fa9e2ac53c562f8
  - path: app/(shell)/add-property/_components/Step2BasicInfo.tsx
    sha: 12319971bc696408bea9636183ab6bf1773e6719
  - path: app/(shell)/add-property/_components/Step3Financial.tsx
    sha: d110e130a082bde1e86f3522c17da4d5b88f6a0b  # Rev 3 (was f189749) — added status selector
  - path: app/(shell)/add-property/_components/Step4PhotosDocs.tsx
    sha: aac50800f73e8835c074227de26db0ff08fcea6f  # Rev 2 (was 8e1c8ff369556b3eef3b84b0d19673dcb2c8b56f)
  - path: app/(shell)/add-property/_components/Step5Review.tsx
    sha: aec9f799dbcd3e61830bf073713364ebfcb3871f
  - path: app/(shell)/add-property/_components/Step6Success.tsx
    sha: fc6163c79d3e1dbb88d0d4a02e34c0536bbb3f96
  - path: app/(shell)/add-property/_components/schemas.ts
    sha: d00bb62a97a791c3f2ff3bfb9379969f842c6d53  # Rev 3 (was c0d38db) — tightened constraints
  - path: app/(shell)/add-property/_components/types.ts
    sha: 044a8ddc68bda58fac2feef42b9dae48a3e52502  # Rev 3 (was 41d67a5) — added WizardStatus + form.status
  # _lib/drafts-storage.ts deleted in Rev 3 (PF4) — was ebdb6685
  - path: app/(shell)/add-property/_lib/use-drafts.ts
    sha: e8cb57ffa2648620357f2135bd4b86929ae2d946  # Rev 3 (was 25b6c3a) — namespaced key, blob strip, legacy migration
```

</details>

<details>
<summary>📋 Manual verification commands</summary>

```bash
# PF1 — confirm lat/lng swap: mapCenter is [lng, lat], destructure says [lat, lng]
grep -n "mapCenter" app/\(shell\)/add-property/_components/Step2BasicInfo.tsx | head
grep -n "form.mapCenter" app/\(shell\)/add-property/actions.ts

# Submit a test draft via the demo button → check the resulting Property's lat/lng on disk
# (run the dev server first, click "Load demo data" → "Submit" → inspect the JSON)
ls -la public/data/users/demo-user/properties/ | head
cat public/data/users/demo-user/properties/PROP-*/location.json 2>/dev/null | head -1

# PF2 — confirm Step 4 file inputs have no onChange
grep -B1 -A3 "type=\"file\"" app/\(shell\)/add-property/_components/Step4PhotosDocs.tsx

# PF3 — confirm purchasePrice is never set anywhere except demo + actions transform
grep -rn "purchasePrice" app/\(shell\)/add-property/ --include="*.tsx" --include="*.ts"

# PF4 — confirm drafts-storage.ts is not imported
grep -rn "drafts-storage" app/\(shell\)/add-property/

# PF5 — count required vs optional in fullPropertySchema
grep -c "z.string().min" app/\(shell\)/add-property/_components/schemas.ts
grep -c "optional()" app/\(shell\)/add-property/_components/schemas.ts
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-13
- Initial audit (first run for `/add-property` in the page-audit format).
- Adopted **input-form taxonomy** (COLLECTED / COLLECTED-PARTIAL / DEFERRED-BY-DESIGN / VALIDATION-GAP / CHROME / DECORATIVE / BROKEN) scoped to this audit only; display-page audits continue to use the standard taxonomy.
- 7 step subsections walked across 14 files; ~95 surfaces inventoried.
- 11 PFn filed:
  - **PF1 (P0)** lat/lng swap bug in `actions.ts:37` — newly discovered, not in original plan
  - **PF2 (P0)** Step 4 file inputs unwired — newly discovered, not in original plan
  - **PF3 (P1)** `buyNumeric` defaults to 0 — newly discovered, not in original plan
  - **PF4 (P1)** Two competing drafts implementations — newly discovered, not in original plan
  - **PF5 (P1)** Validation too permissive — planned, see Q5.B
  - **PF6 (P2)** Drafts localStorage-only — planned, see Q4.A
  - **PF7 (P1)** File upload model incomplete — planned, see Q5.C
  - **PF8 (P2)** Address search non-functional — newly discovered, not in original plan
  - **PF9 (P2)** `status` and `title` hardcoded in transform — planned
  - **PF10 (P2)** 14 deferred-by-design fields — planned; target-route assignments recorded here
  - **PF11 (P3)** Form state manual not RHF — planned, see Q7
- Per-datapoint audits should cite **PF10** when discussing the 14 deferred fields.

### Revision 2 — 2026-05-13
- **PF1 resolved.** `actions.ts:37` destructure flipped to `[lng, lat]`; `CAMBODIA_CENTROID` reordered to `[104.991, 12.5657]`. Wizard-submitted properties now save with correct coordinates.
- **PF2 resolved.** Added `handlePhotoChange` and `handleDocChange` in `Step4PhotosDocs.tsx`; wired `onChange` on both `<input type="file">` elements. Step 4 now accepts file selections and pushes filenames into `form.photos` / `form.documents`. Full storage upload still gated by PF7 (Q5.C).
- **PF3 resolved (interim).** `actions.ts:36-39` now falls back to `currentMarketValue` when `purchasePrice` is unset. Permanent fix tied to PF10 (purchasePrice UI on `/property/[id]/ownership`).
- Source SHAs updated for `actions.ts` and `Step4PhotosDocs.tsx`.
- 3 of 11 PFn resolved · 8 open (PF4, PF5, PF6, PF7, PF8, PF9, PF10, PF11).
- **Backfill verification (2026-05-13):** Ran `scripts/backfill-property-coords.ts` (also exposed as `npm run backfill:property-coords`) against all 20 properties under `public/data/users/`. Result: **0 swaps detected**. All seed records came from `scripts/seed.ts` which writes raw lat/lng without going through `mapWizardToProperty`, so the PF1 bug never affected any persisted record. Script is retained as a safety net for future use.

### Revision 3 — 2026-05-13
- **PF4 resolved.** Deleted `_lib/drafts-storage.ts`. `_lib/use-drafts.ts` rewritten to use namespaced keys (`valgate:add-property:drafts:v1`, `valgate:add-property:active-draft:v1`), strip File blobs before persist, and migrate legacy `add-property-drafts` / `add-property-active-draft` entries on first read.
- **PF5 resolved.** `schemas.ts` tightened — `propertyType` (required enum, no `""`), `propertyName`, `addressLine`, `totalArea` (numeric), `status` (required enum), `currentMarketValue` (digit-only) all required. 14 DEFERRED-BY-DESIGN fields stay `.optional()`. `submitPropertyAction` now surfaces the first field-level Zod message to the user.
- **PF9 resolved (status only).** Added `WizardStatus` type (`Rented | Vacant | Owner-Occupied`) and `form.status` to `FormData`. `Step3Financial.tsx` adds a 3-button status selector with icons (KeyRound / Home / Users) above the value input; heading changed to "Status and value". `actions.ts:42` reads `form.status || "Vacant"` (defensive fallback — Zod already requires a selection). Demo-data button (`AddPropertyFlow.tsx:135`) sets `status: "Rented"` to match the rest of the demo property. **`title = "—"` deferred** — title-deed status doesn't belong in the wizard; will be input on a future ownership-tab panel (already tracked in `ref/10` Gaps).
- Source SHAs updated for: `actions.ts`, `AddPropertyFlow.tsx`, `Step3Financial.tsx`, `schemas.ts`, `types.ts`, `_lib/use-drafts.ts`. `_lib/drafts-storage.ts` removed from walked list.
- 6 of 11 PFn resolved (PF1–PF5, PF9) · 5 open (PF6 drafts→Convex Q4.A, PF7 storage Q5.C, PF8 address search, PF10 14 deferred fields, PF11 RHF Q7).
- Surface inventory tallies updated: COLLECTED 13 → 14 (added `status`), DEFERRED-BY-DESIGN 14 → 13 (`status` no longer in this bucket).

</details>
