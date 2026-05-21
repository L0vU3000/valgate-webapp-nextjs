---
slug: property-id-overview--tenant-mix-donut
data_point: "Tenant Mix donut — stage breakdown arcs, center count, legend"
route: /property/[id]/overview
revision: 1
date: 2026-05-06
verdict: "✅ Correct · 3 findings (1 P1, 1 P2, 1 P3) · schema-gap default documented"
---

# Audit — Tenant Mix Donut on /property/[id]/overview
_Last revised: 2026-05-06 · Revision 1_

## TL;DR
- ✅ Value is correct — shows Signed (1) for PROP-0001, matching the single active lease seed
- ⚠️ 3 findings · 1 P1 (Lease[] ships userId to browser) · 1 P2 (interim stage-breakdown replaces original unit-type categorization) · 1 P3 (donut uses all leases, not just active)
- 🔧 Top fix: narrow Lease[] server-side — strip userId (F1, same as monthly-income F1)
- 📄 Page audit: see [pages/property-id-overview/audit.md](pages/property-id-overview/audit.md)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What does this donut show? | — |
| 2 | Entity | Is the data well-organised? | ✅ |
| 3 | Formula | Does the breakdown match the label? | ✅ |
| 4 | Render | How does the donut reach the user? | ⚠️ |
| 5 | Consistency | Do related numbers agree? | ✅ |
| 6 | Missing safeties | What should exist but doesn't? | 2 gaps |
| 7 | Meaning | Does the label promise what the math delivers? | ⚠️ |
| 8 | Findings | What to fix | 3 items |
| 9 | Fix Log | What has been fixed since the initial audit? | — |

## Glossary
- **Stage breakdown** — interim categorization by `Lease.stage` enum value, since `unitType` field does not yet exist on Lease. See Q5.A.
- **Q5.A** — Open question: Tenant Mix donut should show Commercial/Retail/Vacant by unitType, but `unitType` is absent from the Lease schema. Filed in `ref/05-open-questions.md`.

---

## 1. Snapshot — ✅

> **Plain opener:** The Tenant Mix donut shows how this property's leases are distributed across stage values (Signed, Approaching, Offered, Declined). This is an interim categorization: the original design called for a Commercial/Retail/Vacant split by unit type, but that requires a `unitType` field not yet in the schema. For PROP-0001 with one Signed lease, the donut shows a single blue arc covering 100% of the circle.

| | |
|---|---|
| Where | `/property/PROP-0001/overview`, Summary Row, right card |
| Label | "Tenant Mix" |
| Main formula | Group all property leases by `stage`; compute each stage's arc proportion of the total |
| Reads from | `public/data/users/demo-user/leases/` — all leases for PROP-0001 |
| Canonical home | client (computed in PropertyOverviewPage from `leases` prop) |
| Edge cases | no leases → all arcs=0, center shows "0 Signed", legend shows "—" |

## 2. Entity — ✅

> **Plain opener:** The donut reads directly from the `stage` enum on `Lease`, which is well-typed and Zod-validated. No new fields needed for this interim visualization.

| Field used | Type | Notes |
|---|---|---|
| `stage` | `"Approaching" \| "Offered" \| "Signed" \| "Declined"` | the group-by key |
| `propertyId` | `string` | filter key — only leases for this property |

**Catalog reference:** `ref/00-entity-catalog.md §5`

## 3. Formula — ✅

> **Plain opener:** The donut groups all leases by stage, computes arc lengths proportional to count/total, and renders each as an SVG circle with animated dasharray. For one Signed lease the single arc covers the full 201px circumference.

**Formula (verbatim):**
```ts
const CIRC = 200.96;
const stageGroups = STAGE_ORDER.map(stage => ({
  stage,
  count: leases.filter(l => l.stage === stage).length,
  color: STAGE_COLORS[stage],
})).filter(s => s.count > 0);
let cumArc = 0;
const stageArcs = stageGroups.map(s => {
  const arc = leases.length > 0 ? (s.count / leases.length) * CIRC : 0;
  const offset = -cumArc;
  cumArc += arc;
  return { ...s, arc, offset };
});
const signedCount = leases.filter(l => l.stage === "Signed").length;
```

**Note:** uses **all** leases for the property (not filtered to active). A Declined lease is included in the breakdown. This is intentional — the donut shows the full lease stage portfolio, not just current occupancy. See F3 for nuance.

**Rule 3 multi-record walk:** two leases (Signed + Declined):
- total = 2, Signed count = 1, Declined count = 1
- Signed arc = (1/2) × 200.96 = 100.48, offset = 0
- Declined arc = (1/2) × 200.96 = 100.48, offset = −100.48
- Sum of arcs = 200.96 ≈ CIRC ✅

**Golden-value check**

| Source | Value |
|---|---|
| PROP-0001 lease count | 1 (LEASE-0001) |
| stage | Signed |
| stageGroups | [{Signed, 1, var(--val-primary-dark)}] |
| signedCount | 1 |
| Arc for Signed | (1/1) × 200.96 = 200.96 (full circle) |
| Center text | "1 Signed" |
| Legend | "Signed (1)" |
| Match? | ✅ |

## 4. Render — ⚠️

> **Plain opener:** The donut renders correctly for PROP-0001. The Lease[] prop still carries userId fields. Animations are tied to `mounted` state for a clean entrance.

| | |
|---|---|
| Component | `<PropertyOverviewPage>` Tenant Mix card |
| Prop chain | `leases[]` → `stageGroups` → `stageArcs` → SVG circles |
| Animation | `strokeDasharray` transitions from `0 CIRC` to `arc CIRC` on mount |
| Empty state | `stageArcs.length === 0` → legend shows `"—"`, center shows "0 Signed" |

**PII / IDOR**
- `Lease[]` carries `userId` to browser. See **PF1** in [pages/property-id-overview/audit.md](pages/property-id-overview/audit.md) (F1 in this report).
- Auth shim: see **PF2** in [pages/property-id-overview/audit.md](pages/property-id-overview/audit.md).

## 5. Consistency — ✅

| Identity | Verification | Holds? |
|---|---|---|
| Donut total = leases.length for PROP-0001 | 1 lease = 1 arc at 100% | ✅ |
| Active Leaseholders table row count ≤ donut Signed count | Table shows activeLeases; donut shows all-Signed (active + inactive) — for current seed both are 1 | ✅ |

## 6. Missing safeties — 2 gaps

| Gap | Status | Link |
|---|---|---|
| `userId` shipped in `Lease[]` | ❌ | F1 |
| Original Commercial/Retail/Vacant categorization deferred | ⚠️ interim | F2, Q5.A |
| Auth shim | ⚠️ shim | Page-wide: see **PF2** |

## 7. Meaning — ⚠️

> **Plain opener:** The label "Tenant Mix" traditionally implies a breakdown by tenant category (commercial, retail, residential). The current implementation shows lease stage breakdown instead — technically accurate but semantically different from the original intent.

```
Label rendered:           "Tenant Mix"
Formula chosen:           count of leases grouped by stage enum
User's likely inference:  the types of tenants in this property (commercial vs retail)
Match?                    ⚠️ — interim categorization, not unit-type breakdown (Q5.A)
```

## 8. Findings — 3 items

---

### 🔴 F1 — `userId` shipped to browser in unnarrowed `Lease[]`
**P1 robustness · confidence: high · `[render]`**

Same finding as `property-id-overview--monthly-income` F1. Narrow `Lease[]` server-side in `overview/queries.ts`. Fix covers all 4 overview Lease surfaces at once.

---

### 🟡 F2 — Interim stage-breakdown replaces original unit-type categorization (Q5.A)
**P2 schema smell · confidence: high · `[semantic]`**

**Where:** `PropertyOverviewPage.tsx` — Tenant Mix donut legend and arcs

**Problem:** The original page design showed Commercial (12) / Retail (4) / Vacant (2) breakdown by unit type. Current `LeaseSchema` has `unit: string` ("Unit 1A") but no `unitType` enum field. The interim stage-breakdown (Signed/Approaching/Offered/Declined) is wireable now and gives the donut real data — but it tells a different story than the original commercial/retail categorization.

**Fix:** When a `unitType` field (or a separate Unit entity) lands, rewire the donut to the original commercial/retail/vacant breakdown. Track as Q5.A in `ref/05-open-questions.md`.

---

### 🔵 F3 — Donut uses all leases (not just active), so Declined leases inflate counts
**P3 nit · confidence: medium · `[semantic]`**

**Where:** `PropertyOverviewPage.tsx` — `stageGroups = STAGE_ORDER.map(stage => ({ count: leases.filter(l => l.stage === stage).length }))`

**Problem:** A Declined lease (a rejected application) appears in the donut as a "Declined" segment. It is not a current tenant and should arguably not influence the "Tenant Mix" view of the property's current occupancy picture.

**Impact today:** PROP-0001 has no Declined leases in the seed, so this is not visible. Becomes visible if Declined leases are seeded.

**Fix (optional):** Filter to `leases.filter(l => l.stage !== "Declined")` for the donut, or document the intentional "all stages" interpretation. If keeping all stages, update the card title to "Lease Pipeline" to be more accurate.

## 9. Fix Log

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| — | — | — | _No fixes yet._ | — |

---

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
selector: |
  <PropertyOverviewPage> Tenant Mix card — svg circles + legend
sources:
  - path: lib/data/types/lease.ts
    sha: 942c1004d68e0924237bf2e05b137160c8091887
  - path: lib/data/db/leases.ts
    sha: a598d563f156c57ca11d2055c59ba201b75c91e5
  - path: app/(shell)/property/[id]/overview/queries.ts
    sha: ecdb975189ff442c2a235efeeb23d92338b33ef7
  - path: app/(shell)/property/[id]/_components/PropertyOverviewPage.tsx
    sha: db0c6fa1502d9cb7d83848f9356e29cc829ec22b
```

</details>

<details>
<summary>📋 Manual verification commands</summary>

```bash
# Stage breakdown for PROP-0001 leases
node -e "
const fs = require('fs');
const dir = 'public/data/users/demo-user/leases';
const leases = fs.readdirSync(dir, {withFileTypes:true})
  .filter(e => e.isDirectory())
  .map(d => JSON.parse(fs.readFileSync(dir+'/'+d.name+'/core.json','utf8')))
  .filter(r => r.propertyId === 'PROP-0001');
const counts = {};
leases.forEach(l => { counts[l.stage] = (counts[l.stage]||0)+1; });
console.log('Stage breakdown:', counts);
console.log('Total:', leases.length);
"
# Expected: Stage breakdown: { Signed: 1 }
# Expected: Total: 1
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-06
- Initial audit (fresh write). Surface wired in Phase 6.1 with interim stage-breakdown (original Commercial/Retail/Vacant deferred per Q5.A).
- Golden-value check ✅: 1 Signed lease = single 100% blue arc.
- Rule 3 two-record walk verified arc proportions.
- 3 findings filed: F1 (userId leak), F2 (interim stage vs unit-type, Q5.A), F3 (includes Declined leases).
- PF1+PF2 from pages/property-id-overview/audit.md cited.

</details>
