---
slug: estate-planning--successor-table-direct-reads
route: /estate-planning
data_point: "Successor table direct-read fields (rows 14–18): name, initials, relation, role badge, share %"
verdict: "✅ All 5 fields WIRED · cite PF5 (per-property scoping resolved) · 0 findings"
revision: 1
date: 2026-05-07
template: lite
---

# Audit — Successor table direct-read fields
_Route: /estate-planning — rows 14, 15, 16, 17, 18 (5 surfaces)_
_Last revised: 2026-05-07 · Revision 1_

## §1 — What these surfaces show

> The beneficiary table shows one row per successor assigned to the currently selected property. Each row displays the successor's name (with relation as a sub-label), initials avatar, role badge (Primary Beneficiary / Contingent Beneficiary), and share percentage. The table title shows a count ("N total entries").

Five direct-read fields bundled here (plus count label row 13, also WIRED):

| Inventory row | Element | Class |
|---|---|---|
| 13 | Successor count label "N total entries" | WIRED |
| 14 | Successor name + relation (sub-label) | WIRED |
| 15 | Successor initials (avatar) | WIRED |
| 16 | Successor relation | WIRED |
| 17 | Successor role badge | WIRED |
| 18 | Successor share % | WIRED |

## §2 — Where each value comes from

**Data path:** `getEstatePlanningPageData()` in `queries.ts:141` → `db.successors.list(userId)` → mapped to `Successor[]` at `queries.ts:261-270` with `propertyIds: string[]` from `assignmentsByProperty`.

**Component filter:** `SuccessionPage.tsx:228-234` — `propertySuccessors` useMemo:
```tsx
const propertySuccessors = useMemo(
  () => propertyId
    ? successors.filter((s) => s.propertyIds.includes(propertyId))
    : [],
  [propertyId, successors],
);
```

| Field | Source path | Transform |
|---|---|---|
| initials (avatar) | `s.initials` ← `successor.initials` (stored field) | none |
| name | `s.name` ← `successor.name` | none |
| relation | `s.relation` ← `successor.relation` (sub-label under name) | none |
| role badge | `s.role` ← `successor.role` → `<RoleBadge>` | `"primary"` → "Primary Beneficiary"; `"contingent"` → "Contingent Beneficiary" |
| share % | `s.share` ← `successor.share.toFixed(2) + "%"` | formatted string `"75.00%"` |
| count label | `{propertySuccessors.length} total entries` | integer from filtered array |

## §3 — Seed verification

**Seed assignments (5 SPA records):**
| SPA ID | Successor | Property |
|---|---|---|
| SPA-0001 | SUCC-0001 (Sophea Chan) | PROP-0001 |
| SPA-0002 | SUCC-0002 (Dara Chan) | PROP-0001 |
| SPA-0003 | SUCC-0003 (Chenda Chan) | PROP-0001 |
| SPA-0004 | SUCC-0001 (Sophea Chan) | PROP-0011 |
| SPA-0005 | SUCC-0002 (Dara Chan) | PROP-0011 |

**Expected rendering — PROP-0001 selected:**

| Row | Name | Initials | Relation | Role | Share |
|---|---|---|---|---|---|
| 1 | Sophea Chan | SC | Spouse | Primary Beneficiary | 75.00% |
| 2 | Dara Chan | DC | Child | Contingent Beneficiary | 12.50% |
| 3 | Chenda Chan | CC | Child | Contingent Beneficiary | 12.50% |

Count label: "3 total entries"

**Expected rendering — PROP-0011 selected:**

| Row | Name | Initials | Relation | Role | Share |
|---|---|---|---|---|---|
| 1 | Sophea Chan | SC | Spouse | Primary Beneficiary | 75.00% |
| 2 | Dara Chan | DC | Child | Contingent Beneficiary | 12.50% |

Count label: "2 total entries"

**Expected rendering — any other property:** Empty state "No beneficiaries have been assigned to this property yet." · Count: "0 total entries"

```bash
# Confirm all 3 successors
node -e "
['SUCC-0001','SUCC-0002','SUCC-0003'].forEach(id => {
  const s = require('./public/data/users/demo-user/successors/' + id + '/core.json');
  console.log(s.id, s.name, '| role:', s.role, '| share:', s.share, '| initials:', s.initials);
});"

# Confirm SPA assignments
node -e "
['SPA-0001','SPA-0002','SPA-0003','SPA-0004','SPA-0005'].forEach(id => {
  const a = require('./public/data/users/demo-user/successor-property-assignments/' + id + '/core.json');
  console.log(a.id, ':', a.successorId, '->', a.propertyId);
});"
```

## §4 — Findings

> All 5 direct-read fields are correctly sourced and filtered per selected property. Per-property scoping (PF5) resolved by `assignmentsByProperty` map.

**0 findings.** Page-level findings PF5 and PF6 cited here for completeness:
- **PF5 resolved:** per-property scoping now correct via `assignmentsByProperty` + `propertyIds` on each `Successor`.
- **PF6 deferred:** `getCurrentUserId()` shim — auth-shim boundary applies to `db.successors.list(userId)` call in `queries.ts:146`.

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-07
- Post-wiring audit of rows 14–18 (+ row 13). All fields WIRED. 0 findings. PF5 resolved; PF6 deferred.

</details>
