---
slug: estate-planning--property-cards
route: /estate-planning
data_point: "Property list cards (row 8) — name, address, status badge, initials avatar per property card"
verdict: "✅ WIRED — properties from DB; status badge derived from 4-check rubric; filter select functional · 1 P3 nit (up to 6 cards shown; additional properties not visible without scroll)"
revision: 1
date: 2026-05-07
template: full
---

# Audit — Property list cards
_Route: /estate-planning — row 8_
_Last revised: 2026-05-07 · Revision 1_

## §1 — What this surface shows

> The left column of the estate planning panel shows a list of property cards. Each card displays the property name, address, a derived status badge (Complete / In Review / Action Required / Drafted), and a colour-coded initials avatar. Clicking a card makes it active and changes the right panel to show that property's estate plan details (beneficiary table, documents, timeline).

**Inventory row:** 8
**Classification:** HARDCODED (Rev 1) → WIRED (Rev 2)
**Prior state:** 4 hardcoded property objects in `queries.ts`; no relation to `Property` entity.
**Current state:** `estateProperties` derived from `db.properties.list(userId)` filtered to active properties.

## §2 — Where the value comes from

**Data path:** `queries.ts:141` → `db.properties.list(userId)` at `queries.ts:145`:
```typescript
const properties = propertiesRaw
  .filter((p) => !p.isArchived && p.status !== "Sold" && p.status !== "Archived")
  .sort((a, b) => a.name.localeCompare(b.name));
```

**Selection logic** (`queries.ts:234-248`): Properties are prioritised by presence of estate plan data:
```typescript
const topPropertyIds = new Set([
  ...effectiveAssignments.map((a) => a.propertyId),
  ...estateDocsRaw.map((d) => d.propertyId),
  ...activityRaw.map((e) => e.propertyId).filter(Boolean),
]);
const selectedMetrics = propertyMetrics
  .filter((m) => topPropertyIds.has(m.property.id))
  .slice(0, 6);
const fallbackMetrics = propertyMetrics
  .filter((m) => !topPropertyIds.has(m.property.id))
  .slice(0, Math.max(0, 4 - selectedMetrics.length));
const displayedMetrics = [...selectedMetrics, ...fallbackMetrics];
```

Properties with any estate plan data (assignments, docs, or activity) are shown first (up to 6). If fewer than 4 total, fallback properties from the remaining active pool fill to 4.

## §3 — Formula / derivation

**Status badge derivation** (`queries.ts:120-125`):
```typescript
function deriveStatus(completionPct: number): PropertyStatus {
  if (completionPct >= 100) return "complete";  // → "Complete"
  if (completionPct >= 60)  return "pending";   // → "In Review"
  if (completionPct >= 30)  return "action";    // → "Action Required"
  return "draft";                               // → "Drafted"
}
```
`completionPct` is the same 4-check rubric used for the Plan Completion KPI (see `estate-planning--stats-kpis`).

**Address** (`queries.ts:127-131`):
```typescript
function buildAddress(property): string {
  const parts = [property.addressLine, property.city, property.province].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  return property.province || "Address unavailable";
}
```

**Initials avatar:** `initials(property.name)` — first letter of first word + first letter of last word, uppercased.

**Color swatch:** `COLOR_SWATCHES[index % COLOR_SWATCHES.length]` — 6 pastel swatches cycling by display order.

## §4 — Consistency check

**Status badge ↔ status bar:** The active property card's status badge and the right panel's status bar (`statusPanel = statusPanelConfig[property.status]`) derive from the same `property.status` value — they are always consistent.

**Filter select ↔ card list:** `filteredProperties = statusFilter === "all" ? properties : properties.filter(p => p.status === statusFilter)`. Selecting "Complete" filters cards to only those with `status === "complete"`. Changing filter resets `selectedProperty` to 0, preventing out-of-bounds index on a shorter list.

**Safe index guard** (`SuccessionPage.tsx:225`): `const safeSelectedProperty = Math.min(selectedProperty, Math.max(propertyCount - 1, 0))` — prevents crashes when filter narrows the list.

## §5 — Missing safeties

**No properties at all (`properties.length === 0`):** Handled at `SuccessionPage.tsx:247-258` — renders an empty state "No properties are available for estate planning yet." before the main layout.

**All properties filtered out:** `filteredProperties` can be empty. `propertyCount = 0`. `safeSelectedProperty = 0`. `property = filteredProperties[0] ?? properties[0]` — falls back to first unfiltered property. The panel still shows something; no crash.

## §6 — Meaning of the value

Status thresholds (100% / 60% / 30%) are a product-defined rubric for estate plan health. "In Review" (60–99%) means most checks pass but at least one is incomplete. "Action Required" (30–59%) means critical elements are missing. "Drafted" (0–29%) means the plan is essentially empty. With the current seed data, all covered properties are at 75% ("In Review") because the primary share sum is 75% (not 100%) — the single failing check.

## §7 — Seed verification

**Active properties in seed:** 16 (PROP-0001–0016; none sold or archived)

**Properties with estate plan data (topPropertyIds):**
- PROP-0001: 3 assignments + 1 doc + 2 events → `completionPct = 75%` → status = "pending" → badge "In Review"
- PROP-0011: 2 assignments + 1 doc + 1 event → `completionPct = 75%` → status = "pending" → badge "In Review"

`selectedMetrics` = [PROP-0001, PROP-0011] (both have estate data; order = alphabetical by property name)
`fallbackMetrics`: up to `max(0, 4 - 2) = 2` additional properties from remaining 14

**Expected: 4 property cards shown** (PROP-0001, PROP-0011 + 2 fallback from the sorted active list)

**Filter select default:** "All" — all 4 displayed cards visible.

```bash
# Confirm active property count
node -e "
const fs = require('fs');
const props = fs.readdirSync('./public/data/users/demo-user/properties/')
  .map(id => JSON.parse(fs.readFileSync('./public/data/users/demo-user/properties/' + id + '/core.json')));
const active = props.filter(p => !p.isArchived && p.status !== 'Sold' && p.status !== 'Archived');
console.log('Total:', props.length, '| Active:', active.length);"

# Confirm PROP-0001 and PROP-0011 have estate data
echo "SPAs for PROP-0001 + PROP-0011:"
node -e "
['SPA-0001','SPA-0002','SPA-0003','SPA-0004','SPA-0005'].forEach(id => {
  const a = require('./public/data/users/demo-user/successor-property-assignments/' + id + '/core.json');
  console.log(a.propertyId, '<- successorId:', a.successorId);
});"
```

## §8 — Findings

> Property cards are correctly sourced from DB. Status badges correctly derived from rubric. Filter select functional. 1 P3 nit.

---

### 🔵 F1 — Display cap of 6 estate-plan properties + up to 2 fallbacks — no scroll, no indication that more properties exist
**P3 nit · confidence: medium · `[negative-space]`**

**Where:** `queries.ts:242-248` — `selectedMetrics.slice(0, 6)` + `fallbackMetrics.slice(0, max(0, 4 - selectedMetrics.length))`.

**Problem:** As the estate plan grows beyond 6 properties with data, only the first 6 (alphabetically among topPropertyIds) appear. The remaining properties with estate plans are silently omitted. No "Show more" affordance or indication that the list is truncated.

**Fix:** Add a "View all N properties" link below the list, or paginate the left column. Low priority while the portfolio has ≤16 properties and estate plans cover only 2.

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-07
- Post-wiring audit of row 8. Q4.V and EstatePlan derivation resolved. 1 P3 nit (display cap, no pagination).

</details>
