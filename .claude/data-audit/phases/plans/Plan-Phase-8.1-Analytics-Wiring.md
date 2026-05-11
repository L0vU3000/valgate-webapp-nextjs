# Phase 8.1 — Analytics Wiring

## Context

The `/analytics` page has 7 findings (PF1–PF6 + Row 38), all unblocked after resolving 5 product Q-numbers. The page has P1 correctness bugs (NOI = Revenue, expenses always $0, occupancy hardcoded), P2 presentation bugs (period filter inert, donut center hardcoded, wrong expense labels), and one P3 empty-state gap. All fixes land in this PR. No new entities are needed — the existing `Expense` entity (§25, Phase 6.2) is the unified expense source.

**Key discovery:** `MaintenanceItem` has no `cost` field — `Expense[category="Maintenance"]` must be used for all cost-based calculations. The current code does `maintenance.filter(...).length * 0` which was always structurally zero.

---

## Files to Modify (in execution order)

### 1. `lib/data/types/property.ts`
Add `"Owner-Occupied"` as 6th value to `propertyStatusSchema`:
```typescript
export const propertyStatusSchema = z.enum([
  "Rented", "Vacant", "For Sale", "Sold", "Archived",
  "Owner-Occupied",   // ← add
]);
```
Additive only — existing seed data parses correctly.

---

### 2. `lib/data/derivations/analytics.ts`
Full rewrite of the computation layer. Add `import type { Expense } from "@/lib/data/types/expense"` at top.

**New exported types and helpers:**
```typescript
export type DateWindow = { from: number; to: number };

export function periodToWindow(period: string): DateWindow {
  const now = Date.now();
  const d = new Date();
  switch (period) {
    case "MTD": return { from: Date.UTC(d.getFullYear(), d.getMonth(), 1), to: now };
    case "QTD": {
      const q = Math.floor(d.getMonth() / 3) * 3;
      return { from: Date.UTC(d.getFullYear(), q, 1), to: now };
    }
    case "YTD": return { from: Date.UTC(d.getFullYear(), 0, 1), to: now };
    case "12M":
    case "Custom":
    default: return { from: Date.UTC(d.getFullYear(), d.getMonth() - 11, 1), to: now };
  }
}

// Internal — replaces lastNMonthsWindow
function monthsInWindow(window: DateWindow): { start: number; end: number; label: string }[] {
  const out: { start: number; end: number; label: string }[] = [];
  const d = new Date(window.from);
  let year = d.getUTCFullYear(), month = d.getUTCMonth();
  while (true) {
    const start = Date.UTC(year, month, 1);
    const end = Date.UTC(year, month + 1, 1);
    if (start >= window.to) break;
    out.push({ start, end: Math.min(end, window.to), label: MONTH_LABELS[month] });
    month++; if (month > 11) { month = 0; year++; }
  }
  return out;
}
```

**New function signatures (replace all existing):**
```typescript
// Expense series now real — uses Expense[] not maintenance count * 0
computeRevenueSeries(payments: Payment[], expenses: Expense[], window: DateWindow): RevenueDataPoint[]

// NOI = revenue - sum(Expense in window). Occupancy uses new formula. maintenance kept for count-KPI only.
computeKpiCards(properties, payments, leases, maintenance: MaintenanceItem[], expenses: Expense[], window: DateWindow): KpiCard[]

// Now returns total alongside items (for donut center). Drops maintenance + properties params.
computeExpenseBreakdown(expenses: Expense[], window: DateWindow): { items: ExpenseBreakdownItem[]; total: number }

// Uses Expense[category="Maintenance"] for cost-based bars. Fixed 6-month lookback regardless of window.
computeMaintenanceSpend(expenses: Expense[], window: DateWindow): MaintenanceSpendItem[]

// UNCHANGED:
computeLeasePipeline(leases: Lease[]): LeasePipelineItem[]
computeCapitalGrowth(properties: Property[], valuations: PropertyValuation[]): CapitalGrowthItem[]
```

**`computeKpiCards` occupancy formula (Q4.S resolution):**
```typescript
const active = properties.filter((p) => !p.isArchived);
const occupiedCount = active.filter(
  (p) => p.status === "Rented" || p.status === "Owner-Occupied",
).length;
const occupancyPct = active.length === 0 ? 0 :
  Math.round((occupiedCount / active.length) * 1000) / 10;
// Occupancy is point-in-time — NOT filtered by window per Q4.S
```

**NOI formula:**
```typescript
const windowExpenses = expenses
  .filter((e) => e.date >= window.from && e.date < window.to)
  .reduce((sum, e) => sum + e.amount, 0);
const noi = totalRevenue - windowExpenses;
// positive: noi >= 0  (can go negative — correct for MTD or slow months)
```

**`computeExpenseBreakdown` donut slice colors (6 categories):**
```typescript
const EXPENSE_COLORS: Record<string, string> = {
  Maintenance: "#2563eb",
  Utilities:   "#fbbf24",
  Insurance:   "#f97316",
  Tax:         "#10b981",
  Management:  "#8b5cf6",
  Other:       "#6b7280",
};
// Only include slices where amount > 0. Return empty items[] when total === 0.
```

**`computeMaintenanceSpend` uses fixed 6-month window internally** (card is labeled "6M"):
```typescript
// Uses its own 6-month lookback, ignores the `window` param (kept for signature consistency)
const sixM: DateWindow = { from: Date.UTC(d.getFullYear(), d.getMonth() - 5, 1), to: now };
const maintenanceExpenses = expenses.filter((e) => e.category === "Maintenance");
// returns sum(amount) per month, not count
```

Remove `lastNMonthsWindow` entirely.

---

### 3. `app/(shell)/analytics/queries.ts`

Changes:
- Add `import * as expensesDb from "@/lib/data/db/expenses"` and `import { periodToWindow, type DateWindow } from "@/lib/data/derivations/analytics"`
- Add `period = "12M"` param to `getAnalyticsPageData`
- Add `expensesDb.list(userId)` to the `Promise.all` fetch
- Update all derivation calls to pass `expenses` and `window`
- Add `expenseBreakdownTotal: number` and `period: string` to `AnalyticsPageData` type
- Destructure `computeExpenseBreakdown` result: `const { items: expenseBreakdown, total: expenseBreakdownTotal } = computeExpenseBreakdown(expenses, window)`

```typescript
export type AnalyticsPageData = {
  revenueData: RevenueDataPoint[];
  kpiCards: KpiCard[];
  leasePipeline: LeasePipelineItem[];
  capitalGrowth: CapitalGrowthItem[];
  maintenanceSpend: MaintenanceSpendItem[];
  savedReports: string[];
  expenseBreakdown: ExpenseBreakdownItem[];
  expenseBreakdownTotal: number;   // ← new
  period: string;                  // ← new
};

export async function getAnalyticsPageData(period = "12M"): Promise<AnalyticsPageData>
```

---

### 4. `app/(shell)/analytics/page.tsx`

Read `searchParams` (Next.js 15 async pattern), pass period to data fetch and component:

```typescript
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period } = await searchParams;
  const resolvedPeriod = period ?? "12M";
  const data = await getAnalyticsPageData(resolvedPeriod);
  return <AnalyticsPage data={data} period={resolvedPeriod} />;
}
```

---

### 5. `app/(shell)/analytics/_components/AnalyticsPage.tsx`

Five targeted changes — no structural rewrites:

**A) Add `period` prop + initialize `activePeriod` from it + wire router:**
```typescript
import { useRouter } from "next/navigation";

export function AnalyticsPage({ data, period }: { data: AnalyticsPageData; period: string }) {
  const router = useRouter();
  const [activePeriod, setActivePeriod] = useState<string>(period); // was "MTD"
  // ...
  // period button onClick:
  onClick={() => { setActivePeriod(p); router.push(`?period=${p}`); }}
```
No `useSearchParams()` needed — `period` prop comes from server-side `searchParams`.

**B) Destructure `expenseBreakdownTotal` from `data`:**
```typescript
const { revenueData, kpiCards, leasePipeline, capitalGrowth,
        maintenanceSpend, savedReports, expenseBreakdown, expenseBreakdownTotal } = data;
```

**C) Occupancy card — remove hardcoded 91.4% + drop sparkline:**
- Replace `<p>91.4%</p>` at line 265 with `{kpiCards.find((k) => k.label === "Occupancy")?.value ?? "—"}`
- Remove the entire right-side `<div>` containing `AreaChart` with sparkline data `[{ v: 94 }, ...]` at line 270
- Remove the `occGrad` `<linearGradient>` definition (if inside its own `<defs>` block)
- Replace "Trend: Downward" label with "Point-in-time"

**D) Donut center — replace hardcoded `$48k`:**
```typescript
// At line ~383, replace the hardcoded span:
<span className="text-sm font-semibold text-slate-900">
  {expenseBreakdownTotal === 0 ? "$0"
    : expenseBreakdownTotal >= 1000 ? `$${(expenseBreakdownTotal / 1000).toFixed(1)}k`
    : `$${expenseBreakdownTotal}`}
</span>
```

**E) Saved reports empty state:**
```tsx
// Replace savedReports.map(...) block:
{savedReports.length === 0 ? (
  <p className="text-xs text-slate-400">No saved reports yet.</p>
) : (
  savedReports.map((report, i) => ( /* existing JSX */ ))
)}
```

---

## New Seed Files (EXP-0008 through EXP-0022)

Path pattern: `public/data/users/demo-user/expenses/EXP-XXXX/core.json`

All records use `"userId": "demo-user"`. Format matches existing records exactly.

| ID | date (ms) | Date | category | amount | propertyId | note |
|---|---|---|---|---|---|---|
| EXP-0008 | 1764892800000 | 2025-12-05 | Utilities | 210 | PROP-0002 | Water bill |
| EXP-0009 | 1766016000000 | 2025-12-18 | Management | 320 | PROP-0003 | Property management fee |
| EXP-0010 | 1767830400000 | 2026-01-08 | Insurance | 420 | PROP-0004 | Annual premium instalment |
| EXP-0011 | 1768867200000 | 2026-01-20 | Tax | 550 | PROP-0005 | Quarterly property tax |
| EXP-0012 | 1769040000000 | 2026-01-22 | Maintenance | 390 | PROP-0006 | HVAC filter replacement |
| EXP-0013 | 1770076800000 | 2026-02-03 | Utilities | 175 | PROP-0007 | Electricity |
| EXP-0014 | 1771027200000 | 2026-02-14 | Other | 90 | PROP-0008 | Locksmith call-out |
| EXP-0015 | 1771545600000 | 2026-02-20 | Management | 480 | PROP-0009 | Letting agent fee |
| EXP-0016 | 1772409600000 | 2026-03-02 | Insurance | 310 | PROP-0010 | Landlord insurance |
| EXP-0017 | 1774137600000 | 2026-03-22 | Utilities | 240 | PROP-0012 | Gas bill |
| EXP-0018 | 1775347200000 | 2026-04-05 | Tax | 620 | PROP-0013 | Quarterly rates |
| EXP-0019 | 1776470400000 | 2026-04-18 | Maintenance | 850 | PROP-0014 | Roof repair |
| EXP-0020 | 1777334400000 | 2026-04-28 | Other | 130 | PROP-0015 | Admin and compliance |
| EXP-0021 | 1777680000000 | 2026-05-02 | Utilities | 195 | PROP-0002 | Water bill May |
| EXP-0022 | 1777939200000 | 2026-05-05 | Maintenance | 460 | PROP-0016 | Pest control |

**Expected totals (verified):**

| Period | Total | Records |
|---|---|---|
| MTD (May 1+) | $655 | EXP-0021, EXP-0022 |
| QTD (Apr 1+) | $2,405 | EXP-0005, 0018, 0019, 0020, 0021, 0022 |
| YTD (Jan 1+) | $6,760 | EXP-0002 through 0022, excl. Nov/Dec 2025 |
| 12M (all) | $7,470 | All 22 records |

**12M donut breakdown:**
| Category | Amount | % |
|---|---|---|
| Maintenance | $2,630 | 35% |
| Tax | $1,370 | 18% |
| Utilities | $1,290 | 17% |
| Insurance | $1,010 | 14% |
| Management | $950 | 13% |
| Other | $220 | 3% |
| **Total** | **$7,470** | **100%** |

---

## Gotchas

1. **NOI can go negative** — correct for MTD if no May rent collected yet. `positive: noi >= 0` flag drives the KPI card icon color.
2. **Occupancy is NOT period-filtered** — always point-in-time per Q4.S resolution.
3. **`computeMaintenanceSpend` ignores the `window` param** — it always shows trailing 6M because the card title says "6M". Accept param for signature consistency but override internally.
4. **Remove sparkline AreaChart completely** — the `occGrad` gradient definition must also be removed. The main revenue chart's gradient (`revGrad`, `expGrad`) is in a separate `<defs>` block and is unaffected.
5. **`router.push` not `router.replace`** — back button must restore previous period.
6. **Donut with empty items[]** — Recharts PieChart renders nothing; center shows `$0`. Correct behavior for a period with no expenses.

---

## Verification

```bash
npx tsc --noEmit   # zero errors expected
```

| Finding | What to check |
|---|---|
| PF2 (expenses: 0) | Revenue chart — expense area series shows non-zero values for months with seed data |
| PF3 (NOI = Revenue) | KPI strip: Total Revenue and NOI must differ (NOI = Revenue − expenses in window) |
| PF4 (91.4% hardcoded) | Occupancy card shows live value (e.g. 37.5% for 6 rented / 16 total). No sparkline. |
| PF5 (Utilities = Insurance) | Donut has "Insurance" (orange) and "Utilities" (amber) as distinct slices |
| PF1 (filter inert) | Click "MTD" → URL becomes `?period=MTD` → donut center changes to `$655` |
| PF6 (no empty state) | Saved Reports card shows "No saved reports yet." |
| Row 38 ($48k hardcoded) | Donut center shows `$7.5k` for 12M, changes on period switch |

**Seed data sanity check:**
```bash
node -e "
const fs = require('fs');
const base = 'public/data/users/demo-user/expenses';
let total = 0;
fs.readdirSync(base).sort().forEach(id => {
  const f = JSON.parse(fs.readFileSync(\`\${base}/\${id}/core.json\`, 'utf8'));
  console.log(id, new Date(f.date).toISOString().slice(0,10), f.category, '\$'+f.amount);
  total += f.amount;
});
console.log('Grand total: \$'+total, '(expect \$7470)');
"
```

---

## Archive Requirement

After implementation, copy this plan to:
`.claude/data-audit/docs/plans/Plan-Phase-8.1-Analytics-Wiring.md`
