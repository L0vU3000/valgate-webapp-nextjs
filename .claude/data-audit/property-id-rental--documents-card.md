---
slug: property-id-rental--documents-card
data_point: "Documents card — 3-item list (name, status label, date)"
route: /property/[id]/rental
revision: 1
date: 2026-05-06
verdict: "✅ Correct · 3 findings (1 P1, 1 P2, 1 P3)"
---

# Audit — Documents Card on /property/[id]/rental
_Last revised: 2026-05-06 · Revision 1_

## TL;DR
- ✅ Correct — shows top-3 documents for PROP-0001 by uploadedAt DESC; status labels derived from category + age match seed data
- ⚠️ 3 findings · 1 P1 (Document[] userId to browser) · 1 P2 (untyped category match is typo-fragile) · 1 P3 ("Expiring" uses upload date as proxy for policy expiry)
- 🔧 Top fix: narrow Document[] in `rental/queries.ts` to exclude userId (F1); resolve Q5.R to close the category enum (F2)
- 📄 Page audit: see [pages/property-id-rental/audit.md](pages/property-id-rental/audit.md)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What triggers the Documents card? | — |
| 2 | Entity | Is the data well-organised? | ✅ |
| 3 | Formula | Does the status derivation match the seed? | ✅ |
| 4 | Render | How do documents reach the user? | ⚠️ |
| 5 | Consistency | Does the card count match the subtitles? | ✅ |
| 6 | Missing safeties | What should exist but doesn't? | 1 gap |
| 7 | Meaning | Do status labels promise what the logic delivers? | ⚠️ |
| 8 | Findings | What to fix | 3 items |
| 9 | Fix Log | What has been fixed since the initial audit? | — |

---

## 1. Snapshot — ✅

> **Plain opener:** The right column of the rental page has a "Documents" card showing the three most recently uploaded documents for the property. Each row shows the file name, an optional status label (Active or Expiring), and a formatted date. If the property has no documents, the card shows a "—" placeholder. This card was previously a hardcoded 3-item array literal; it was wired to real Document seeds in Phase 6.3.

| | |
|---|---|
| Where | `/property/PROP-0001/rental`, right column "Documents" card |
| Label | _three document rows, no explicit count label_ |
| Main formula | `documents.slice().sort((a, b) => b.uploadedAt - a.uploadedAt).slice(0, 3)` → top-3 most-recent |
| Status formula | `getDocStatusInfo(doc)` — Rental → "Active"; Insurance + >1yr → "Expiring"; otherwise "" |
| Reads from | `documents: DbDocument[]` prop filtered by propertyId in `rental/queries.ts` |
| Edge cases | 0 documents → renders `<p className="text-[13px] text-slate-400">—</p>` |

## 2. Entity — ✅

| Field | Notes |
|---|---|
| `Document.name` | Direct read — used as the row title |
| `Document.category` | Untyped `z.string().optional()` — used for status branch; see Q5.R |
| `Document.uploadedAt` | Unix ms — sorted DESC for top-3 selection; formatted for date label |

## 3. Formula — ✅

**Sort + slice:**
```ts
documents
  .slice()                                    // avoid mutating prop
  .sort((a, b) => b.uploadedAt - a.uploadedAt)
  .slice(0, 3)                                // top-3 most recent
```

**Status derivation (`getDocStatusInfo`):**
```ts
function getDocStatusInfo(doc: DbDocument): { statusLabel: string; statusClass: string; dateLabel: string } {
  const dateStr = new Date(doc.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (doc.category === "Rental") {
    return { statusLabel: "Active", statusClass: "text-emerald-700", dateLabel: `Signed ${dateStr}` };
  }
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;
  if (doc.category === "Insurance" && Date.now() - doc.uploadedAt > oneYearMs) {
    const expStr = new Date(doc.uploadedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" });
    return { statusLabel: "Expiring", statusClass: "text-amber-600", dateLabel: `Exp: ${expStr}` };
  }
  return { statusLabel: "", statusClass: "", dateLabel: dateStr };
}
```

**Golden-value check (PROP-0001, now = 2026-05-06)**

Documents for PROP-0001, sorted by `uploadedAt` DESC:

| Rank | ID | Name | uploadedAt | category | statusLabel | dateLabel |
|---|---|---|---|---|---|---|
| 1 | DOC-0007 | Property_Tax_Return_2026.xlsx | 2025-03-28 | Tax | "" | Mar 28, 2025 |
| 2 | DOC-0006 | Insurance_Policy_2025.pdf | 2025-03-01 | Insurance | "Expiring" (>1yr) | Exp: Mar 2025 |
| 3 | DOC-0005 | Move_In_Checklist_2025.pdf | 2025-02-27 | Rental | "Active" | Signed Feb 27, 2025 |

Expected card render (PROP-0001):
1. `Property_Tax_Return_2026.xlsx` · Mar 28, 2025
2. `Insurance_Policy_2025.pdf` · Expiring · Exp: Mar 2025
3. `Move_In_Checklist_2025.pdf` · Active · Signed Feb 27, 2025

Result: ✅

## 4. Render — ⚠️

| | |
|---|---|
| Component | `<PropertyRentalPage>` right column — conditional map over sorted documents |
| Prop chain | `rental/queries.ts` → `db.documents.list(userId)` → filter `propertyId` → `documents[]` → sort + slice → `getDocStatusInfo` → row |
| Hidden state | `documents.length === 0` → `<p className="text-[13px] text-slate-400">—</p>` |

**PII / IDOR**
- `Document[]` includes `userId` field shipped to the browser; see **F1** below.
- Auth shim: see **PF2** in [pages/property-id-rental/audit.md](pages/property-id-rental/audit.md).

## 5. Consistency — ✅

| Identity | Verification | Holds? |
|---|---|---|
| Card always shows at most 3 items | `.slice(0, 3)` after sort | ✅ |
| Sort order (most-recent first) | `b.uploadedAt - a.uploadedAt` — DESC | ✅ |
| Empty state matches file convention | `"—"` — same as Phase 6.1/6.2 empty states in this file | ✅ |

## 6. Missing safeties — 1 gap

| Gap | Status | Link |
|---|---|---|
| `userId` in `Document[]` shipped to browser | ❌ | F1 |

## 7. Meaning — ⚠️

| Label | Formula | User's inference | Match? |
|---|---|---|---|
| "Active" (Rental docs) | `category === "Rental"` | "This rental document is in effect" | ✅ — reasonable approximation |
| "Expiring" (Insurance docs > 1yr) | `category === "Insurance" && age > 1yr` | "This insurance is due for renewal" | ⚠️ — uses upload date as proxy for policy expiry; see F3 |
| "" (all other) | neither condition | "No special status" | ✅ |

## 8. Findings — 3 items

---

### 🔴 F1 — `userId` shipped to browser in `Document[]`
**P1 robustness · confidence: high · `[render]`**

`rental/queries.ts` returns `documents: Document[]` without narrowing. Every `Document` carries `userId`. Same pattern as PF1 in [pages/property-id-rental/audit.md](pages/property-id-rental/audit.md) (Property) and PF1 in [pages/property-id-documents/audit.md](pages/property-id-documents/audit.md) (Document+Folder). Fix: add a `DocumentCardItem` type picking only `{ id, name, category, uploadedAt }` in the rental queries narrowing layer.

---

### 🟡 F2 — Status derivation relies on untyped `category` string; typos produce silent mismatch
**P2 schema smell · confidence: high · `[logic]`** — _see Q5.R_

`getDocStatusInfo` branches on `doc.category === "Rental"` and `doc.category === "Insurance"`. `Document.category` is `z.string().optional()` — no enum constraint. A seed with `"rental"` (lowercase) or `"rental agreement"` silently falls to the default branch and renders no status label. This won't cause a crash but produces invisible incorrect UX. Fix: resolve Q5.R by closing `category` to `z.enum(["Title","Sales","Tax","Rental","Photos","Insurance"])` and updating seeds to match.

---

### 🔵 F3 — "Expiring" label uses upload date as proxy for insurance policy expiry
**P3 nit · confidence: high · `[semantic]`**

`doc.category === "Insurance" && Date.now() - doc.uploadedAt > oneYearMs` uses 1 year after upload as a heuristic for "policy is expiring." Insurance policies have explicit expiry dates; this heuristic could flag an active 2-year policy as "Expiring" or miss a policy uploaded close to its real expiry. Acceptable as a v1 approximation, but the derivation rule should be documented in the UI or replaced with a real `expiryDate` field on Document when the schema is tightened. No schema change in scope for Phase 6.3.

---

## 9. Fix Log

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| — | — | — | _No fixes yet._ | — |

---

<details>
<summary>🔍 Source files & hashes</summary>

```yaml
sources:
  - path: lib/data/types/document.ts
    sha: f5839bbe034bf437a08fd3ddf06292a3aed13373
  - path: lib/data/db/documents.ts
    sha: 2d6ecf3ddea37acfe3e59ddcc16ec7e75c8af2ee
  - path: app/(shell)/property/[id]/rental/queries.ts
    sha: 3a3603e8108b9326f109a45784f8e4eb1b2c5727
  - path: app/(shell)/property/[id]/rental/page.tsx
    sha: a77c6477c66eeecfcd9f844a2dd138ccdc49c0e0
  - path: app/(shell)/property/[id]/_components/PropertyRentalPage.tsx
    sha: bfb87b4668543208b609974be41d8ec214f1cdd8
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-06
- Initial audit. Surface wired in Phase 6.3 (replaced inline 3-item array literal).
- Golden-value check ✅: top-3 docs for PROP-0001 are Tax (Mar 28)/Insurance (Mar 1)/Rental (Feb 27); status labels match `getDocStatusInfo` branches.
- 3 findings: F1 (userId leak), F2 (untyped category match), F3 (upload-date proxy for expiry).

</details>
