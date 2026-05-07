# Plan — Phase 6.5: CoOwner wiring (Rank 5, single-page entity, NEW entity, PII-flagged)

## Context

CoOwner is **rank 5 in the build order** (`pages/SUMMARY.md`) with 10 surfaces unlocked on a single page (`/property/[id]/ownership`). Like 6.4 (LandParcel), **CoOwner does NOT exist** — no type, no Zod, no db layer, no seeds, no `db/index.ts` export, no entry in `ref/00-entity-catalog.md`. Phase 6.5 has a schema-build half (sub-phase 6.5.1 NOT skipped) followed by the wiring half. The phase is also blocked on Q4.N — but the blocker description in PHASES.md is misleading and needs correcting before drafting the schema.

**Q4.N — what it actually says vs what PHASES.md claims.** PHASES.md describes Q4.N as "PII handling for SSN/tax data," but the literal question text is:

> **Q4.N — Ownership tab visibility?** Should Viewers see ownership/equity? Sensitive financial info; default to hide unless explicitly granted.

Q4.N is a **role-based access control (RBAC)** question — *who* can see ownership/equity, not *how* PII is stored. The PII storage question is real but implicit (it surfaces as soon as you build the schema and have to put SSN somewhere). This plan resolves both up-front, then corrects the PHASES.md description in Step 0.

**Decision 1 — Q4.N RBAC (literal):** Defer real RBAC enforcement to the Clerk + Convex backend phase. Today the FS demo is single-user (`getCurrentUserId()` shim returns `"demo-user"`); there are no Viewer/Admin roles to gate against. **For Phase 6.5, all CoOwner data flows to the demo user.** When real auth lands, the gate can be added as a server-action precheck before `getOwnershipPageData()` returns CoOwner data — or as a narrowed read shape (`CoOwnerListItem` excluding ssn/taxEntity for non-Admin requests). Document this as a forward-looking note in the entity catalog and the open-questions file. **Do not implement role checks today.**

**Decision 2 — PII storage strategy (implicit, but critical for schema):** Store SSN **already-masked at rest** in the format `••••-••-XXXX` where only the last 4 digits are plaintext. Match the existing hardcoded mock exactly. Reasoning:

1. **Matches the FS demo era's single-user assumption** — there is no realistic threat model on a local JSON file owned by the developer.
2. **The full SSN is never needed by any current surface** — all rendering today shows the masked form. Storing only the masked form means the full SSN never enters the system.
3. **Real encryption (KMS-managed key, encrypted at rest, decrypted only by privileged server functions) is a backend-phase concern** — Convex/Neon migration phase is the right home, not the FS-demo wiring phase. Implementing a "fake encryption" today (e.g. base64 the SSN) is worse than honest masking — it implies a security guarantee that isn't there.
4. **`tax1099Status` and `taxEntity` are not PII** — tax entity is a public business classification ("LLC", "Trust"); 1099 status is operational metadata. These can be plaintext.

**If the user later needs full SSN** (e.g. for 1099 generation), the field gets added back as `ssnEncrypted: bytes` during the backend phase, when KMS infrastructure exists. The masked-only field is forward-compatible: keep `ssnMasked` for display and add `ssnEncrypted` later for operations.

**No PF traps in the same class as 6.2/6.3.** The ownership page has 6 PFn findings, but most are out-of-scope:
- **PF1** (full Property prop) — general optimization, separate concern.
- **PF2** (single-user shim) — auth concern affecting all pages.
- **PF3** (full-list-then-filter in queries.ts) — minor; same shape as other phases.
- **PF4** (no Zod at FS boundary for OwnershipRecord/OwnershipHistory) — out of CoOwner's lane; new CoOwner entity will have Zod from day one.
- **PF5** (`OwnershipRecord` type-name collision — current type is a deed/document record; catalog §21 calls it ownership-structure record). **Out of scope for 6.5** — Phase 6.6 owns the rename. CoOwner is structurally independent of OwnershipRecord (CoOwner.propertyId, no FK to OwnershipRecord).
- **PF6** (no audit log for ownership mutations) — needs server-actions infrastructure; defer to backend phase. CoOwner reads (this phase) don't trigger mutations.

**Constants to delete:** No single named constant like `kpiData` or `FALLBACK_FILES` here — the 10 hardcoded surfaces are inline JSX literals scattered across `PropertyOwnershipPage.tsx` (lines 24-29 KPI strip, 176-189 donut math, 193-203 legend, 213-238 two `OwnerCard` calls, 292-311 income/expense split rows). Delete each in place during wiring; no single `delete this constant` step.

**10 surfaces breakdown:**
- Row 18 — Split donut (60%/40% arc geometry + center text)
- Row 19 — Donut legend (name + share% per owner)
- Rows 20-22 — Owner 1 OwnerCard (3 sub-rows: identity/share/equity, contact PII, tax PII)
- Rows 23-25 — Owner 2 OwnerCard (same 3 sub-rows)
- Row 28 — Rent income split (sharePercent × Lease.monthlyRent → per-owner $/mo)
- Row 29 — Expense responsibility labels (sharePercent restated as text)

**Cross-entity dependency:** Row 28 needs Lease + Payment data (wired in 6.1 + 6.2). The income split formula is `coOwner.sharePercent × monthlyIncomeFromLeases`. Use the same active-lease filter as Phase 6.1 row 8 to avoid double-counting.

The intended outcome: `CoOwner` entity exists and is Zod-validated; 10 hardcoded surfaces become real-data reads; Q4.N reinterpreted and resolved (RBAC deferred to backend; PII stored masked); 3-4 new per-datapoint audit reports land (per WIRING-PLAYBOOK Step C bundling); CoOwner flips from "not built" → "shipped, fully wired" in `pages/INDEX.md` and `SUMMARY.md`; `ref/00-entity-catalog.md` gains a CoOwner section with PII annotations.

## Prerequisites

- **Phase 6.0, 6.1, 6.2, 6.3, 6.4 complete.** All cross-page entities (PropertyValuation, Lease+Tenant, Payment+Expense, Document, LandParcel) shipped.
- **Lease + Payment wired** (Phase 6.1, 6.2) — needed for row 28 income split derivation.
- **WIRING-PLAYBOOK.md rules read.** Step C wins (bundling, systemic citation, compressed lite) apply directly here — Owner cards are textbook bundle material.
- **Verified during exploration:**
  - `lib/data/types/co-owner.ts` does **NOT exist** — must CREATE
  - `lib/data/db/co-owners.ts` does **NOT exist** — must CREATE
  - No co-owner seeds — must CREATE
  - `db/index.ts` does NOT export co-owners — must UPDATE
  - `app/(shell)/property/[id]/ownership/queries.ts` exists and fetches `ownershipRecords` + `ownershipHistory` (filtered by propertyId) — needs CoOwner added
  - `lib/data/types/ownership-record.ts` exists but is misnamed (PF5) — **do not touch**; Phase 6.6
  - CoOwner is **NOT in the entity catalog** — must add §<n>
  - Q4.N text is about Viewer RBAC, not PII storage; PHASES.md description is wrong — fix in Step 0
  - PROP-0001 has no co-owner seed today; existing mock shows James Smith (Primary, 60%) + Maria Jones (Minor, 40%) — match these in seeds for visual parity

## Step 0 — Pre-flight (~15 min)

Per WIRING-PLAYBOOK.md pre-flight section:

1. **Read entity backlog row.** `pages/property-id-ownership/plan.md` §3 CoOwner entry — confirms 10 surfaces (rows 18-25, 28-29) and lists Q4.N as the blocker.
2. **Resolve Q4.N (RBAC literal) now.** Update `ref/05-open-questions.md` Q4.N from "Open" to "Resolved 2026-05-06 in Phase 6.5: For FS demo era (single-user), no role enforcement; all CoOwner data flows to the demo user. When Clerk + Convex auth lands, add a server-action precheck before `getOwnershipPageData()` returns CoOwner — or expose a narrowed `CoOwnerListItem` shape (no ssn/taxEntity) for non-Admin reads. The schema is forward-compatible." Update PHASES.md "Active Q-number blockers" — strike Q4.N from blockers; add a `(resolved Phase 6.5; backend phase will gate)` note.
3. **Correct the PHASES.md miscategorization of Q4.N.** Edit the Q4.N row in PHASES.md "Active Q-number blockers" — the description says "PII handling for SSN/tax data" but Q4.N is about Viewer access, not PII storage. Replace with "Ownership tab Viewer RBAC."
4. **Commit PII storage strategy now (separate from Q4.N).** Document the masked-SSN-at-rest decision in the entity catalog when CoOwner is added in Step A.1: "SSN stored already-masked as `••••-••-XXXX`; full SSN not stored. Real encryption deferred to backend phase." File this as a brief note in `ref/05-open-questions.md` under a new Q-number (Q5.\<next\>) titled "Real PII encryption strategy for backend phase" — open, blocks Convex migration, not Phase 6.5.
5. **Commit CoOwner Zod shape now (before Step A.1):**
   ```
   CoOwnerSchema = z.object({
     id, userId, propertyId,
     name: z.string().min(1),
     role: z.enum(["Primary", "Minor"]),
     sharePercent: z.number().min(0).max(100),
     email: z.string().optional(),
     phone: z.string().optional(),
     address: z.string().optional(),
     ssnMasked: z.string().regex(/^••••-••-\d{4}$/).optional(),  // PII: masked at rest
     taxEntity: z.enum(["Individual", "S-Corp", "C-Corp", "LLC", "Partnership", "Trust", "Other"]).optional(),
     tax1099Status: z.string().optional(),  // free-text e.g. "On file (2024)"
     createdAt: timestampSchema,
     updatedAt: timestampSchema,
   })
   ```
   - Mirrors atom usage from `_common.ts` (`idSchema`, `userIdSchema`, `propertyIdSchema`, `timestampSchema`).
   - `name`, `role`, `sharePercent` are required (the universal needed fields).
   - All PII + tax fields optional — co-owners with partial data render gracefully.
   - `taxEntity` closed to a 7-value enum (covers common US/Cambodian business entities); `tax1099Status` left as free-text (formats vary too widely to enum today).
   - `equityValue` is **NOT stored** — it's derived as `sharePercent × Property.currentMarketValue` (or fallback to 0). Same pattern as portfolio derivations.
6. **Plan CoOwner seed shape:** 2 seeds for PROP-0001 matching the existing mock (CO-0001 James Smith Primary 60%, CO-0002 Maria Jones Minor 40%). 1-2 additional seeds for other properties (PROP-0002 with single owner; PROP-0006 with 3 owners) to exercise multi-record edge cases for Rule 3 (sharePercent should sum to 100 per property — Rule 3 mental walk).

## Scope of this change

**Files to CREATE (4 source files + seeds + audit reports + 1 new Q):**

1. **`lib/data/types/co-owner.ts`** — type + Zod, ~30 lines following the LandParcel/Expense pattern.
2. **`lib/data/db/co-owners.ts`** — db layer, ~40 lines mirroring `expenses.ts` (collection name `co-owners`, ID prefix `CO`).
3. **`public/data/users/demo-user/co-owners/CO-0001..00NN/core.json`** — 4-5 seed records (2 for PROP-0001 matching mock, 1-2 for other properties).
4. **3-4 per-datapoint audit reports** under `.claude/data-audit/` (per WIRING-PLAYBOOK Step C bundling — see Step C below):
   - `property-id-ownership--co-owner-cards-direct-reads.md` (1 bundle covering 7 surfaces: rows 19, 20-22, 23-25)
   - `property-id-ownership--split-donut.md` (full template — donut geometry + sum-to-100 verification)
   - `property-id-ownership--rent-income-split.md` (full template — cross-entity derivation with Lease/Payment)
   - `property-id-ownership--expense-responsibility.md` (lite or short full — label-only render with derived percentages)

**Files to MODIFY (3 source files + corpus):**

1. **`lib/data/db/index.ts`** — add `export * as coOwners from "./co-owners"`.
2. **`app/(shell)/property/[id]/ownership/queries.ts`** — extend `OwnershipPageData` with `coOwners: CoOwner[]`; extend `Promise.all`; filter by propertyId.
3. **`app/(shell)/property/[id]/_components/PropertyOwnershipPage.tsx`** — accept `coOwners: CoOwner[]` prop; replace 10 surfaces (rows 18-25 inline literals + rows 28-29 income/expense split). Compute `equityValue = coOwner.sharePercent × property.currentMarketValue / 100` inline. Use Lease/Payment data already wired in Phase 6.1+6.2 (or extend rental-style derivation if it lives elsewhere). **Do NOT touch any OwnershipRecord/OwnershipHistory rendering** — Phase 6.6 territory.
4. **`ref/00-entity-catalog.md`** — append new CoOwner section: fields, relationships (1→N with Property), **PII annotation** (`ssnMasked` is the only PII storage; full SSN not stored; backend phase will revisit encryption).

**Files to UPDATE in the audit corpus:**

- `.claude/data-audit/INDEX.md` — append 3-4 new per-datapoint audit rows.
- `.claude/data-audit/pages/INDEX.md` — CoOwner row: `not built` → `shipped, fully wired`.
- `.claude/data-audit/pages/SUMMARY.md` — Rank 5 row: same status change.
- `pages/property-id-ownership/plan.md` §5 Fix Log — append entry: rows 18-25, 28-29 wired; Q4.N resolved + reinterpreted (RBAC deferred); PII strategy documented; new Q5.\<next\> filed for backend encryption.
- `ref/05-open-questions.md` — Q4.N: move from Open to Resolved with date + decision note. Append new Q5.\<next\> for "Real PII encryption strategy for backend phase."
- `.claude/data-audit/docs/PHASES.md` — flip 6.5 status (when phase ships); fix Q4.N description from "PII handling for SSN/tax data" to "Ownership tab Viewer RBAC"; add `Plan-Phase-6.5-CoOwner-wiring.md` to archived plan files NOW (drafted); strike Q4.N from "Active Q-number blockers" once resolved; bump "Last updated."

**Files NOT touched (out-of-scope by design):**

- `lib/data/types/ownership-record.ts` and `lib/data/db/ownership-records.ts` — PF5 rename is Phase 6.6's lane.
- `lib/data/types/ownership-history.ts` — different entity, already wired for timeline.
- `lib/data/types/successor.ts` — unrelated (estate beneficiaries, separate page).
- `mainFolders` / OwnershipRecord/OwnershipHistory rendering in component — Phase 6.6 territory.
- Real RBAC infrastructure — backend phase.
- Real PII encryption — backend phase.
- Audit log for mutations (PF6) — needs server actions; backend phase.
- No new entity types beyond CoOwner.

## Step A — Wiring (~100 min) with per-surface rule annotations

Broken into 4 sub-steps. Run the ★ self-review pass at the end.

### A.1 — CoOwner schema build (~30 min)

1. **Create `lib/data/types/co-owner.ts`** with the schema committed in Step 0. Follow the LandParcel pattern exactly. Export `CoOwner` type and `CoOwnerRole`, `TaxEntity` extracted enums.
2. **Create `lib/data/db/co-owners.ts`** mirroring `expenses.ts`: `list`, `get`, `create`, `remove`. Collection `"co-owners"`, prefix `"CO"`.
3. **Update `lib/data/db/index.ts`** with the export.
4. **Create 4-5 seed records** under `public/data/users/demo-user/co-owners/CO-0001..00NN/core.json`:
   - **CO-0001 / PROP-0001** — name="James Smith", role="Primary", sharePercent=60, email="james.smith@email.com", phone="(312) 555-0147", address="456 Owner Ave, Chicago IL 60601", ssnMasked="••••-••-4832", taxEntity="Individual", tax1099Status="On file (2024)" (matches mock exactly)
   - **CO-0002 / PROP-0001** — name="Maria Jones", role="Minor", sharePercent=40, email="m.jones@email.com", phone="(312) 555-0192", address="789 Partner St, Chicago IL 60602", ssnMasked="••••-••-7710", taxEntity="LLC", tax1099Status="On file (2024)" (matches mock)
   - **CO-0003 / PROP-0002** — single-owner case (sharePercent=100, partial PII fields) — exercises the empty-state render path.
   - **CO-0004..0006 / PROP-0006** — three-owner case (40/30/30 split) — exercises Rule 3 sum-to-100 and the donut multi-arc render path.
5. **Update `ref/00-entity-catalog.md`** — append CoOwner section: list all fields with types and provenance, note 1→N with Property, **explicitly flag `ssnMasked` as masked-at-rest PII** with "full SSN not stored; backend phase will revisit encryption (Q5.\<next\>)."
6. **Smoke test** — `tsc --noEmit` clean; mentally parse CO-0001 via `CoOwnerSchema.parse()` to confirm shape (especially the SSN regex — `••••-••-XXXX` with 4-digit suffix).

### A.2 — Resolve Q4.N + reinterpret + queries.ts extension (~15 min)

1. **Update `ref/05-open-questions.md`** — Q4.N moves from Open to Resolved with the one-line note from Step 0. Append new Q5.\<next\> for backend encryption strategy.
2. **Update PHASES.md "Active Q-number blockers" table** — fix Q4.N description (RBAC, not PII storage) AND strike it once resolved. Status table caveat for 6.5 ("Blocked on Q4.N + entity creation") drops once 6.5 ships.
3. **Extend `ownership/queries.ts`:**
   - Add `CoOwner` import
   - Extend `OwnershipPageData` type with `coOwners: CoOwner[]`
   - Extend `Promise.all` to include `db.coOwners.list(userId)`
   - Filter by propertyId
   - **Note:** if row 28 needs Lease/Payment data and they're not currently fetched here, extend to fetch those too. Verify by reading current `ownership/queries.ts` and the row-28 wiring in Step A.4.

### A.3 — Component prep (~10 min)

1. **Update `PropertyOwnershipPage.tsx`** signature to accept `coOwners: CoOwner[]` prop.
2. **Compute derived values once at the top:**
   ```
   const totalShare = coOwners.reduce((s, o) => s + o.sharePercent, 0);
   const propertyValue = property.currentMarketValue ?? 0;
   const monthlyRentIncome = /* derive from active leases — see Phase 6.1 pattern */;
   ```
3. **Sort coOwners by sharePercent DESC** (so Primary appears first; matches mock convention).

### A.4 — Wire 10 surfaces (~45 min)

**Row 18 — Split donut (60%/40% arcs + "60% · 40%" center text, lines 176-189):**
- **Wire:** map `coOwners` → render N donut arcs, each with `strokeDasharray={ owner.sharePercent * 2.51 } { 100 * 2.51 }` and rotated by cumulative previous percent. Center text: `coOwners.map(o => `${o.sharePercent}%`).join(" · ")`.
- **Rule 3 trigger:** sharePercent should sum to 100 per property. Walk: 2 owners (60+40=100 ✓), 1 owner (100 ✓), 3 owners (40+30+30=100 ✓). If sum ≠ 100, render as-is but file as a future data-quality concern (don't crash, don't silently rebalance).
- **Rule 1 sweep:** color per arc — rotate through a small palette (blue, slate, etc.) deterministically by index. Don't claim role-based color (Primary green vs Minor amber) without a schema field for it.

**Row 19 — Donut legend (J. Smith 60% / M. Jones 40%, lines 193-203):**
- **Wire:** map `coOwners` → render `${initials(o.name)} ${o.sharePercent}%`. (initials = first letters of first + last name.)
- **Bundleable** — direct read.

**Rows 20-22 — Owner 1 OwnerCard (lines 213-225):**
- **Wire:** render the FIRST coOwner via existing `<OwnerCard>` component. Pass: `initials`, `name`, `badge` (derived from role: "Primary Owner" / "Minor Owner"), `share={o.sharePercent}`, `equity={formatCurrency(o.sharePercent * propertyValue / 100)}`, `email`, `phone`, `address`, `ssn={o.ssnMasked ?? "—"}`, `entity={o.taxEntity ?? "—"}`, `status={o.tax1099Status ?? "—"}`.
- **Rule 2:** PII fields all optional — render `"—"` per file convention if undefined.
- **Bundleable** — direct prop pass-through.

**Rows 23-25 — Owner 2 OwnerCard (lines 226-239):**
- **Wire:** same as Owner 1 but for the SECOND coOwner. If `coOwners.length < 2`, hide the card (or render an empty-state). Don't crash on single-owner properties.
- **Rule 2 trigger:** single-owner case (CO-0003 PROP-0002) — second card hidden.
- **Bundleable** — direct prop pass-through.
- **For 3+ owner properties (CO-0004..0006 PROP-0006):** the current 2-OwnerCard layout doesn't extend; either render a horizontally-scrolled list OR cap at top 2 by share with a "+1 more" indicator. **Default: cap at 2 with "+ N more co-owners" indicator below** — document trade-off in audit. Real fix is a Phase-8-or-later UI redesign for the multi-owner case.

**Row 28 — Rent income split (lines 292-299):**
- **Wire:** for each coOwner, compute `formatCurrency(o.sharePercent * monthlyRentIncome / 100)` and render as `${initials} ${share}% → $X/mo`. Use Lease/Payment data already wired in Phase 6.1+6.2.
- **Rule 3 trigger:** the per-owner sums must equal `monthlyRentIncome` total. Walk: 2 owners (60% + 40% of $1800 = $1080 + $720 = $1800 ✓).
- **Full-template audit** (cross-entity derivation).

**Row 29 — Expense responsibility (lines 302-311):**
- **Wire:** for each coOwner, render `${initials} ${share}% shared costs`. Pure label rendering — no $ amount today (no Expense-by-owner logic).
- **Rule 1 trigger:** the original mock said "shared costs" suggesting an expense breakdown — but no per-owner expense data exists. Either: (a) keep as label only (default), or (b) compute `o.sharePercent × totalExpensesYTD / 100` and show $ amount. Default to (a) — simpler, no implied derivation. Document in audit.
- **Lite-template** — direct read (sharePercent → label).

### ★ Self-review pass (~10 min)

After A.1-A.4 done:

1. **Rule 1 sweep:** check adjacent claim-strings near wired surfaces. Three known: donut color claims (handled — neutral palette), OwnerCard "Primary"/"Minor" badge color (rendered from role enum, fine), "shared costs" label (handled — kept label-only). Quick scan for any "vs" or "% of" strings near the cards.
2. **Rule 2 grep:** in `PropertyOwnershipPage.tsx`, grep for `"—"`, `"None"`, `"N/A"`. Confirm new empty states (PII fields, missing 2nd owner) match the file's existing convention.
3. **Rule 3 mental walks:** 
   - Donut sum-to-100: walk PROP-0001 (60+40=100 ✓), PROP-0002 (100 ✓), PROP-0006 (40+30+30=100 ✓).
   - Income split: walk PROP-0001 (60% × $1800 + 40% × $1800 = $1800 ✓).
   - Equity: walk PROP-0001 (60% × $271,000 = $162,600; mock shows $162,480 — close, real value depends on property.currentMarketValue at run-time).
4. **PII boundary verification:** grep `PropertyOwnershipPage.tsx` for raw "ssn" anywhere besides the OwnerCard prop pass-through. Should appear ONLY in `ssn={o.ssnMasked ?? "—"}` lines. No console.log, no inline rendering of full SSN. Verify the seeds contain only the masked form.
5. **OwnershipRecord boundary verification:** grep for `kpis`, `OwnershipDocument`, `Acquisition Details`. All must STILL EXIST untouched (Phase 6.6 territory — they're the OwnershipRecord §21 surfaces).
6. **Multi-owner edge case:** mentally render PROP-0006 (3 owners). Confirm donut renders 3 arcs, legend renders 3 entries, OwnerCards cap at 2 with "+1 more" indicator.

**STOP. Hand back to user for Step B visual verification.**

## Step B — Visual dev-server check (~15 min, you do this)

1. Start dev server.
2. Open `/property/PROP-0001/ownership` — confirm:
   - Donut shows 60%/40% arcs (visually identical to before — same numbers, real source)
   - Legend shows "JS 60% / MJ 40%"
   - Owner 1 card: James Smith, Primary Owner, 60%, $162,480 (or close — depends on property value), email/phone/address from seed, SSN ••••-••-4832, Individual, On file (2024)
   - Owner 2 card: Maria Jones, Minor Owner, 40%, $108,320, etc.
   - Income split: J. Smith 60% → $X/mo, M. Jones 40% → $Y/mo (X+Y = monthly rent income)
   - Expense responsibility: J. Smith 60% shared costs / M. Jones 40% shared costs
   - OwnershipRecord rows (Acquisition Details, Mortgage terms, KPI strip rows 6-7) STILL show their old hardcoded data (correct — Phase 6.6 territory)
3. Open `/property/PROP-0002/ownership` — confirm:
   - Single-owner card renders (no second card)
   - Donut shows single 100% arc cleanly
4. Open `/property/PROP-0006/ownership` — confirm:
   - Donut shows 3 arcs (40/30/30)
   - Top 2 owners render as cards with "+1 more co-owners" indicator below
5. **Empty PII test:** verify CO-0003 (partial PII fields) renders `"—"` for missing email/phone/address/ssn; doesn't crash.
6. Hand back with notes if anything is wrong; otherwise say "go" for Step C.

## Step C — Audit batch + index updates (~1 hour, per WIRING-PLAYBOOK Step C wins)

1. Run `/audit-datapoint` on the **first** newly-wired surface (recommend the bundled CoOwner cards report — `property-id-ownership--co-owner-cards-direct-reads.md` — since it exercises 7 surfaces in one file and validates the new bundling pattern).
2. **Spot-check dedup machinery + bundling format:**
   - ☐ Bundle uses the format from WIRING-PLAYBOOK Win 1 (table covering 7 surfaces with per-field rows)
   - ☐ Findings use one-liner stubs for systemic findings (Win 2): `### F1 — userId leak via full Property/CoOwner prop chain` + `Systemic — see PF1 in pages/property-id-ownership/audit.md.`
   - ☐ Compressed lite format (Win 3): no Contents table, no Glossary, single inline source-summary line, no Revision history block
   - ☐ TL;DR has the `📄 Page audit:` back-link
3. **If any check fails:** STOP. Investigate; fix coupling if needed.
4. **If passes:** continue with the remaining audits, **applying WIRING-PLAYBOOK Step C wins**:
   - **Win 1 — Bundle direct-read cluster.** Rows 19 (legend), 20 (Owner 1 identity/share/equity), 21 (Owner 1 contact PII), 22 (Owner 1 tax PII), 23 (Owner 2 identity/share/equity), 24 (Owner 2 contact PII), 25 (Owner 2 tax PII) all share entity (CoOwner), source files (PropertyOwnershipPage.tsx + OwnerCard component), and systemic findings → ONE bundle: `property-id-ownership--co-owner-cards-direct-reads.md` covering 7 surfaces with a per-field table.
   - **Full template (standalone):** Split donut (row 18 — multi-record sum-to-100 verification, geometry derivation), Rent income split (row 28 — cross-entity derivation with Lease+Payment) — **2 audits**.
   - **Lite or short audit (standalone):** Expense responsibility (row 29 — sharePercent → label render, no derivation; ~5 min) — **1 audit**.
   - **Total reports:** 1 bundle + 2 full + 1 short lite = **4 audit files** covering 10 surfaces.
   - **Win 2 — Systemic-finding stub.** F1 (userId leak via PF1), F2 (no audit log via PF6), etc. render as one-liner stubs — no Where/Problem/Why/Fix block.
   - **Win 3 — Compressed lite.** The bundle and the row-29 short audit use the compressed format.
5. Update `INDEX.md` (per-datapoint table) with **4 new rows** (annotate the bundle row as covering 7 underlying surfaces).
6. Update `pages/INDEX.md` CoOwner row.
7. Update `pages/SUMMARY.md` Rank 5 row.
8. Update `docs/PHASES.md`: flip 6.5 status emoji, fix Q4.N description, add archived plan path entry to `(executed)`, strike Q4.N from active blockers, bump "Last updated."
9. Append fix-log entry to `pages/property-id-ownership/plan.md` §5 with: rows 18-25, 28-29 wired; Q4.N resolved + reinterpreted; PII strategy documented; Q5.\<next\> filed for backend encryption.

## Verification

After Phase 6.5 lands:

1. **Type check passes.** Zero errors. `tsc --noEmit` clean.
2. **No ZodError in terminal** during dev server boot or page navigation. Especially verify the SSN regex (`/^••••-••-\d{4}$/`) parses each seed cleanly.
3. **Visual check on PROP-0001/ownership.** All 10 surfaces show real CoOwner data; donut + cards visually identical to before (same numbers, real source).
4. **CoOwner entity exists** with Zod schema, db layer, 4-5 seeds, exported from `db/index.ts`, parses cleanly.
5. **Q4.N resolved AND reinterpreted** in `ref/05-open-questions.md` (RBAC defer + PII strategy doc with date) and removed from PHASES.md "Active Q-number blockers." PHASES.md description corrected from "PII handling" to "Viewer RBAC."
6. **New Q5.\<next\> filed** in `ref/05-open-questions.md` for "Real PII encryption strategy for backend phase."
7. **PII boundary holds.** No raw SSN in seeds (only masked form). No raw SSN rendering in component. `grep -rn "ssn:" public/data/users/demo-user/co-owners/` returns only the `"ssnMasked": "••••-••-XXXX"` form.
8. **OwnershipRecord boundary respected.** `kpis` constant, Acquisition Details block (rows 26), Mortgage terms (row 13), Distribution method (row 27) STILL EXIST in `PropertyOwnershipPage.tsx` untouched. OwnershipRecord §21 rows in audit corpus remain `not built` (Phase 6.6 territory).
9. **Entity catalog updated.** `ref/00-entity-catalog.md` has a CoOwner section with all fields + PII annotation + Q5.\<next\> cross-link.
10. **4 new per-datapoint audit reports** under `.claude/data-audit/` (1 bundle covering 7 surfaces + 2 full + 1 short lite, total 10 surfaces audited). Confirm by `ls .claude/data-audit/*.md | wc -l` (should be ~69, up from ~65 after Phase 6.4 — bundling means fewer files, not fewer surfaces).
11. **Status fields synced.** CoOwner reads `shipped, fully wired` in BOTH `pages/INDEX.md` and `pages/SUMMARY.md`. PHASES.md row 6.5 reads ✅ and the `Blocked on Q4.N + entity creation` caveat is removed.
12. **Fix log appended** to `pages/property-id-ownership/plan.md` §5 with Q4.N + PII notes.
13. **Playbook rules visibly applied.** No P1-grade adjacent-hardcode findings; sum-to-100 walk verified for 3 properties (PROP-0001, PROP-0002, PROP-0006); income-split sums match monthly rent total.
14. **No surprise file changes.** `git status` shows: 3 source files created (type, db, queries.ts extension), 3 source files modified (db/index, page.tsx, component), 4-5 seed JSONs, 4 audit reports, ~6 corpus files updated.

## What unblocks after Phase 6.5

- **Phase 6.6 — OwnershipRecord §21 wiring.** Rank 6 in build order; 6 surfaces on the same page. Still blocked on the PF5 type rename (`OwnershipRecord` → `OwnershipDocument`). After 6.5, the page will be ~50% wired (10 of 25 hardcoded surfaces); 6.6 lands the next 6.
- **Q4.N formally closed** — no longer in the "Active Q-number blockers" list. Backend phase will revisit RBAC enforcement.
- **PII handling pattern established** — masked-at-rest with optional fields; backend phase will add encryption. Future PII-bearing entities (UserProfile, Tenant if it gains PII) can follow the same pattern.
- **Multi-record entity in component established** — first phase with N owner cards from one entity. Pattern reuses for Folder, MaintenanceItem, Notification phases.
- **OwnershipRecord rename pressure** — PF5 is the only remaining structural blocker on the ownership page; Phase 6.6 will fix it.

## Time estimate

~3.5 hours total (Step C bundling per WIRING-PLAYBOOK saves ~80 min vs naive per-surface audits):

- Step 0 (pre-flight + Q4.N reinterpret + PII strategy + Zod commit): ~15 min
- Step A.1 (CoOwner schema + seeds + db export + entity catalog): ~30 min
- Step A.2 (Q4.N updates + queries.ts extension): ~15 min
- Step A.3 (component prep + sorting + derivations): ~10 min
- Step A.4 (wire 10 surfaces — donut, legend, 2 OwnerCards, income/expense split): ~45 min
- ★ self-review: ~10 min
- Step B (visual check across 3 properties): ~15 min
- Step C (4-report batch + dedup spot-check + 6 corpus updates): ~1 hour
  - 1 bundled lite (~10 min) + 2 full (~20 min) + 1 short (~5 min) = ~35 min audits
  - Index + SUMMARY + PHASES + plan.md + Q-number updates: ~15 min
- Buffer (PII regex tuning, multi-owner edge case, Q4.N wording): ~30 min

**Realistic: 3.5 hours. Conservative: 4 hours.**

## Out of scope (deliberate)

- **OwnershipRecord §21 wiring** — rows 6, 7, 13, 17, 26, 27. Phase 6.6, blocked on PF5 type rename.
- **OwnershipRecord/OwnershipDocument type rename (PF5)** — Phase 6.6's lane. CoOwner is structurally independent.
- **Real RBAC for ownership tab** — backend/Convex phase. Schema is forward-compatible (narrowed read shape can be added later).
- **Real PII encryption** — backend/Convex phase (Q5.\<next\>). Today: masked-at-rest only.
- **Audit log for ownership mutations (PF6)** — needs server actions infrastructure; backend phase.
- **Multi-tenant auth (PF2)** — affects all pages; separate concern.
- **Property prop narrowing (PF1)** — general optimization, separate concern.
- **Full SSN storage** — explicitly NOT stored; only the masked form.
- **3+ owner UI redesign** — current cap-at-2 + "+N more" is the v1; richer multi-owner card layout is a future UI phase.
- **Per-owner expense breakdown** (row 29 with $ amounts) — needs Expense-by-owner data model not in current scope.
- **Distribution method customization (row 27)** — Phase 6.6 OwnershipRecord territory.
- **Modifying any Zod schema except creating CoOwner** — Property, Lease, Payment, Document, LandParcel all settled.
- `.context/todo-ui.md` or `deferred-database-migration.md` updates — Phase 7 concern.
- Re-running `/audit-page-datapoints` against ownership page — source code changes confined to wiring.
- DDL or ERD generation refresh — separate workstreams; CoOwner will land in a future ERD refresh.
