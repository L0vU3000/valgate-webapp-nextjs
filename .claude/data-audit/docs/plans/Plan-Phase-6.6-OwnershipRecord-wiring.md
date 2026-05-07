# Plan — Phase 6.6: OwnershipRecord §21 wiring + PF5 rename (Rank 6, single-page entity, NEW entity)

## Context

OwnershipRecord §21 is **rank 6 in the build order** (`pages/SUMMARY.md`) with 6 surfaces unlocked on `/property/[id]/ownership` (rows 6, 7, 13, 17, 26, 27). Phase 6.6 is **structurally distinctive**: it bundles a refactor (PF5 type rename) with a new-entity build + wiring. The two halves cannot be cleanly split — the §21 entity wants to BE called `OwnershipRecord`, but that name is currently occupied by a misnamed type (a deed/document record). The rename frees the name; only then does the §21 schema land cleanly.

**The PF5 rename — what it actually is.** `lib/data/types/ownership-record.ts` exists today with this shape:

```
OwnershipRecordSchema = z.object({
  id, userId, propertyId, name, type, date, owner, createdAt, updatedAt
})
```

That's a **deed/document record** (used to render audit rows 30-31 — title deeds, transfer documents, with `name` = "Hard Title — Original Deed", `type` = "Hard Title", `owner` = "Chan Family Trust"). Catalog §21 OwnershipRecord is **a different concept**: it's the ownership-structure record (holdingType, mortgage terms, acquisition details, distribution method). Two concepts share one name today; you can't safely build the §21 entity until the existing one is renamed.

**Step A.0 (the rename) is mechanical — 21 source-code references + 3 seed files + 2 audit corpus files.** The compiler catches every TS callsite; only the seed-folder rename (OWNR-* → ODOC-*) and the audit-corpus references need manual care.

**Catalog §21 is incomplete.** The catalog defines §21 OwnershipRecord with 5 fields: `holdingType, currentEstimatedValue, remainingMortgage, equityPercent, coOwnerIds`. The 6 page surfaces need **more**: loan terms, lender, dates, acquisition costs, distribution method. This plan extends §21 with the missing fields and updates the catalog accordingly. Two field-design decisions baked in:

1. **`currentEstimatedValue` / `remainingMortgage` are NOT new fields — they read from Property.** Both already exist on `PropertyFinanceSchema` (`currentMarketValue`, `outstandingMortgage`). Don't duplicate. `equityPercent` derives at query time: `(currentMarketValue − outstandingMortgage) / currentMarketValue × 100`. Same pattern as Phase 6.0 PropertyValuation derivations.
2. **`coOwnerIds` is dropped.** Phase 6.5 builds CoOwner with its own `propertyId` FK. The catalog's `coOwnerIds: v.array(v.id("userProfiles"))` predates the CoOwner-as-entity decision. Row 7 (Total Owners) reads `coOwners.length` directly; no array-of-IDs needed on §21.

**Cross-phase dependency: Phase 6.6 needs Phase 6.5 shipped.** Row 7 (Total Owners) reads `coOwners.length`. Without CoOwner data, that surface stays hardcoded. The build order already has 6.5 → 6.6 in sequence; this plan formalizes it as a hard prerequisite.

**No PF traps to spring beyond PF5 itself.** The 6 hardcoded surfaces are inline JSX literals + the `kpis` module-level constant (lines 24-29). The `kpis` constant overlaps with Phase 6.5's domain (it has 4 KPIs: rows 6, 7, 8, 9 — and rows 8/9 are Property-fields-promotion not in 6.6 scope). Phase 6.6 wires the first 2 KPIs (rows 6, 7); the latter 2 stay hardcoded with a TODO note (Property fields promotion is its own micro-phase).

**Constants to delete:** None outright. The `kpis` constant gets refactored in place — convert array literals to a function that builds the kpis from `record` and `coOwners` props. Inline literals at rows 13 (line 132), 17 (line 155), 26 (lines 247-258), 27 (lines 274-283) get replaced one-by-one.

**6 surfaces breakdown:**
- Row 6 — KPI "Ownership Type" — `record.holdingType`
- Row 7 — KPI "Total Owners" — `coOwners.length` (cross-entity)
- Row 13 — Mortgage terms string — `${loanType} ${loanTermYears}yr @ ${interestRate}%`
- Row 17 — Next Payment Due — formatted `record.nextPaymentDue`
- Row 26 — Acquisition Details table — 9 sub-rows mixing `Property.purchasePrice` + `record.{downPayment, closingCosts, lenderName, loanAmount, interestRate, loanTermYears, originationDate, maturityDate}`
- Row 27 — Distribution method — `record.distributionMethod` (radio shows selected only; no interactivity wiring)

The intended outcome: PF5 closed (entire codebase + corpus uses `OwnershipDocument` for deed records and `OwnershipRecord` for §21 ownership-structure records); new `OwnershipRecord` (§21) entity exists with extended Zod schema; 6 hardcoded surfaces become real-data reads; 3 new per-datapoint audit reports land (per WIRING-PLAYBOOK Step C bundling); OwnershipRecord §21 flips from "not built" → "shipped, fully wired" in `pages/INDEX.md` and `SUMMARY.md`; `ref/00-entity-catalog.md` §21 entry extended with the new field set; the ownership page reaches ~64% wired (16 of 25 hardcoded → real after 6.5+6.6).

## Prerequisites

- **Phase 6.0, 6.1, 6.2, 6.3, 6.4 complete.** All upstream entities shipped.
- **Phase 6.5 (CoOwner) MUST be complete.** Row 7 (Total Owners) reads `coOwners.length`. Without 6.5, row 7 stays hardcoded — partially-wired phase. Treat 6.5 as a hard prerequisite.
- **WIRING-PLAYBOOK.md Step C wins read.** Bundling applies cleanly here (4 of 6 surfaces are direct reads on the same entity).
- **Verified during exploration:**
  - `lib/data/types/ownership-record.ts` exists but is misnamed (it's a deed/document record). Schema: `{id, userId, propertyId, name, type, date, owner, createdAt, updatedAt}`.
  - `lib/data/db/ownership-records.ts` exists; ID prefix `OWNR`; collection `"ownership-records"`.
  - 3 deed seeds exist (OWNR-0001..0003).
  - **21 source-code references** to `OwnershipRecord` / `OwnershipRecordSchema` / `ownershipRecords` across 6 files: `lib/data/types/ownership-record.ts`, `lib/data/db/ownership-records.ts`, `lib/data/db/index.ts`, `lib/actions/ownership-records.actions.ts`, `app/(shell)/property/[id]/_components/PropertyOwnershipPage.tsx`, `scripts/fixtures/ownership.ts`. Plus `scripts/seed.ts` (referenced).
  - `Property` already has `purchasePrice` (string), `currentMarketValue`, `outstandingMortgage`, `monthlyPayment`, `interestRate` (all on PropertyFinanceSchema, all `.optional()`).
  - **PROP-0001's `purchasePrice` is currently unset in seeds** (per earlier 6.5 exploration note). Row 26 will need a fallback (`"—"`) or seed-backfill — choose backfill for visual parity.
  - `app/(shell)/property/[id]/ownership/queries.ts` exists; fetches `ownershipRecords` (deed-records, soon to be `ownershipDocuments`) + `ownershipHistory`. Phase 6.5 added `coOwners`. This phase adds the new `ownershipRecords` (§21) — reusing the namespace name after rename.

## Step 0 — Pre-flight (~10 min)

Per WIRING-PLAYBOOK.md pre-flight section:

1. **Read entity backlog row.** `pages/property-id-ownership/plan.md` §3 OwnershipRecord §21 entry — confirms 6 surfaces (rows 6, 7, 13, 17, 26, 27) and lists PF5 as the blocker.
2. **No new Q-numbers.** PF5 is a refactor, not a design ambiguity. The catalog §21 extension (new mortgage/acquisition/distribution fields) is a pragmatic schema choice, not a Q-number question — document the choice in catalog notes.
3. **Commit naming convention now (before Step A.0):**
   - Existing deed/document type → `OwnershipDocument` / `OwnershipDocumentSchema` / `ownershipDocuments` (namespace) / `ODOC` (ID prefix) / `"ownership-documents"` (collection string)
   - NEW §21 type → `OwnershipRecord` / `OwnershipRecordSchema` / `ownershipRecords` (namespace, reused after rename) / `OREC` (ID prefix) / `"ownership-records"` (collection string, reused after rename)
4. **Commit OwnershipRecord §21 Zod shape now (before Step A.1):**
   ```
   OwnershipRecordSchema = z.object({
     id, userId, propertyId,
     holdingType: z.enum(["Tenancy in Common", "Joint Tenancy", "Sole Ownership", "Trust", "LLC", "Other"]),
     // Loan / mortgage transaction
     loanType: z.string().optional(),                  // e.g. "Fixed", "ARM"
     loanAmount: z.number().nonnegative().optional(),
     loanTermYears: z.number().int().positive().optional(),
     interestRate: z.number().nonnegative().optional(),  // overlaps Property.interestRate; §21 is the transactional source
     originationDate: timestampSchema.optional(),
     maturityDate: timestampSchema.optional(),
     nextPaymentDue: timestampSchema.optional(),
     lenderName: z.string().optional(),
     // Acquisition costs
     downPayment: z.number().nonnegative().optional(),
     closingCosts: z.number().nonnegative().optional(),
     // Distribution
     distributionMethod: z.enum(["Pro-Rata by Share", "Equal Split", "Custom"]).optional(),
   })
   ```
   - `holdingType` required (the universal needed field — every property has SOME holding structure).
   - All loan/acquisition/distribution fields optional — properties without active loans (e.g. fully-paid) gracefully render with `"—"` per file convention.
   - `holdingType` and `distributionMethod` closed enums (textbook closed taxonomies); other fields stay open.
   - **NOT stored:** `currentEstimatedValue`, `remainingMortgage`, `equityPercent`. All three derive from Property at query time.
   - **NOT stored:** `coOwnerIds`. Catalog version was pre-Phase-6.5; CoOwner has its own propertyId FK now.
5. **Plan §21 seed shape:** 1 seed for PROP-0001 (OREC-0001) with all fields populated to match current hardcoded display (holdingType="Tenancy in Common", loanType="Fixed", loanAmount=388000, loanTermYears=30, interestRate=3.875, originationDate=Mar 15 2021, maturityDate=Mar 15 2051, nextPaymentDue=Feb 1 2026, lenderName="First Midwest Bank", downPayment=97000, closingCosts=9200, distributionMethod="Pro-Rata by Share"). 1-2 additional seeds for other properties (PROP-0002 with partial fields — fully-paid no-mortgage case; PROP-0006 for multi-owner case).
6. **Plan Property.purchasePrice backfill** for PROP-0001 (set to `485000` in `public/data/users/demo-user/properties/PROP-0001/finance.json`) so row 26 "Purchase Price" reads real data. Note as a one-line side fix in audit (not a separate phase concern).

## Scope of this change

**Files to RENAME (Step A.0 — PF5 fix):**

1. **`lib/data/types/ownership-record.ts`** → **`lib/data/types/ownership-document.ts`**
2. **`lib/data/db/ownership-records.ts`** → **`lib/data/db/ownership-documents.ts`**
3. **`lib/actions/ownership-records.actions.ts`** → **`lib/actions/ownership-documents.actions.ts`**
4. Seed folder `public/data/users/demo-user/ownership-records/` → **`.../ownership-documents/`**
5. Inside seed folder: `OWNR-0001/`, `OWNR-0002/`, `OWNR-0003/` → `ODOC-0001/`, `ODOC-0002/`, `ODOC-0003/`. Inside each `core.json`, the `id` field flips `"OWNR-000X"` → `"ODOC-000X"`.

**Identifier renames inside the renamed files (Step A.0):**

- `OwnershipRecord` (type) → `OwnershipDocument`
- `OwnershipRecordSchema` (Zod) → `OwnershipDocumentSchema`
- `NewOwnershipRecord` → `NewOwnershipDocument`
- `ID_PREFIX = "OWNR"` → `ID_PREFIX = "ODOC"`
- `COLLECTION = "ownership-records"` → `COLLECTION = "ownership-documents"`
- Action revalidation tag `"ownership-records"` → `"ownership-documents"`

**Identifier renames in CALLSITES (Step A.0):**

- `lib/data/db/index.ts` — `export * as ownershipRecords from "./ownership-records"` → `export * as ownershipDocuments from "./ownership-documents"` (the namespace `ownershipRecords` will be RE-ADDED in Step A.1 pointing at the new entity)
- `app/(shell)/property/[id]/_components/PropertyOwnershipPage.tsx` — type import + prop type signature (2 references)
- `app/(shell)/property/[id]/ownership/queries.ts` — `db.ownershipRecords` → `db.ownershipDocuments`; type import; field name in returned object (`ownershipRecords` → `ownershipDocuments`). Then in Step A.2, the new `ownershipRecords` (§21) is added back as a separate field.
- `scripts/fixtures/ownership.ts`, `scripts/seed.ts` — adjust imports and seed paths.

**Files to UPDATE in audit corpus during Step A.0:**

- `.claude/data-audit/pages/property-id-ownership/audit.md` — rows 30-31 (deed surfaces) now reference `OwnershipDocument`. PF5 finding gets struck through and marked resolved.
- `.claude/data-audit/pages/property-id-ownership/plan.md` — Priority 0 action item marked done; Entity Backlog row "OwnershipDocument" replaces "OwnershipRecord" for the deed-records reference.
- `pages/INDEX.md` and `pages/SUMMARY.md` — anywhere the existing entity is named, update.

**Files to CREATE (Step A.1 — new §21 entity + Step C audits):**

1. **`lib/data/types/ownership-record.ts`** (NEW, free after rename) — type + Zod with §21 extended schema, ~45 lines.
2. **`lib/data/db/ownership-records.ts`** (NEW) — db layer mirroring `expenses.ts`. Collection `"ownership-records"`, prefix `"OREC"`.
3. **`public/data/users/demo-user/ownership-records/OREC-0001..00NN/core.json`** — 2-3 seed records (1 for PROP-0001 matching mock).
4. **3 per-datapoint audit reports** under `.claude/data-audit/` (per WIRING-PLAYBOOK Step C bundling — see Step C):
   - `property-id-ownership--ownership-record-direct-reads.md` (1 bundle covering 4 surfaces: rows 6, 13, 17, 27)
   - `property-id-ownership--total-owners.md` (full template — cross-entity CoOwner count)
   - `property-id-ownership--acquisition-details.md` (full template — 9-field table mixing Property + §21 sources)

**Files to MODIFY (Step A.2 + A.3):**

1. **`lib/data/db/index.ts`** — re-add `export * as ownershipRecords from "./ownership-records"` (now pointing at NEW §21 entity).
2. **`app/(shell)/property/[id]/ownership/queries.ts`** — extend `OwnershipPageData` with `ownershipRecords: OwnershipRecord[]` (the NEW field; coexists with `ownershipDocuments` from Step A.0). Add to `Promise.all`. Filter by propertyId. Optionally compute and include `equityPercent` derivation here (or inline in component).
3. **`app/(shell)/property/[id]/_components/PropertyOwnershipPage.tsx`** — accept `ownershipRecords: OwnershipRecord[]` prop; refactor `kpis` array to a function building from props; replace 6 hardcoded surfaces. **Do NOT touch CoOwner surfaces** (Phase 6.5 territory) or remaining hardcoded rows 8-12, 14-16 (Property-field promotion, separate concern).
4. **`ref/00-entity-catalog.md` §21** — extend the OwnershipRecord section with the new mortgage/acquisition/distribution fields. Note that `currentEstimatedValue`, `remainingMortgage`, `equityPercent` derive from Property. Drop `coOwnerIds` (CoOwner is a separate entity per Phase 6.5). Add §21a or §22 for OwnershipDocument (the renamed deed entity).
5. **`public/data/users/demo-user/properties/PROP-0001/finance.json`** — backfill `purchasePrice: 485000` for row 26 visual parity (one-line side fix; documented in audit).

**Files to UPDATE in the audit corpus (Step C):**

- `.claude/data-audit/INDEX.md` — append 3 new per-datapoint audit rows.
- `.claude/data-audit/pages/INDEX.md` — OwnershipRecord §21 row: `not built` → `shipped, fully wired`. OwnershipDocument row: stays as the renamed deed-records entity (still wired for rows 30-31, no change in status).
- `.claude/data-audit/pages/SUMMARY.md` — Rank 6 row: same status change.
- `pages/property-id-ownership/plan.md` §5 Fix Log — append entry: PF5 closed (rename complete); rows 6, 7, 13, 17, 26, 27 wired; catalog §21 extended.
- `.claude/data-audit/docs/PHASES.md` — flip 6.6 status (when phase ships); add `Plan-Phase-6.6-OwnershipRecord-wiring.md` to archived plan files NOW (drafted); strike PF5 from any blocker mentions; bump "Last updated."

**Files NOT touched (out-of-scope by design):**

- Property entity (`lib/data/types/property.ts`) — settled. Existing `currentMarketValue`, `outstandingMortgage`, `purchasePrice`, `interestRate`, `monthlyPayment` stay; §21 reads them when needed.
- CoOwner entity — Phase 6.5 territory.
- OwnershipHistory entity — already wired for timeline (row 32); no change.
- Successor entity — unrelated (estate beneficiaries page).
- Property-field-promotion rows 8-12, 14-16 (Property purchasePrice/marketValue/mortgage/equity card surfaces) — separate concern; if Property data is sufficient, can be done as a quick follow-up phase or absorbed into 6.6 if the user wants. **Default: out of scope.**
- Distribution method INTERACTIVITY (row 27 radio toggle) — render selected state only; click-to-change is a future server-actions phase.
- Audit log for ownership mutations (PF6) — needs server actions; backend phase.

## Step A — Wiring (~110 min) with per-surface rule annotations

Broken into 4 sub-steps. Run the ★ self-review pass at the end.

### A.0 — PF5 rename (~60 min)

This is a mechanical refactor. Compiler errors guide the work; follow them top-to-bottom.

1. **Rename type file:** `git mv lib/data/types/ownership-record.ts lib/data/types/ownership-document.ts`. Inside: `OwnershipRecord` → `OwnershipDocument` (3 occurrences), `OwnershipRecordSchema` → `OwnershipDocumentSchema` (2 occurrences).
2. **Rename db file:** `git mv lib/data/db/ownership-records.ts lib/data/db/ownership-documents.ts`. Inside: `OwnershipRecord` → `OwnershipDocument` (12+ occurrences in function signatures), `NewOwnershipRecord` → `NewOwnershipDocument`, `ID_PREFIX = "OWNR"` → `"ODOC"`, `COLLECTION = "ownership-records"` → `"ownership-documents"`.
3. **Rename action file:** `git mv lib/actions/ownership-records.actions.ts lib/actions/ownership-documents.actions.ts`. Inside: type imports + revalidation tag `"ownership-records"` → `"ownership-documents"`.
4. **Update db/index.ts:** `export * as ownershipRecords from "./ownership-records"` → `export * as ownershipDocuments from "./ownership-documents"`. (The `ownershipRecords` namespace will be re-added in Step A.1 pointing at the NEW entity.)
5. **Update component:** `app/(shell)/property/[id]/_components/PropertyOwnershipPage.tsx` — `import { OwnershipRecord }` → `import { OwnershipDocument }`; prop type `ownershipRecords: OwnershipRecord[]` → `ownershipDocuments: OwnershipDocument[]`. (Renamed prop now refers to deeds.)
6. **Update queries.ts:** `app/(shell)/property/[id]/ownership/queries.ts` — `db.ownershipRecords.list` → `db.ownershipDocuments.list`; field name `ownershipRecords` → `ownershipDocuments` in returned object; type import.
7. **Update fixtures + seed scripts:** `scripts/fixtures/ownership.ts` and `scripts/seed.ts` — adjust imports + any reference paths.
8. **Move seed folder:** `git mv public/data/users/demo-user/ownership-records public/data/users/demo-user/ownership-documents`.
9. **Rename seed records:** `git mv ODOC-0001/...` for each (OWNR → ODOC). Update `id` field inside each `core.json` (e.g. `"OWNR-0001"` → `"ODOC-0001"`).
10. **Update audit corpus references:** `pages/property-id-ownership/audit.md` (rows 30-31 now say `OwnershipDocument`), `pages/property-id-ownership/plan.md` (Priority 0 PF5 action marked done), `pages/INDEX.md` + `pages/SUMMARY.md` (entity rename in any visible references).
11. **Smoke test:** `tsc --noEmit` clean. Dev-server boot succeeds. The `/property/PROP-0001/ownership` deed-record surfaces (rows 30-31) still render correctly (proves the rename didn't break the existing wiring).

### A.1 — New OwnershipRecord §21 schema build (~30 min)

1. **Create `lib/data/types/ownership-record.ts`** (NEW; previously occupied by what's now OwnershipDocument). Use the schema committed in Step 0. Export `OwnershipRecord` type, `HoldingType`, `DistributionMethod` extracted enums.
2. **Create `lib/data/db/ownership-records.ts`** (NEW) mirroring `expenses.ts`: `list`, `get`, `create`, `update`, `remove`. Collection `"ownership-records"`, prefix `"OREC"`.
3. **Update `lib/data/db/index.ts`** — re-add `export * as ownershipRecords from "./ownership-records"` (now points at NEW §21 entity).
4. **Create 2-3 seed records** under `public/data/users/demo-user/ownership-records/OREC-0001..00NN/core.json`:
   - **OREC-0001 / PROP-0001** — all fields populated to match the current hardcoded display (holdingType="Tenancy in Common", loanType="Fixed", loanAmount=388000, loanTermYears=30, interestRate=3.875, originationDate=ts(Mar 15 2021), maturityDate=ts(Mar 15 2051), nextPaymentDue=ts(Feb 1 2026), lenderName="First Midwest Bank", downPayment=97000, closingCosts=9200, distributionMethod="Pro-Rata by Share").
   - **OREC-0002 / PROP-0002** — fully-paid case (holdingType="Sole Ownership", no loan fields populated, distributionMethod undefined). Exercises empty-state render path on rows 13, 17, 26, 27.
   - **OREC-0003 / PROP-0006** — multi-owner case (holdingType="Tenancy in Common", distributionMethod="Equal Split", partial loan fields). Pairs with Phase 6.5's 3-owner CoOwner seeds.
5. **Backfill `Property.purchasePrice` for PROP-0001** — set `purchasePrice: "485000"` in `public/data/users/demo-user/properties/PROP-0001/finance.json` so row 26 "Purchase Price" reads real data. Document as a one-line side fix in audit.
6. **Update `ref/00-entity-catalog.md` §21** — extend OwnershipRecord field list with the new mortgage/acquisition/distribution fields. Note `currentEstimatedValue`, `remainingMortgage`, `equityPercent` derive from Property. Drop `coOwnerIds`. Add a new section (§21a or appended footnote) for OwnershipDocument noting the rename.
7. **Smoke test** — `tsc --noEmit` clean; mentally parse OREC-0001 via `OwnershipRecordSchema.parse()` to confirm shape (especially the date timestamps and the holdingType enum).

### A.2 — queries.ts extension (~10 min)

1. **Extend `ownership/queries.ts`:**
   - Add `OwnershipRecord` import (the NEW §21 type)
   - Extend `OwnershipPageData` type with `ownershipRecords: OwnershipRecord[]` (this coexists with `ownershipDocuments` from Step A.0 and `coOwners` from Phase 6.5)
   - Extend `Promise.all` to include `db.ownershipRecords.list(userId)`
   - Filter by propertyId
   - Pick the active record: `const ownershipRecord = ownershipRecords[0] ?? null;` — 1→1 today.
   - Verify `coOwners` is being fetched (added in Phase 6.5 — should already be there).

### A.3 — Wire 6 surfaces (~40 min)

**Step A.3.0 — Refactor `kpis` constant (lines 24-29):**
- Convert from module-level constant to a function `buildKpis({ record, coOwners, property })` that returns the 4 KPI objects.
- Rows 6 + 7 use real data; rows 8 + 9 (Property-field promotion — out of scope) keep hardcoded values for now with a `// TODO: Phase 6.6.5 (Property-field promotion)` comment.
- This avoids one big inline replace and makes the component cleaner.

**Row 6 — KPI "Ownership Type" (line 25):**
- **Wire:** `record.holdingType ?? "—"` for value; sub stays "Joint ownership" (or derived from holdingType — keep static for v1).
- **Bundleable** — direct read.

**Row 7 — KPI "Total Owners" (line 26):**
- **Wire:** `coOwners.length` for value; sub `"Co-owner${coOwners.length === 1 ? "" : "s"}"` (pluralization).
- **Cross-entity dependency:** if Phase 6.5 isn't shipped, `coOwners` is undefined; render `"—"` and TODO comment. Phase 6.6 prerequisites require 6.5 done.
- **Full-template audit** (cross-entity derivation, single-source).

**Row 13 — Mortgage terms (line 132):**
- **Wire:** `${record.loanType} ${record.loanTermYears}yr @ ${record.interestRate}%` (e.g. "Fixed 30yr @ 3.875%"). If any field undefined, render `"—"`.
- **Rule 2:** all-or-nothing — if loan fields are partial, fall back to `"—"` rather than rendering a half-sentence ("Fixed —yr @ 3.875%").
- **Bundleable** — concat of direct reads.

**Row 17 — Next Payment Due (line 155):**
- **Wire:** `formatDate(record.nextPaymentDue)` (e.g. "Feb 01, 2026"). Use existing `formatDate` util (Phase 6.1/6.2 pattern).
- **Rule 2:** `"—"` if undefined.
- **Bundleable** — direct read formatted.

**Row 26 — Acquisition Details table (lines 247-258):**
- **Wire:** render 9-row table with these source mappings:
  - Purchase Price → `formatCurrency(property.purchasePrice)` (after Step A.1 backfill)
  - Down Payment → `formatCurrency(record.downPayment)`
  - Closing Costs → `formatCurrency(record.closingCosts)`
  - Total Acquisition → derived: `purchasePrice + closingCosts` (mock shows this; verify formula in audit)
  - Lender → `record.lenderName ?? "—"`
  - Loan Amount → `formatCurrency(record.loanAmount)`
  - Rate → `${record.interestRate}%`
  - Term → `${record.loanTermYears}yr`
  - Origination → `formatDate(record.originationDate)`
  - Maturity → `formatDate(record.maturityDate)`
- **Rule 2:** each row independently empty-states to `"—"`; table doesn't collapse if some fields are missing (e.g. PROP-0002 fully-paid case shows mostly "—").
- **Rule 3 trigger:** Total Acquisition derivation — walk: 485000 + 9200 = 494200 ✓. Walk with closingCosts undefined: shows just `"—"` (don't sum-with-undefined).
- **Full-template audit** (multi-field table + 1 derivation).

**Row 27 — Distribution method (lines 274-283):**
- **Wire:** render the radio button list (3 options: Pro-Rata by Share, Equal Split, Custom) with `record.distributionMethod` showing as selected. **No interactivity wiring** — display-only.
- **Rule 2:** if `distributionMethod` undefined, show all options unselected (don't default to a value the schema doesn't have).
- **Bundleable** — direct read driving a CSS class.

### ★ Self-review pass (~10 min)

After A.0-A.3 done:

1. **Rule 1 sweep:** check adjacent claim-strings near wired surfaces. Three known: KPI sub-labels ("Joint ownership", "Co-owners" — handled), mortgage terms ("Fixed 30yr @ 3.875%" depends on 3 fields — handled with all-or-nothing), Acquisition Details "Total Acquisition" derivation (handled with sum-with-undefined guard).
2. **Rule 2 grep:** in `PropertyOwnershipPage.tsx`, grep for `"—"`, `"None"`, `"N/A"`, `"$0"`. Confirm new empty states match file convention. Especially the Acquisition Details table where independent empty-state per row matters.
3. **Rule 3 mental walks:**
   - Total Acquisition: walk PROP-0001 (485000 + 9200 = 494200 ✓), walk PROP-0002 (closingCosts undefined → render "—" without crashing).
   - coOwners.length: walk PROP-0001 (2 owners ✓), PROP-0002 (1 owner ✓), PROP-0006 (3 owners ✓).
4. **PF5 verification:** grep entire repo for `OwnershipRecord` — should ONLY return references to the new §21 entity (in lib/data/types/ownership-record.ts, lib/data/db/ownership-records.ts, queries.ts, component, audit corpus). Should NOT return any reference to deed-records (those are now `OwnershipDocument`). Same grep for `OWNR-` — should return zero (all renamed to `ODOC-` or `OREC-`). Same grep for `"ownership-records"` — should ONLY appear in the new §21 db file (and audit corpus referencing the new entity).
5. **CoOwner boundary verification:** grep `PropertyOwnershipPage.tsx` for `OwnerCard`, `coOwner`, `donut` — all CoOwner surfaces (Phase 6.5) should STILL EXIST untouched.
6. **Property-field-promotion boundary:** rows 8-12, 14-16 (Acquisition Price KPI, Holding Period KPI, Equity card primary value, etc.) STILL show their hardcoded values with TODO comments. Don't get tempted to wire them.

**STOP. Hand back to user for Step B visual verification.**

## Step B — Visual dev-server check (~10 min, you do this)

1. Start dev server.
2. Open `/property/PROP-0001/ownership` — confirm:
   - KPI strip row 6 "Ownership Type" shows "Tenancy in Common" (real)
   - KPI strip row 7 "Total Owners" shows "2 Co-owners" (derived from coOwners.length)
   - KPI strip rows 8, 9 STILL show hardcoded "$485,000" + "4 yrs 3 mos" (correct — Property-field promotion out of scope)
   - Equity card row 13 "Mortgage terms" shows "Fixed 30yr @ 3.875%" (real)
   - Equity card row 17 "Next Payment Due" shows "Feb 01, 2026" (real)
   - Acquisition Details (row 26) shows real values: Purchase $485,000 (after backfill), Down Payment $97,000, Closing $9,200, Total $494,200, Lender "First Midwest Bank", Loan $388,000, Rate 3.875%, Term 30yr, Origination Mar 15 2021, Maturity Mar 15 2051
   - Distribution method (row 27) shows "Pro-Rata by Share" selected
   - Documents tab (rows 30-31) STILL shows OwnershipDocument deed records (rename didn't break it)
   - CoOwner surfaces (donut, OwnerCards, income split, expense split — rows 18-25, 28-29) STILL show real CoOwner data (Phase 6.5)
3. Open `/property/PROP-0002/ownership` — confirm:
   - KPI row 6 shows "Sole Ownership"
   - KPI row 7 shows "1 Co-owner" (singular)
   - Equity row 13 shows "—" (no loan)
   - Acquisition Details row 26 shows "—" for loan-related fields, real values for purchase if backfilled
   - Distribution method row 27 shows all options unselected (no value)
4. Open `/property/PROP-0006/ownership` — confirm:
   - KPI row 7 shows "3 Co-owners"
   - Distribution method shows "Equal Split" selected
5. **Re-audit existing wired surfaces** — confirm rows 30-31 (deed records) still render correctly post-rename.
6. Hand back with notes if anything is wrong; otherwise say "go" for Step C.

## Step C — Audit batch + index updates (~1 hour, per WIRING-PLAYBOOK Step C wins)

1. Run `/audit-datapoint` on the **first** newly-wired surface (recommend the bundled OwnershipRecord report — `property-id-ownership--ownership-record-direct-reads.md` — since it exercises 4 surfaces in one file and validates the bundling pattern continues to work).
2. **Spot-check dedup machinery + bundling format:**
   - ☐ Bundle uses the format from WIRING-PLAYBOOK Win 1 (table covering 4 surfaces with per-field rows)
   - ☐ Findings use one-liner stubs for systemic findings (Win 2)
   - ☐ Compressed lite format (Win 3)
   - ☐ TL;DR has the `📄 Page audit:` back-link
   - ☐ Notes PF5 was resolved in this phase
3. **If any check fails:** STOP. Investigate; fix coupling if needed.
4. **If passes:** continue with the remaining audits, **applying WIRING-PLAYBOOK Step C wins**:
   - **Win 1 — Bundle direct-read cluster.** Rows 6 (holdingType), 13 (mortgage terms concat), 17 (next payment date), 27 (distribution method) all share entity (OwnershipRecord §21), source files (PropertyOwnershipPage.tsx + queries.ts + types), and systemic findings → ONE bundle: `property-id-ownership--ownership-record-direct-reads.md` covering 4 surfaces with a per-field table.
   - **Full template (standalone):** Total Owners (row 7, cross-entity coOwners.length count), Acquisition Details (row 26, multi-field table + Total derivation) — **2 audits**.
   - **Total reports:** 1 bundle + 2 full = **3 audit files** covering 6 surfaces.
   - **Win 2 — Systemic-finding stub.** F1 (userId leak via PF1), F2 (audit log via PF6), etc. render as one-liner stubs.
   - **Win 3 — Compressed lite.** The bundle uses the compressed format.
5. Update `INDEX.md` (per-datapoint table) with **3 new rows** (annotate the bundle row as covering 4 underlying surfaces).
6. Update `pages/INDEX.md` OwnershipRecord §21 row (and verify OwnershipDocument row reflects the rename).
7. Update `pages/SUMMARY.md` Rank 6 row.
8. Update `docs/PHASES.md`: flip 6.6 status emoji, add archived plan path entry to `(executed)`, note PF5 closed, bump "Last updated."
9. Append fix-log entry to `pages/property-id-ownership/plan.md` §5 with: PF5 closed (rename complete); rows 6, 7, 13, 17, 26, 27 wired; catalog §21 extended; Property.purchasePrice backfilled.

## Verification

After Phase 6.6 lands:

1. **Type check passes.** Zero errors. `tsc --noEmit` clean.
2. **No ZodError in terminal** during dev server boot or page navigation. Especially verify both schemas (OwnershipDocument for deeds, OwnershipRecord for §21) parse their respective seeds cleanly.
3. **Visual check on PROP-0001/ownership.** All 6 surfaces show real OwnershipRecord §21 data; deed records (rows 30-31) still render correctly post-rename; CoOwner surfaces (Phase 6.5) untouched.
4. **OwnershipDocument entity exists** (renamed from old OwnershipRecord) with Zod schema, db layer, 3 deed seeds (now ODOC-prefixed), exported from `db/index.ts` as `ownershipDocuments`.
5. **OwnershipRecord §21 entity exists** (NEW) with extended Zod schema, db layer, 2-3 seeds (OREC-prefixed), exported from `db/index.ts` as `ownershipRecords`.
6. **PF5 closed.** `grep -rn "OwnershipRecord" --include="*.ts" --include="*.tsx"` returns ONLY references to the new §21 entity. `grep -rn "OWNR-" public/data/` returns zero.
7. **Catalog §21 extended.** `ref/00-entity-catalog.md` §21 entry has the new mortgage/acquisition/distribution fields. New section (§21a or §22) added for OwnershipDocument. `coOwnerIds` removed from §21.
8. **Property.purchasePrice backfilled** for PROP-0001 (485000). Documented in plan.md fix log.
9. **CoOwner boundary respected.** Phase 6.5's CoOwner surfaces (donut row 18, legend row 19, OwnerCards rows 20-25, income/expense split rows 28-29) STILL EXIST untouched.
10. **Property-field-promotion boundary respected.** Rows 8-12, 14-16 STILL show their hardcoded values with TODO comments — they're a future micro-phase concern.
11. **3 new per-datapoint audit reports** under `.claude/data-audit/` (1 bundle covering 4 surfaces + 2 full standalone, total 6 surfaces audited). Confirm by `ls .claude/data-audit/*.md | wc -l` (should be ~72, up from ~69 after Phase 6.5 — bundling means fewer files, not fewer surfaces).
12. **Status fields synced.** OwnershipRecord §21 reads `shipped, fully wired` in BOTH `pages/INDEX.md` and `pages/SUMMARY.md`. PHASES.md row 6.6 reads ✅ and the `Blocked on Priority 0 type rename` caveat is removed.
13. **Fix log appended** to `pages/property-id-ownership/plan.md` §5 with PF5 + 6.6 wiring notes.
14. **Playbook rules visibly applied.** No P1-grade adjacent-hardcode findings; mortgage-terms all-or-nothing handled; Total Acquisition sum-with-undefined handled; deed records still functional post-rename.
15. **No surprise file changes.** `git status` shows: 3 file renames (type, db, action) + 3 seed-folder renames + 9 seed-file renames; 2 source files created (new OwnershipRecord type + db); 4 source files modified (db/index, queries.ts, component, finance.json); 3 audit reports created; ~6 corpus files updated.

## What unblocks after Phase 6.6

- **Phase 6.7 — Folder wiring.** Rank 7; 4 surfaces (documents page). Folder entity exists since Batch 3; wire-only. Quick ~2-hour phase. No remaining structural blockers.
- **Phase 6.8 — Notification + MaintenanceItem wiring.** Rank 8; 4 surfaces (overview + rental). Independent of 6.6.
- **Ownership page reaches ~64% wired** — 16 of 25 hardcoded → real after 6.5 + 6.6. Remaining 9: Property-field promotion (7), OwnershipDocument status badge (1), OwnershipRecord vs Property reconciliation (1).
- **PF5 closed** — naming collision resolved. Future audits can reference `OwnershipRecord` and `OwnershipDocument` unambiguously.
- **Pattern reinforced for refactor + new-entity bundling** — Phase 6.6 is the first phase to bundle a rename refactor with an entity build. If this works smoothly, the same pattern can apply to other naming/structural cleanups in the future.

## Time estimate

~4 hours total (slightly larger than 6.4/6.5 because of the rename refactor):

- Step 0 (pre-flight + naming convention + Zod commit): ~10 min
- Step A.0 (PF5 rename — 21 source refs + 3 seeds + audit corpus): ~60 min
- Step A.1 (new §21 schema + seeds + db export + entity catalog + Property.purchasePrice backfill): ~30 min
- Step A.2 (queries.ts extension): ~10 min
- Step A.3 (wire 6 surfaces + kpis refactor): ~40 min
- ★ self-review: ~10 min
- Step B (visual check across 3 properties + post-rename verification): ~10 min
- Step C (3-report batch + dedup spot-check + 6 corpus updates): ~1 hour
  - 1 bundled lite (~10 min) + 2 full (~20 min) = ~30 min audits
  - Index + SUMMARY + PHASES + plan.md updates: ~15 min
- Buffer (rename edge cases, missed callsites, seed migration tedium): ~30 min

**Realistic: 4 hours. Conservative: 4.5 hours.**

## Out of scope (deliberate)

- **CoOwner surfaces** (rows 18-25, 28-29) — Phase 6.5 territory. Untouched.
- **Property-field-promotion surfaces** (rows 8-12, 14-16: Acquisition Price KPI, Holding Period KPI, Equity card primary, mortgage progress bar, etc.) — separate micro-phase. Could be folded in if user prefers; default out of scope to keep 6.6 focused on §21.
- **Distribution method INTERACTIVITY** (row 27 click-to-change) — display-only today; needs server actions; future phase.
- **Audit log for ownership mutations (PF6)** — needs server actions; backend phase.
- **Reconciling Property.outstandingMortgage with §21 loanAmount** — both coexist; future migration phase if redundancy becomes problematic.
- **Reconciling Property.interestRate with §21 interestRate** — same as above.
- **Real RBAC for ownership tab (Q4.N)** — Phase 6.5's lane (already deferred to backend phase).
- **Real PII encryption** — backend phase.
- **Multi-tenant auth (PF2)** — affects all pages; separate concern.
- **Property prop narrowing (PF1)** — general optimization, separate concern.
- **Distribution method enum extension** — closed to 3 values (Pro-Rata, Equal, Custom); future business case can extend.
- **Modifying any Zod schema except creating §21 OwnershipRecord and renaming OwnershipDocument** — Property, Lease, Payment, Document, LandParcel, CoOwner all settled.
- `.context/todo-ui.md` or `deferred-database-migration.md` updates — Phase 7 concern.
- Re-running `/audit-page-datapoints` against ownership page — source code changes confined to wiring + rename.
- DDL or ERD generation refresh — separate workstreams; both new entities will land in a future ERD refresh.
