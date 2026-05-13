---
slug: property-id-ownership--ownership-document-status
route: /property/[id]/ownership
data_point: "OwnershipDocument status badge — row 31"
verdict: "✅ Wired · 1 finding (P1 systemic)"
revision: 1
date: 2026-05-11
template: lite
---

> **Plain English:** The status badge in the ownership documents table (the green "Current" pill on each row) was previously hardcoded to always show "Current" regardless of what was stored. This sprint adds a `status` field to the `OwnershipDocument` schema (`"Current" | "Superseded" | "Archived"`), seeds all 3 existing documents with `status: "Current"`, and wires the badge to `doc.status ?? "Current"` so it can vary when the document lifecycle changes.

## TL;DR

- **Row 31 (Status badge):** reads `doc.status ?? "Current"` — "Current" for all 3 seed documents ✅; falls back to "Current" if field absent ✅
- Schema: `OwnershipDocument.status?: z.enum(["Current", "Superseded", "Archived"])` — optional for backwards compatibility ✅
- All 3 existing ODOC JSON files updated with `"status": "Current"` ✅
- **1 finding:** F1 (P1 systemic)

## §1 — Surface inventory (1 surface)

| Row | Surface | Source field | Empty state | Value for ODOC-0001 |
|---|---|---|---|---|
| 31 | Documents table "Status" badge | `doc.status ?? "Current"` | `"Current"` (default) | "Current" |

## §2 — Source trace

```
ODOC-0001/core.json → {status: "Current"}
  → db.ownershipDocuments.listByProperty(userId, propertyId)   lib/data/db/ownership-documents.ts
  → OwnershipDocumentSchema.parse()                             lib/data/types/ownership-document.ts
  → getOwnershipPageData() ownershipDocuments                   ownership/queries.ts
  → PropertyOwnershipPage ownershipDocuments prop               _components/PropertyOwnershipPage.tsx
  → documents table row → {doc.status ?? "Current"}            row 31
```

## §3 — Findings

🔴 **F1 — Full OwnershipDocument object passes RSC boundary (P1 systemic)** — `ownershipDocuments` is the full entity array including `userId` on each record. Same systemic PF1 finding as other entities on this page. Fix: narrow to `Pick<OwnershipDocument, "id" | "name" | "type" | "date" | "owner" | "status">` in queries.ts. Deferred to PF1 narrowing pass.

## §4 — Revision history

| Rev | Date | Change |
|---|---|---|
| 1 | 2026-05-11 | Initial write — Phase 8.7. `status` field added to schema + 3 seed records. Badge wired to `doc.status ?? "Current"`. |
