---
slug: property-id-valuation--qoq-change
data_point: "Current Market Value card — QoQ change sub-label"
route: /property/[id]/valuation
revision: 1
date: 2026-05-05
verdict: "⚠️ 3 findings (1 P1, 1 P2, 1 P3) — label says 'quarter' but formula uses adjacent records"
---

# Audit — QoQ Change sub-label on /property/[id]/valuation
_Last revised: 2026-05-05 · Revision 1_

## TL;DR
- ✅ Arithmetic is correct — $15,000 delta between VAL-0003 ($1,310,000) and VAL-0002 ($1,295,000)
- ⚠️ 3 findings · 1 P1 (label says "quarter" but formula uses adjacent records regardless of time gap) · 1 P2 (negative delta uses "−" em-dash not "−" minus sign — locale inconsistency) · 1 P3 (null case renders "No prior record" — acceptable but mismatched with card's positive/negative colour logic)
- 🔧 Top fix: rename label to "since last valuation" or add guard requiring records ≥ 90 days apart to claim "quarter" (F1)
- 📄 Page audit: see [pages/property-id-valuation/audit.md](pages/property-id-valuation/audit.md)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What is this number, where does it come from? | — |
| 2 | Entity | Is the data well-organised? | ✅ |
| 3 | Formula | Does the math match the label? | ⚠️ |
| 4 | Render | How does the value reach the user? | ✅ |
| 5 | Consistency | Do related numbers agree? | ✅ |
| 6 | Missing safeties | What should exist but doesn't? | 3 gaps |
| 7 | Meaning | Does the label promise what the math delivers? | ⚠️ |
| 8 | Findings | What to fix | 3 items |
| 9 | Fix Log | What has been fixed since the initial audit? | — |

## Glossary
- **QoQ** — Quarter-over-Quarter: change between this quarter and the previous one. The formula currently delivers "record-over-record", not strict QoQ.
- **PFn** — Page-wide finding already filed in the page audit; cited here instead of restated.
- **prev** — `sorted.at(-2)`: the second-most-recent `PropertyValuation` record by `recordedAt`.

---

## 1. Snapshot — ✅

> **Plain opener:** This is the change in property value between the two most recently recorded valuations — shown as a green "▲ +$X since last quarter" or red "▼ −$X" sub-label below the Current Market Value headline.

| | |
|---|---|
| Where | `/property/[id]/valuation`, Current Market Value card, sub-label text |
| Label | "▲ +$15,000 since last quarter" (with seed PROP-0001) |
| Main formula | `latest.price − prev.price` where `prev = sorted.at(-2)` |
| Reads from | Same sorted `PropertyValuation[]` as Current Market Value |
| Canonical home | client (derived inline in `PropertyValuationPage.tsx`) |
| Edge cases | single record → `"No prior record"` · tied `recordedAt` → non-deterministic prev |

## 2. Entity — ✅

> **Plain opener:** The entity is sound — same `PropertyValuation` records used by the headline; no additional data needed.

Same entity as Current Market Value audit. See [`ref/00 §16`](ref/00-entity-catalog.md). Relevant fields: `price` (the subtracted values) and `recordedAt` (the sort key). No schema issues specific to this sub-label.

## 3. Formula — ⚠️

> **Plain opener:** The subtraction is arithmetically correct, but the label says "quarter" while the code actually computes the delta between any two adjacent records regardless of how far apart they are in time.

| | |
|---|---|
| Source file | `app/(shell)/property/[id]/_components/PropertyValuationPage.tsx` |
| Lines | 126–134 |
| Output | `qoqStr` → `sub` prop on `<KpiCard label="Current Market Value">` |

**Formula (verbatim):**
```ts
const qoqDelta = latest && prev ? latest.price - prev.price : null;
const qoqStr =
  qoqDelta !== null
    ? qoqDelta >= 0
      ? `▲ +$${qoqDelta.toLocaleString("en-US")} since last quarter`
      : `▼ −$${Math.abs(qoqDelta).toLocaleString("en-US")} since last quarter`
    : "No prior record";
```

**Zod validation:** `PropertyValuationSchema.parse(r)` validates `price: z.number().positive()` at FS read boundary. Subtraction is safe — both inputs are guaranteed non-null positive numbers. ✅

**Golden-value check**

| Source | Value |
|---|---|
| VAL-0003 price (latest) | $1,310,000 |
| VAL-0002 price (prev = sorted.at(-2)) | $1,295,000 |
| qoqDelta | +$15,000 |
| qoqStr | "▲ +$15,000 since last quarter" |
| Match? | ✅ (arithmetic) · ⚠️ (label — see F1) |

**Time gap between VAL-0002 and VAL-0003:** Feb 2026 → Mar 2026 = ~1 month. "Last quarter" claim is false with this seed data.

**Robustness notes**
- ✅ Empty valuations → `qoqDelta = null` → `"No prior record"` 
- ✅ One record → `prev = null` → `"No prior record"`
- ✅ `qoqDelta === 0` → `"▲ +$0 since last quarter"` — renders correctly (positive branch)
- ⚠️ Adjacent records 1 day apart → label still says "quarter" (F1)

## 4. Render — ✅

> **Plain opener:** The sub-label reaches the screen through a plain `<p>` tag — no animation, no count-up. Simple and correct.

| | |
|---|---|
| Component | `<PropertyValuationPage>` → `<KpiCard>` |
| Prop chain | `qoqStr` → `sub` prop → `{sub && <p style={{ color: subColor }}>{sub}</p>}` |
| Animation | None — `sub` renders as static text; only `value` (headline) goes through `useCountUp` |
| Colour | `qoqColor`: `"#059669"` (green) if delta ≥ 0, `"#dc2626"` (red) if negative, `"#64748b"` (grey) if null |

**PII / IDOR**
- No sensitive data in this sub-label. Auth shim: page-wide, see **PF2** in [pages/property-id-valuation/audit.md](pages/property-id-valuation/audit.md).

## 5. Consistency — ✅

> **Plain opener:** The delta is consistent with the headline — $1,310,000 − $1,295,000 = $15,000, which matches what the Current Market Value KPI card displays as the delta.

| Identity | Verification | Holds? |
|---|---|---|
| `qoqDelta = latest.price − prev.price` agrees with seed | $1,310,000 − $1,295,000 = $15,000 ✅ | ✅ |
| Colour matches sign | positive delta → green (`#059669`) ✅ | ✅ |
| "No prior record" when only 1 valuation | `prev = sorted.at(-2) = undefined → null` ✅ | ✅ |

## 6. Missing safeties — 3 gaps

> **Plain opener:** Three gaps: the "quarter" label is semantically wrong with short gaps, negative formatting uses an unusual dash character, and the null state colour doesn't signal "incomplete data" strongly enough.

| Gap | Status | Link |
|---|---|---|
| "last quarter" label when records may be days apart | ⚠️ | F1 |
| Negative delta uses "−" (Unicode minus) inconsistently with positive format | 🔵 | F2 |
| `"No prior record"` text is grey-coloured but card doesn't display an icon | 🔵 | F3 |
| Multi-tenant isolation (auth shim) | ⚠️ shim | Page-wide: see **PF2** in pages/property-id-valuation/audit.md |
| Missing audit trail on PropertyValuation mutations | ❌ | Page-wide: see **PF4** in pages/property-id-valuation/audit.md |

## 7. Meaning — ⚠️

> **Plain opener:** The label says "quarter" but the formula delivers "since the previous record" — these are the same only if records happen to be three months apart.

```
Label rendered:           "▲ +$15,000 since last quarter"
Formula chosen:           latest.price − sorted.at(-2).price
User's likely inference:  the change since three months ago
Actual delivery:          change since the immediately prior record (any time gap)
Match?                    ⚠️ ambiguous — correct only when records are ~90 days apart
```

**Counterexample considered:**
> If a user enters valuations weekly, the sub-label would read "▲ +$5,000 since last quarter" for a 7-day change. The label would be actively misleading.

Filed as F1. No new open question needed — this is a design choice that can be resolved by label change alone.

## 8. Findings — 3 items

**Severity:** 🔴 P0 ship-blocker · 🔴 P1 robustness gap · 🟡 P2 schema smell · 🔵 P3 nit
**Confidence:** high (verified) · medium (inferred) · low (subjective)
**Tags:** `[schema]` · `[logic]` · `[render]` · `[consistency]` · `[negative-space]` · `[semantic]`

---

### 🔴 F1 — Label says "quarter" but formula uses adjacent records regardless of time gap
**P1 robustness · confidence: high · `[semantic]`**

**Where:** `app/(shell)/property/[id]/_components/PropertyValuationPage.tsx:130,132`

**Problem:** The string literals `"▲ +$X since last quarter"` and `"▼ −$X since last quarter"` are produced for any two adjacent `PropertyValuation` records. With seed data VAL-0002 (Feb) → VAL-0003 (Mar), the records are 1 month apart. A user who enters monthly snapshots would see "since last quarter" for a 30-day delta — actively misleading.

**Why it matters:** "Quarter" implies 90 days. Displaying it for shorter or longer intervals violates the label promise (§7). The fix is either a label change or a time-gate.

**Fix (label change — simpler):** Replace both string literals with `"since last valuation"`. Accurate for all time gaps.

**Fix (time-gate — stricter):** Compute `gapDays = (latest.recordedAt - prev.recordedAt) / 86_400_000`. If `gapDays < 60`, label as `"since ${prev.month}"`; if 60–135, `"since last quarter"`; if 136–400, `"since last year"`.

---

### 🟡 F2 — Negative delta uses Unicode minus "−" (U+2212) while positive uses ASCII "+"
**P2 schema smell · confidence: high · `[render]`**

**Where:** `app/(shell)/property/[id]/_components/PropertyValuationPage.tsx:132`

**Problem:** Positive delta: `` `▲ +$${qoqDelta.toLocaleString("en-US")}` `` (ASCII `+`). Negative delta: `` `▼ −$${...}` `` — the "−" is Unicode U+2212 (MINUS SIGN), not ASCII U+002D HYPHEN-MINUS. Inconsistent character encoding across the two branches.

**Why it matters:** Screen readers may pronounce U+2212 differently from "-". Copy-pasting the rendered string would produce different characters. Minor but easy to fix.

**Fix:** Use the same character in both branches: either `"▼ -$X"` (ASCII hyphen) or ensure both are intentionally styled differently (document the choice).

---

### 🔵 F3 — Null case "No prior record" uses grey colour without a visual indicator
**P3 nit · confidence: low · `[render]`**

**Where:** `app/(shell)/property/[id]/_components/PropertyValuationPage.tsx:132,134`

**Problem:** When `qoqDelta === null`, `qoqStr = "No prior record"` and `qoqColor = "#64748b"` (grey). The text appears below the headline with no icon, making it visually identical to a sub-label that happens to be grey-coloured. A `Minus` or `HelpCircle` icon would make the "no data" state more distinct.

**Why it matters:** Very low severity — primarily aesthetic. Properties with only one valuation record would show this state.

**Fix:** Optionally prefix with an icon: `"— No prior record"` or render a conditional `<Minus>` icon alongside the text.

## 9. Fix Log

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| — | — | — | _No fixes yet._ | — |

---

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
selector: |
  <PropertyValuationPage> <KpiCard label="Current Market Value">
  sub={qoqStr}
sources:
  - path: lib/data/types/property-valuation.ts
    sha: 66eac77416f0cc2de1b7871b38896c17e4156ef9
  - path: app/(shell)/property/[id]/valuation/queries.ts
    sha: e7a521135d3872161f96a9df58e619543d6ffebe
  - path: app/(shell)/property/[id]/_components/PropertyValuationPage.tsx
    sha: 409bb68a6ab50873b896aaba2cc69c5b7a70610e
```

</details>

<details>
<summary>📋 Manual verification commands</summary>

```bash
# Delta between VAL-0002 and VAL-0003
node -e "console.log('qoqDelta:', 1310000 - 1295000, '→ string:', '▲ +\$' + (15000).toLocaleString('en-US') + ' since last quarter')"

# Time gap in days between VAL-0002 and VAL-0003
node -e "console.log('gap days:', (1775001600000 - 1772236800000) / 86400000)"
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-05
- Initial audit (fresh write). Surface newly wired in Phase 6.0.
- Golden-value check ✅: seed delta $15,000 matches formula output.
- Key finding F1: "since last quarter" label semantically incorrect for adjacent-record formula.
- PF2 (auth shim) and PF4 (audit trail) cited from page audit; not restated.

</details>
