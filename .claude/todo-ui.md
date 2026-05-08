# TODO — UI

The `isArchived?: boolean` field is wired into the data layer and derivations.
All KPI counts (`totalProperties`, `rentedCount`, `vacantCount`, `occupancy`) already exclude archived properties.
What still needs to be built:

---

## UI pieces needed

### 1. Archive button (trigger)
- **Where:** Property detail page — likely in the header or an "Actions" dropdown menu alongside "Edit" and "Delete".
- **What it does:** calls a server action that sets `isArchived: true` on the property and redirects back to `/portfolio`.
- **Label:** "Archive property" (not "Delete" — the record stays, just hidden from the active portfolio).

### 2. Confirmation dialog
- **Why:** Destructive-ish action. Show a modal: "Archive this property? It will no longer appear in your portfolio or KPIs. You can restore it later."
- **Buttons:** "Archive" (primary, amber/warning colour) and "Cancel".

### 3. Archived properties list / restore flow
- **Where:** A separate tab or filter on `/portfolio` — e.g. a toggle "Show archived" that appends `?archived=true` to the URL.
- **What it shows:** Same table as the main portfolio but filtered to `isArchived === true`, with a "Restore" button per row.
- **Restore action:** sets `isArchived: false`, redirects back to active portfolio.

### 4. Portfolio filter badge (small)
- The filter bar on `/portfolio` may want an "Archived" filter chip alongside "Status" and "Type" once archiving is in use.

---

## Server action needed

```ts
// lib/actions/properties.actions.ts (or similar)
export async function archivePropertyAction(id: string): Promise<{ ok: boolean; error?: string }>;
export async function restorePropertyAction(id: string): Promise<{ ok: boolean; error?: string }>;
```

Both call `propertiesDb.update(userId, id, { isArchived: true/false })`.

---

---

# TODO — Edit Property

The add-property wizard (Steps 1–5) and the DB write layer (`db/properties.ts`) already exist. Edit property reuses the same schemas and action shape — it's a mutation, not a new flow.

## 1. Route

`/property/[id]/edit` — a new page that pre-fills the wizard data from the existing property record.

Or, simpler: a modal/drawer launched from the property detail header ("Edit" button in the existing actions menu). No new route needed if the edit surface is small enough.

## 2. Form fields

Reuse step2 and step3 schemas from `app/(shell)/add-property/_components/schemas.ts`. The fields are already defined; only the default values change (pre-fill from `property.*`).

Fields to expose in the edit form:
- **Basic info:** `name`, `type`, `province`, `addressLine`, `city`, `zip`, `country`
- **Financial:** `purchasePrice` (displayed as formatted `buyNumeric` — see §4), `currentMarketValue`, `outstandingMortgage`, `monthlyPayment`, `interestRate`, `annualPropertyTax`, `annualInsurance`
- **Property details:** `totalArea`, `yearBuilt`, `bedrooms`, `bathrooms`, `parkingSpaces`, `title`, `titleVariant`

Fields **not** in the edit form (system-managed or separate flows):
- `status` — changed via "Mark as Rented / Vacant / For Sale" actions
- `isArchived` — changed via the Archive action (see Archive section above)
- `health` — no write path defined yet (Q5.K)
- `lat` / `lng` — map picker (separate interaction, already in add-property Step 2)

## 3. Server action

```ts
// lib/actions/properties.actions.ts
export async function editPropertyAction(
  id: string,
  form: EditPropertyForm,
): Promise<{ ok: boolean; error?: string }>;
```

Calls `propertiesDb.update(userId, id, mapEditFormToProperty(form))`.

`mapEditFormToProperty` mirrors `mapWizardToProperty` in `actions.ts` but for partial updates:
- `buyNumeric = parseCurrency(form.purchasePrice) ?? existing.buyNumeric`
- Do **not** store `buy` (already removed from storage — see audit `portfolio--buy-price` F1).
- Decide whether to keep or drop `purchasePrice` from storage on save (see §4).

## 4. Buy price field — resolve F2 / Q5.P

This is the deferred decision from the buy price audit (F2, Q5.P).

**Recommended approach:**
- Pre-fill the purchase price input with the numeric value: `String(property.buyNumeric)` or `formatCurrency(property.buyNumeric)`.
- On submit: `parseCurrency(form.purchasePrice)` → store as `buyNumeric` only.
- Drop `purchasePrice` from the `PropertyFinance` type and all `finance.json` files — it was only ever needed as the wizard's raw input buffer. Once we pre-fill from `buyNumeric`, there's no reason to keep the original string around.

**Files to update when this is implemented:**
- `lib/data/types/property.ts` — remove `purchasePrice?: string` from `PropertyFinance`
- `lib/data/db/properties.ts` — remove `purchasePrice: p.purchasePrice` from `splitProperty`
- `app/(shell)/add-property/actions.ts` — remove `purchasePrice: form.purchasePrice || undefined` from `mapWizardToProperty`
- All `finance.json` seed files — remove `"purchasePrice"` key (if present)

## 5. Validation

Reuse `step3Schema` from `schemas.ts` but tighten financial fields to numeric (Q5.B):
```ts
purchasePrice: z.string().optional().refine(
  (v) => !v || Number.isFinite(parseCurrency(v)),
  "Enter a valid amount"
),
```

## 6. Post-save behaviour

After a successful edit: `revalidateTag` for the property and portfolio pages, then redirect to `/property/[id]/overview` (or stay on edit with a success toast).

---

# TODO — Column sorting on /portfolio

The `PropertyTable` has no sort controls yet. When sorting is added:

## 1. Sort affordance
Add sortable column headers (chevron icon on hover) for: Name, Province, Status, Size, Buy price, Health.

## 2. Numeric sort for Size
`totalArea` is stored as a string (`"850"`, `"1,200"`, `"5,000"`). Sorting it lexicographically gives wrong order (`"5,000"` < `"850"`). Sort comparator must strip commas and parse as number:
```ts
(a, b) => Number(a.totalArea.replace(/,/g, "")) - Number(b.totalArea.replace(/,/g, ""))
```
Source: `portfolio--size` F4.

## 3. Numeric sort for Buy price
Same pattern — compare `p.buyNumeric` directly (it's already a number on `PropertyListItem` via the query).

---

# TODO — Sold / Archived count on /portfolio

The "Showing X of Y properties" footer (and the filter bar) needs to be clear about what Y means when sold or archived properties exist.

## Current state
- `queries.ts` filters `!p.isArchived && p.status !== "Sold" && p.status !== "Archived"` before building `PropertyListItem[]`.
- The table footer shows `filtered.length` of `properties.length` — both counts exclude sold/archived.
- A user with sold properties has no way to see them or know they're hidden.

## What to build
- **Short term:** Add a small "X sold / X archived" footnote below the table footer, shown only when sold or archived properties exist. Links or chips that activate a filter to surface them.
- **Long term:** Add `Sold` and `Archived` as explicit Status filter options (alongside Rented / Vacant / For Sale), pulling from `Q4.D` soft-delete design.

Source: `portfolio--filtered-count` F3.

---

# TODO — YoY Growth KPI on /portfolio

The growth card currently renders a grey `—` placeholder. `yoyGrowth: { kind: "unknown" }` is hardcoded in `computeKpis`.

## What to build
Once the formula is agreed (Q3.C), implement in `lib/data/derivations/portfolio.ts`:
```ts
// Requires historical buyNumeric snapshots or a valuations table
yoyGrowth = (currentTotalValue - sameMonthLastYear) / sameMonthLastYear * 100
```

## Blocker
Q3.C is unresolved: what is the base value for properties that didn't exist last year? Exclude them, or include at purchase price? **Decide before implementing.** No UI work until Q3.C is resolved.

---

# TODO — Timezone wiring

Default is now `"Asia/Phnom_Penh"` (UTC+7) in `app/(shell)/settings/queries.ts`.
The settings UI picker already exists (`SettingsPage.tsx:201–203`) but saves nothing.
What still needs to be built:

## 1. Save action
- **File to create:** `app/(shell)/settings/actions.ts`
- **Action:** `saveUserPreferencesAction({ timezone, language, dashboardView })` — calls `userProfilesDb.update(userId, { timezone, language, dashboardView })`.
- **Wire in:** `SettingsPage.tsx` — add a "Save" button (or `onChange` auto-save) that calls this action.

## 2. Timezone-aware date utility
- **File to create:** `lib/date-tz.ts`
- **Functions needed:**
  - `startOfMonthInTz(tz: string): number` — returns UTC ms for midnight of the 1st of the current month in the given timezone.
  - `startOfDayInTz(date: Date, tz: string): number` — returns UTC ms for midnight of a given date in the timezone.
  - Use `Intl.DateTimeFormat` with `formatToParts` to extract year/month/day in the target tz, then reconstruct a UTC timestamp.

## 3. Wire timezone into derivations
Each function below needs a `tz: string` parameter (default `"Asia/Phnom_Penh"`):

| Function | File | What to change |
|---|---|---|
| `computeKpis` | `lib/data/derivations/portfolio.ts:36` | Replace `Date.UTC(...)` with `startOfMonthInTz(tz)` |
| `lastNMonthsWindow` | `lib/data/derivations/analytics.ts:235` | Replace `new Date(year, month-i, 1)` with tz-aware equivalent |
| `formatRelativeDate` | `lib/data/derivations/rental.ts:197` | Replace `new Date(year, month, date)` with `startOfDayInTz(d, tz)` |

## 4. Pass timezone through page queries
Each page query fetches properties — they should also fetch the user's timezone from `userProfilesDb.get(userId)` and pass it to the derivation functions.

| Query file | Derivation call to update |
|---|---|
| `app/(shell)/portfolio/queries.ts` | `computeKpis(properties, payments, tz)` |
| `app/(shell)/analytics/queries.ts` | `lastNMonthsWindow(n, tz)` |
| `app/(shell)/rental/queries.ts` | `formatRelativeDate(at, tz)` |

## 5. Fix `toLocaleDateString` calls (6 spots)
Pass `{ timeZone: tz }` to each call. All currently omit it, so they silently use server or browser TZ.

| File | Line | Fix |
|---|---|---|
| `lib/format.ts` | 38 | `toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: tz })` |
| `lib/data/derivations/rental.ts` | 85, 87 | add `timeZone: tz` |
| `lib/data/derivations/rental.ts` | 205 | add `timeZone: tz` |
| `app/(shell)/property/[id]/_components/PropertyDocumentsPage.tsx` | 318 | add `timeZone: tz` |
| `app/(shell)/profile/queries.ts` | 40, 43 | add `timeZone: tz` |

Client components that call `toLocaleDateString` need timezone passed as a prop from their server parent.

---

## Data layer already done
- `PropertyCore.isArchived?: boolean` — field exists on the type.
- `computeStats` and `computeKpis` in `lib/data/derivations/portfolio.ts` filter `!p.isArchived` before counting.
- `computeKpiCards` in `lib/data/derivations/analytics.ts` filters `!p.isArchived` for occupancy.
- `propertiesDb.update()` in `lib/data/db/properties.ts` already handles partial updates — just pass `{ isArchived: true }`.
