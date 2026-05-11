---
slug: estate-planning--action-stubs
route: /estate-planning
data_point: "Action stubs (rows 3, 11, 20, 23, 24) — Generate Portfolio Report, Download Summary, Review All, MoreHorizontal, footer buttons + copy"
verdict: "✅ View Analytics and Add Beneficiary WIRED (see notes) · 5 stub surfaces remain CHROME · Q4.W resolved for v1 scope · 0 findings"
revision: 1
date: 2026-05-07
template: lite
---

# Audit — Action stubs
_Route: /estate-planning — rows 3 (partial), 11 (partial), 20, 23, 24_
_Last revised: 2026-05-07 · Revision 1_

## §1 — What these surfaces show

> Several buttons and copy elements on the page are static stubs: they render correctly but have no functionality beyond opening a dialog or navigating. This report covers all stub/chrome action surfaces. Note: two actions that were originally all-CHROME (View Analytics and Add Beneficiary) are now wired — those are documented here for completeness, with their rows marked PARTIAL.

| Inventory row | Element | Class | Status |
|---|---|---|---|
| 3a | "View Analytics" header button | PARTIAL | **WIRED** — `router.push("/analytics")` |
| 3b | "Generate Portfolio Report" header button | PARTIAL (stub) | CHROME — no handler |
| 11a | "Download Summary" panel button | PARTIAL (stub) | CHROME — no handler |
| 11b | "Add Beneficiary" panel button | PARTIAL | **WIRED** — opens Add Beneficiary dialog |
| 11c | "Review All" panel button | PARTIAL (stub) | CHROME — no handler |
| 20 | MoreHorizontal (successor row action) | CHROME | CHROME — no handler |
| 23 | Panel footer copy | CHROME | CHROME — static text, softened per Q5.W |
| 24a | "View full history" footer button | CHROME | CHROME — no handler |
| 24b | "Download all documents" footer button | CHROME | CHROME — no handler |

**Q4.W resolution (Revision 2):** The following actions are wired in v1: View Analytics (→ `/analytics`), Add Beneficiary (full form dialog + `addSuccessorAndAssign` server action). The remaining actions (Generate Portfolio Report, Download Summary, Review All, MoreHorizontal, View full history, Download all documents) are deferred — their product scope is undefined and no action handler is wired.

## §2 — Where each value comes from

**Row 3a — View Analytics (WIRED):**
`SuccessionPage.tsx:390-395`:
```tsx
<button onClick={() => router.push("/analytics")}>
  <BarChart2 className="size-4" />
  View Analytics
</button>
```
Navigates to `/analytics`. No data derivation needed.

**Row 3b — Generate Portfolio Report (CHROME):**
`SuccessionPage.tsx:396-400`:
```tsx
<button className="...">
  <TrendingUp className="size-4" />
  Generate Portfolio Report
</button>
```
No `onClick` — static stub.

**Row 11b — Add Beneficiary (WIRED):**
`SuccessionPage.tsx:473-479`:
```tsx
<button onClick={openAddDialog}>
  <UserPlus className="size-3.5" />
  Add Beneficiary
</button>
```
Opens `<Dialog>` with form fields (name, relation, role, share, property assignment). On submit: `handleAddBeneficiary` → `addSuccessorAndAssign(successor, propertyIds)` → `router.refresh()`.

**Rows 11a, 11c, 20, 24a, 24b (CHROME):**
All render with correct visual styling but have no `onClick` handlers — pure stubs.

**Row 23 — Panel footer copy (CHROME):**
`SuccessionPage.tsx:665`: `"Your estate planning data is kept private in Valgate."` — static text; PF3 softened per Q5.W.

## §3 — Seed verification

No seed verification applicable for stub surfaces. For Add Beneficiary (WIRED):

```bash
# Confirm addSuccessorAndAssign creates SPA records (check actions.ts)
grep -n 'successorPropertyAssignments.create\|estateActivityEvents.create' \
  'app/(shell)/estate-planning/actions.ts'

# Confirm Add Beneficiary dialog form fields in component
grep -n 'addDialogOpen\|handleAddBeneficiary\|openAddDialog' \
  'app/(shell)/estate-planning/_components/SuccessionPage.tsx'
```

## §4 — Findings

> No issues with stub surfaces — all render correctly and are consistent with their CHROME classification. Wired actions (View Analytics, Add Beneficiary) correctly functional.

**0 findings.** Deferred stub actions are by product design (Q4.W).

**Deferred stubs — for reference:**
- **Generate Portfolio Report** — awaits product decision on format (PDF export? server-side generation?). No blocker identified beyond product scope.
- **Download Summary** — per-property estate plan export. Needs EstatePlan document generation, likely PDF.
- **Review All** — batch review flow. Product scope undefined.
- **MoreHorizontal** (successor row) — per-beneficiary actions (Edit, Remove, Re-verify). Q4.W deferred.
- **View full history** — full activity log view. Depends on Q4.P activity log pagination.
- **Download all documents** — bulk estate document export. Depends on file storage implementation.

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-07
- Post-wiring audit of action stubs. View Analytics and Add Beneficiary now WIRED. 5 stub surfaces remain CHROME. Q4.W resolved for v1 scope. 0 findings.

</details>
