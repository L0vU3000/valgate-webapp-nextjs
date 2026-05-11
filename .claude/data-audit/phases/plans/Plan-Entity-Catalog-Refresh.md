# Plan — Refresh entity catalog (`ref/00-entity-catalog.md`)

## Context

`.claude/data-audit/ref/00-entity-catalog.md` is the existing master schema reference — 558 lines, 24 entity sections (Property §1 through CoOwner §24). It's the right home for the user's "consolidate all entities and their fields in one md file" request, but it has drifted from the code during the entity sprint:

1. **Missing entity:** `Expense` (added in Phase 6.2) is not in the catalog.
2. **Aspirational entries that don't exist in code:** `RentalEvent` (§8), `Draft` (§12), `EstateDocument` (§15) are documented as if real but `lib/data/types/` has no corresponding files.
3. **Schema drift:** during 6.0–6.8, several entities gained fields, enum values, or new sub-schemas. Catalog field-tables may not match current Zod exactly (Property gained sub-schemas for Core/Location/Finance/Media; Lease/Tenant gained enum values; Document/Folder gained `parentFolderId` self-FK relationships).
4. **Q-resolutions not reflected:** Q5.K resolved 2026-05-06 → remove `Property.health`. Q4.N resolved → CoOwner PII annotations. Q4.R resolved → LandParcel as separate entity (already in §23). The catalog should annotate which fields are scheduled for removal or have committed semantics.
5. **Convex `v.*` annotations vs Zod reality:** the catalog was originally written with Convex `v.*` type annotations as the proposed backend schema. The deployed code is Zod. Both are valid (Convex annotations stay as backend-target; Zod is current). Refresh should clarify this so future readers don't conflate them.

The intended outcome: a single accurate consolidated entity reference. Every entity in `lib/data/types/` represented; every aspirational entity flagged; every recent schema decision reflected. The catalog stays authoritative for "what entities does this app have, what fields, what types, what relationships" — usable for backend planning, ERD/DDL generation, onboarding, and audit dedup citations.

## Prerequisites

- **All Phase 6.x entity work complete.** Sprint shipped 2026-05-06.
- **All recent Q-resolutions recorded** in `ref/05-open-questions.md` (Q3.B, Q4.N, Q4.R, Q4.F, Q5.K all resolved this cycle).
- **Catalog file exists** at `.claude/data-audit/ref/00-entity-catalog.md` — 24 sections, ~558 lines.
- **Zod entity files exist** at `lib/data/types/` — 23 entity files + `_common.ts`:
  - certification, co-owner, document, emergency-contact, expense, folder, inspection, land-parcel, lease, maintenance-item, notification-preference, notification, ownership-document, ownership-history, ownership-record, payment, professional, property-valuation, property, safety-risk, successor, tenant, user-profile.
- This is a **documentation-only refresh** — no code changes, no schema changes, no entity additions/removals.

## Step 0 — Pre-flight (~5 min)

1. **Open both files side-by-side:**
   - Catalog: `.claude/data-audit/ref/00-entity-catalog.md`
   - Zod entities: `lib/data/types/*.ts` (23 files)
2. **Confirm the catalog's section numbering** (§1–§24, plus need to reserve §25 for Expense).
3. **Note current Q-resolutions** that affect catalog content:
   - Q5.K: `Property.health` scheduled for removal — annotate as deprecated in the catalog
   - Q4.N: CoOwner PII fields (`ssnMasked`, `taxEntity`, `tax1099Status`) — annotate as masked-at-rest
   - Q4.R: LandParcel = separate entity (already in §23)
   - Q4.F: Notification auto-creation deferred — annotate
   - Q3.B: Monthly Income formula — affects derivations doc, not catalog directly

## Scope of this change

**File to MODIFY (1 file):**

- **`.claude/data-audit/ref/00-entity-catalog.md`** — refresh in place. Section-by-section field-list verification + add §25 Expense + mark §8/§12/§15 aspirational + annotate Q-resolutions + add Last refreshed footer.

**Files NOT modified:**

- No code changes. No `lib/data/types/*` edits.
- No Zod schema edits.
- No other audit corpus files.
- `ref/03-data-flow-and-derivations.md` — separate ref doc; touch in a different refresh if needed.
- `ref/05-open-questions.md` — already up to date with resolutions; no changes here.

## Step 1 — Drift survey (~30 min)

Walk every catalog section. For each, verify the field table against current Zod. Mark drift in a working notes block (mental or on-screen) — do NOT edit the catalog yet.

For each section §N:

1. Open the corresponding Zod file (`lib/data/types/<entity>.ts`).
2. Compare:
   - **Field set** — every field in Zod present in catalog? Every field in catalog present in Zod?
   - **Types** — Zod type matches the Convex `v.*` annotation? (e.g. Zod `z.string()` ↔ Convex `v.string()`; Zod `z.enum([...])` ↔ Convex `v.union(v.literal(...))`)
   - **Optionality** — `.optional()` in Zod ↔ `v.optional()` in catalog (Nullable column)
   - **Enum values** — exact string match
3. Flag drift in 4 categories:
   - **MISSING_IN_CATALOG** — Zod has a field the catalog doesn't list
   - **MISSING_IN_ZOD** — catalog lists a field that doesn't exist in Zod (likely catalog over-promised)
   - **TYPE_DRIFT** — same field name but different type
   - **ENUM_DRIFT** — enum has different values

**Special-case sections:**

- **§1 Property** — has 4 sub-schemas (PropertyCoreSchema + PropertyLocation + PropertyFinance + PropertyMedia merged into PropertySchema). Catalog has them flat in one table — that's correct since they merge into one entity. Verify all sub-schema fields covered.
- **§17/§18 Inspection + Certification** — currently in one section per the catalog grouping. Verify both sub-entities still match.
- **§21/§21a OwnershipRecord + OwnershipDocument** — catalog grouped them into one section after the PF5 rename. Verify both schemas (the new §21 ownership-structure record + the renamed §21a deed-document record) are accurately documented.
- **§22 OwnershipHistoryItem** — under same heading as §21; verify it's still aligned with `ownership-history.ts`.

**Aspirational sections to confirm (no Zod file expected):**

- **§8 RentalEvent** — `lib/data/types/rental-event.ts` does NOT exist. Confirmed aspirational.
- **§12 Draft** — `lib/data/types/draft.ts` does NOT exist. Confirmed aspirational.
- **§15 EstateDocument** — `lib/data/types/estate-document.ts` does NOT exist. Confirmed aspirational.

Output of Step 1: a per-section drift list, ready to drive Step 2 edits.

## Step 2 — Apply edits (~35 min)

**2.1 — Refresh existing sections (§1–§24, except §8/§12/§15)** (~25 min)

For each section with drift, edit in place:

- **MISSING_IN_CATALOG** rows: add the field to the table with the correct type, optionality, provenance ("added Phase 6.x" if the field came in during the sprint).
- **MISSING_IN_ZOD** rows: keep the field in the catalog but annotate `**proposed (not yet in code)**` in the Provenance column. This preserves the design intent without misleading.
- **TYPE_DRIFT**: update the type column to match Zod, with the Convex `v.*` equivalent. If the difference is intentional (Zod tightening), note it.
- **ENUM_DRIFT**: update enum values to match Zod exactly.

**2.2 — Add §25 Expense** (~5 min)

Append a new section after §24 CoOwner, following the established format:

```markdown
## 25. Expense (`expenses`)

Property-attached operational expenses (maintenance bills, utilities, taxes, etc.). Built in Phase 6.2 alongside Payment for the rental page Net Income derivation.

| Field | Type | Nullable | Provenance |
|---|---|---|---|
| `_id` | `v.id("expenses")` | no | Convex |
| `userId` | `v.string()` | no | ownership |
| `propertyId` | `v.id("properties")` | no | Phase 6.2 wiring |
| `date` | `v.number()` | no | when the expense was incurred |
| `category` | `v.union(v.literal("Maintenance"), v.literal("Utilities"), v.literal("Insurance"), v.literal("Tax"), v.literal("Management"), v.literal("Other"))` | no | Phase 6.2 design |
| `amount` | `v.number()` | no | non-negative |
| `note` | `v.optional(v.string())` | yes | free-text receipt detail |

**Relationships**: 1→1 to Property via `propertyId`.
**Ownership**: `userId === ctx.identity.subject`.
**Indexes**: `by_user_and_property`, `by_user_and_date` (for YTD windows).
**Notes**: Phase 6.2 wired Expense to overview row 11 (Expenses KPI) and rental rows 16-17 (Expenses subtotal + Net Income subtotal). Pairs with Payment for cross-card identity (NOI = Gross − Expenses; Net Income = Total Rent − Expenses).
```

**2.3 — Mark aspirational sections (§8 RentalEvent, §12 Draft, §15 EstateDocument)** (~3 min)

For each, prepend a status banner immediately under the heading:

```markdown
## 8. RentalEvent (`rentalEvents`)

> 🔜 **Not built.** No `lib/data/types/rental-event.ts` exists today. Documented here as design intent only; will be built when Phase 6.x deferred lands (PropertyComparable / MarketSnapshot / RentalEvent — gated on Q4.Q, now resolved → Phase 6.9).
```

For §12 Draft: similar banner. Note that Drafts are currently held in browser localStorage during the add-property wizard, not in the FS DB. The proposed entity is for server-side draft persistence (future).

For §15 EstateDocument: similar banner. Note that the current Successor + estate-planning surfaces don't yet attach documents; this entity would land if/when an estate-planning page is built.

**2.4 — Annotate Q-resolutions (~5 min)**

In specific entity sections, add resolution callouts:

- **§1 Property**, near the `health` field row: `> ⚠️ **Q5.K resolved 2026-05-06: scheduled for removal.** `Property.health` will be dropped from the schema in a follow-up cleanup phase. Replacement attention-signal will derive from open Emergency MaintenanceItems + overdue Payment.`
- **§9 Notification**, near the top of the section: `> **Q4.F resolved Phase 6.8 (2026-05-06):** HYBRID per source. Lease-expiring alerts derived at query time from Lease.endDate. Manual/cross-cutting alerts stored as Notification rows. Auto-creation deferred to backend phase. **Schema gap (Q5.T):** no `propertyId` field; property-scoping today via `linkTo` URL parse.`
- **§24 CoOwner**, near the PII fields: `> **Q4.N resolved Phase 6.5 (2026-05-06):** RBAC deferred to backend phase; FS demo is single-user. **PII storage:** SSN stored already-masked at rest (`••••-••-XXXX`); full SSN never enters the system. Real encryption is Q5.S → backend phase.`
- **§23 LandParcel**, near the top: `> **Q4.R resolved Phase 6.4 (2026-05-06):** Option 2 — separate entity, 1→1 with Property for v1, 1→N-ready by removing per-property uniqueness when multi-parcel lands.`

## Step 3 — Front matter / Last refreshed (~5 min)

1. Update the catalog's intro paragraph to reflect: "Refreshed 2026-05-06 to sync with current Zod schemas in `lib/data/types/`. The Convex `v.*` annotations remain as the proposed backend schema target; current code uses Zod (validated at FS read boundary). Aspirational entries (§8, §12, §15) are flagged with a 🔜 Not built banner."
2. Append a footer:
   ```markdown
   ---
   ## Last refreshed
   
   2026-05-06 — synced §1–§24 with current Zod schemas; added §25 Expense (Phase 6.2 entity); marked §8 RentalEvent, §12 Draft, §15 EstateDocument as 🔜 Not built; annotated Q4.N, Q4.R, Q4.F, Q5.K, Q5.T resolutions in affected sections. Deltas tracked in this turn — full per-section drift survey done in Step 1.
   ```

## Verification

After the refresh:

1. **Section count: 25** (§1–§25). The numbering ranges over §1, §2, ..., §22, §23, §24, §25, with §17/§18 grouped (Inspection + Certification) and §21/§21a/§22 grouped (OwnershipRecord + OwnershipDocument + OwnershipHistory) per existing convention.
2. **Every entity in `lib/data/types/` has a section.** Verify by mental cross-check: 23 Zod entity files (excluding `_common.ts`) ↔ 23 catalog sections (counting grouped sections separately).
3. **Aspirational entities flagged.** §8 RentalEvent, §12 Draft, §15 EstateDocument all have the 🔜 Not built banner.
4. **Q-resolution callouts present** in §1 (health deprecation), §9 (Notification HYBRID), §23 (LandParcel decision), §24 (CoOwner PII).
5. **Field tables match Zod.** Spot-check 3 entities (recommend Property §1 — most fields, most likely to drift; Lease §5 — closed enums; CoOwner §24 — recently added). Each catalog field row should map to a Zod schema field.
6. **No regressions in unrelated content.** Cross-references to Q-numbers, page audits, and `ref/03-data-flow-and-derivations.md` still resolve.
7. **`grep -c "^## " ref/00-entity-catalog.md`** returns exactly the expected section count.

## Time estimate

~1.5 hours total:

- Step 0 (pre-flight): ~5 min
- Step 1 (drift survey across 24 sections): ~30 min (~1.25 min/section average; Property and OwnershipRecord §21 will take longer)
- Step 2.1 (refresh existing sections in place): ~25 min
- Step 2.2 (add §25 Expense): ~5 min
- Step 2.3 (mark §8/§12/§15 aspirational): ~3 min
- Step 2.4 (annotate Q-resolutions in 4 sections): ~5 min
- Step 3 (front matter + Last refreshed): ~5 min
- Buffer (unexpected drift, formatting): ~15 min

**Realistic: 1.5 hours. Conservative: 2 hours.**

## Out of scope (deliberate)

- **Removing `Property.health` from the schema** — that's the Q5.K cleanup phase; this refresh just annotates the deprecation.
- **Implementing Q3.B Monthly Income status badge** — separate cleanup phase.
- **Building §8 RentalEvent / §12 Draft / §15 EstateDocument** — explicitly aspirational; no schema work in this refresh.
- **Refreshing `ref/03-data-flow-and-derivations.md`** — separate refresh; can be done after this if drift is severe there too.
- **Generating ERD or DDL** — separate side workstreams (already in PHASES.md queue).
- **Auto-generation of the catalog from Zod** — could be a future tooling effort (run `tsx scripts/generate-catalog.ts` to dump Zod → markdown); not in scope today.
- **Migrating the catalog format from Convex `v.*` to Zod** — the dual annotation (Convex as backend target, Zod as current code) is intentional. Don't drop Convex annotations.
- **Renaming entity sections** — keep §1–§24 numbering; only append §25.
- **Modifying any code or seed files** — pure documentation refresh.
- **Re-running `/audit-page-datapoints` or `/audit-datapoint`** — no code change → no audit refresh needed.
- `.context/todo-ui.md` or `deferred-database-migration.md` updates — Phase 7 concern.
