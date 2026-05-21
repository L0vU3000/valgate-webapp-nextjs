---
slug: analytics--kpi-strip-direct-reads
data_point: "KPI strip bundle — Total Revenue (13), Occupancy KPI (15), Rent Collection (16), Maintenance KPI (17), change badges (18)"
route: /analytics
revision: 1
date: 2026-05-06
verdict: "✅ 2 WIRED correctly · 2 PARTIAL (proxy formulas) · 1 HARDCODED (change badges) — no regressions from Phase 8.1 wiring"
---

# Audit Bundle — KPI Strip Direct Reads on /analytics
_Last revised: 2026-05-06 · Revision 1_
_Bundle covers 5 surfaces. Full per-surface template not warranted — all read from the same derivation function `computeKpiCards` with the same source files._

📄 Page audit: see [pages/analytics/audit.md](pages/analytics/audit.md)

## TL;DR
- ✅ Total Revenue and Occupancy are correctly wired to `computeKpiCards` with period-filtered window; values shift by period
- ⚠️ 3 open findings: F1 (change badges "—" hardcoded — HARDCODED P3), F2 (Rent Collection uses Signed-lease count as proxy — PARTIAL P2), F3 (Maintenance KPI shows item count not spend — PARTIAL P3)
- 🔧 Highest-priority fix: F2 (Rent Collection proxy misleads if leases expire during period); F1 and F3 are cosmetic gaps

---

## Per-surface summary

| Row | Surface | Status | Source | Value (12M default) | Verdict |
|---|---|---|---|---|---|
| 13 | Total Revenue | WIRED | `payments.filter(Paid+Rent+window).reduce(sum, amount)` | varies by seed + period | ✅ |
| 15 | Occupancy KPI | WIRED | `active.filter(Rented‖Owner-Occupied).length / active.length × 100` | point-in-time, not window-filtered | ✅ |
| 16 | Rent Collection | PARTIAL | `leases.filter(stage==="Signed").length / leases.length` — "Signed" is a proxy for collecting | ratio of signed leases, not payment-verified | ⚠️ |
| 17 | Maintenance KPI | PARTIAL | `maintenance.length` (open item count) | "N open", not dollar spend | ⚠️ |
| 18 | All 5 change badges | HARDCODED | `"—"` literal in every card | "—" | ❌ |

## Entity

All 5 surfaces are outputs of `computeKpiCards(properties, payments, leases, maintenance, expenses, window)` in `lib/data/derivations/analytics.ts`. The function accepts a `DateWindow` and is called via `getAnalyticsPageData(period)` in `queries.ts`, which maps the URL period to a window via `periodToWindow()`.

**Note on Occupancy KPI (row 15):** Occupancy is intentionally point-in-time — it does NOT filter by the active window. `active.filter(p => p.status === "Rented" || p.status === "Owner-Occupied")` reflects the current property status register, not a historical aggregate. This is correct per Q4.S resolution (Phase 8.1): sparkline deferred, point-in-time only.

## Rule 1 — Adjacent claim-strings

- "vs prev" label beside all change badges: implies a prior-period comparison that doesn't exist. The badge value is "—" — no incorrect claim, just an unexplained placeholder. P3 nit (F1).
- TrendingUp/Down icon beside change badge: currently always TrendingUp (because `positive: true` for all non-NOI cards). No incorrect claim — just a fixed icon. Cosmetically misleading if NOI is negative (NOI card uses `noi >= 0` to set `positive` flag correctly — that card is handled by its own report).
- "PARTIAL" Rent Collection: label "Rent Collection" implies payment-verified rate; the value is actually lease-stage ratio. The label makes a semantic claim the formula doesn't support (F2).

## Rule 2 — Empty-state convention

- Total Revenue with no payments: `"$0"` — consistent with other `$`-formatted cards.
- Occupancy with no properties: `"0%"` — correct guard.
- Rent Collection with no leases: `"0%"` — correct guard.
- Maintenance with no items: `"$0"` — label now shows "N open" so `"$0"` would be a mismatch; actual code: `maintenanceTotal === 0 ? "$0" : \`${maintenanceTotal} open\`` — the "$0" case for zero items is the wrong unit (dollars) for a count field. P3 nit, but this conflicts with F3's "count not dollars" finding.

## Findings

### 🔵 F1 — KPI change badges are hardcoded `"—"` for all 5 cards
**P3 nit · confidence: high · `[render]`**

**Where:** `lib/data/derivations/analytics.ts` — every card in `computeKpiCards` returns `change: "—"`.

**Problem:** The KPI cards display a "vs prev" label and a TrendingUp/Down icon, implying period-over-period comparison data. All five cards show "—" because no prior-period reference is computed. The affordance is misleading — not a correctness bug (no wrong number shown), but a broken promise to the user.

**Fix when ready:** Compute prior-period revenue/occupancy/etc. by calling `computeKpiCards` again against the prior window of equal length. Seed data is sparse for historical comparison — defer until Phase 9 DB migration provides more temporal coverage.

---

### 🟡 F2 — Rent Collection uses Signed-lease ratio, not payment-verified rate
**P2 schema smell · confidence: high · `[semantic]`**

**Where:** `lib/data/derivations/analytics.ts:136–138` — `leases.filter(l => l.stage === "Signed").length / leases.length`.

**Problem:** "Signed" is a lease status (valid agreement in place), not a payment status. A tenant could be Signed but overdue on rent. The card label "Rent Collection" implies a payment-verified collection rate (e.g., fraction of expected rent actually received). This is a semantic mismatch — the formula is internally consistent but the label sets a false expectation.

**Fix (option a):** Compute `receivedThisMonth / expectedThisMonth` using `Payment[]` and `Lease[]` — the same hybrid approach as Q3.B resolved for the Monthly Income KPI. **Fix (option b):** Rename the card to "Active Leases" and change the label to "lease coverage rate". Option (a) aligns with the Q3.B resolution; option (b) is a 1-line rename.

---

### 🔵 F3 — Maintenance KPI shows item count, label implies financial spend
**P3 nit · confidence: medium · `[semantic]`**

**Where:** `lib/data/derivations/analytics.ts:140` — `maintenance.length`.

**Problem:** The card label is "Maintenance" — on a financial analytics page this reads as "maintenance spend." The value `N open` (a count of open MaintenanceItems) is a work-queue metric, not financial. The expense breakdown donut correctly separates Maintenance as a cost category using `Expense[category="Maintenance"]`; this KPI card doesn't.

**Note:** The format was improved in Phase 8.1 — the value now shows `"N open"` instead of a bare integer or misleading dollar sign, which partially mitigates the mismatch. F3 remains open as a semantic gap.

**Fix:** Replace with `sum(Expense.amount where category="Maintenance" and date in window)` formatted as currency, matching the expense breakdown approach. Or rename the card to "Open Work Orders" and keep the count.

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
