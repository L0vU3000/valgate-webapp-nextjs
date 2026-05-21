---
slug: analytics--occupancy-card
data_point: "Occupancy card — headline value (27), subtitle label (28); sparkline removed"
route: /analytics
revision: 1
date: 2026-05-06
verdict: "✅ PF4 resolved in Phase 8.1 — live scalar from computeKpiCards; sparkline (row 29) removed; 0 open findings"
---

# Audit — Occupancy Card on /analytics
_Last revised: 2026-05-06 · Revision 1_

📄 Page audit: see [pages/analytics/audit.md](pages/analytics/audit.md) — PF4 (occupancy card fully hardcoded) resolved.

## TL;DR
- ✅ Headline value wired to `kpiCards.find(k => k.label === "Occupancy")?.value` — live scalar from `computeKpiCards`
- ✅ Subtitle changed from hardcoded "Trend: Downward" to "Point-in-time" — correctly describes point-in-time nature
- ✅ Hardcoded sparkline (row 29, `[94,93.5,93,92.2,91.8,91.4]`) removed entirely — no fabricated trend data
- ✅ 0 new findings — clean after PF4 resolution

## Contents
| # | Section | Result |
|---|---|---|
| 1 | Snapshot | WIRED |
| 2 | Entity | ✅ |
| 3 | Formula | ✅ |
| 4 | Render | ✅ |
| 5 | Consistency | ✅ |
| 6 | Missing safeties | 0 gaps |
| 7 | Meaning | ✅ |
| 8 | Findings | 0 items |
| 9 | Fix Log | PF4 resolved |

## Glossary
- **Point-in-time occupancy** — count of properties currently Rented or Owner-Occupied divided by total active (non-archived) properties; uses current `Property.status` register, NOT filtered by the analytics period window
- **PF4** — Page-wide P1 finding: occupancy card was fully hardcoded (91.4%, "Trend: Downward", sparkline array). Resolved Phase 8.1.
- **Owner-Occupied** — new `Property.status` enum value added in Phase 8.1 to count self-occupied properties toward occupancy

---

## 1. Snapshot — ✅

> **Plain opener:** The Occupancy card previously showed a fabricated "91.4%" value and a hardcoded downward trend sparkline that had no relationship to real data. Both are gone. The card now shows the live occupancy percentage from the KPI strip computation and a "Point-in-time" label that honestly describes what the number represents.

| | |
|---|---|
| Where | `/analytics`, right-side column, first card |
| Original bug | Row 27: "91.4%" literal · Row 28: "Trend: Downward" literal · Row 29: `[94,93.5,...,91.4]` hardcoded array |
| Fix applied | Rows 27/28 replaced with live values; Row 29 (sparkline) removed |
| Current state | Headline: `kpiCards.find(k => k.label === "Occupancy")?.value ?? "—"` |
| Subtitle: | `"Point-in-time"` (static label — correctly describes the formula) |

## 2. Entity — ✅

| Entity | Key fields | Notes |
|---|---|---|
| `Property` | `status`, `isArchived` | `"Rented"` or `"Owner-Occupied"` = occupied; `isArchived === true` = excluded |

**New enum value:** `"Owner-Occupied"` added to `propertyStatusSchema` in Phase 8.1 (alongside Rented, Vacant, For Sale, Sold, Archived). Properties lived in by the owner now correctly count toward occupancy.

## 3. Formula — ✅

> **Plain opener:** Occupancy is computed once in `computeKpiCards`. It counts every non-archived property with status "Rented" or "Owner-Occupied", divides by total non-archived properties, rounds to one decimal place.

```ts
// lib/data/derivations/analytics.ts (computeKpiCards)
const active = properties.filter((p) => !p.isArchived);
const occupiedCount = active.filter(
  (p) => p.status === "Rented" || p.status === "Owner-Occupied",
).length;
// Note: Occupancy is point-in-time — NOT filtered by window
const occupancyPct = active.length === 0 ? 0 :
  Math.round((occupiedCount / active.length) * 1000) / 10;
```

**Period independence (intentional):** `occupancyPct` does NOT use the `window` parameter. This is correct per Q4.S resolution: occupancy is a snapshot of today's property status register, not a backward-looking aggregate. The window parameter affects revenue, expenses, and NOI — not the current occupancy count.

**Rule 3 multi-record walk:**
- Property A: `status="Rented"`, `isArchived=false` → counted in `occupiedCount` and `active` ✅
- Property B: `status="Vacant"`, `isArchived=false` → counted in `active` only ✅
- Property C: `status="Owner-Occupied"`, `isArchived=false` → counted in both ✅
- Property D: `status="Rented"`, `isArchived=true` → excluded from both ✅
- Result: `occupancyPct = Math.round((2/3) * 1000) / 10 = 66.7%` ✅

## 4. Render — ✅

> **Plain opener:** The card reads `kpiCards[2]` (the Occupancy entry) from the server-computed `kpiCards` array and displays `.value`. The sparkline AreaChart, gradient definition, and `occGrad` pattern are fully removed from `AnalyticsPage.tsx`.

```tsx
// AnalyticsPage.tsx (after Phase 8.1)
<p className="text-3xl font-semibold text-slate-900 mt-1">
  {kpiCards.find((k) => k.label === "Occupancy")?.value ?? "—"}
</p>
<p className="text-xs font-semibold text-slate-500 mt-1">Point-in-time</p>
```

**What was removed:**
- `[{ v: 94 }, { v: 93.5 }, { v: 93 }, { v: 92.2 }, { v: 91.8 }, { v: 91.4 }]` inline data array
- `<AreaChart>` sparkline
- `<linearGradient id="occGrad">` definition
- `"Trend: Downward"` literal

## 5. Consistency — ✅

| Identity | Holds? |
|---|---|
| Occupancy card value = KPI strip Occupancy value | ✅ — same `kpiCards.find(k => k.label === "Occupancy").value` expression |
| No sparkline → no claim about historical trend | ✅ — the removed sparkline made false claims; its absence is a net improvement |

## 6. Missing safeties — 0 gaps

The optional-chain `?.value ?? "—"` ensures the card shows "—" if the Occupancy KPI card is not found in the array (defensive; the array always contains 5 elements in the current derivation).

## 7. Meaning — ✅

```
Label:           "Occupancy Rate"
Subtitle:        "Point-in-time"
Formula:         (Rented + Owner-Occupied) / non-archived properties × 100
User inference:  what fraction of properties are currently occupied
Match?           ✅ — "Point-in-time" correctly sets expectation that this is not a trend
```

**What "Owner-Occupied" covers:** properties the owner lives in personally. Adding this avoids the paradox where a self-occupied property shows as "Vacant" in the occupancy rate.

## 8. Findings — 0 items

No open findings. PF4 fully resolved.

## 9. Fix Log

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| 1 | 2026-05-06 | PF4 — occupancy card fully hardcoded (91.4%, Trend: Downward, sparkline) | (1) `91.4%` → `kpiCards.find(label="Occupancy").value`; (2) `"Trend: Downward"` → `"Point-in-time"`; (3) sparkline AreaChart + data array removed; (4) `"Owner-Occupied"` added to `propertyStatusSchema`; (5) `occupancyPct` formula includes `status === "Owner-Occupied"`. | Phase 8.1 working tree |

---

<details>
<summary>🔍 Source files & hashes</summary>

```yaml
sources:
  - path: lib/data/derivations/analytics.ts
    sha: 39151627376123c9e16223b86a1ec0b37e982b60
  - path: app/(shell)/analytics/queries.ts
    sha: 8f8ba87dccfd201a299ffcb80b426307604f2143
  - path: app/(shell)/analytics/page.tsx
    sha: 1a5fa2d5ccf8da238ca03013bea48c4fda49c4fd
  - path: app/(shell)/analytics/_components/AnalyticsPage.tsx
    sha: 7d432debd03cd7cf6fd7320c74d950eda472e93e
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-06
- Initial audit written post Phase 8.1 wiring. PF4 (occupancy card P1 hardcoded bug) was the primary subject.
- PF4 resolved: live scalar from `computeKpiCards`; sparkline removed; "Point-in-time" label added.
- `"Owner-Occupied"` enum value added to `propertyStatusSchema` — occupancy formula updated to include Owner-Occupied.
- 0 open findings.
- Cross-identity with KPI strip Occupancy confirmed: same expression, same KpiCard object.

</details>
