---
slug: property-id-rental--financial-overview-chart
data_point: "Financial Overview — bar chart (6 monthly rent bars)"
route: /property/[id]/rental
revision: 1
date: 2026-05-06
verdict: "✅ Correct · 1 finding (P1) · Nov–Apr window; only Mar bars are non-zero"
---

# Audit — Financial Overview Chart on /property/[id]/rental
_Last revised: 2026-05-06 · Revision 1_

## TL;DR
- ✅ Chart is correct — 6 bars for Nov 2025–Apr 2026; only March shows $1,700 (2 payments)
- ⚠️ 1 finding · 1 P1 (Payment[] userId to browser)
- 🔧 Top fix: narrow Payment[] server-side to strip userId (F1)
- 📄 Page audit: see [pages/property-id-rental/audit.md](pages/property-id-rental/audit.md)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What is this number? | — |
| 2 | Entity | Is the data well-organised? | ✅ |
| 3 | Formula | Does the math match the label? | ✅ |
| 4 | Render | How does the value reach the user? | ⚠️ |
| 5 | Consistency | Do related numbers agree? | ✅ |
| 6 | Missing safeties | What should exist but doesn't? | 1 gap |
| 7 | Meaning | Does the label promise what the math delivers? | ✅ |
| 8 | Findings | What to fix | 1 item |
| 9 | Fix Log | What has been fixed since the initial audit? | — |

## Glossary
- **Chart window** — last 6 complete calendar months; `[new Date(year, month-6, 1), new Date(year, month, 1))` (exclusive upper bound)
- **Chart window for today (May 6, 2026)** — Nov 1, 2025 to Apr 30, 2026 inclusive
- **`rentInWindow`** — Paid Rent payments with date inside the chart window

---

## 1. Snapshot — ✅

> **Plain opener:** The Financial Overview bar chart shows how much rent was collected each month over the last six months. Each bar represents one calendar month. For PROP-0001 viewed on May 6, 2026, the six months are November 2025 through April 2026. Two payments fell in March 2026 ($850 each), giving March a bar of $1,700. The other five months have no paid rent records and show $0.

| | |
|---|---|
| Where | `/property/PROP-0001/rental`, Financial Overview card, `<BarChart>` |
| Label | (bar chart — no single label; see period label audit) |
| Main formula | 6 monthly slots, each summing `Paid Rent` payments in that month |
| Chart window | Nov 2025 – Apr 2026 |
| Reads from | PMT-0001 (Mar 2, $850) · PMT-0002 (Mar 31, $850) |
| Edge cases | PMT-0006 (May 5) excluded — ≥ chartWindowEnd (May 1, 2026) |

## 2. Entity — ✅

| Field | Type | Notes |
|---|---|---|
| `Payment.kind` | enum | only `"Rent"` contributes |
| `Payment.status` | enum | only `"Paid"` contributes |
| `Payment.amount` | `number` | the summand |
| `Payment.date` | `number` | Unix ms — window filter key; also used for month-slot matching |

## 3. Formula — ✅

> **Plain opener:** The formula builds six monthly bucket objects, then loops through the Paid Rent payments in the window and adds each payment's amount to the bucket for its calendar month. The resulting `chartData` array drives the bar chart directly.

**Formula (verbatim):**
```ts
const nowDate = new Date(now);
const chartWindowStart = new Date(nowDate.getFullYear(), nowDate.getMonth() - 6, 1);
const chartWindowEnd   = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);

const rentInWindow = payments.filter(
  (p) =>
    p.kind === "Rent" &&
    p.status === "Paid" &&
    p.date >= chartWindowStart.getTime() &&
    p.date < chartWindowEnd.getTime(),
);

const chartMonths = Array.from({ length: 6 }, (_, i) => {
  const d = new Date(chartWindowStart.getFullYear(), chartWindowStart.getMonth() + i, 1);
  return { month: d.toLocaleDateString("en-US", { month: "short" }), year: d.getFullYear(), monthIndex: d.getMonth(), rent: 0 };
});
rentInWindow.forEach((p) => {
  const d = new Date(p.date);
  const slot = chartMonths.find((m) => m.year === d.getFullYear() && m.monthIndex === d.getMonth());
  if (slot) slot.rent += p.amount;
});
const chartData = chartMonths.map(({ month, rent }) => ({ month, rent }));
```

**Rule 3 window/slot walk (PROP-0001):**

| Payment | Date | In window? | Slot |
|---|---|---|---|
| PMT-0001 | Mar 2, 2026 (1772409600000) | ✅ (< May 1, 2026) | Mar 2026 |
| PMT-0002 | Mar 31, 2026 (1774915200000) | ✅ | Mar 2026 |
| PMT-0006 | May 5, 2026 (1777939200000) | ❌ (≥ 1777593600000 chartWindowEnd) | excluded |

**Resulting chartData:**

| Month | Rent | Note |
|---|---|---|
| Nov 2025 | $0 | no paid rent |
| Dec 2025 | $0 | no paid rent |
| Jan 2026 | $0 | no paid rent |
| Feb 2026 | $0 | no paid rent |
| Mar 2026 | $1,700 | PMT-0001 + PMT-0002 |
| Apr 2026 | $0 | no paid rent |

**Golden-value check**

| | |
|---|---|
| Only non-zero bar | Mar 2026: $1,700 |
| Chart renders | 5 bars at $0, 1 bar at $1,700 |
| Match? | ✅ |

## 4. Render — ⚠️

| | |
|---|---|
| Component | `<PropertyRentalPage>` → Financial Overview card → `<BarChart data={chartData}>` |
| Prop chain | `payments[]` → `rentInWindow` filter → slot accumulation → `chartData` → Recharts |
| Tooltip | `formatter={(v) => [$${v.toLocaleString()}, "Rent"]}` |

**PII / IDOR:** `Payment[]` carries `userId` to browser. See F1. Auth/property narrowing: **PF1** + **PF2** in pages/property-id-rental/audit.md.

## 5. Consistency — ✅

| Identity | Verification | Holds? |
|---|---|---|
| Sum of all chart bars = totalRentInWindow | $0+$0+$0+$0+$1,700+$0 = $1,700 = totalRentInWindow | ✅ |
| Chart uses different window than YTD | YTD excludes Nov/Dec 2025; chart includes them (no Rent in those months anyway) | ✅ documented |
| PMT-0006 correctly excluded | May 5 ≥ May 1 chartWindowEnd | ✅ |

## 6. Missing safeties — 1 gap

| Gap | Status | Link |
|---|---|---|
| `userId` in `Payment[]` shipped to browser | ❌ | F1 |

## 7. Meaning — ✅

```
Label rendered:           (bar chart under "Financial Overview" heading)
Formula chosen:           Paid Rent aggregated by calendar month within 6-month window
User's likely inference:  monthly rent collection trend for last 6 months
Match?                    ✅ (uses Paid status — received rent, not contractual)
```

## 8. Findings — 1 item

---

### 🔴 F1 — `userId` shipped to browser in unnarrowed `Payment[]`
**P1 robustness · confidence: high · `[render]`**

Same systemic finding as `property-id-overview--noi` F1. Narrow `Payment[]` in `rental/queries.ts` before returning to browser.

## 9. Fix Log

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| — | — | — | _No fixes yet._ | — |

---

<details>
<summary>🔍 Source files & hashes</summary>

```yaml
sources:
  - path: lib/data/types/payment.ts
    sha: 852426d2435663db3850eb978b89866e71cde9ea
  - path: lib/data/db/payments.ts
    sha: 14de75d299815592b34becc71f7b0331a50f9487
  - path: app/(shell)/property/[id]/rental/queries.ts
    sha: 3a3603e8108b9326f109a45784f8e4eb1b2c5727
  - path: app/(shell)/property/[id]/_components/PropertyRentalPage.tsx
    sha: bfb87b4668543208b609974be41d8ec214f1cdd8
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-06
- Initial audit. Surface wired in Phase 6.2 (PF4 trap sprung: module-level `chartData` const deleted).
- Golden-value check ✅: Nov–Apr window; PMT-0001 + PMT-0002 both in Mar slot → $1,700; PMT-0006 excluded by upper bound.
- Rule 3 window/slot walk: all 3 PROP-0001 payments verified; only 2 fall inside window.
- 1 finding: F1 (userId leak in Payment[]).

</details>
