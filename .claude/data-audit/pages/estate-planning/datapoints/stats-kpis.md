---
slug: estate-planning--stats-kpis
route: /estate-planning
data_point: "Stats KPI cards (rows 4–7): Plan Completion, Pending Reviews, Assigned Beneficiaries, Estate Documents"
verdict: "✅ All 4 KPIs WIRED · Q3.R resolved — 4-check rubric + pending formula defined · 1 P3 grammatical nit (beneficiaries sub-label plural)"
revision: 1
date: 2026-05-07
template: full
---

# Audit — Stats KPI cards
_Route: /estate-planning — rows 4, 5, 6, 7_
_Last revised: 2026-05-07 · Revision 1_

## §1 — What these surfaces show

> Four stat cards at the top of the page summarise the estate planning health of the whole portfolio. "Plan Completion" shows a percentage with a progress bar indicating what fraction of the 4-check rubric is met on average. "Pending Reviews" counts the total number of unresolved items (unbalanced primary shares + missing estate docs + unverified beneficiaries). "Assigned Beneficiaries" counts beneficiaries with at least one property assignment and flags any still unverified. "Estate Documents" shows the total count of documents categorised as estate-related.

| Inventory row | KPI card | Class |
|---|---|---|
| 4 | Plan Completion — value + progress bar | WIRED |
| 5 | Pending Reviews — value + sub-label | WIRED |
| 6 | Assigned Beneficiaries — value + sub-label | WIRED |
| 7 | Estate Documents — value + sub-label | WIRED |

## §2 — Where the value comes from

All 4 values are computed in `getEstatePlanningPageData()` (`queries.ts:141`) after `Promise.all` over 5 DB sources (`queries.ts:143-150`).

**Row 4 — Plan Completion:**
```typescript
// queries.ts:296-303
const portfolioCompletion =
  propertyMetrics.length === 0
    ? 0
    : Math.round(
        (propertyMetrics.reduce((sum, m) => sum + m.completionPct, 0) /
          propertyMetrics.length) * 10,
      ) / 10;
```
`stats[0].progress = portfolioCompletion` drives the progress bar width.

**Row 5 — Pending Reviews:**
```typescript
// queries.ts:304-307
const pendingReviews =
  propertyMetrics.filter((m) => !m.hasPrimaryShareBalance).length +
  propertyMetrics.filter((m) => !m.hasEstateDoc).length +
  propertyMetrics.reduce((sum, m) => sum + m.unverifiedCount, 0);
```

**Row 6 — Assigned Beneficiaries:**
```typescript
// queries.ts:309-312
const assignedSuccessorCount = estateSuccessors.filter(
  (s) => s.propertyIds.length > 0,
).length;
const unverifiedCount = estateSuccessors.filter((s) => !s.verified).length;
```

**Row 7 — Estate Documents:**
```typescript
// queries.ts:272-280
const estateDocsRaw = documentsRaw.filter(
  (doc) => doc.kind === "document" && (doc.category ?? "").toLowerCase() === "estate",
);
// ...
stats[3].value = String(estateDocuments.length); // estateDocuments.length = estateDocsRaw.length
```

## §3 — Formula / derivation

**Per-property rubric** (applied at `queries.ts:200-232` for each active property):

| Check | Field | Condition |
|---|---|---|
| `hasAssignedSuccessor` | `assignedSuccessors.length > 0` | ≥1 successor linked via SPA |
| `hasPrimaryShareBalance` | `Math.abs(primaryShareTotal - 100) < 0.001` | Primary shares sum exactly 100% |
| `hasEstateDoc` | `estateDocsByProperty.get(propertyId).length > 0` | ≥1 Document with `category="estate"` |
| `hasActivity` | `activityByProperty.get(propertyId).length > 0` | ≥1 EstateActivityEvent |

`completionPct = Math.round((passed / 4) * 1000) / 10` (e.g. 3/4 = 75.0%)

**Pending Reviews formula:**
= (# properties where primary share ≠ 100%) + (# properties with no estate doc) + (# unverified successors with any assignment)

**Note on "Plan Completion" semantics:** The formula is not "% of portfolio with a complete estate plan" but "average completion percentage across all active properties." A portfolio with 1 out of 16 properties at 75% will show ~4.7%, which reads as very low. This is intentional — it reflects total estate planning coverage pressure across the portfolio.

## §4 — Consistency check

**KPI label changes** from Rev 1 to Rev 2 wiring:
- Row 6: "Named Beneficiaries" → "Assigned Beneficiaries" (label more accurate — counts successors with assignments, not all successors named in the DB)
- Row 7: "Protected Documents" → "Estate Documents" (label more accurate — counts by category, no encryption claim)
- Sub-label for row 7: "All encrypted & backed up" → "Secured by Valgate" (PF3 softened)

**Sub-label variants:**
- Row 4 (`subVariant: "neutral"`): `"N of M properties have assigned beneficiaries"` — plain text
- Row 5 (`subVariant: "danger"`): `"Missing docs, share balance, or verification"` — red warning with `<AlertTriangle>` icon
- Row 6 (`subVariant: "neutral"`): `"N beneficiaries still unverified"` (when `unverifiedCount > 0`) or `"All assigned beneficiaries are verified"` — conditional
- Row 7 (`subVariant: "primary"`): `"Secured by Valgate"` — primary blue with `<Lock>` icon

## §5 — Missing safeties

**`propertyMetrics.length === 0` guard:** Present at `queries.ts:296-298` — returns `0` instead of dividing by zero.

**`assignedSuccessorCount` zero case:** `estateSuccessors.filter(...)` over empty array returns `[]` cleanly; `length = 0` renders as `"0"`.

**KPI progress bar:** `stat.progress !== null` guard at `SuccessionPage.tsx:105`. Only row 4 sets `progress`; rows 5–7 set `progress: null` — no bar rendered.

## §6 — Meaning of the value

**Plan Completion %:** Average completion of the 4-check rubric across all active properties (not only properties with estate plans). A score of 9.4% (from seed: 2 properties at 75%, 14 at 0%) indicates most properties have no estate plan setup yet. This is the expected state for an early-stage portfolio.

**Pending Reviews:** Additive count — not a unique count of properties. The same property can contribute to multiple categories (e.g. PROP-0001 contributes +1 to `!hasPrimaryShareBalance` and +1 to `unverifiedCount` for a total of +2 reviews).

**Assigned Beneficiaries:** Counts distinct successors who are linked to at least one property. A successor unlinked from any property does not count.

## §7 — Seed verification

**Active properties:** 16 (all PROP-0001–PROP-0016 have status Rented/Vacant; none archived/sold)

**Properties with estate plan data:**
- PROP-0001: 3 successors (SPA-0001/0002/0003), 1 estate doc (DOC-0009), 2 activity events (EACT-0001/0002)
- PROP-0011: 2 successors (SPA-0004/0005), 1 estate doc (DOC-0010), 1 activity event (EACT-0003)

**Per-property rubric results:**

| Property | hasSuccessor | hasPrimaryBalance (75% ≠ 100%) | hasEstateDoc | hasActivity | completionPct |
|---|---|---|---|---|---|
| PROP-0001 | ✅ | ❌ | ✅ | ✅ | 75.0% |
| PROP-0011 | ✅ | ❌ | ✅ | ✅ | 75.0% |
| PROP-0002–0010, 0012–0016 (14) | ❌ | ❌ | ❌ | ❌ | 0.0% |

**Expected KPI values with seed:**
- **Plan Completion:** `Math.round((75 + 75 + 0×14) / 16 × 10) / 10` = `Math.round(93.75) / 10` = **9.4%**
- **Progress bar:** 9.4% width
- **Plan Completion sub-label:** "2 of 16 properties have assigned beneficiaries"
- **Pending Reviews:** `16 (!hasPrimaryBalance) + 14 (!hasEstateDoc) + 1 (unverified SUCC-0003 on PROP-0001)` = **31**
- **Assigned Beneficiaries:** 3 (SUCC-0001, SUCC-0002, SUCC-0003 all have propertyIds.length > 0)
- **Assigned Beneficiaries sub-label:** `"1 beneficiaries still unverified"` (SUCC-0003)
- **Estate Documents:** **2** (DOC-0009 + DOC-0010)

```bash
# Verify estate document count
node -e "
const docs = ['DOC-0009','DOC-0010'].map(id =>
  require('./public/data/users/demo-user/documents/' + id + '/core.json'));
docs.forEach(d => console.log(d.id, d.name, '| category:', d.category, '| property:', d.propertyId));"

# Verify SPA assignments exist for 2 properties
node -e "
const spas = ['SPA-0001','SPA-0002','SPA-0003','SPA-0004','SPA-0005'].map(id =>
  require('./public/data/users/demo-user/successor-property-assignments/' + id + '/core.json'));
const byProp = {};
spas.forEach(a => { if (!byProp[a.propertyId]) byProp[a.propertyId] = []; byProp[a.propertyId].push(a.successorId); });
console.log(JSON.stringify(byProp, null, 2));"
```

## §8 — Findings

> All 4 KPI values are correctly derived from DB data. Q3.R (estate KPI formulas) resolved via 4-check rubric. 1 P3 nit.

---

### 🔵 F1 — "1 beneficiaries still unverified" — plural form used for singular count
**P3 nit · confidence: high · `[semantic]`**

**Where:** `queries.ts:335-338` — sub-label interpolation:
```typescript
sub: unverifiedCount > 0
  ? `${unverifiedCount} beneficiaries still unverified`
  : "All assigned beneficiaries are verified",
```

**Problem:** With `unverifiedCount = 1`, the sub-label reads "1 beneficiaries still unverified" — grammatically incorrect ("1 beneficiary").

**Fix:** `unverifiedCount === 1 ? "1 beneficiary still unverified" : "${unverifiedCount} beneficiaries still unverified"`.

**Estimated effort:** 1 line change in `queries.ts`.

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-07
- Post-wiring audit. All 4 KPIs WIRED. Q3.R resolved. 1 P3 nit (plural form for singular unverified count).

</details>
