---
slug: property-id-rental--period-label
data_point: "Financial Overview — period selector label"
route: /property/[id]/rental
revision: 1
date: 2026-05-06
verdict: "✅ Correct · 0 findings · 'Nov 2025 – Apr 2026' derived from chart window"
---

# Audit — Period Label on /property/[id]/rental
_Last revised: 2026-05-06 · Revision 1_

## TL;DR
- ✅ Value is correct — displays `"Nov 2025 – Apr 2026"` (first and last month of the 6-month chart window)
- ✅ 0 findings — no entity fields, no PII leak; purely a date derivation
- 📄 Page audit: see [pages/property-id-rental/audit.md](pages/property-id-rental/audit.md)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What is this number? | — |
| 2 | Entity | Is the data well-organised? | ✅ |
| 3 | Formula | Does the math match the label? | ✅ |
| 4 | Render | How does the value reach the user? | ✅ |
| 5 | Consistency | Do related numbers agree? | ✅ |
| 6 | Missing safeties | What should exist but doesn't? | 0 gaps |
| 7 | Meaning | Does the label promise what the math delivers? | ✅ |
| 8 | Findings | What to fix | 0 items |
| 9 | Fix Log | What has been fixed since the initial audit? | — |

## Glossary
- **Chart window** — last 6 complete calendar months; `[new Date(year, month-6, 1), new Date(year, month, 1))`
- **Period label** — string derived from `chartMonths[0]` and `chartMonths[5]`; used as the button label on the period picker

---

## 1. Snapshot — ✅

> **Plain opener:** The period label is the text on the dropdown button above the bar chart — it tells the user which 6-month range the chart covers. On May 6, 2026, the chart window runs from November 2025 through April 2026, so the label reads "Nov 2025 – Apr 2026". This string is computed at runtime from the same month array that drives the chart bars; it is not hardcoded.

| | |
|---|---|
| Where | `/property/PROP-0001/rental`, Financial Overview card, period picker button |
| Label | (the button text itself) |
| Main formula | `chartMonths[0].month + " " + chartMonths[0].year + " – " + chartMonths[5].month + " " + chartMonths[5].year` |
| Reads from | `chartMonths` array (derived from `Date.now()`) |
| Displayed as | `"Nov 2025 – Apr 2026"` |

## 2. Entity — ✅

No database entity fields are read to produce this value. The period label is derived entirely from `Date.now()` and JavaScript `Date` arithmetic. There are no PII fields, no `userId`, no external reads.

| Dependency | Type | Notes |
|---|---|---|
| `Date.now()` | `number` | current timestamp — determines chart window |
| `chartMonths[0].month` | `string` | `"short"` locale format of first slot month |
| `chartMonths[0].year` | `number` | year of first slot |
| `chartMonths[5].month` | `string` | `"short"` locale format of last slot month |
| `chartMonths[5].year` | `number` | year of last slot |

## 3. Formula — ✅

> **Plain opener:** The period label is a string concatenation of the first and last entries in the `chartMonths` array. The array is built by the same code that populates the chart bars, so the label is always guaranteed to match the chart range.

**Formula (verbatim):**
```ts
const periodLabel = `${chartMonths[0].month} ${chartMonths[0].year} – ${chartMonths[5].month} ${chartMonths[5].year}`;
```

**Walk (May 6, 2026):**

| Slot | Index | d = new Date(…) | month | year |
|---|---|---|---|---|
| 0 | 0 | Nov 1, 2025 | "Nov" | 2025 |
| 1 | 1 | Dec 1, 2025 | "Dec" | 2025 |
| 2 | 2 | Jan 1, 2026 | "Jan" | 2026 |
| 3 | 3 | Feb 1, 2026 | "Feb" | 2026 |
| 4 | 4 | Mar 1, 2026 | "Mar" | 2026 |
| 5 | 5 | Apr 1, 2026 | "Apr" | 2026 |

`periodLabel` = `"Nov 2025 – Apr 2026"` ✅

**Golden-value check**

| Source | Value |
|---|---|
| `chartMonths[0]` | `{ month: "Nov", year: 2025 }` |
| `chartMonths[5]` | `{ month: "Apr", year: 2026 }` |
| Computed label | `"Nov 2025 – Apr 2026"` |
| Displayed | `"Nov 2025 – Apr 2026"` |
| Match? | ✅ |

## 4. Render — ✅

| | |
|---|---|
| Component | `<PropertyRentalPage>` → Financial Overview card → period picker `<button>` |
| Prop chain | `Date.now()` → `chartMonths` → `periodLabel` → JSX |
| PII | None — no entity fields |

## 5. Consistency — ✅

| Identity | Verification | Holds? |
|---|---|---|
| Period label matches chart month range | `chartMonths[0]` = first bar label; `chartMonths[5]` = last bar label | ✅ by construction |
| Label rolls forward monthly | Derived from `Date.now()` — always the current window | ✅ |

## 6. Missing safeties — 0 gaps

No entity reads, no PII, no empty-state concern. This surface is trivially safe.

## 7. Meaning — ✅

```
Label rendered:           "Nov 2025 – Apr 2026"
Formula chosen:           first and last month of the 6-complete-month chart window
User's likely inference:  the date range shown in the bar chart
Match?                    ✅
```

## 8. Findings — 0 items

No findings. This surface is clean.

## 9. Fix Log

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| — | — | — | _No findings; no fix log entries._ | — |

---

<details>
<summary>🔍 Source files & hashes</summary>

```yaml
sources:
  - path: app/(shell)/property/[id]/_components/PropertyRentalPage.tsx
    sha: bfb87b4668543208b609974be41d8ec214f1cdd8
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-06
- Initial audit. Surface wired in Phase 6.2 (PF4 trap sprung; period label moved from hardcoded string literal to runtime derivation).
- Golden-value check ✅: chartMonths[0]="Nov 2025", chartMonths[5]="Apr 2026" → "Nov 2025 – Apr 2026".
- 0 findings.

</details>
