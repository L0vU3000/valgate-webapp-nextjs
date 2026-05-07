---
slug: analytics--lease-pipeline-direct-reads
data_point: "Lease Expiry Pipeline card — bucket labels (30), units count (31), bar width pct (32)"
route: /analytics
revision: 1
date: 2026-05-06
verdict: "✅ Correct · 1 finding (P3 nit) — no changes from Phase 8.1 wiring"
---

# Audit Bundle — Lease Expiry Pipeline on /analytics
_Last revised: 2026-05-06 · Revision 1_
_Bundle covers 3 surfaces. Lite template — all are direct derivations from the same `computeLeasePipeline` call._

📄 Page audit: see [pages/analytics/audit.md](pages/analytics/audit.md)

## TL;DR
- ✅ All 3 surfaces correctly computed — bucket labels are derived from config, counts from `Lease.endDate` bucket math, bar widths proportional to max bucket
- ✅ No changes from Phase 8.1 wiring — this card was WIRED before and remains WIRED
- ⚠️ 1 finding: F1 (P3 — "View All" button is CHROME stub; not a data bug)

---

## Per-surface summary

| Row | Surface | Formula | Status | Verdict |
|---|---|---|---|---|
| 30 | Bucket range labels (0-3M, 4-6M, 7-12M) | `b.range` from `buckets` config array — labels derived, not hardcoded literals | WIRED | ✅ |
| 31 | Units count per bucket | `leases.filter(days >= b.min && days <= b.max).length` — days computed from `l.endDate - Date.now()` | WIRED | ✅ |
| 32 | Bar width pct | `Math.round((totals[i] / max) * 100)` — proportional to max bucket count | WIRED | ✅ |

## Entity

All 3 surfaces are outputs of `computeLeasePipeline(leases)` in `lib/data/derivations/analytics.ts`. The function uses the current timestamp (`Date.now()`) to compute days-to-expiry for each lease. This is intentionally NOT period-filtered — the pipeline shows upcoming expirations relative to today regardless of the analytics period filter.

**Note on period isolation:** `leasePipeline` is computed outside the period window. This is correct: lease expiry is a forward-looking operational metric (how many leases expire soon?) not a backward-looking financial metric (how much did we earn in the period?). Period filter affecting the pipeline would be a bug.

## Rule 1 — Adjacent claim-strings

- "View All" button (row 33, CHROME): implies navigation to a full lease list. No false claim — it's a stub; clicking does nothing. Not a data surface. Filed as F1.
- "Units" label beside the count: correct — the value is a count of leases (units of lease agreements), not a count of physical rooms.
- Bar color coding (red/yellow/green by bucket): colors make a severity claim. Red = 0–3M (most urgent), yellow = 4–6M, green = 7–12M. This is a correct directional claim — expiring sooner warrants higher urgency.

## Rule 2 — Empty-state convention

- Empty leases list → `max = Math.max(0, ...totals) = 0` → all `pct = 0` → zero-width bars. No text placeholder. Minor gap: a user with no leases sees a pipeline with three empty bars and no "No leases" message. P3 cosmetic (not filed as a separate finding).

## Rule 3 — Multi-record mental walk (days bucket)

- Lease A expires 45 days from today → `days = 45`, lands in `{min:0, max:90}` → 0–3M bucket. ✅
- Lease B expires 150 days from today → `days = 150`, lands in `{min:91, max:180}` → 4–6M bucket. ✅
- Lease C expires 200 days from today → `days = 200`, lands in `{min:181, max:365}` → 7–12M bucket. ✅
- Lease D expired yesterday → `days = -1`, matches no bucket → correctly excluded from all counts. ✅

## Findings

### 🔵 F1 — "View All" button is a CHROME stub
**P3 nit · confidence: high · `[render]`**

**Where:** `AnalyticsPage.tsx:281` — `<button className="...">View All</button>` with no click handler.

**Problem:** The button implies navigation to a full lease expiry list (e.g., `/rental` or a filtered lease view). No handler is wired.

**Fix:** Route to `/rental` or `/rental?filter=expiring` when that page's filtering is ready. For now, disable the button or add a tooltip "Coming soon."

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
