# Add Property Flow — Spec Sheet

**Route:** `/add-property`
**Shell component:** `app/(shell)/add-property/_components/AddPropertyFlow.tsx`
**Total steps:** 7 (indexed 0–6; labeled "Step N of 5" in UI because Step 0 is pre-flow and Step 6 is post-flow)

---

## Global Conventions

### Layout shell (persistent across all steps)
- `AppHeader` (top nav, unchanged from rest of app)
- **Page chrome** rendered by `AddPropertyFlow`:
  - Breadcrumb: `Valgate / Add Property` (12px, uppercase, tracked)
  - Page title: `Add New Property` (36px, extrabold)
  - `Save as Draft` button (top-right, steps 1–5 only)
  - Progress bar + "Step N of 5: {label}" (steps 1–5 only)
- **Footer nav** (steps 1–5 only):
  - Left: `Save as Draft`
  - Right: `Go Back` + `Continue`

### Container widths
- Step 0: `max-w-[800px]` centered
- Step 1: `max-w-[800px]` centered
- Step 2: `max-w-[1000px]` with 300px right rail
- Step 3: `max-w-[1000px]` with 300px right rail
- Step 4: `max-w-[800px]` centered
- Step 5: `max-w-[1000px]` with 300px right rail
- Step 6: centered success card, `max-w-[500px]`

### Typography tokens
- H1 (shell): 36px / extrabold / `text-val-heading`
- H2 (step): 30px / bold / `text-foreground`
- Section heading: 16px / semibold
- Body: 14px / `text-foreground`
- Caption / muted: 12–14px / `text-muted-foreground`

### Data persistence
- Step & form state persisted via `?step=N` URL param **and** localStorage key `addProperty.draft.v1`
- Draft auto-saved on every field change (debounced 500ms)
- `Save as Draft` button explicitly persists the draft via a Server Action → `lib/services/property-drafts.ts` (Drizzle on Neon), writing the `property_drafts` table

### Validation
- Zod schema per step (`schemas.ts` in `_components/`)
- Continue button disabled until current step is valid
- Inline field errors on blur

---

## Step 0 — Start (method picker)

**Route:** `/add-property` (no query param, or `?step=0`)
**Purpose:** Choose how to create the property, or resume a draft.

### Header
- Breadcrumb + H1 `Add New Property`
- (No progress bar, no footer)

### Body
- H2: **Add property**
- Subtitle: **Create new record or continue from draft**

### Method cards (grid, 3 columns, `gap-4`)

| Card | Icon | Icon bg | Badge | Badge color | Description |
|---|---|---|---|---|---|
| Take a photo | `Camera` | `#EFF6FF` | Fastest | `#2563EB` | Capture your property document with the camera. OCR extracts details, you confirm. |
| Upload document | `Upload` | `#ECFDF5` | Recommended | `#059669` | Upload a PDF or image. OCR extracts details, you confirm. |
| Manual input | `FileEdit` | `#F3F4F6` | — | — | Enter property information by hand. |

- Card style: `border rounded-xl p-5`, hover lifts border to primary.
- Click selects the method **and** advances to Step 1 (single tap).
- Keyboard: Tab cycles; Enter/Space activates.

### Drafts section
- Heading: **Or continue from drafts**
- Container: `border rounded-xl p-6 min-h-[5rem]`
- **Empty state:** small icon + text `"No drafts yet — your unfinished properties will appear here."`
- **Populated:** list of draft rows. Each row: property name, last-edited timestamp, right-aligned `Resume` link, kebab menu for `Delete`.

### Validation / gates
- None on this step.
- Selecting a method is the only way to proceed.

### Empty / edge cases
- No drafts → empty state (above).
- Auth check: if signed out, redirect to sign-in with return URL.

---

## Step 1 — Property Type

**Route:** `/add-property?step=1`
**Purpose:** Classify the asset.

### Header
- Shell breadcrumb + H1 + Save as Draft.
- Progress: 20%, "Step 1 of 5: Property Type"

### Body
- H2: **What type of property are you adding?**
- Subtitle: **Select the category that best describes your property.**

### Type grid (4 columns × 2 rows)

| Key | Icon | Label | Sub-label |
|---|---|---|---|
| `residential` | `Home` | Residential House | Single family detached |
| `commercial` | `Building2` | Commercial Building | Office or mixed use |
| `multi-unit` | `BuildingApartment` (distinct) | Multi-Unit Complex | Apartments, condos |
| `retail` | `Store` | Retail Space | Shop or storefront |
| `land` | `LandPlot` | Land | Vacant plot or lot |
| `industrial` | `Factory` | Industrial | Warehouse or factory |
| `construction` | `HardHat` | Under Construction | Development project |
| `other` | `MoreHorizontal` | Other | Custom type |

- Each tile: icon in 48px rounded square, label, sub-label.
- **Selected state:** primary border, primary/5 fill, check badge in top-right corner.
- **Unselected hover:** border → primary, subtle scale(1.01).

### Footer
- `Save as Draft` | `Go Back` (to Step 0) | `Continue` (disabled until selection)

### Validation
- Required: `propertyType`
- On Continue without selection → shake + inline error under heading.

---

## Step 2 — Basic Information

**Route:** `/add-property?step=2`
**Purpose:** Capture identity, location, and physical attributes.

### Header
- Progress: 40%, "Step 2 of 5: Basic Information"

### Layout
- **Left (flex-1):** form card, `border rounded-xl p-6`
- **Right (300px):** Tips card + Location Preview card

### Form — Identity
- Section heading: **Identity**
- Subtitle: **How this property is named and referenced in your portfolio.**
- Fields:
  - `propertyName` — text, required, helper "Pick something memorable"
  - `propertyId` — text, auto-generated (editable); default pattern `PR{YYYY}{NNNN}`

### Form — Location
- Section heading: **Location**
- Subtitle: **We use this to fetch market data and map the property.**
- Fields:
  - `addressLine` — text, required, with autocomplete (Mapbox/Google Places)
  - `addressLine2` — text, placeholder "Apartment, suite, etc."
  - `city` / `state` — 2-col grid; state is a dropdown (dependent on country)
  - `zip` / `country` — 2-col grid; country is a dropdown, defaults to user locale

### Form — Property Details
- Section heading: **Physical Details**
- Subtitle: **Dimensions and unit counts. Leave blank if not applicable.**
- Fields (all optional):
  - `yearBuilt` — number (1800–current year)
  - `totalArea` — number + unit toggle (sqft / m²)
  - `bedrooms` / `bathrooms` — number, stepper
  - `parkingSpaces` / `storageUnit` — number, stepper

### Right rail — Tips card
- Heading: **Tips**, `Info` icon
- Bullets (basic-info specific):
  - Use a memorable property name — you'll see it everywhere.
  - Accurate addresses unlock valuation and tax estimates.
  - Year built drives tax and depreciation math.
  - All physical details are optional; fill what you know.

### Right rail — Location Preview
- Heading: **Location Preview**, `MapPin` icon
- 160px-tall map. Once address geocodes, render a static Mapbox tile centered on the pin. Before that, show a neutral placeholder.

### Validation
- Required: `propertyName`, `addressLine`, `city`, `country`
- Format: `yearBuilt` ∈ [1800, now]; `zip` by country pattern

---

## Step 3 — Financial Information

**Route:** `/add-property?step=3`
**Purpose:** Capture money facts: purchase, ownership, carrying costs.

### Header
- Progress: 60%, "Step 3 of 5: Financial Information"

### Layout
- **Left (flex-1):** form card
- **Right (300px):** live Financial Summary + Tips

### Form — Purchase Information
- Subtitle: **What you paid and when.**
- Fields:
  - `purchasePrice` — currency, required
  - `purchaseDate` — date picker, required
  - `currentMarketValue` — currency, optional (helper: "Leave blank to estimate from market data")

### Form — Ownership & Financing
- Subtitle: **How you own this property.**
- `ownershipStatus` — radio group, required:
  - `fully_owned` — Fully owned (no mortgage)
  - `financed` — Financed (mortgage/loan)
  - `leased` — Leased
  - `other` — Other
- **Conditional (only when `financed`):**
  - `outstandingMortgage` — currency
  - `monthlyPayment` — currency
  - `interestRate` — percentage
  - `loanTermYears` — number

### Form — Taxes & Insurance
- Subtitle: **Recurring costs. Used for cash-flow reports.**
- Fields:
  - `annualPropertyTax` — currency
  - `taxAssessmentValue` — currency
  - `annualInsurance` — currency

### Right rail — Financial Summary (live)
- Heading: **Financial Summary**, `DollarSign` icon
- Rows (computed from form state, not hardcoded):
  - Purchase Price → `form.purchasePrice`
  - Outstanding Mortgage → `form.outstandingMortgage || "—"`
  - **Current Equity** → `purchasePrice − outstandingMortgage` (green, bold)
- Divider, then **Monthly Expenses**:
  - Mortgage payment → `form.monthlyPayment`
  - Tax (monthly) → `annualPropertyTax / 12`
  - Insurance (monthly) → `annualInsurance / 12`
- Divider, then **Total monthly**: sum of the above (green, bold)
- Empty state: each row shows `—` until input is present.

### Right rail — Financial Tips (different from Step 2!)
- Bullets:
  - Use today's best estimate for market value.
  - If financed, keep mortgage details current — it drives equity tracking.
  - Tax assessment value is often lower than market value.
  - All figures can be edited later.

### Validation
- Required: `purchasePrice`, `purchaseDate`, `ownershipStatus`
- If `ownershipStatus = financed`, require `outstandingMortgage`, `monthlyPayment`, `interestRate`
- Currency inputs: auto-format with locale separator and `$` prefix

---

## Step 4 — Photos & Documents

**Route:** `/add-property?step=4`
**Purpose:** Attach visual and paper assets.

### Header
- Progress: 80%, "Step 4 of 5: Photos & Documents"

### Body — Property Photos
- Section heading: **Property Photos** (with primary underline)
- Subtitle: **Upload photos to help with identification and listings. JPG, PNG, or HEIC up to 10 MB each.**
- Drop zone:
  - `border-2 border-dashed rounded-xl p-10`
  - `ImageIcon` 40px centered
  - "Drag & Drop Photos Here" / "or" / `Browse Files` button
- Selected photos render as 100×100 thumbnails:
  - Actual image preview (not a static icon)
  - Hover → dark overlay + delete X in corner
  - First photo gets a `Cover` badge; reorder by drag
- Trailing `+` tile to add more.

### Body — Property Documents
- Section heading: **Property Documents** (with primary underline)
- Subtitle: **Deeds, agreements, inspections, reports. PDF, DOCX, or images up to 25 MB each.**
- Drop zone (identical structure, different icon):
  - `FileText` 40px
  - "Drag & Drop Documents Here"
- Uploaded list (rows, not thumbnails):
  - Row: type icon (`FilePdf` / `FileImage`), filename (primary), upload timestamp (muted), file size, trash button
  - Progress bar overlay while uploading

### Validation
- Nothing is required.
- Warn (not block) if zero photos: "Properties with at least one photo are 3× more likely to feel complete."

### Edge cases
- File rejected (wrong type or too big): inline toast, do not add to list.
- Network failure mid-upload: row shows retry affordance.

---

## Step 5 — Review

**Route:** `/add-property?step=5`
**Purpose:** Confirm everything before commit.

### Header
- Progress: 100%, "Step 5 of 5: Review"
- Footer `Continue` button relabeled **Submit Property** (primary color).

### Layout
- **Left (flex-1):** stacked review cards
- **Right (300px):** Property Summary + Estimated Value

### Review cards

Each card:
- Title in top-left, `Edit` link in top-right → jumps to the source step (preserves state).
- Key/value list, muted label left, foreground value right.

#### Card 1 — Property Overview
- Property Name → `propertyName`
- Property Type → label from `propertyType` (e.g., "Residential House")
- Property ID → `propertyId`
- Address → composed `${addressLine}, ${city}, ${state} ${zip}, ${country}`
- Year Built → `yearBuilt`
- Total Area → `totalArea` + unit
- Bedrooms / Bathrooms → inline pair

#### Card 2 — Financial Information
- Purchase Price / Purchase Date / Current Market Value
- Divider
- Ownership Status → human label
- (if financed) Outstanding Mortgage / Monthly Payment / Interest Rate
- Divider
- Annual Property Tax / Annual Insurance

#### Card 3 — Photos & Documents
- "Photos Uploaded: N" + horizontal strip of first 3 thumbnails, then `+N more` tile
- "Documents Uploaded: N" + listed filenames

### Right rail — Property Summary
- `Status: Ready to Submit` (green) OR `Missing: {list}` (amber)
- Completion % bar (actual, computed from required-field coverage across all steps)
- Checklist:
  - Property Type — Completed / Incomplete
  - Basic Info — Completed / Incomplete
  - Financial Info — Completed / Incomplete
  - Photos (optional) — N uploaded
  - Documents (optional) — N uploaded
- **Estimated Value** (if we have enough data) — computed from purchase + market + area heuristics. Hide card if we can't estimate.

### Submit behavior
- Footer `Submit Property` → loading state → `createProperty` Server Action (validates with `fullPropertySchema`, writes via `lib/services/properties.ts` / Drizzle) → navigate to Step 6 with new `propertyId`.
- On failure: stay on Step 5, toast with generic error, log details server-side.

### Right rail — (no "Next Steps" card — moved to Step 6)

---

## Step 6 — Success

**Route:** `/add-property/success?id={propertyId}`
**Purpose:** Confirm, celebrate, redirect.

### Layout
- No progress bar, no footer, no breadcrumb H1 (success card owns the page).
- Centered card: `border rounded-xl shadow-lg p-10 max-w-[500px]`

### Content
- Animated check icon (53px, green `#059669`) — fade-in + scale.
- H2: **Property Added Successfully!**
- Subtitle: **{propertyName} has been added to your portfolio.**
- Divider
- Muted text: `Property ID: {propertyId}` (click to copy, toast "Copied")
- Divider

### Next actions
- Section label: **What would you like to do next?**
- CTAs (stacked, centered):
  1. Primary: **View Property Details** → `/property/{propertyId}/ownership`
  2. Secondary: **Add Another Property** → clears form + localStorage, routes to `/add-property`
  3. Tertiary (text link): **Go to Portfolio** → `/portfolio`

### Right rail / below (optional)
- "What's next" hint block:
  - Generate property reports
  - Set up rent collection
  - Add maintenance schedule
  - Invite co-owners
- Each item links to the relevant deep feature.

---

## Data Model

### Zod schemas (per step)
File: `app/(shell)/add-property/_components/schemas.ts`
- `step1Schema` — propertyType enum
- `step2Schema` — name, address, details
- `step3Schema` — finance, with discriminated union on ownershipStatus
- `step4Schema` — optional arrays of file metadata
- `fullPropertySchema` — `z.intersection` of 1–4 (used on submit)

### Backend (Neon + Drizzle)
Schema in `lib/db/schema/*`, data access in `lib/services/*` (one module per entity):
- `property_drafts` table: `userId`, `data` (partial property, JSONB), `updatedAt`, `step`
- `properties` table: created on Step 5 submit
- Files: uploaded to object storage (e.g. R2), IDs/URLs stored on draft/property rows

### Server actions
- `saveDraft(stepData)` — upsert via `lib/services/property-drafts.ts`
- `createProperty(fullData)` — validates with `fullPropertySchema`, writes via `lib/services/properties.ts`, returns `propertyId`
- Rate limit: 10 saves/min, 5 submits/hour per user

---

## State machine

```
Step 0 ──method→ Step 1 ──selected→ Step 2 ──filled→ Step 3 ──filled→ Step 4 ──next→ Step 5 ──submit→ Step 6
  │                │                   │                 │                │                │
  └──resume draft─→(jump to saved step based on draft.step)
                   │                   │                 │                │                │
                   └───── Go Back ←────┴──── Go Back ←───┴──── Go Back ←──┴──── Go Back ←──┘
```

- `Save as Draft` is available from Steps 1–5; writes current form + step via the `saveDraft` Server Action (Neon + Drizzle), stays on page.
- `Back to Portfolio` link sits only in the shell breadcrumb (not duplicated per step).

---

## Open questions

1. Do photo and document methods in Step 0 actually run OCR, or are they aspirational? If aspirational, collapse to single `Start` CTA.
2. Which geocoding provider — Mapbox (already in repo per `docs/mapbox-backend-guide.md`) or Google Places?
3. Where do files live — which object store (e.g. R2 vs S3)? Sizes above suggest R2. (DB is Neon + Drizzle; only file blobs need external storage.)
4. Currency/locale — single currency (USD) MVP or multi-currency from day one?
5. Estimated Value on Step 5 — do we have a heuristic to compute, or cut the card until we do?
