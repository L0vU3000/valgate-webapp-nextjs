---
slug: property-id-location--development-potential
data_point: "FullView KPI card — Development Potential bullet list"
route: /property/[id]/location
revision: 1
date: 2026-05-06
verdict: "✅ Correct · 2 findings (1 P1, 1 P3)"
---

# Audit — Development Potential on /property/[id]/location
_Last revised: 2026-05-06 · Revision 1_

## TL;DR
- ✅ Value is correct — displays "Residential Subdivision" and "Up to 6 units" bullets (LP-0001 seed) against expected seed values
- ✅ Empty-state correct — when `developmentPotential` is null/undefined or empty array, bullet section is hidden entirely (not a `"—"` placeholder — cleaner for a list)
- ⚠️ 2 findings · 1 P1 (LandParcel[] prop ships userId to browser) · 1 P3 (first bullet "Development Potential" is a static label rendered as a p tag, may look like a data bullet)
- 🔧 Top fix: narrow `LandParcel[]` prop (F1, systemic)
- 📄 Page audit: see [pages/property-id-location/audit.md](pages/property-id-location/audit.md)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What is this number, where does it come from? | — |
| 2 | Entity | Is the data well-organised? | ✅ |
| 3 | Formula | Does the math match the label? | ✅ |
| 4 | Render | How does the value reach the user? | ⚠️ |
| 5 | Consistency | Do related numbers agree? | ✅ |
| 6 | Missing safeties | What should exist but doesn't? | 1 gap |
| 7 | Meaning | Does the label promise what the math delivers? | ✅ |
| 8 | Findings | What to fix | 2 items |
| 9 | Fix Log | What has been fixed since the initial audit? | — |

## Glossary
- **PFn** — Page-wide finding filed in the page audit; cited here instead of restated.
- **developmentPotential** — `string[]` on `LandParcel`; use-type bullets describing what the land is permitted to become under current zoning rules.

---

## 1. Snapshot — ✅

> **Plain opener:** This section shows the permitted uses for the land parcel as a bullet list — for example "Residential Subdivision" and "Up to 6 units". These come directly from the `developmentPotential` field on the LandParcel record, which stores an array of plain-English strings.

| | |
|---|---|
| Where | `/property/[id]/location`, FullView Current Zoning KPI card (second card), below the badge |
| Label | "Development Potential" (static label) followed by bullets from array |
| Main formula | `parcel.developmentPotential.map(b => <p key={b}>{b}</p>)` |
| Reads from | `public/data/users/demo-user/land-parcels/LP-0001/core.json` — `developmentPotential` field |
| Canonical home | server (passed as part of `landParcels` prop) |
| Edge cases | `undefined` or `[]` → entire section hidden (no bullets rendered) · `parcel === null` → entire Zoning card shows `"—"` |

## 2. Entity — ✅

> **Plain opener:** `developmentPotential` is a plain string array — flexible enough for any number of use-type bullets without needing a closed enum, because zoning categories are jurisdiction-specific.

| Field | Type | Notes |
|---|---|---|
| `developmentPotential` | `z.array(z.string()).optional()` | strings, not a closed enum — see Q4.R resolution notes |

Design choice: kept as `string[]` rather than a closed enum. Zoning descriptions are jurisdiction-specific; a closed taxonomy would require country-specific data. A future Q5.x can re-evaluate if patterns emerge.

## 3. Formula — ✅

> **Plain opener:** No arithmetic here — it's a direct list render. Each string in the array becomes a paragraph element, with a static "Development Potential" label above. The only logic is the empty-state guard.

```
parcel?.developmentPotential != null && parcel.developmentPotential.length > 0
  → render label + map(bullets)
  else → render nothing
```

Renders with LP-0001 seed: ["Residential Subdivision", "Up to 6 units"] → 2 bullets ✅
Renders with LP-0002 seed (no `developmentPotential`): hidden ✅

## 4. Render — ⚠️

> **Plain opener:** The bullets render correctly. The same issue as every other LandParcel surface: `userId` rides along in the prop.

| Step | Mechanism | Notes |
|---|---|---|
| Server fetch | `db.landParcels.list(userId)` | filtered by propertyId |
| Prop | `landParcels: LandParcel[]` | includes `userId` (F1) |
| Component pick | `const parcel = landParcels[0] ?? null` | null-safe |
| Display | conditional render with `.map()` | correct — hides section if absent |

## 5. Consistency — ✅

> **Plain opener:** The same `parcel.developmentPotential` array feeds both the FullView card (row 16) and the ExpandedView Zoning tab (row 25). They read the same prop so they can never diverge.

FullView (row 16) and ExpandedView Zoning tab (row 25) both render `parcel.developmentPotential` using the same map pattern from the same `parcel` variable.

## 6. Missing safeties — 1 gap

- F1: `userId` in prop (P1, systemic — same as every LandParcel surface).

The empty-array guard (`parcel.developmentPotential.length > 0`) prevents accidental render of a label with no bullets. The `parcel === null` guard on the parent card prevents crash when no parcel exists.

## 7. Meaning — ✅

> **Plain opener:** "Development Potential" is the correct label for zoning use-type bullets — it describes what the land is permitted to become. The bullets come directly from the `developmentPotential` field without transformation, so they carry exactly the meaning stored in the record.

No "compared to" or "% of" language adjacent to this section. The static label "Development Potential" is a UI header, not a data bullet — it could be confused for a bullet on small screens (F2, P3), but it's styled differently.

## 8. Findings

### 🔴 F1 — userId travels to browser in LandParcel[] prop
_Systemic — see PF1 in [pages/property-id-location/audit.md](pages/property-id-location/audit.md)_

**Severity:** P1
**Fix:** Narrow the prop type server-side to `Omit<LandParcel, "userId">[]`.

### 🟡 F2 — "Development Potential" static label could be mistaken for a data bullet
**Severity:** P3
**Where:** FullView Current Zoning card — the static header `<p>Development Potential</p>` uses the same `text-xs text-slate-500` class as the data bullets below it.
**Problem:** Visually, the header looks like the first bullet. A user with only one development use could interpret "Development Potential" as the use itself.
**Fix:** Use a distinct label style (e.g. `font-semibold` or a subtle separator) to visually separate the header from the bullets.

## 9. Fix Log

_No fixes recorded yet._

<details>
<summary>📜 Revision history</summary>

| Rev | Date | Summary |
|---|---|---|
| 1 | 2026-05-06 | Initial audit — Phase 6.4 wiring complete |

</details>
