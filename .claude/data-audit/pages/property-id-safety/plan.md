---
slug: property-id-safety
route: /property/[id]/safety
revision: 2
date: 2026-05-07
verdict: "⚠️ 16 WIRED · 3 PARTIAL · 9 HARDCODED · 5 PFn — Phase 8.6 planned; Q3.J + Q5.Q resolved; schema gaps A/B/C + KPI derivation wiring queued"
---

# Page Audit — /property/[id]/safety — plan.md
_Last revised: 2026-05-05 · Revision 1_

_See [audit.md](./audit.md) for the underlying analysis._

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 3 | Entity Backlog | What database concepts are missing, prioritised? | 0 new entities — see schema gaps |
| 4 | Audit Roadmap | Which rows deserve `/audit-datapoint` and with which template? | 22 rows |
| 5 | Fix Log | What has been fixed since the initial audit? | — |

---

## 3. Entity Backlog (0 new entities — schema gaps only)

> **Plain opener:** The safety domain is the first page in this audit series where all data entities already exist — Inspection, Certification, SafetyRisk, and EmergencyContact are all defined in `lib/data/types/`, have DB implementations, and are fetched and rendered. The 9 HARDCODED rows are not blocked on missing entities but on missing derivation logic and two type-field gaps.

### No new entity needed — KPI derivation layer is the blocker

- **Required by:** rows 8–15 (all KPI cards) — "78.6%", "5 of 6 current", "Compliant", "18 days", "Fire safety · Apr 29, 2026", "2", "1 medium · 1 low"
- **Catalog reference:** all four safety entities are already catalogued at [`ref/00 §17`](../../ref/00-entity-catalog.md) (Inspection + Certification), [`§19`](../../ref/00-entity-catalog.md) (SafetyRisk), [`§20`](../../ref/00-entity-catalog.md) (EmergencyContact)
- **Entities in `lib/data/types/`?** ✅ All four exist
- **Entities fetched?** ✅ `getSafetyPageData` returns all four arrays
- **What's actually missing:** `PropertySafetyPage` receives the arrays but computes nothing from them. The fix is a small derivation helper at the top of the component (or in `queries.ts`) — no schema work required for most KPIs.
- **Land first, then audit:** as soon as the derivation helper is added and KPI rows become WIRED, audit rows 8–15 as a batch with the **full** template (all are derivations: ratio, count, date-diff, grouped-count).
- **Notes:** This page is notable for being the inverse of every prior page: the data exists, the query exists, the prop chain exists — only the computation step is missing.

### Schema gap A — `SafetyRisk.resolved` field
- **Required by:** row 14 ("Open Issues: 2") — the "open" filter requires a `resolved: boolean` field
- **Catalog reference:** [`ref/00 §19`](../../ref/00-entity-catalog.md) — catalog specifies `resolved: v.boolean()` but `lib/data/types/safety-risk.ts` omits it
- **Currently in `lib/data/types/`?** ❌ Field missing; type has only `id, userId, propertyId, severityLabel, title, desc, createdAt, updatedAt`
- **Resolution:** Add `resolved: boolean` to `SafetyRisk` type + seed data. Until then, "Open Issues" collapses to `risks.length`.
- **Notes:** Open question filed as Q5.Q. If there is no "close a risk" action in the UI, clarify whether risks are always open or need an explicit close flow.

### Schema gap B — `Inspection.date` is a display string, not a timestamp
- **Required by:** rows 12–13 (Next Inspection "18 days" / "Fire safety · Apr 29, 2026") — countdown arithmetic requires a parseable date
- **Catalog reference:** [`ref/00 §17`](../../ref/00-entity-catalog.md) — catalog implies `date` as a stored value; no explicit type defined
- **Currently in `lib/data/types/`?** `Inspection.date: string` — e.g. `"Mar 14, 2026"`. Date arithmetic from a formatted display string requires `new Date(str)` which is locale-sensitive and fragile.
- **Resolution:** Change `Inspection.date` to `date: number` (Unix ms), format to display string at render time using `formatDate`. Update seed files (all `INSP-*` `core.json`).
- **Notes:** This is the same pattern already applied to `Lease.startDate` / `Lease.endDate` in `lib/data/types/lease.ts`. Consistent timestamp-as-number convention throughout.

### Schema gap C — Status fields need typed string unions
- **Required by:** rows 21, 28, 32 (three PARTIAL rows) — untyped `string` fields prevent exhaustive styling
- **Affects:** `Certification.status`, `Inspection.status`, `SafetyRisk.severityLabel`
- **Resolution (after catalog reconciliation per PF5):**
  - `Certification.status: "Valid" | "Expiring" | "Expired"`
  - `Inspection.status: "Passed" | "Failed" | "Pending"` (reconcile catalog `Pass/Fail` with seed `"Passed"`)
  - `SafetyRisk.severityLabel: "High" | "Medium" | "Low"`
- **Notes:** Reconciliation decision — UI/seed uses `"Passed"` but catalog says `Pass` — pick one before tightening; recommend `"Passed"/"Failed"/"Pending"` (past-tense for completed inspections is more natural).

---

## 4. Audit Roadmap (22 rows)

> **Plain opener:** Of the 22 audit-relevant rows (WIRED + PARTIAL), 19 can be run now with the lite template (all direct reads from the safety entity arrays). The 3 PARTIAL rows each need one styling finding plus a PFn citation. The 9 HARDCODED KPI rows are blocked on derivation logic (not on entities) — flip them to "ready" once the KPI helper is added.

| Row | Element | Status | Template | Existing audit |
|---|---|---|---|---|
| 1 | Header `code` + `type` | ready | lite | _to-do_ |
| 2 | Header `health` score | ready | lite | _to-do_ |
| 4 | Breadcrumb `property.code` | ready | lite | _to-do_ |
| 6 | Header subtitle (compliance + next inspection) | blocked on **KPI derivation + Schema gap B** | — | wait for derivation |
| 8 | Certifications donut (78.6% + arc) | blocked on **KPI derivation** | — | wait for derivation |
| 9 | Certifications "5 of 6 current" | blocked on **KPI derivation** | — | wait for derivation |
| 10 | Compliance "Compliant" | blocked on **KPI derivation + Q3.J decision** | — | wait for decision |
| 11 | Compliance "All obligations met" | blocked on **KPI derivation + Q3.J decision** | — | wait for decision |
| 12 | Next Inspection "18 days" | blocked on **KPI derivation + Schema gap B** | — | wait for `Inspection.date` → timestamp |
| 13 | Next Inspection detail label | blocked on **KPI derivation + Schema gap B** | — | wait for `Inspection.date` → timestamp |
| 14 | Open Issues count | blocked on **Schema gap A** (`SafetyRisk.resolved`) | — | wait for field |
| 15 | Open Issues breakdown "1 medium · 1 low" | blocked on **Schema gap A** | — | wait for field |
| 17 | Certification `c.name` | ready | lite | _to-do_ |
| 18 | Certification `c.inspector` | ready | lite | _to-do_ |
| 19 | Certification issued date `c.issued` | ready | lite | _to-do_ |
| 20 | Certification expires date `c.expires` | ready | lite | _to-do_ |
| 21 | Certification status badge | partial | lite + PFn citation | _to-do_ (cite PF5 for color gap) |
| 25 | Inspection date `insp.date` | ready | lite | _to-do_ |
| 26 | Inspection type `insp.type` | ready | lite | _to-do_ |
| 27 | Inspection inspector `insp.inspector` | ready | lite | _to-do_ |
| 28 | Inspection status text + color | partial | lite + PFn citation | _to-do_ (cite PF5 for color gap) |
| 29 | Inspection issues count `insp.issues` | ready | lite | _to-do_ |
| 32 | Risk severity badge | partial | lite + PFn citation | _to-do_ (cite PF5 for color gap) |
| 33 | Risk title `r.title` | ready | lite | _to-do_ |
| 34 | Risk description `r.desc` | ready | lite | _to-do_ |
| 37 | Contact name `ec.name` | ready | lite | _to-do_ |
| 38 | Contact phone `ec.phone` | ready | lite | _to-do_ |
| 39 | Contact sub-text `ec.sub` | ready | lite | _to-do_ |

**Legend:**
- **ready** — WIRED, runnable now
- **partial** — PARTIAL; run lite template, cite PF5 for styling gap instead of restating
- **blocked on \<gap\>** — HARDCODED; revisit after the named derivation or schema gap is resolved

**Recommended next moves (in order):**
1. **Add the KPI derivation helper** (small, no schema change for certifications ratio and open-issues-count). Unblocks rows 8, 9 immediately and makes rows 10–11 dependent only on the Q3.J decision.
2. **Resolve Schema gap C** (type unions for status fields). Unblocks PARTIAL rows 21, 28, 32 from being lite + PFn citation to clean WIRED + lite.
3. **Resolve Schema gap B** (`Inspection.date` → timestamp). Unblocks rows 12, 13.
4. **Resolve Schema gap A** (`SafetyRisk.resolved`). Unblocks rows 14, 15.
5. **Answer Q3.J** (define "Compliance" status logic). Unblocks rows 10, 11.
6. Run `/audit-datapoint` on all WIRED/ready rows in batches by entity: certifications batch (17–21), inspections batch (25–29), risks batch (32–34), contacts batch (37–39).

## 5. Fix Log

> A chronological record of fixes applied after the initial audit. Empty on first write.

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| — | — | — | _No code changes yet — plan only._ | — |

### Phase 8.6 Planning (2026-05-07)

- **Q3.J resolved** — three-state compliance model: "Compliant" (all Valid) → "At Risk" (any Expiring, no Expired) → "Non-Compliant" (any Expired). See `ref/05-open-questions.md` Q3.J resolution note.
- **Q5.Q resolved** — no `resolved` field on SafetyRisk; KPI card renamed from "Open Issues" to "Safety Risks"; count = `risks.length`. See `ref/05-open-questions.md` Q5.Q resolution note.
- **Phase 8.6 plan written** — covers Schema gaps A/B/C + `computeSafetyKpis` helper + 9 HARDCODED → WIRED + 3 PARTIAL → WIRED + INSP-0004 seed addition. See `.claude/data-audit/docs/plans/Plan-Phase-8.6-Safety-Wiring.md`.
- **Blocking Q-numbers for wiring now cleared:** Q3.J + Q5.Q. Schema gaps A (no-op), B (type change + seed), C (union narrowing) remain as implementation steps.

---

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-05
- Initial plan (fresh write). 0 new entities in backlog — all 4 safety entities already exist. 3 schema gaps identified. 22 rows in Audit Roadmap (19 ready-for-lite + 3 partial).
- Key deviation from plan-v13 prediction: entities are NOT missing; derivation layer and schema gaps are the real blockers. MaintenanceItem does NOT appear on this page.
- Recommended next: add KPI derivation helper (small, no DB change) then type-narrow the 3 status fields.

</details>
