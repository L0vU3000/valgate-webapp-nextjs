---
slug: estate-planning--estate-documents
route: /estate-planning
data_point: "Estate Documents cards (row 21) — document name, meta (date · type · size), download icon"
verdict: "✅ WIRED — Documents filtered by category='estate'; per-property scoped; empty-state shown · Q4.C resolved · 0 findings"
revision: 1
date: 2026-05-07
template: full
---

# Audit — Estate Documents cards
_Route: /estate-planning — row 21_
_Last revised: 2026-05-07 · Revision 1_

## §1 — What this surface shows

> Within the right panel for the selected property, an "Estate Documents" section shows document cards. Each card displays the document name, a meta line with upload date + file type + file size, and a download icon button. An empty state is shown when the selected property has no estate-category documents. The section is scoped to the selected property — switching properties changes the document list.

**Inventory row:** 21
**Classification:** HARDCODED (Rev 1 — 2 hardcoded placeholders in `queries.ts`) → WIRED (Rev 2)
**Q-gate resolved:** Q4.C (EstateDocument vs Document entity) — resolved by using `Document` entity with `category="estate"` (case-insensitive filter), not a separate entity.

## §2 — Where the value comes from

**Data path:** `queries.ts:141` → `db.documents.list(userId)` at `queries.ts:147`:
```typescript
const estateDocsRaw = documentsRaw.filter(
  (doc) => doc.kind === "document" && (doc.category ?? "").toLowerCase() === "estate",
);
const estateDocsByProperty = new Map<string, typeof estateDocsRaw>();
for (const doc of estateDocsRaw) {
  const docs = estateDocsByProperty.get(doc.propertyId) ?? [];
  docs.push(doc);
  estateDocsByProperty.set(doc.propertyId, docs);
}
```

**Mapped to `EstateDocument[]`** (`queries.ts:272-280`):
```typescript
const estateDocuments: EstateDocument[] = estateDocsRaw
  .sort((a, b) => b.uploadedAt - a.uploadedAt)
  .map((doc, index) => ({
    id: doc.id,
    propertyId: doc.propertyId,
    name: doc.name.replace(/_/g, " "),
    meta: estateDocumentMeta(doc),
    iconBg: index % 2 === 0 ? "#ffdad6" : "#c3c7cd",
  }));
```

**Component filter** (`SuccessionPage.tsx:235-238`):
```tsx
const propertyDocuments = useMemo(
  () => (propertyId ? documents.filter((doc) => doc.propertyId === propertyId) : []),
  [documents, propertyId],
);
```

## §3 — Formula / derivation

**`meta` string** (`queries.ts:133-139`):
```typescript
function estateDocumentMeta(doc): string {
  const ext = doc.extension ? doc.extension.toUpperCase() : "FILE";
  const size = typeof doc.sizeBytes === "number" ? formatBytes(doc.sizeBytes) : "Unknown size";
  return `${formatDate(doc.uploadedAt)} • ${ext} • ${size}`;
}
```
Example: `"Apr 12, 2026 • PDF • 2.3 MB"`

**Name display:** `doc.name.replace(/_/g, " ")` — converts snake_case filenames to display names (e.g. `"Will_And_Testament.pdf"` → `"Will And Testament.pdf"`).

**Icon background:** Alternating pink (`#ffdad6`) and grey (`#c3c7cd`) by display index.

**Sort order:** Descending by `uploadedAt` — most recent document shown first.

## §4 — Consistency check

**Category filter case-insensitivity:** `(doc.category ?? "").toLowerCase() === "estate"` matches both `"estate"` and `"Estate"` (as used in seed). Robust to casing variation.

**Per-property scoping:** `propertyDocuments` filters by `doc.propertyId === propertyId`. Documents for PROP-0001 don't appear when PROP-0011 is selected, and vice versa.

**Estate Documents KPI ↔ document list:** The KPI (row 7) shows `estateDocuments.length` — the total count across ALL properties (not the selected property). The panel list shows only the selected property's documents. These are intentionally different scopes; both are correctly computed.

## §5 — Missing safeties

**Empty state:** `SuccessionPage.tsx:594-597` — when `propertyDocuments.length === 0`, renders:
```tsx
<div className="col-span-2 rounded-xl border border-[#e8eaed] bg-[#f8fafc] p-4 text-sm text-[#434655]">
  No estate documents are linked to this property yet.
</div>
```
Shown for all 14 properties with no estate docs in seed.

**`doc.sizeBytes` undefined:** `typeof doc.sizeBytes === "number"` guard in `estateDocumentMeta` — falls back to `"Unknown size"`.

**`doc.extension` undefined:** `doc.extension ? doc.extension.toUpperCase() : "FILE"` — falls back to `"FILE"`.

**Download button:** Currently a static icon button with no `onClick` handler — no download functionality. The button renders correctly but clicking does nothing. This is consistent with the general stub-action pattern for document management (see `estate-planning--action-stubs`).

## §6 — Meaning of the value

Estate documents are legal instruments (wills, deeds, trusts) associated with a specific property's succession plan. The category filter `category="estate"` scopes the document list to estate-relevant files only — a property may also have inspection reports, lease agreements, etc. that are excluded. The display name cleanup (`_` → space) makes stored filenames readable in the UI without requiring a separate `displayName` field.

The Q4.C decision (use `Document` with `category` tag vs. a separate `EstateDocument` entity) was resolved in favor of the existing `Document` entity. The tradeoff: estate-specific metadata (witnesses, notarization date, jurisdiction) cannot be stored without a schema extension or a separate entity in the future.

## §7 — Seed verification

**Estate documents in seed:**

| Doc ID | Name | Category | Property | Size | Uploaded |
|---|---|---|---|---|---|
| DOC-0009 | Will_And_Testament.pdf | Estate | PROP-0001 | 2,400,000 B (≈2.3 MB) | 1776159000000 → Apr 12, 2026 |
| DOC-0010 | Estate_Transfer_Deed.pdf | Estate | PROP-0011 | 1,100,000 B (≈1.0 MB) | 1778062500000 → May 3, 2026 |

**Expected rendering — PROP-0001 selected:**
- 1 card: "Will And Testament.pdf" | "Apr 12, 2026 • PDF • 2.3 MB" | pink icon bg

**Expected rendering — PROP-0011 selected:**
- 1 card: "Estate Transfer Deed.pdf" | "May 3, 2026 • PDF • 1.0 MB" | pink icon bg

**Expected rendering — any other property:** Empty state "No estate documents are linked to this property yet."

**KPI (row 7):** Estate Documents = 2 (total across all properties)

```bash
# Confirm DOC-0009 and DOC-0010 seed data
node -e "
['DOC-0009','DOC-0010'].forEach(id => {
  const d = require('./public/data/users/demo-user/documents/' + id + '/core.json');
  console.log(d.id, '| name:', d.name, '| category:', d.category,
    '| property:', d.propertyId, '| size:', d.sizeBytes, '| uploaded:', new Date(d.uploadedAt).toISOString());
});"

# Confirm no other estate-category documents exist in seed
node -e "
const fs = require('fs');
const docDir = './public/data/users/demo-user/documents/';
const docs = fs.readdirSync(docDir)
  .map(id => JSON.parse(fs.readFileSync(docDir + id + '/core.json')))
  .filter(d => (d.category ?? '').toLowerCase() === 'estate');
console.log('Estate docs found:', docs.length);
docs.forEach(d => console.log(d.id, d.name, d.propertyId));"
```

## §8 — Findings

> Estate document cards correctly source from DB Documents with category filter. Per-property scoping correct. Empty state present. Q4.C resolved. 0 findings.

**0 findings.** PF6 deferred (auth shim applies to `db.documents.list(userId)`).

**Note for future:** If estate-specific metadata (witnesses, notarization) is needed, Q4.C may be revisited to introduce an `EstateDocument` extension. The current `category` approach is sufficient for v1.

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-07
- Post-wiring audit of row 21. Q4.C resolved. WIRED. Empty state verified. 0 findings.

</details>
