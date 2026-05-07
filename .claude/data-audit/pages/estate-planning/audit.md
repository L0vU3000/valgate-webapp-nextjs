---
slug: estate-planning
route: /estate-planning
revision: 2
date: 2026-05-07
verdict: "✅ 17 WIRED · 0 HARDCODED · 5 CHROME · 2 PARTIAL — KPIs derived, property cards from DB, verified conditional fixed, estate docs + activity wired; PF1–PF5 resolved; PF6 deferred"
---

# Page Audit — /estate-planning
_Last revised: 2026-05-07 · Revision 2_

_See [plan.md](./plan.md) for the action items derived from this audit._

## TL;DR
- ✅ 17 WIRED surfaces — all 4 KPI cards derived from DB (portfolio completion, pending reviews, assigned beneficiaries, estate doc count); property list cards from `db.properties.list` (active only); filter select functional with useMemo; panel header (property name + last updated) from DB; status bar from `property.status` + `completionPct`; successor count from `propertySuccessors.length`; successor table per-property-scoped via `assignmentsByProperty`; verified/unverified conditional correct (PF2 fixed); estate document cards from `db.documents.list` filtered to `category="estate"`; recent activity timeline from `db.estateActivityEvents.list`
- ⚠️ 2 PARTIAL rows — row 3 (View Analytics → `router.push("/analytics")` WIRED; Generate Portfolio Report static stub) and row 11 (Add Beneficiary WIRED with form dialog + `addSuccessorAndAssign`; Download Summary + Review All static stubs)
- 🔵 5 pure CHROME rows — breadcrumb (1), page heading + subtitle (2), MoreHorizontal row action (20), panel footer copy softened per Q5.W (23), panel footer buttons (24)
- ✅ 0 HARDCODED surfaces — all 10 previously hardcoded rows replaced with DB derivations
- ✅ PF1–PF5 resolved; PF3 softened (Q5.W option a applied); PF6 deferred (Q4.M)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Surface Inventory | What's on the page and what powers each thing? | 24 rows |
| 2 | Page-wide findings | What systemic problems span the whole page? | 6 PFn (4 resolved, 1 softened, 1 deferred) |

## Glossary
- **WIRED / HARDCODED / PARTIAL / CHROME / DECORATIVE** — see `.claude/skills/audit-page-datapoints/SKILL.md` § "Surface classification".
- **PFn** — Page-wide finding number (PF1, PF2, …). Filed once at the page level; per-datapoint audits cite instead of restating.
- **Lite template** — 4-section per-datapoint report for trivial direct-reads. Full template stays at 9 sections for derivations.
- **PII / IDOR** — sensitive fields exposed to the browser; ownership not enforced.

---

## 1. Surface Inventory

> **Plain opener:** The page shows 24 distinct things. 17 are connected to real database data — including all KPI stat cards, all property list cards with derived status badges, the per-property beneficiary table with correct verified/unverified badges, estate document cards, and the recent activity timeline. 2 rows are a mix of wired actions and static stubs. 5 are pure static chrome.

| # | Element | Class | Source / Constant | File:line |
|---|---|---|---|---|
| 1 | Breadcrumb "Valgate / Estate Planning" | CHROME | static labels | `SuccessionPage.tsx:376-380` |
| 2 | Page heading "Estate Planning" + subtitle copy | CHROME | static copy | `SuccessionPage.tsx:381-386` |
| 3 | Header actions: "View Analytics", "Generate Portfolio Report" | PARTIAL | View Analytics → `router.push("/analytics")`; Generate Portfolio Report is a static stub | `SuccessionPage.tsx:389-400` |
| 4 | KPI card: Plan Completion (% + progress bar) | WIRED | `stats[0]`: `portfolioCompletion` = avg of per-property 4-check rubric (assigned successor, primary share = 100%, estate doc, activity) | `queries.ts:317-323` |
| 5 | KPI card: Pending Reviews | WIRED | `stats[1]`: `pendingReviews` = `!hasPrimaryShareBalance` count + `!hasEstateDoc` count + `unverifiedSuccessor` count | `queries.ts:324-330` |
| 6 | KPI card: Assigned Beneficiaries (+ sub-label) | WIRED | `stats[2]`: `assignedSuccessorCount` = successors with ≥1 property assignment; sub-label shows unverified count | `queries.ts:331-342` |
| 7 | KPI card: Estate Documents | WIRED | `stats[3]`: `estateDocuments.length` — count of `Documents` with `category="estate"` (case-insensitive) | `queries.ts:343-350` |
| 8 | Property list: cards (name, address, status badge, initials avatar) | WIRED | `filteredProperties` ← `estateProperties` ← `db.properties.list(userId)` filtered to active (non-archived, non-sold); prioritised by assignment/doc/activity presence | `queries.ts:250-259` |
| 9 | Filter select (All / Complete / In Review / Action / Draft) | WIRED | `statusFilter` state; `filteredProperties` useMemo over `estateProperties`; `setSelectedProperty(0)` resets on change | `SuccessionPage.tsx:426-441` |
| 10 | Panel header: selected property name + "Last updated: …" | WIRED | `property.name`, `property.lastUpdatedLabel` — last-updated = max of activity event timestamps or `property.updatedAt` | `SuccessionPage.tsx:461-466` |
| 11 | Panel action buttons: "Download Summary", "Add Beneficiary", "Review All" | PARTIAL | Add Beneficiary opens `addDialogOpen` → `handleAddBeneficiary` → `addSuccessorAndAssign`; Download Summary + Review All are static stubs | `SuccessionPage.tsx:469-483` |
| 12 | Status bar: title / progress label / progress bar | WIRED | `statusPanel` from `statusPanelConfig[property.status]`; `progressLabel` from `property.completionPct`; bar width = `${property.completionPct}%` | `SuccessionPage.tsx:490-508` |
| 13 | Successor count label "N total entries" | WIRED | `{propertySuccessors.length} total entries` — filtered to selected property | `SuccessionPage.tsx:517` |
| 14 | Successor rows: name | WIRED | `s.name` ← `successorsRaw` via `db.successors.list(userId)`, filtered to `propertySuccessors` | `queries.ts:262` |
| 15 | Successor rows: initials | WIRED | `s.initials` | `queries.ts:261` |
| 16 | Successor rows: relation | WIRED | `s.relation` | `queries.ts:263` |
| 17 | Successor rows: role badge (Primary Beneficiary / Contingent Beneficiary) | WIRED | `s.role` → `<RoleBadge>` component | `queries.ts:264` |
| 18 | Successor rows: share percentage | WIRED | `s.share = successor.share.toFixed(2) + "%"` | `queries.ts:265` |
| 19 | Successor rows: verification status ("Verified" / "Unverified") | WIRED | `s.verified ? <CheckCircle2> "Verified" : <AlertTriangle> "Unverified"` (PF2 resolved) | `SuccessionPage.tsx:567-577` |
| 20 | Successor row: MoreHorizontal action button | CHROME | static icon button — no handler | `SuccessionPage.tsx:580-582` |
| 21 | Estate Documents: document cards (name, meta, download icon) | WIRED | `propertyDocuments` ← `estateDocsRaw` filtered to selected `propertyId`; empty-state rendered when `propertyDocuments.length === 0` | `queries.ts:272-280` |
| 22 | Recent Activity: timeline events (title, time, desc, dot) | WIRED | `propertyTimeline` ← `db.estateActivityEvents.list(userId)` scoped to selected `propertyId`; `formatEventTime` for relative timestamps; empty-state shown | `queries.ts:282-291` |
| 23 | Panel footer: "Your estate planning data is kept private in Valgate." | CHROME | static copy; text softened per Q5.W (was "End-to-end encrypted estate planning data.") | `SuccessionPage.tsx:665` |
| 24 | Panel footer buttons: "View full history" / "Download all documents" | CHROME | static stub buttons — no handlers | `SuccessionPage.tsx:668-673` |

**Tally:** WIRED **17** · PARTIAL **2** · CHROME **5** · HARDCODED **0**

**Audit-relevant rows (WIRED + PARTIAL):** 19. CHROME rows listed for completeness; excluded from Audit Roadmap.

---

## 2. Page-wide findings (6 PFn)

> **Plain opener:** Six problems were filed at initial audit. PF1–PF4 are fully resolved. PF5 is resolved (per-property successor scoping). PF3 security copy was softened (Q5.W option a). PF6 (auth shim) is deferred pending Q4.M.

**Severity:** 🔴 PF P0 ship-blocker · 🔴 PF P1 robustness · 🟡 PF P2 schema smell · 🔵 PF P3 nit
**Confidence:** high (verified) · medium (inferred) · low (subjective)
**Tags:** `[schema]` · `[logic]` · `[render]` · `[consistency]` · `[negative-space]` · `[semantic]` · `[styling]`

---

### ~~🔴 PF1 — `EstatePlanningPageData` conflates real Successor data with hardcoded placeholder arrays — no type-level separation~~ — ✅ resolved in Revision 2
**PF P1 robustness · confidence: high · `[schema]` `[render]`**

**Where:** `app/(shell)/estate-planning/queries.ts` — `getEstatePlanningPageData()` return type. Applied to all HARDCODED rows (4–13).

**Problem:** `getEstatePlanningPageData()` fetched real `Successor[]` from `db.successors.list(userId)` and correctly mapped 5 fields (rows 14–18). But it packaged this real data alongside 4 literal arrays (`stats`, `properties`, `documents`, `timeline`) in a single return type — no type-level marker distinguished live data from hardcoded placeholders. `data.stats[0].value` ("84.5%") and `data.successors[0].name` ("Sophea Chan") looked identical from types alone.

**Fix:** Once estate KPI formulas (Q3.R) and estate plan state are defined, replace the literal `stats` array with a computation. Until then, add inline `// HARDCODED` comments.

**Resolved (Revision 2, 2026-05-07):** Phase 8.5 wiring replaced all 4 literal arrays with real database derivations. `queries.ts` now calls `db.properties.list`, `db.documents.list`, `db.successorPropertyAssignments.list`, and `db.estateActivityEvents.list` in a single `Promise.all`. `EstatePlanningPageData` is fully live-data backed.

---

### ~~🔴 PF2 — Successor `verified` field is fetched correctly but ignored — all rows always render green "Verified"~~ — ✅ resolved in Revision 2
**PF P1 robustness · confidence: high (seed verified) · `[render]` `[logic]`**

**Where:** `app/(shell)/estate-planning/_components/SuccessionPage.tsx:567-577`. Applied to inventory row 19 (was PARTIAL → now WIRED).

**Problem:** In `queries.ts`, `s.verified` was correctly mapped from `dbSuccessors`. In `SuccessionPage.tsx:316-319` (Revision 1), the status cell unconditionally rendered `<CheckCircle2>` green. No conditional branch existed for `s.verified === false`. SUCC-0003 (Chenda Chan, `verified: false`) always showed green "Verified".

Also: the fallback array in Revision 1 hardcoded `verified: true` for all 3 fallback entries, silently hiding the bug in fresh environments.

**Fix:**
```tsx
{s.verified ? (
  <div className="flex items-center gap-1.5">
    <CheckCircle2 className="size-3.5 text-[#059669] shrink-0" />
    <span className="text-xs font-semibold text-[#059669]">Verified</span>
  </div>
) : (
  <div className="flex items-center gap-1.5">
    <AlertTriangle className="size-3.5 text-[#ba1a1a] shrink-0" />
    <span className="text-xs font-semibold text-[#ba1a1a]">Unverified</span>
  </div>
)}
```

**Resolved (Revision 2, 2026-05-07):** Conditional branch now at `SuccessionPage.tsx:567-577`. SUCC-0003 (Chenda Chan) correctly renders red "Unverified". The hardcoded fallback array was also removed when the full DB path was wired.

---

### 🟡 PF3 — Security copy ("All encrypted & backed up", "End-to-end encrypted estate planning data.") has no backing implementation — ✅ softened per Q5.W
**PF P2 schema smell · confidence: high · `[semantic]`** — _see Q5.W_

**Where:** `queries.ts` (KPI sub-label for Estate Documents) and `SuccessionPage.tsx:665` (panel footer). Applied to inventory rows 7 (WIRED) and 23 (CHROME).

**Problem:** Two surfaces asserted encryption. Estate planning data is stored in FS-layer JSON under `public/data/` — no encryption layer exists. Asserting "End-to-end encrypted" before any encryption backend exists creates risk: users may make trust decisions based on these claims.

**Fix:** Q5.W — option a: soften copy to something factually defensible without an encryption backend.

**Update (Revision 2, 2026-05-07):** Q5.W option a applied. Row 7 KPI sub-label changed from `"All encrypted & backed up"` to `"Secured by Valgate"`. Row 23 panel footer changed from `"End-to-end encrypted estate planning data."` to `"Your estate planning data is kept private in Valgate."` Both are factually defensible. Follow-up: define actual storage security model when encryption backend is introduced.

---

### ~~🟡 PF4 — `addSuccessorAndAssign` in `actions.ts` is a structural stub with a no-op property-assignment loop~~ — ✅ resolved in Revision 2
**PF P2 schema smell · confidence: high · `[negative-space]`**

**Where:** `app/(shell)/estate-planning/actions.ts`. Applied to inventory row 11 (was CHROME → PARTIAL, with Add Beneficiary now WIRED).

**Problem:** The successor-creation half (`createSuccessor(successor)`) called a real action function. The property-assignment loop called `updateProperty(propId, {})` with an empty patch. The inline comment confirmed: "placeholder — real assign needs Property type extension." No UI surface invoked this action ("Add Beneficiary" had no `onClick`).

**Fix:** Resolve Q4.V (Successor-to-Property assignment model) → replace empty loop with real assignment write.

**Resolved (Revision 2, 2026-05-07):** `actions.ts` fully rewritten. Empty patch replaced with `db.successorPropertyAssignments.create()` per property and `db.estateActivityEvents.create()` (kind `"successor.assigned"`) per assignment. Share balance validation gates primary beneficiary writes: if `existingPrimaryTotal + successor.share > 100`, action returns an error before creating the successor.

---

### ~~🟡 PF5 — Successor rows are not scoped to the selected property — same list appears regardless of which property card is active~~ — ✅ resolved in Revision 2
**PF P2 schema smell · confidence: high · `[logic]` `[negative-space]`**

**Where:** `queries.ts:261-270` (estateSuccessors) and `SuccessionPage.tsx:228-234` (propertySuccessors filter). Applied to WIRED rows 14–19.

**Problem:** `db.successors.list(userId)` returned all user successors with no `propertyId` filter. Selecting any property card showed the same 3 successor rows. `SuccessorSchema` had no `propertyId` field and no join table existed.

**Fix:** Resolve Q4.V → add join table → filter per property.

**Resolved (Revision 2, 2026-05-07):** `assignmentsByProperty: Map<string, string[]>` built from `db.successorPropertyAssignments.list(userId)`. Each `Successor` carries `propertyIds: string[]`. In `SuccessionPage.tsx:228-234`:
```tsx
const propertySuccessors = useMemo(
  () => propertyId
    ? successors.filter((s) => s.propertyIds.includes(propertyId))
    : [],
  [propertyId, successors],
);
```
Empty state "No beneficiaries have been assigned to this property yet." shown when `propertySuccessors.length === 0`.

---

### 🟡 PF6 — Multi-user / auth shim gap (cite Q4.M)
**PF P2 schema smell · confidence: high · `[negative-space]`**

**Where:** `queries.ts:142` — `getCurrentUserId()` shim → all 5 `db.*` calls. Applied to WIRED rows 4–22.

**Problem:** `getCurrentUserId()` returns hardcoded `"demo-user"`. Successor records include PII (name, relation) and financial data (share percentage). When real Clerk auth lands, ownership enforcement must be added at all 5 `db.*` call boundaries: `db.successors`, `db.properties`, `db.documents`, `db.successorPropertyAssignments`, `db.estateActivityEvents`.

**Deferred:** Blocked on Q4.M. No change in Revision 2 — same shim in place.

---

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
walked:
  - app/(shell)/estate-planning/page.tsx
  - app/(shell)/estate-planning/queries.ts
  - app/(shell)/estate-planning/_components/SuccessionPage.tsx
  - app/(shell)/estate-planning/actions.ts
  - lib/data/db/successors.ts
  - lib/data/db/successor-property-assignments.ts
  - lib/data/db/estate-activity-events.ts
  - lib/data/db/documents.ts
  - public/data/users/demo-user/successors/SUCC-0001/core.json
  - public/data/users/demo-user/successors/SUCC-0002/core.json
  - public/data/users/demo-user/successors/SUCC-0003/core.json
  - public/data/users/demo-user/successor-property-assignments/SPA-0001/core.json
  - public/data/users/demo-user/estate-activity-events/EACT-0001/core.json
  - public/data/users/demo-user/documents/DOC-0009/core.json
  - public/data/users/demo-user/documents/DOC-0010/core.json
sources:
  - path: app/(shell)/estate-planning/queries.ts
    note: fully rewritten Phase 8.5; Promise.all over 5 DB sources; per-property 4-check rubric; all KPIs derived
  - path: app/(shell)/estate-planning/_components/SuccessionPage.tsx
    note: '"use client"; verified conditional at :567-577; propertySuccessors filter; Add Beneficiary dialog'
  - path: app/(shell)/estate-planning/actions.ts
    note: full SPA + EstateActivityEvent creation; primary share balance validation
  - path: lib/data/db/successor-property-assignments.ts
    note: NEW Phase 8.5; collection "successor-property-assignments"; ID prefix SPA; 5 seed records
  - path: lib/data/db/estate-activity-events.ts
    note: NEW Phase 8.5; collection "estate-activity-events"; ID prefix EACT; 3 seed records; sorted desc by createdAt
  - path: public/data/users/demo-user/successors/SUCC-0003/core.json
    note: 'verified: false — key fixture confirming PF2 fix (Chenda Chan now renders Unverified)'
  - path: public/data/users/demo-user/documents/DOC-0009/core.json
    note: 'Will_And_Testament.pdf — category: "Estate" — PROP-0001 estate doc'
  - path: public/data/users/demo-user/documents/DOC-0010/core.json
    note: 'Estate_Transfer_Deed.pdf — category: "Estate" — PROP-0011 estate doc'
```

</details>

<details>
<summary>📋 Manual verification commands</summary>

```bash
# Confirm verified conditional is in place (validates PF2 fix)
grep -n 'verified\|Unverified\|AlertTriangle' \
  'app/(shell)/estate-planning/_components/SuccessionPage.tsx' | grep -v import

# Confirm SUCC-0003.verified = false (key fixture)
node -e "const s = require('./public/data/users/demo-user/successors/SUCC-0003/core.json');
  console.log('name:', s.name, '| verified:', s.verified); // expects false"

# Confirm all 5 SPA seed records
node -e "
['SPA-0001','SPA-0002','SPA-0003','SPA-0004','SPA-0005'].forEach(id => {
  const a = require('./public/data/users/demo-user/successor-property-assignments/' + id + '/core.json');
  console.log(a.id, ':', a.successorId, '->', a.propertyId);
});"

# Confirm 2 estate-category document seeds
node -e "
['DOC-0009','DOC-0010'].forEach(id => {
  const d = require('./public/data/users/demo-user/documents/' + id + '/core.json');
  console.log(d.id, d.name, '| category:', d.category, '| property:', d.propertyId);
});"

# Confirm 3 activity event seeds
for f in EACT-0001 EACT-0002 EACT-0003; do
  node -e "const e = require('./public/data/users/demo-user/estate-activity-events/$f/core.json');
  console.log('$f:', e.kind, '|', e.propertyId, '|', e.title);"
done

# Confirm actions.ts creates real SPA records
grep -n 'successorPropertyAssignments\|estateActivityEvents\|updateProperty' \
  'app/(shell)/estate-planning/actions.ts'
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 2 — 2026-05-07
- Phase 8.5 wiring complete.
- New tally: WIRED 17 · PARTIAL 2 · CHROME 5 · HARDCODED 0. All 10 previously HARDCODED rows now WIRED.
- Row 9 (filter) reclassified CHROME → WIRED (functional `<select>` with onChange + useMemo).
- Row 19 (verified status) reclassified PARTIAL → WIRED (PF2 resolved).
- Rows 3 and 11 reclassified CHROME → PARTIAL (split wired/stub actions).
- Row 13 reclassified HARDCODED → WIRED (`propertySuccessors.length`).
- KPI label updates: "Named Beneficiaries" → "Assigned Beneficiaries" (row 6); "Protected Documents" → "Estate Documents" (row 7).
- **PF1 resolved:** queries.ts fully rewritten; all literal arrays replaced with derivations.
- **PF2 resolved:** verified/unverified conditional at `SuccessionPage.tsx:567-577`; SUCC-0003 renders Unverified.
- **PF3 softened:** security copy changed per Q5.W option a.
- **PF4 resolved:** actions.ts creates real `SuccessorPropertyAssignment` + `EstateActivityEvent` records; primary share balance validation added.
- **PF5 resolved:** `assignmentsByProperty` map; `propertySuccessors` filtered per property in component.
- **PF6 deferred:** Auth shim unchanged; awaits Q4.M.
- New entities introduced: `SuccessorPropertyAssignment` (5 seed records: SPA-0001–SPA-0005) + `EstateActivityEvent` (3 seed records: EACT-0001–EACT-0003).
- Estate document seeds added: DOC-0009 (PROP-0001, Will_And_Testament.pdf) + DOC-0010 (PROP-0011, Estate_Transfer_Deed.pdf).
- 8 post-wiring audit reports written.

### Revision 1 — 2026-05-07
- Initial audit (Phase 8.5). No fixes applied.
- 24-row inventory. Tally: WIRED 5 · PARTIAL 1 · HARDCODED 10 · CHROME 8.
- 6 PFn filed: EstatePlanningPageData conflation (PF1), verified-status rendering bug (PF2), encryption claims (PF3), actions.ts stub (PF4), no per-property successor scoping (PF5), auth-shim gap (PF6).
- Key seed verification: SUCC-0003.verified = false (Chenda Chan, Child, 12.5% share).
- New Q-numbers filed: Q3.R, Q4.V, Q4.W, Q5.W.

</details>
