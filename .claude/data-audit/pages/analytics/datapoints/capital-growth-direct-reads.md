---
slug: analytics--capital-growth-direct-reads
data_point: "Capital Growth card — rank numbers (40), property names (41), growth pct (42), bar widths (43)"
route: /analytics
revision: 1
date: 2026-05-06
verdict: "✅ Correct · 1 finding (P3 nit) — no changes from Phase 8.1 wiring"
---

# Audit Bundle — Capital Growth Direct Reads on /analytics
_Last revised: 2026-05-06 · Revision 1_
_Bundle covers 4 surfaces. Lite template — all are direct outputs of `computeCapitalGrowth` from the same entities._

📄 Page audit: see [pages/analytics/audit.md](pages/analytics/audit.md)

## TL;DR
- ✅ All 4 surfaces correctly computed — growth % from first-to-last valuation across sorted `PropertyValuation[]` per property; bar widths proportional to peak; names from `Property.name`
- ✅ Top-3 cutoff is intentional and documented; empty guard correctly returns `[]`
- ⚠️ 1 finding: F1 (P3 — card title "Capital Growth (Ranked)" implies portfolio-wide but shows only top 3; minor label gap)

---

## Per-surface summary

| Row | Surface | Formula | Status | Verdict |
|---|---|---|---|---|
| 40 | Rank numbers (01, 02, 03) | `String(i + 1).padStart(2, "0")` — derived from sort position | WIRED | ✅ |
| 41 | Property names | `p.name` from `Property` — sorted by `growthPct DESC` | WIRED | ✅ |
| 42 | Growth percentages | `((last - first) / first) * 100` across `PropertyValuation` series sorted by `recordedAt` | WIRED | ✅ |
| 43 | Bar widths | `Math.round((r.growthPct / peak) * 100)` — proportional to highest-growth property | WIRED | ✅ |

## Entity

All 4 surfaces are outputs of `computeCapitalGrowth(properties, valuations)` in `lib/data/derivations/analytics.ts`. The function:
1. Groups `PropertyValuation[]` by `propertyId`
2. For each property: sorts series by `recordedAt`, computes `((last - first) / first) * 100`
3. Drops properties with `< 2` valuations or `first === 0` (guards against division-by-zero)
4. Sorts by `growthPct DESC`, slices to top 3
5. Normalizes bar widths against the peak growth

**Note on period isolation:** `capitalGrowth` is NOT period-filtered. Growth is computed from the full valuation history (first to last recorded valuation). This is correct — capital appreciation is a lifetime metric, not a per-period one.

## Rule 1 — Adjacent claim-strings

- Growth % suffix: `${growthPct >= 0 ? "+" : ""}${growthPct.toFixed(1)}%` — includes explicit "+" for positive gains. No false claim.
- Bar width as fraction of peak: a 50%-wide bar means "this property grew at half the rate of the top property." No absolute claim. Safe.
- "Ranked" in card title: correctly implies this is a sorted subset, not all properties.

## Rule 2 — Empty-state convention

- No properties with `≥ 2` valuations: `computeCapitalGrowth` returns `[]`; component renders no rows. No empty-state copy shown. Minor: could add "No valuation history yet." Cosmetic P3 gap (not filed separately — consistent with sparse-seed behavior across the app).

## Rule 3 — Multi-record mental walk

- Property A: valuations [500k, 550k] → `((550 - 500) / 500) × 100 = +10%` → included ✅
- Property B: single valuation [400k] → excluded (series.length < 2) ✅
- Property C: first valuation = 0 → excluded (division-by-zero guard) ✅
- Property D: valuations [600k, 480k] → `((480 - 600) / 600) × 100 = -20%` → negative growth, included, sorts below positive-growth properties ✅

## Findings

### 🔵 F1 — Card shows only top-3 properties; no indication of total count
**P3 nit · confidence: high · `[semantic]`**

**Where:** `lib/data/derivations/analytics.ts:232` — `.slice(0, 3)`.

**Problem:** The card title "Capital Growth (Ranked)" implies a portfolio-wide ranking, but only the top 3 are shown. A user with 10 properties might wonder where properties 4–10 are. No "Showing 3 of N" or "Top 3" qualifier in the UI.

**Fix:** Add a subtitle "Top 3 by growth" or append `(${rows.length} of ${properties.length})` if more than 3 properties have valuation history. Low priority for v1.

---

<details>
<summary>🔍 Source files & hashes</summary>

```yaml
sources:
  - path: lib/data/derivations/analytics.ts
    sha: 39151627376123c9e16223b86a1ec0b37e982b60
  - path: app/(shell)/analytics/queries.ts
    sha: 8f8ba87dccfd201a299ffcb80b426307604f2143
  - path: app/(shell)/analytics/_components/AnalyticsPage.tsx
    sha: 7d432debd03cd7cf6fd7320c74d950eda472e93e
```

</details>
