# Plan — /ownership Completion Sprint (Phase 8.7)

## Context

The `/property/[id]/ownership` page was partially wired in Phases 6.5 and 6.6:
- Phase 6.5 landed CoOwner entity (10 surfaces: split donut, legend, owner cards, rent/expense distribution)
- Phase 6.6 landed OwnershipRecord §21 entity + the Priority-0 rename (`OwnershipRecord → OwnershipDocument`)
- 7 per-datapoint audit files were written and verified

**Current state:** 31 WIRED · 1 HARDCODED (row 31, OwnershipDocument status badge) + 5–7 Property field promotions that read as hardcoded strings in the component despite the source fields existing on `Property`.

This sprint wires the remaining surfaces, fixes the one schema gap, resolves the open PFn findings in scope, writes the remaining datapoint audit files, and syncs the corpus.

---

## Q-Gate Check (all clear)

| Q # | Status | Notes |
|---|---|---|
| Q4.N (Viewer RBAC) | ✅ resolved | Deferred to Clerk+Convex phase; no action needed |
| Q4.E (equity stored vs derived) | ✅ resolved | Derive on read: `sharePercent × currentMarketValue / 100` |
| Q4.P (audit log) | ✅ resolved | Estate-activity-events pattern established |
| Q5.S (PII encryption) | ✅ deferred | SSN masked-at-rest; backend phase |
| Holding period formula | ✅ trivial | `(today - purchaseDate)` → years + months; guard if `purchaseDate` undefined |
| Appreciation formula | ✅ trivial | `(currentMarketValue - buyNumeric) / buyNumeric * 100`; guard both undefined / zero |
| Equity formula | ✅ trivial | `currentMarketValue - outstandingMortgage`; guard undefined |
| LTV formula | ✅ trivial | `outstandingMortgage / currentMarketValue * 100`; guard zero denominator |

No Q-gates block this work.

---

## Remaining Surfaces to Wire

| Row | Label | Source | Status |
|---|---|---|---|
| 8 | Acquisition Price KPI | `Property.buyNumeric` → format "$X" | ❌ hardcoded "$485,000" |
| 9 | Holding Period KPI | derive from `Property.purchaseDate` → today → "X yrs Y mos" | ❌ hardcoded "4 yrs 3 mos" |
| 10 | Current Estimated Value | `Property.currentMarketValue` → format "$X" | ❌ hardcoded "$612,000" |
| 11 | Appreciation % | derive `(currentMarketValue - buyNumeric) / buyNumeric × 100` | ❌ hardcoded "+26.2%" |
| 12 | Outstanding Mortgage | `Property.outstandingMortgage` → format "$X" | ❌ hardcoded "$341,200" |
| 14 | Equity amount + bar | derive `currentMarketValue - outstandingMortgage` | ❌ hardcoded "$270,800 (44.2%)" |
| 15 | LTV Ratio | derive `outstandingMortgage / currentMarketValue × 100` | ❌ hardcoded "55.8%" |
| 16 | Monthly P/I | `Property.monthlyPayment` → format "$X/mo" | ❌ hardcoded "$1,612/mo" |
| 31 | OwnershipDocument status badge | `OwnershipDocument.status` (field missing) | ❌ hardcoded "Current" |

**PFn in scope:**
- PF1 (full Property to client) — partially fix: pass computed `propertyFinancials` shape instead of full Property
- PF3 (full-list-then-filter) — add `listByProperty` helpers to 4 DB modules

**PFn out of scope:**
- PF2 (auth shim) — Clerk phase
- PF4 (Zod at FS boundary) — systemic, backend phase
- PF6 (audit log for mutations) — no write CTAs wired yet

---

## Step-by-Step Implementation

### Step 1 — Schema: add `OwnershipDocument.status`

**File:** `lib/data/types/ownership-document.ts`
- Add `status?: z.enum(["Current", "Superseded", "Archived"])` to Zod schema
- Update TypeScript type accordingly

**File:** `scripts/fixtures/ownership.ts`
- Add `status: "Current"` to all 3 existing OwnershipDocument seed records (ODOC-0001 → ODOC-0003)
- Re-run seed script after

### Step 2 — DB layer: add `listByProperty` helpers (PF3 fix)

**Files:**
- `lib/data/db/co-owners.ts`
- `lib/data/db/ownership-documents.ts`
- `lib/data/db/ownership-records.ts`
- `lib/data/db/ownership-history.ts`

For each, add:
```ts
listByProperty(userId: string, propertyId: string): EntityType[]
// Implementation: call this.list(userId).filter(r => r.propertyId === propertyId)
```
Match existing method signatures in the file exactly.

### Step 3 — queries.ts: compute `propertyFinancials` server-side (PF1 partial fix)

**File:** `app/(shell)/property/[id]/ownership/queries.ts`

Replace the `list(userId) + filter` calls with `listByProperty(userId, propertyId)` calls.

Add a `buildPropertyFinancials(property: Property)` helper that computes:
```ts
{
  acquisitionPrice: fmtCurrency(property.buyNumeric),          // "$485,000"
  holdingPeriod: deriveHoldingPeriod(property.purchaseDate),   // "4 yrs 2 mos"
  currentMarketValue: fmtCurrencyOpt(property.currentMarketValue), // "$612,000" | "—"
  appreciationPct: deriveAppreciation(property.buyNumeric, property.currentMarketValue), // "+26.2%" | "—"
  outstandingMortgage: fmtCurrencyOpt(property.outstandingMortgage), // "$341,200" | "—"
  equityAmount: deriveEquityAmount(property.currentMarketValue, property.outstandingMortgage), // "$270,800" | "—"
  equityPct: deriveEquityPct(property.currentMarketValue, property.outstandingMortgage),       // 44.2 | null
  ltv: deriveLtv(property.currentMarketValue, property.outstandingMortgage),                   // "55.8%" | "—"
  monthlyPayment: fmtCurrencyOpt(property.monthlyPayment),     // "$1,612" | "—"
}
```

All helpers are pure functions defined at the bottom of queries.ts (or in a co-located util). Keep them small — no abstraction beyond what's needed.

Return `propertyFinancials` as part of `getOwnershipPageData` return value. Keep passing `property` separately (still needed for id, name, type, health, code used elsewhere in the component) — do not delete it from props yet since PF1 full fix is a separate pass.

### Step 4 — Component: wire `propertyFinancials` and `doc.status`

**File:** `app/(shell)/property/[id]/_components/PropertyOwnershipPage.tsx`

- Accept `propertyFinancials: PropertyFinancials` as a new prop
- In `buildKpis()`, replace rows 8–9 hardcoded values with `propertyFinancials.acquisitionPrice` and `propertyFinancials.holdingPeriod`
- In the Equity & Financial Position section, replace rows 10–12, 14–16 hardcoded values with `propertyFinancials.*`
- In the documents table (row 31), replace `"Current"` string literal with `doc.status ?? "Current"`
- The equity bar width (row 14) currently uses a hardcoded percentage — replace with `propertyFinancials.equityPct ?? 0` (for the `width` style)

**File:** `app/(shell)/property/[id]/ownership/page.tsx`
- Destructure `propertyFinancials` from `getOwnershipPageData` result and pass to `PropertyOwnershipPage`

### Step 5 — Re-run seed

```bash
npx tsx scripts/seed.ts
```

Verify ODOC-0001 now has `status: "Current"` in the JSON fixture.

### Step 6 — Per-datapoint audit files

Write 2 new audit files in `.claude/data-audit/pages/property-id-ownership/datapoints/`:

**`property-financials-promotions.md`** — bundled lite template
- Covers rows 8 (acquisition price), 9 (holding period), 10 (current market value), 12 (outstanding mortgage), 16 (monthly P/I)
- 5 direct reads from `propertyFinancials.*`

**`property-financials-derivations.md`** — full template (derivations)
- Covers rows 11 (appreciation %), 14 (equity amount + bar), 15 (LTV)
- Document formulas, guard conditions, golden values for PROP-0001 / PROP-0002

**`ownership-document-status.md`** — lite template
- Covers row 31 (status badge)
- Document the new field, default "Current", guard `?? "Current"`

### Step 7 — Corpus sync

1. **`plan.md` Fix Log** — append new row for Phase 8.7:
   - Rows 8–16 (Property field promotions): ✅ resolved
   - Row 31 (OwnershipDocument.status): ✅ resolved
   - PF3 (listByProperty helpers): ✅ resolved

2. **`ai-data-ref/pages.md`** — update ownership row to:
   `37 WIRED · 0 HARDCODED · ✅ fully wired`

3. **`INDEX.md`** — add 3 new datapoint entries

---

## Verification

```
Step A: npx tsc --noEmit → zero errors
Step B: npx tsx scripts/seed.ts → no errors

Step C: npm run dev → navigate to /property/PROP-0001/ownership
  - KPI strip: Acquisition Price = "$485,000", Holding Period = ~"4 yrs 2 mos"
  - Equity section: Current Value = "$612,000", Appreciation shows real %, Mortgage/Equity/LTV from real fields
  - Documents table: status badge reads from doc.status field (not hardcoded)

Step D: navigate to /property/PROP-0002/ownership
  - All optional financial fields show "—" gracefully (no crashes)

Step E: navigate to /property/PROP-0006/ownership (3 co-owners)
  - Split donut 40+30+30=100% still correct (regression check)
  - Acquisition Price / financials from PROP-0006 fields
```

---

## Files to Modify

| File | Change |
|---|---|
| `lib/data/types/ownership-document.ts` | Add `status` field |
| `scripts/fixtures/ownership.ts` | Add `status: "Current"` to 3 OwnershipDocument seeds |
| `lib/data/db/co-owners.ts` | Add `listByProperty` |
| `lib/data/db/ownership-documents.ts` | Add `listByProperty` |
| `lib/data/db/ownership-records.ts` | Add `listByProperty` |
| `lib/data/db/ownership-history.ts` | Add `listByProperty` |
| `app/(shell)/property/[id]/ownership/queries.ts` | Use `listByProperty`; compute + return `propertyFinancials` |
| `app/(shell)/property/[id]/ownership/page.tsx` | Pass `propertyFinancials` to component |
| `app/(shell)/property/[id]/_components/PropertyOwnershipPage.tsx` | Accept `propertyFinancials`; remove 8 hardcoded values; wire `doc.status` |
| **New:** `.claude/data-audit/pages/property-id-ownership/datapoints/property-financials-promotions.md` | Lite bundled audit (5 surfaces) |
| **New:** `.claude/data-audit/pages/property-id-ownership/datapoints/property-financials-derivations.md` | Full audit (3 derivations) |
| **New:** `.claude/data-audit/pages/property-id-ownership/datapoints/ownership-document-status.md` | Lite audit (1 surface) |
| `.claude/data-audit/pages/property-id-ownership/plan.md` | Fix Log + status update |
| `.claude/data-audit/ai-data-ref/pages.md` | Update ownership row |
| `.claude/data-audit/INDEX.md` | Add 3 new datapoint entries |
