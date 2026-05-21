---
slug: estate-planning--property-status-panel
route: /estate-planning
data_point: "Property status panel — panel header (row 10) + status bar (row 12): property name, last updated, status title, progress label, progress bar"
verdict: "✅ Both rows WIRED — property name + lastUpdatedLabel from DB; status bar from derived property.status + completionPct · 0 findings"
revision: 1
date: 2026-05-07
template: full
---

# Audit — Property status panel (header + status bar)
_Route: /estate-planning — rows 10, 12_
_Last revised: 2026-05-07 · Revision 1_

## §1 — What these surfaces show

> The right panel header identifies which property is being viewed and when the estate plan was last updated. Below the action buttons, a status bar shows the estate plan status title (e.g. "Plan Finalized", "Pending Review") with a coloured icon, plus a progress label (e.g. "75.0% Complete") and a coloured progress bar. Both surfaces are driven by the currently selected property.

| Inventory row | Element | Class |
|---|---|---|
| 10 | Panel header — property name + "Last updated: DATE" | WIRED |
| 12 | Status bar — status title, icon, progress label, progress bar | WIRED |

## §2 — Where the value comes from

**Row 10 — Panel header:**
- `property.name` — direct read from `EstateProperty.name` ← `dbProperty.name`
- `property.lastUpdatedLabel` — formatted date string from `queries.ts:218-221`:
  ```typescript
  const lastUpdatedAt = propertyEvents.length
    ? Math.max(...propertyEvents.map((e) => e.createdAt))
    : property.updatedAt;
  // ...
  lastUpdatedLabel: formatDate(lastUpdatedAt)
  ```
  The last-updated timestamp uses the most recent activity event for that property, falling back to `property.updatedAt` if no activity events exist.

**Row 12 — Status bar:**
- `statusPanel = statusPanelConfig[property.status]` (`SuccessionPage.tsx:260-289`):
  ```typescript
  const statusPanelConfig = {
    complete: { title: "Plan Finalized",   icon: <CheckCircle2 green>, ... },
    pending:  { title: "Pending Review",   icon: <AlertTriangle amber>, ... },
    action:   { title: "Action Required",  icon: <AlertTriangle red>, ... },
    draft:    { title: "Draft Plan",       icon: <FileText grey>, ... },
  };
  ```
- `progressLabel`: `property.completionPct >= 100 ? "100% Finalized" : "${property.completionPct.toFixed(1)}% Complete"` (`SuccessionPage.tsx:290-293`)
- Progress bar width: `style={{ width: '${property.completionPct}%' }}` (`SuccessionPage.tsx:505-507`)

## §3 — Formula / derivation

Both rows derive from `EstateProperty` which is built in `queries.ts:200-259`:

1. `completionPct` — per-property 4-check rubric (see `estate-planning--stats-kpis` §3)
2. `status = deriveStatus(completionPct)` — threshold function:
   - `completionPct >= 100` → `"complete"` → "Plan Finalized"
   - `completionPct >= 60` → `"pending"` → "Pending Review"
   - `completionPct >= 30` → `"action"` → "Action Required"
   - else → `"draft"` → "Draft Plan"
3. `lastUpdatedLabel` — max event timestamp or property.updatedAt → `formatDate()` → `"May 3, 2026"` format

## §4 — Consistency check

**Status title ↔ status badge (row 8):** Both use `property.status`. The card badge label (`propertyStatusConfig[property.status].label`) and the panel status title (`statusPanel.title`) are derived from the same value — always consistent.

**Progress bar ↔ progress label:** `progressLabel` and bar width both use `property.completionPct` — always consistent.

**Last updated ↔ activity events:** The last-updated date reflects the most recent `EstateActivityEvent.createdAt` for the property. When a new beneficiary is added via `addSuccessorAndAssign`, a new `EstateActivityEvent` is created — so the panel updates automatically on next page load.

**Panel re-key on selection change:** Both panel header and body are keyed with `key={'ph-${selectedProperty}'}` and `key={'pb-${selectedProperty}'}` respectively — they re-render (with fade animation) when the selected property changes.

## §5 — Missing safeties

**`property` undefined:** Handled at `SuccessionPage.tsx:247-258` — empty state shown before the panel renders. `statusPanelConfig[property.status]` can never receive `undefined` if the empty-state guard is in place.

**`completionPct` out of range:** `Math.round((passed / 4) * 1000) / 10` produces values in `[0, 100]`. `passed` is bounded by `checks.length = 4`. No overflow possible.

**`property.updatedAt` undefined:** If `updatedAt` is missing from the property seed (unlikely given Zod schema), `formatDate(undefined)` would produce "Invalid Date". The Zod schema for `Property` requires `updatedAt: z.number()`. Safe in practice.

## §6 — Meaning of the value

The "last updated" date tells the property owner when any estate plan activity last occurred on this property — not when the property record itself was last changed. This is more meaningful in the estate planning context: it reflects the most recent legal or beneficiary action, not a metadata edit.

The status title ("Plan Finalized" / "Pending Review" / etc.) is a high-level health indicator. In the current seed: PROP-0001 and PROP-0011 both sit at 75% ("Pending Review") because the single primary beneficiary (Sophea Chan) holds 75% — not 100% — of the primary share. Adding a second primary beneficiary with 25% share would push the balance to 100% and upgrade the status to "Plan Finalized" (100%).

## §7 — Seed verification

**PROP-0001 expected panel state:**
- Property name: see `PROP-0001/core.json` → `property.name`
- Last updated: `max(EACT-0001.createdAt, EACT-0002.createdAt)` = `max(1778165100000, 1778062500000)` = 1778165100000 = 2026-05-04 (UTC) → `formatDate`: "May 4, 2026"
- `completionPct`: 75.0%
- `status`: `"pending"` (75 ≥ 60 but < 100)
- Status title: "Pending Review" with amber `<AlertTriangle>`
- Progress label: "75.0% Complete"
- Progress bar width: `"75%"`

**PROP-0011 expected panel state:**
- Last updated: `EACT-0003.createdAt` = 1776159000000 → "Apr 12, 2026"
- `completionPct`: 75.0%
- Status title: "Pending Review"
- Progress label: "75.0% Complete"

**Fallback properties (no activity events):**
- Last updated: `property.updatedAt` from seed record
- `completionPct`: 0%
- Status title: "Draft Plan"
- Progress label: "0.0% Complete"
- Progress bar width: `"0%"` (effectively invisible)

```bash
# Confirm EACT timestamps to validate last-updated calculation
node -e "
const events = ['EACT-0001','EACT-0002','EACT-0003'].map(id =>
  require('./public/data/users/demo-user/estate-activity-events/' + id + '/core.json'));
events.forEach(e => console.log(e.id, '| property:', e.propertyId, '| createdAt:', new Date(e.createdAt).toISOString()));"
```

## §8 — Findings

> Panel header and status bar both correctly sourced from DB derivations. 0 findings.

**0 findings.** PF6 deferred (auth shim applies to the 5 DB calls in `queries.ts`).

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-07
- Post-wiring audit of rows 10 and 12. Both WIRED. 0 findings. Last-updated derivation from activity events documented.

</details>
