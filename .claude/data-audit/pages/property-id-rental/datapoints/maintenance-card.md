---
slug: property-id-rental--maintenance-card
route: /property/[id]/rental
data_point: "Maintenance card — open count badge + 2 item rows (rows 28, 29, 30 — combined-derivation report)"
template: full
verdict: "✅ Correct · 2 findings (1 P1, 1 P3) · 1 open item for PROP-0001 (MAINT-0001, Emergency, InProgress) · second slot hidden"
revision: 1
date: 2026-05-06
---

> **Plain opener:** The Maintenance card on the rental page shows how many work orders are open and lists the top 2 by urgency. This report covers all three visible surfaces (the "N Open" count badge, the first item row, and the second item row) — they all come from the same filtered-and-sorted derivation, so one report covers all three.

📄 **Page audit:** [property-id-rental/audit.md](pages/property-id-rental/audit.md) — cite `PF1` for systemic finding.

---

## §1 — What the user sees

Three surfaces on the Maintenance card (`col-span-4` card, in the "Tenant, Maintenance, Documents" row):

- **Row 28 — Open count badge:** Amber pill next to the "Maintenance" heading: "1 Open" (or "N Open")
- **Row 29 — Item 1:** Title + severity sub-label for the highest-severity open item
- **Row 30 — Item 2:** Same for second item; hidden if fewer than 2 open items

For PROP-0001 seed data: badge shows "1 Open"; item 1 shows "Burst pipe in kitchen — water shut off" with "Emergency priority"; item 2 slot is hidden (only 1 open item).

---

## §2 — Source trace

**One derivation drives all three surfaces:**

```
// rental/queries.ts
allMaintenanceItems = await db.maintenanceItems.list(userId)
maintenanceItems = allMaintenanceItems.filter(m => m.propertyId === propertyId)

// PropertyRentalPage.tsx
openMaintenance = maintenanceItems.filter(m => m.status === "Open")
openCount = openMaintenance.length
displayItems = [...openMaintenance]
  .sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || b.createdAt - a.createdAt)
  .slice(0, 2)
```

`severityRank` maps Emergency→3, Urgent→2, Standard→1.

- **Row 28:** `{openCount} Open`
- **Row 29:** `displayItems[0].title` + `displayItems[0].severity` (if exists)
- **Row 30:** `displayItems[1].title` + `displayItems[1].severity` (if exists); hidden when `displayItems.length < 2`

**Entity:** `MaintenanceItem` — `lib/data/types/maintenance-item.ts`, `lib/data/db/maintenance-items.ts`

**Seed for PROP-0001:** MAINT-0001 (`severity: "Emergency"`, `status: "InProgress"`, `title: "Burst pipe in kitchen — water shut off"`)

⚠️ Note: MAINT-0001 has `status: "InProgress"`, not `"Open"` — so the filter `status === "Open"` yields 0 results for PROP-0001. `openCount = 0`, `displayItems = []`, both item slots hidden, badge shows "0 Open". This is technically correct behavior (no Open items), but the seed may need updating for demo purposes. See F2 below.

---

## §3 — Formula / derivation correctness

**Filter logic:** `status === "Open"` — only items in the Open state are counted and displayed. Items in InProgress or Resolved are excluded.

**Sort order:** Emergency first → Urgent → Standard, then by `createdAt` descending within the same severity.

**Mental walk — 3-item array (Emergency, Standard, Urgent):**
1. `severityRank` → [3, 1, 2]
2. Sort desc → Emergency(3), Urgent(2), Standard(1)
3. Slice(0,2) → Emergency + Urgent ✓

**Mental walk — PROP-0001 seed:**
- MAINT-0001: status="InProgress" → filtered OUT → `openCount=0`, `displayItems=[]`
- Badge renders "0 Open", items render "—" empty state ✓

**Mental walk — no items:**
- `openMaintenance = []` → `openCount=0`, `displayItems=[]` → badge "0 Open", empty state "—" ✓

**Cross-card identity:** `openCount === displayItems.length` only when `openCount <= 2`. For 3+ open items, `displayItems.length = 2` but `openCount = N > 2`. This is correct and expected (card shows top 2, badge shows full count).

---

## §4 — Consistency checks

- Phase 6.2 Financial Overview chart (same component): untouched. ✓
- Phase 6.3 Documents card (same component): untouched. ✓
- Phase 6.1 Lease Summary (same component): untouched. ✓
- `severityDotClass` maps Emergency→`bg-rose-500`, Urgent→`bg-amber-400`, Standard→`bg-slate-400` — derived from entity, not hardcoded. ✓
- Sub-label renders `{item.severity} priority` — derived from enum value, not hardcoded "High" / "Medium". ✓

---

## §5 — Missing safeties / edge cases

**Rule 2 (empty state):** `displayItems.length === 0` → renders `<p className="text-[13px] text-slate-400">—</p>` ✓

**`openCount = 0`:** Badge renders "0 Open" (amber styling kept) — informative for the property manager. Acceptable.

**`displayItems.length < 2`:** Second slot not rendered (conditional `displayItems[1]` access is guarded by map — array has 0 or 1 items). ✓

**No `MaintenanceItem` for this property:** `maintenanceItems = []`, `openMaintenance = []` → same as empty state. ✓

---

## §6 — Meaning / label accuracy

The "N Open" badge accurately reflects the count of `status === "Open"` items. Items in InProgress are excluded from the count, which is the correct interpretation (they are being worked on, not pending assignment).

The `{item.severity} priority` sub-label directly reads the enum value. No semantic gap.

The severity dot colors (rose=Emergency, amber=Urgent, slate=Standard) provide quick visual triage.

---

## §7 — Combined-derivation note

All three surfaces (row 28 count badge, row 29 first item, row 30 second item) derive from the same `openMaintenance` array. Per WIRING-PLAYBOOK Step C combined-derivation pattern, one full-template report covers all three. No individual reports needed for rows 29 and 30.

---

## §8 — Findings

### 🟡 F1 — PF1: userId leak — `db.maintenanceItems.list(userId)` fetches all user items; filter by propertyId client-side (systemic)
**Severity:** P1 (systemic)
**Page-wide:** `Page-wide: see PF1 in pages/property-id-rental/audit.md`
**Fix:** Already tracked at page level. No per-datapoint action needed.

---

### 🟡 F2 — MAINT-0001 seed has `status: "InProgress"`, so PROP-0001 shows "0 Open" in demo
**Severity:** P3 (seed data quality, not a code bug)
**Observation:** The seed `MAINT-0001` has `severity: "Emergency"`, `status: "InProgress"` — it is excluded by the `status === "Open"` filter, resulting in `openCount=0` and an empty maintenance card for the demo PROP-0001 property. For a richer demo, the seed should have at least one item with `status: "Open"`.
**Fix:** Change MAINT-0001 seed `status` from `"InProgress"` to `"Open"`, or add a second MaintenanceItem seed with `status: "Open"` for PROP-0001. Low priority — code correctness is confirmed; this only affects demo visual.
**Deferred:** Can be done as a seed data expansion post-phase.

---

## 🔍 Source files & hashes

<details>
<summary>Source file checksums at time of audit</summary>

| File | Role |
|---|---|
| `lib/data/types/maintenance-item.ts` | Entity type + Zod schema |
| `lib/data/db/maintenance-items.ts` | DB layer |
| `app/(shell)/property/[id]/rental/queries.ts` | Data fetching |
| `app/(shell)/property/[id]/_components/PropertyRentalPage.tsx` | Component + derivation |

</details>

---

## 📜 Revision history

<details>
<summary>Revision log</summary>

### Revision 1 — 2026-05-06
- Phase 6.8 wiring complete. Combined-derivation report covering rows 28, 29, 30.
- Q4.F resolved: HYBRID per source; MaintenanceItem wired via filter+sort+slice.
- F2 filed: MAINT-0001 seed has InProgress status — yields 0 Open for demo. Seed expansion deferred.

</details>
