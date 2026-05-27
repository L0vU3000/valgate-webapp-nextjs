---
slug: add-property
route: /add-property
revision: 4
date: 2026-05-26
verdict: "🟢 0 missing entities · 7 PFn resolved (PF1, PF2, PF3, PF4, PF5 partial, PF8, PF9) · 4 PFn open (PF5 remaining schema tightening · PF6 Q4.A · PF7 Q5.C · PF10 13 deferred fields · PF11 Q7) · 13 DEFERRED-BY-DESIGN fields tracked in ref/10"
---

# Plan — /add-property
_Last revised: 2026-05-26 · Revision 4 (PF8 resolved; PF5 correction)_

_See [audit.md](./audit.md) for the underlying analysis._

## Contents

| # | Section | Question it answers | Result |
|---|---|---|---|
| 3 | Entity Backlog | What database concepts are missing, prioritised? | 0 entities (only UI/logic gaps) |
| 4 | Audit Roadmap | What to do next — fix order, per-datapoint applicability, PF6 cite directive | 11 PFn ordered by severity |
| 5 | Fix Log | What has been fixed since the initial audit? | — |

## 3. Entity Backlog (0 entities)

> **Plain opener:** Unlike display-page audits, this audit found **no missing entities**. The wizard already writes to the `Property` entity — the gaps are bugs in the write path, missing input controls for fields that already exist in the schema, and a deferred file-storage decision.

**Why no entities are listed:**

- All 14 COLLECTED fields land in existing `Property` schema fields.
- The 13 DEFERRED-BY-DESIGN fields are also already in `Property` — they just don't have UI input controls (anywhere — wizard or property tabs). Their target-route assignments are recorded in `audit.md` PF10 and mirrored in `ref/10-input-data-map.md` § Gaps.
- The 2 COLLECTED-PARTIAL rows (file uploads via Step 0 photo/upload method, autosave) are blocked on persistence-model decisions (PF6 → Q4.A; PF7 → Q5.C), not on new entities. All former BROKEN and COLLECTED-PARTIAL address rows are now COLLECTED (PF1, PF2, PF8 resolved).

**If anything looks entity-shaped, it would be `PropertyDraft` (PF6):** today drafts live in `localStorage` only. Q4.A's resolution may add a `propertyDrafts` Convex collection — but that's not an entity that displays data, it's a persistence migration. Tracked in `ref/08-backend-migration-readiness.md`, not here.

## 4. Audit Roadmap

> **Plain opener:** For display pages, the roadmap lists rows to deep-dive with `/audit-datapoint`. That doesn't transfer to input forms — there's no rendered value to verify against seed data. Instead this section orders the 11 PFn for fix work, separates trivial direct-writes from cases worth investigating further, and gives per-datapoint audits on other routes a clear citation target.

### 4a. Per-datapoint audit applicability

`/audit-datapoint` is built to verify **displayed** numbers and labels against seed data + derivation logic. `/add-property` is an **input** form, so the per-datapoint deep-dive doesn't map cleanly:

- **Rows 1.2, 2.2–2.11, 3.2** (COLLECTED direct-writes) — trivial direct writes from input → form key → Property field. The "audit" reduces to "field is collected, schema accepts it, transform passes it through." Recorded in `audit.md` § 1; no per-datapoint deep-dive needed.
- **Rows 0.6, 0.7, 2.5, 2.12, S.5** (COLLECTED-PARTIAL) — these are the interesting ones, but their findings are already captured as PF1, PF7, PF8. No per-row audit adds information beyond the PF.
- **Rows 4.3, 4.7** (BROKEN) — bugs, not data audits. PF2 covers both.

**Conclusion:** No per-datapoint audits are scheduled for `/add-property` rows. Future audits on **other routes** that read fields populated by this wizard (e.g. portfolio map cluster, `/property/[id]/location` lat/lng) should **cite PF1** instead of re-discovering the swap, and **cite PF10** for any of the 14 deferred-by-design fields.

### 4b. PFn fix priority (recommended order)

| Order | PF | Severity | Status | Fix sketch | Blocks |
|---|---|---|---|---|---|
| 1 | ~~**PF1**~~ | 🔴 P0 | ✅ Rev 2 | Standardized on UI's `[lng, lat]` convention; `actions.ts:37` destructure + `CAMBODIA_CENTROID` flipped | (resolved) |
| 2 | ~~**PF2**~~ | 🔴 P0 | ✅ Rev 2 | Added `handlePhotoChange` + `handleDocChange` with `onChange` wiring on both file inputs | (resolved) |
| 3 | ~~**PF3**~~ | 🔴 P1 | ✅ Rev 2 (interim) | `buyNumeric` falls back to `currentMarketValue` until ownership tab gains a `purchasePrice` input (PF10) | (resolved — interim) |
| 4 | ~~**PF5**~~ | 🔴 P1 | ✅ Rev 3 | Tightened `fullPropertySchema`; surface first Zod message on submit | (resolved — Q5.B closed) |
| 5 | ~~**PF4**~~ | 🔴 P1 | ✅ Rev 3 | Deleted `_lib/drafts-storage.ts`; namespaced keys in `use-drafts.ts` + legacy migration + blob strip | (resolved) |
| 6 | ~~**PF9**~~ | 🟡 P2 | ✅ Rev 3 (`status`) · 🟡 deferred (`title`) | 3-button status selector in Step 3; `form.status` wired through transform; `title="—"` left for ownership-tab phase | (status resolved; title in `ref/10` Gaps) |
| 7 | ~~**PF8**~~ | 🟡 P2 | ✅ Rev 4 | Wired via `useGeocode` hook — Mapbox Geocoding API, autocomplete dropdown, atomic field population | (resolved) |
| 7b | **PF5 (remaining)** | 🔴 P1 | partial | Tighten `fullPropertySchema`: require `addressLine`, `totalArea`, `status`, `currentMarketValue` — see corrected PF5 in audit.md | Submit-time validation integrity |
| 8 | **PF10** | 🟡 P2 | open | Cross-app input map (`ref/10-input-data-map.md` § Gaps) — for each of 13 fields, build create/edit UI on the target route | 13 fields' usability — unblocks portfolio finance, property tabs |
| 9 | **PF6** | 🟡 P2 | open | Q4.A resolution — migrate drafts to Convex `propertyDrafts` collection scoped to userId | Cross-device draft sync |
| 10 | **PF7** | 🔴 P1 | open | Q5.C resolution — pick storage provider, add presigned upload mutation, wire Step 4 + Document tab | File storage across app |
| 11 | **PF11** | 🔵 P3 | open | RHF migration — out of scope for Phase 9 | Maintenance only |

**Ordering rationale:**
- **PF1 & PF2 first** because they're silent correctness bugs affecting every submission — fix before any further wiring lands on top.
- **PF3, PF5, PF4 next** because they affect data integrity at the schema/persistence boundary.
- **PF9 & PF8 before PF10** because they fix the *current* wizard's UX; PF10 is a multi-phase cross-app project.
- **PF7 (P1) is sequenced after PF10** because P10 is unblocked sooner — file storage requires architecture commitment, while PF10 work proceeds per-entity without architectural blockers.
- **PF11 last** — out of scope.

### 4c. Cross-cite directive

Per-datapoint audits on **other routes** that touch any of the 14 DEFERRED-BY-DESIGN fields should cite **audit.md PF10** rather than restating the wiring gap. The PF10 table includes target-route assignments for each field, so the citation carries the full context.

Example:
> _Row N (Outstanding Mortgage value) — surface is HARDCODED. Source field `Property.outstandingMortgage` exists but has no UI input anywhere. See `pages/add-property/audit.md` § PF10 for the target-route assignment (`/property/[id]/ownership` equity panel)._

## 5. Fix Log

> A chronological record of fixes applied after the initial audit. Empty on first write.

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| 2 | 2026-05-13 | PF1 — lat/lng swap | `actions.ts:37` destructure flipped to `[lng, lat]`; `CAMBODIA_CENTROID` reordered to `[104.991, 12.5657]` to match UI's `[lng, lat]` convention. Wizard-submitted properties now save with correct coordinates. | (uncommitted — `valgate-local-db` branch) |
| 2 | 2026-05-13 | PF2 — Step 4 file inputs unwired | Added `handlePhotoChange` + `handleDocChange` in `Step4PhotosDocs.tsx:30-43`; wired `onChange={handlePhotoChange}` on photo input (line 73) and `onChange={handleDocChange}` on doc input (line 157). Selecting files now populates `form.photos` / `form.documents`. | (uncommitted — `valgate-local-db` branch) |
| 2 | 2026-05-13 | PF3 — `buyNumeric` defaults to 0 (interim) | `actions.ts:36-39` chains `parseCurrency(form.purchasePrice) ?? parseCurrency(form.currentMarketValue) ?? 0`. Portfolio "Total Purchase Price" KPI now non-zero for wizard rows when a market value is entered. Permanent fix tied to PF10 (purchasePrice UI on `/property/[id]/ownership`). | (uncommitted — `valgate-local-db` branch) |
| 3 | 2026-05-13 | PF4 — dead drafts file + dual keys | Deleted `_lib/drafts-storage.ts`. `_lib/use-drafts.ts` rewritten: namespaced keys `valgate:add-property:drafts:v1` + `valgate:add-property:active-draft:v1`; File blobs stripped before persist; legacy `add-property-drafts` / `add-property-active-draft` entries migrated to new keys on first read, then deleted. Q4.A migration target now has one shape. | (uncommitted — `valgate-local-db` branch) |
| 3 | 2026-05-13 | PF5 — validation too permissive | `schemas.ts` tightened — `propertyType` (required enum, no `""`), `propertyName`, `addressLine`, `totalArea` (numeric), `status` (required enum), `currentMarketValue` (digit-only) all required. 14 DEFERRED-BY-DESIGN fields stay optional. `actions.ts` surfaces first Zod issue's `message` (user-readable since messages were hand-authored). Closes Q5.B. | (uncommitted — `valgate-local-db` branch) |
| 3 | 2026-05-13 | PF9 — `status` hardcoded (`title` deferred) | `WizardStatus` type added to `types.ts` (`"" \| Rented \| Vacant \| Owner-Occupied`); `defaultForm.status: ""`. `Step3Financial.tsx` renders 3-button selector with icons + sub-labels above the value input; page heading "What is this property worth?" → "Status and value". `actions.ts:42` reads `form.status \|\| "Vacant"`. `AddPropertyFlow.tsx` demo-data adds `status: "Rented"`. `title="—"` left in transform (decision: title-deed status belongs on a future ownership-tab panel; tracked in `ref/10` Gaps). | (uncommitted — `valgate-local-db` branch) |
| 3 | 2026-05-13 | PF1 backfill verification | Wrote `scripts/backfill-property-coords.ts` (npm: `backfill:property-coords`). Scans all properties, classifies as `ok` / `definite-swap` / `likely-swap` / `unreadable`. Dry-run by default; `--fix` for definite swaps; `--fix-likely` for Cambodia-heuristic suspects too. Initial run on `valgate-local-db` branch: **20 properties, 0 anomalies** — wizard never made it to disk before the PF1 fix. Script retained for future safety. | (uncommitted — `valgate-local-db` branch) |
| 4 | 2026-05-26 | PF8 — address search non-functional (correction: already resolved) | `_lib/use-geocode.ts` added — Mapbox Geocoding API v5, 300ms debounce, parses `zip`, `city`, `province`, `country`, `center` from each feature's context. `Step2BasicInfo.tsx` wired: `useGeocode()` drives an autocomplete dropdown; selecting a suggestion sets all address fields + `mapCenter` atomically. PF8 closed. | (code predates Rev 4 audit; branch: `valgate-local-db`) |
| 4 | 2026-05-26 | PF5 — schema correction | Revision 3 over-claimed the schema fix. Rev 4 audit verified `schemas.ts` directly: only `propertyType` (required enum) and `propertyName` (`min(1)`) are enforced. `addressLine`, `totalArea`, `status`, `currentMarketValue` are still `.optional()`. PF5 re-opened with remaining scope. | (audit correction only — no code change) |

---

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-13
- Extracted action items from initial audit (Phase 9, 2026-05-13).
- §3 Entity Backlog deliberately empty — no missing entities; all gaps are UI or logic.
- §4 Audit Roadmap re-shaped for input-form audits: no per-datapoint audits scheduled; PFs are ordered by fix priority instead.
- Cross-cite directive documented in §4c — per-datapoint audits on other routes reference PF10 for DEFERRED-BY-DESIGN field gaps.
- §5 Fix Log empty.

### Revision 2 — 2026-05-13
- PF1, PF2, PF3 resolved (see audit.md Rev 2).
- §4b roadmap updated with status column; resolved PFs struck through.
- §5 Fix Log seeded with 3 entries documenting the changes.
- Remaining: 8 open PFn — next priority is **PF5** (tighten schema; Q5.B) or **PF9** (`status` UI field — needed before rental flow makes sense).

### Revision 3 — 2026-05-13
- PF4 (dead drafts file + dual keys), PF5 (schema — partially resolved, see Rev 4 correction), PF9 (`status` field; `title` deferred) resolved.
- §4b roadmap updated — 6 of 11 PFs resolved.
- §5 Fix Log appended with 3 entries (PF4, PF5, PF9).
- Remaining 5 open PFn split into two clusters:
  - **Architectural** (need design decisions): PF6 drafts→Convex (Q4.A), PF7 storage provider (Q5.C), PF11 RHF (Q7)
  - **Contained**: PF8 (address search), PF10 (build input UI for 14 deferred fields — large but well-scoped via `ref/10`)
- Best next code work is **Phase 10 — wire Tenant + Lease on `/property/[id]/rental`** (per `ref/10` Gaps build order).

### Revision 4 — 2026-05-26
- **PF8 resolved.** `useGeocode` hook + autocomplete dropdown confirmed in code. Address search is fully functional; all address fields populate from a single suggestion click. Row 2.5 reclassified COLLECTED-PARTIAL → COLLECTED.
- **PF5 correction.** Re-read `schemas.ts` directly. Revision 3's fix note over-stated the enforcement. Only `propertyType` and `propertyName` are required; `addressLine`, `totalArea`, `status`, `currentMarketValue` remain `.optional()`. PF5 re-opened with the remaining 4-field scope. Added as row `7b` in §4b roadmap.
- §5 Fix Log appended with 2 entries (PF8, PF5 correction).
- 7 of 11 PFn resolved · 4 open (PF5 remaining, PF6, PF7, PF10, PF11).
- **Best next code work:** tighten the 4 remaining optional fields in `schemas.ts` (row 7b) — contained change, no architecture needed.

</details>
