---
phase: 8.6-Wiring
title: Safety Page — KPI Derivation + Schema Gaps A/B/C
date: 2026-05-07
status: planned
route: /property/[id]/safety
---

# Phase 8.6-Wiring — Safety Page

Wiring pass for `/property/[id]/safety`. The page was audited early (prior to Phase 8.x numbering) and has had no wiring sub-phase. All 4 safety entities exist, are fetched, and arrive as props — the 9 HARDCODED KPI surfaces are a derivation gap, not a missing-entity gap. Three schema gaps gate the countdown arithmetic and status styling.

---

## Scope

| Category | Count |
|---|---|
| HARDCODED surfaces to wire | 9 (all in KPI row — rows 6, 8, 9, 10, 11, 12, 13, 14, 15) |
| PARTIAL surfaces to resolve | 3 (rows 21, 28, 32 — status badges) |
| Schema gaps to fix | 3 (A: Q5.Q resolution, B: `Inspection.date` → timestamp, C: typed status unions) |
| Q-numbers to resolve | 2 (Q3.J, Q5.Q) |
| New seed records | 1 (INSP-0004 — future scheduled inspection for PROP-0001) |
| PFn deferred (systemic) | 3 (PF1 full Property to client, PF2 list-then-filter, PF3 auth IDOR — all cross-cutting; addressed in a future auth/infra phase) |

---

## Q-Resolutions

Both questions must be resolved before wiring begins. Decisions recorded here; `ref/05-open-questions.md` updated in Step 0.

### Q3.J — Compliance KPI formula

**Decision: Three-state compliance model (option hybrid of a + c)**

| State | Condition | Badge colour | Sub-label |
|---|---|---|---|
| `"Compliant"` | All certifications are `"Valid"` | emerald | "All obligations met" |
| `"At Risk"` | At least one `"Expiring"`, zero `"Expired"` | amber | `"{N} cert{s} expiring soon"` |
| `"Non-Compliant"` | At least one `"Expired"` | rose | `"{N} cert{s} expired"` |
| `"—"` | No certifications recorded | slate | "No certifications recorded" |

**Rationale:** Option (a) (all-Valid threshold) is too binary for the three-state UX; option (c) (any-Expired = Non-Compliant) gives the clearest strongest signal. Combining them as a priority cascade — Expired wins, then Expiring, then all-Valid — maps cleanly to the existing seed status values without requiring schema changes to Certification. The card icon tint and check-icon change to match the state.

**PROP-0001 expected result after wiring:** CERT-0001 is "Valid", CERT-0002 is "Expiring" → **"At Risk"** (1 cert expiring soon). The current hardcoded "Compliant" is incorrect for this property.

### Q5.Q — SafetyRisk.resolved field

**Decision: Option (a) — do not add the field; rename KPI to "Safety Risks"**

No "close a risk" action exists in the current UI. Adding `resolved: boolean` without a write path would be dead schema. The KPI card:
- **Headline:** `risks.length` (count of all recorded risks for this property)
- **Sub-label:** severity breakdown — e.g. `"1 high · 2 medium"` or `"No risks recorded"` when empty
- **KPI card label:** rename from "Open Issues" → **"Safety Risks"** (accurate without implying a resolution workflow)

**PROP-0001 expected result after wiring:** RISK-0003 (Low, "Loose handrail") → headline **1**, sub-label **"1 low"**. Current hardcoded "2" / "1 medium · 1 low" is incorrect for PROP-0001.

---

## Schema Changes

### Gap A — Q5.Q resolution (no field added)

No type change required. The `SafetyRisk` type remains as-is. KPI label and derivation change only in the component.

### Gap B — `Inspection.date`: string → number (Unix ms)

**Files changed:**

1. `lib/data/types/inspection.ts` — change `date: z.string().min(1)` → `date: z.number().int().positive()`

2. Seed files (convert display string to `new Date("YYYY-MM-DD").getTime()`):

| ID | Old value | Canonical date | Approx Unix ms |
|---|---|---|---|
| INSP-0001 | `"Mar 14, 2026"` | 2026-03-14 | `new Date("2026-03-14").getTime()` |
| INSP-0002 | `"Sep 22, 2025"` | 2025-09-22 | `new Date("2025-09-22").getTime()` |
| INSP-0003 | `"Feb 02, 2026"` | 2026-02-02 | `new Date("2026-02-02").getTime()` |

3. **New seed record INSP-0004** (demonstrates Next Inspection countdown — all 3 existing inspections are in the past):

```json
{
  "id": "INSP-0004",
  "userId": "demo-user",
  "propertyId": "PROP-0001",
  "date": "<new Date("2026-06-15").getTime()>",
  "type": "Annual Electrical",
  "inspector": "Heng Virak",
  "status": "Pending",
  "issues": 0,
  "createdAt": 1775001600000,
  "updatedAt": 1775001600000
}
```

4. **Render-layer:** every place `insp.date` is rendered as a display string, wrap with a `formatDate(insp.date)` helper (pattern already used in `lib/data/derivations/*.ts` for `Lease.startDate`). Do NOT convert display strings in prop render — the timestamp is the source, format at render time.

### Gap C — Typed status unions for 3 fields

All three fields are `z.string().min(1)` today. Narrow each to a closed union:

**1. `lib/data/types/certification.ts`**
```ts
// before
status: z.string().min(1),
// after
status: z.enum(["Valid", "Expiring", "Expired"]),
```
Note: seed uses "Valid" (not "Active" as catalog §18 states). Keep "Valid" — seed and component are consistent; catalog §18 needs updating to match.

**2. `lib/data/types/inspection.ts`**
```ts
// before
status: z.string().min(1),
// after
status: z.enum(["Passed", "Satisfactory", "Failed", "Pending"]),
```
Note: "Satisfactory" is retained as a distinct mid-state (INSP-0002 uses it). "Pending" added to support INSP-0004. Catalog §17 said "Pass/Fail/Pending" — update catalog to match seed convention (past-tense "Passed"/"Failed").

**3. `lib/data/types/safety-risk.ts`**
```ts
// before
severityLabel: z.string().min(1),
// after
severityLabel: z.enum(["High", "Medium", "Low"]),
```
No seed change needed — all 3 risk records already use title-case values.

---

## Derivation Helper

Add `computeSafetyKpis` to `app/(shell)/property/[id]/safety/queries.ts` (server-side, returned as part of `getSafetyPageData` return shape) or at the top of `PropertySafetyPage.tsx` as a pure function before the component.

**Preferred location:** top of `PropertySafetyPage.tsx` as a plain function (no import needed, avoids RSC-boundary serialization of computed values when the inputs are already props).

```ts
function computeSafetyKpis(
  certifications: Certification[],
  inspections: Inspection[],
  risks: SafetyRisk[],
) {
  // Certification compliance
  const total = certifications.length;
  const valid = certifications.filter(c => c.status === "Valid").length;
  const expiring = certifications.filter(c => c.status === "Expiring").length;
  const expired = certifications.filter(c => c.status === "Expired").length;
  const complianceRatio = total > 0 ? valid / total : 0;
  const complianceStatus =
    expired > 0 ? "Non-Compliant" :
    expiring > 0 ? "At Risk" :
    total > 0 ? "Compliant" : "—";
  const complianceSubLabel =
    expired > 0 ? `${expired} cert${expired > 1 ? "s" : ""} expired` :
    expiring > 0 ? `${expiring} cert${expiring > 1 ? "s" : ""} expiring soon` :
    total > 0 ? "All obligations met" : "No certifications recorded";

  // Next future inspection
  const now = Date.now();
  const nextInspection = inspections
    .filter(i => i.date > now)
    .sort((a, b) => a.date - b.date)[0] ?? null;
  const daysUntilNext = nextInspection
    ? Math.ceil((nextInspection.date - now) / 86_400_000)
    : null;
  const nextInspectionSubLabel = nextInspection
    ? `${nextInspection.type} · ${new Date(nextInspection.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
    : "Schedule upcoming inspection";

  // Safety risks
  const totalRisks = risks.length;
  const high = risks.filter(r => r.severityLabel === "High").length;
  const medium = risks.filter(r => r.severityLabel === "Medium").length;
  const low = risks.filter(r => r.severityLabel === "Low").length;
  const riskSubLabel =
    totalRisks === 0 ? "No risks recorded" :
    [high > 0 && `${high} high`, medium > 0 && `${medium} medium`, low > 0 && `${low} low`]
      .filter(Boolean)
      .join(" · ");

  return {
    complianceRatio,     // 0–1 float
    complianceStatus,    // "Compliant" | "At Risk" | "Non-Compliant" | "—"
    complianceSubLabel,
    valid,
    total,
    nextInspection,
    daysUntilNext,       // null when no future inspections
    nextInspectionSubLabel,
    totalRisks,
    riskSubLabel,
  };
}
```

Call at component top:

```ts
const kpis = computeSafetyKpis(certifications, inspections, risks);
```

---

## Surface Wiring (9 HARDCODED → WIRED)

All in `app/(shell)/property/[id]/_components/PropertySafetyPage.tsx`.

### Row 6 — Header subtitle

```tsx
// before
78.6% compliant · Next inspection Apr 29, 2026

// after
{(kpis.complianceRatio * 100).toFixed(1)}% compliant ·{" "}
{kpis.nextInspection
  ? `Next inspection ${kpis.nextInspectionSubLabel.split(" · ")[1]}`
  : "No upcoming inspection"}
```

### Row 8 — Certifications donut arc + percentage

SVG `strokeDasharray`: the hardcoded formula `${78.6 * 2.51}` maps to `compliancePct × 2.51` where 2.51 ≈ circumference / 100 for r=40 (circumference = 2π × 40 ≈ 251.33; `/100` normalizes to percent).

```tsx
// before
strokeDasharray={`${78.6 * 2.51} ${100 * 2.51}`}
// ...
<span className="text-[15px] font-bold text-emerald-600">78.6%</span>

// after
strokeDasharray={`${(kpis.complianceRatio * 100 * 2.51).toFixed(1)} ${100 * 2.51}`}
// ...
<span className={`text-[15px] font-bold ${kpis.complianceStatus === "Non-Compliant" ? "text-rose-600" : kpis.complianceStatus === "At Risk" ? "text-amber-600" : "text-emerald-600"}`}>
  {(kpis.complianceRatio * 100).toFixed(1)}%
</span>
```

Also update the donut `stroke-emerald-500` class to match compliance state (emerald / amber / rose).

### Row 9 — "5 of 6 current"

```tsx
// before
<div className="text-xs text-slate-400 mt-1 text-center">5 of 6 current</div>

// after
<div className="text-xs text-slate-400 mt-1 text-center">{kpis.valid} of {kpis.total} valid</div>
```

### Rows 10–11 — Compliance headline + sub-label + icon tint

```tsx
// before
<div className="w-7 h-7 rounded-md bg-emerald-50 ..."><Check className="size-4 text-emerald-600" /></div>
<div className="text-[24px] font-bold ...">Compliant</div>
<div className="text-xs text-slate-400 mt-1">All obligations met</div>

// after
const complianceTint =
  kpis.complianceStatus === "Non-Compliant" ? { bg: "bg-rose-50", text: "text-rose-600" } :
  kpis.complianceStatus === "At Risk" ? { bg: "bg-amber-50", text: "text-amber-600" } :
  { bg: "bg-emerald-50", text: "text-emerald-600" };
// ...
<div className={`w-7 h-7 rounded-md ${complianceTint.bg} ...`}>
  <Check className={`size-4 ${complianceTint.text}`} />
</div>
<div className="text-[24px] font-bold ...">{kpis.complianceStatus}</div>
<div className="text-xs text-slate-400 mt-1">{kpis.complianceSubLabel}</div>
```

### Rows 12–13 — Next Inspection headline + sub-label

```tsx
// before
<div className="text-[24px] font-bold ...">18 days</div>
<div className="text-xs text-slate-400 mt-1">Fire safety · Apr 29, 2026</div>

// after
<div className="text-[24px] font-bold ...">
  {kpis.daysUntilNext !== null ? `${kpis.daysUntilNext} days` : "None"}
</div>
<div className="text-xs text-slate-400 mt-1">{kpis.nextInspectionSubLabel}</div>
```

When `daysUntilNext === null` the card shows "None" and the sub-label shows "Schedule upcoming inspection". Consider rendering the card with a slate icon tint (no upcoming inspection is not a warning, just a state).

### Rows 14–15 — Safety Risks headline + sub-label + card label rename

```tsx
// before (card label)
<span ...>Open Issues</span>
// ...
<div ...>2</div>
<div ...>1 medium · 1 low</div>

// after
<span ...>Safety Risks</span>
// ...
<div ...>{kpis.totalRisks}</div>
<div ...>{kpis.riskSubLabel}</div>
```

---

## Status Badge Fixes (3 PARTIAL → WIRED)

### Row 21 — `Certification.status` badge

Replace two-state `if/else` with three-state lookup:

```tsx
// after Schema gap C, exhaustive lookup
const CERT_STATUS_STYLE = {
  Valid:    { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  Expiring: { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500"   },
  Expired:  { bg: "bg-rose-50",    text: "text-rose-700",    dot: "bg-rose-500"    },
} satisfies Record<Certification["status"], { bg: string; text: string; dot: string }>;

const certStyle = CERT_STATUS_STYLE[c.status];
```

### Row 28 — `Inspection.status` badge

```tsx
const INSPECTION_STATUS_STYLE = {
  Passed:       { bg: "bg-emerald-50", text: "text-emerald-700" },
  Satisfactory: { bg: "bg-amber-50",   text: "text-amber-700"   },
  Failed:       { bg: "bg-rose-50",    text: "text-rose-700"    },
  Pending:      { bg: "bg-slate-50",   text: "text-slate-600"   },
} satisfies Record<Inspection["status"], { bg: string; text: string }>;
```

Remove the `"Clear"` string literal (was a non-standard seed value; no seed record uses it; "Passed" covers it).

### Row 32 — `SafetyRisk.severityLabel` badge

```tsx
const RISK_SEVERITY_STYLE = {
  High:   { bg: "bg-rose-50",    text: "text-rose-700"    },
  Medium: { bg: "bg-amber-50",   text: "text-amber-700"   },
  Low:    { bg: "bg-emerald-50", text: "text-emerald-700" },
} satisfies Record<SafetyRisk["severityLabel"], { bg: string; text: string }>;
```

---

## Files Changed (summary)

| File | Change |
|---|---|
| `lib/data/types/inspection.ts` | `date: z.string()` → `z.number()` · `status: z.string()` → `z.enum(["Passed","Satisfactory","Failed","Pending"])` |
| `lib/data/types/certification.ts` | `status: z.string()` → `z.enum(["Valid","Expiring","Expired"])` |
| `lib/data/types/safety-risk.ts` | `severityLabel: z.string()` → `z.enum(["High","Medium","Low"])` |
| `public/data/users/demo-user/inspections/INSP-0001/core.json` | `date` string → Unix ms timestamp |
| `public/data/users/demo-user/inspections/INSP-0002/core.json` | `date` string → Unix ms timestamp |
| `public/data/users/demo-user/inspections/INSP-0003/core.json` | `date` string → Unix ms timestamp |
| `public/data/users/demo-user/inspections/INSP-0004/core.json` | **NEW** — future inspection for PROP-0001 (Jun 15 2026, Annual Electrical, Pending) |
| `app/(shell)/property/[id]/_components/PropertySafetyPage.tsx` | `computeSafetyKpis` helper + 9 HARDCODED rows wired + 3 status badge lookups + PARTIAL rows wired |
| `app/(shell)/property/[id]/safety/queries.ts` | Update `getSafetyPageData` return type to reflect typed fields (no logic change unless derivation helper moved here) |

---

## Expected Results After Wiring (PROP-0001)

| KPI Card | Before (hardcoded) | After (derived) |
|---|---|---|
| Certifications % | 78.6% | 50% (1 Valid / 2 total) |
| Certifications sub | "5 of 6 current" | "1 of 2 valid" |
| Compliance state | "Compliant" | "At Risk" |
| Compliance sub | "All obligations met" | "1 cert expiring soon" |
| Next Inspection | "18 days · Fire safety · Apr 29" | "39 days · Annual Electrical · Jun 15, 2026" (INSP-0004) |
| Safety Risks count | 2 | 1 |
| Safety Risks sub | "1 medium · 1 low" | "1 low" |

---

## Deferred (not in Phase 8.6 scope)

| Item | Reason |
|---|---|
| PF1 — Full Property to Client Component | Cross-tab systemic refactor; gated on narrowing all 7 property-tab interfaces simultaneously |
| PF2 — List-then-filter | Indexed DB queries require `by_property` index work across 4 DB modules; scoped to a future infra phase |
| PF3 — Auth IDOR | Gated on Clerk auth integration replacing the `getCurrentUserId()` stub; cross-project |
| Q3.J Compliance donut "percent of certifications" re: `valid / total` vs `non-expired / total` | Decided: `valid / total` (strictest reading). "Expiring" lowers the ratio. |
| Catalog §18 "Active" vs "Valid" | Update `ref/00-entity-catalog.md` §18 in same PR — 1-line change; seed/code wins over catalog |

---

## Post-wiring: Per-datapoint Audits

After wiring is confirmed working, run `/audit-datapoint` on the following as a bundle (all can be cited as a single derivation bundle report):

- `property-id-safety--kpi-bundle.md` (full template — rows 6, 8, 9, 10, 11, 12, 13, 14, 15; 9 surfaces; derived values)
- `property-id-safety--certification-badge.md` (lite + PF5 citation)
- `property-id-safety--inspection-status.md` (lite + PF5 citation)
- `property-id-safety--risk-severity.md` (lite + PF5 citation)

Update `pages/property-id-safety/plan.md` Fix Log once each finding is confirmed.

---

## Q-numbers to update in `ref/05-open-questions.md`

| Q | Update |
|---|---|
| Q3.J | Mark **Resolved 2026-05-07 (Phase 8.6):** three-state model (Compliant/At Risk/Non-Compliant); priority cascade Expired → Expiring → all-Valid |
| Q5.Q | Mark **Resolved 2026-05-07 (Phase 8.6):** option (a) — no `resolved` field; KPI renamed to "Safety Risks"; count = `risks.length` |
