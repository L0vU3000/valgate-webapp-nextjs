# Pages — AI ref

> Distilled from `../ref/09-page-wiring-status.md`. Tables only. If conflict, `09` wins.

## Status table

| # | Route | WIRED | HARDCODED | PARTIAL | Verdict | Phase |
|---|---|---|---|---|---|---|
| 1 | /portfolio | 16 | 0 | 0 | ✅ fully wired | 6.0 + YoY Rev 2 |
| 2 | /property/[id]/overview | 16 | 0 | 0 | ✅ fully wired | 6.1 + 6.2 + 6.8 + 8.8 |
| 3 | /property/[id]/safety | 16 | 9 | 3 | ⏸️ DEFERRED | — |
| 4 | /property/[id]/ownership | 31 | 1 | 0 | ✅ fully wired | 6.5 + 6.6 |
| 5 | /property/[id]/valuation | 10 | 12 | 0 | 🟡 partial | 6.0 valuation Rev 2 |
| 6 | /property/[id]/rental | 32 | 0 | 0 | ✅ fully wired | 6.1+6.2+6.3+6.7+6.8 |
| 7 | /property/[id]/location | 15 | 7 | 0 | 🟡 partial | 6.4 |
| 8 | /property/[id]/documents | 16 | 1 | 0 | ✅ fully wired | 6.3 + 6.7 |
| 9 | /analytics | 28 | 2 | 1 | ✅ fully wired | 8.1 |
| 10 | /rental | ~58 | ~16 | 1 | 🟡 partial | 8.2 + 6.8b |
| 11 | /directory | 99 | 0 | 0 | ✅ fully wired | 8.4 |
| 12 | /directory/[id] | 11 | 0 | 0 | ✅ fully wired | 8.4b |
| 13 | /estate-planning | 18 | 0 | 2 | ✅ fully wired | 8.5 |
| 14 | /profile | 14 | 0 | 0 | ✅ fully wired | 8.6 |
| 15 | /settings | 16 | 3 | 0 | ✅ fully wired | 8.7 |

✅ Fully wired (zero/CHROME-only HARDCODED) · 🟡 Partial · ⏸️ Deferred

## What's still HARDCODED, by route

| Route | Remaining HARDCODED | Blocker |
|---|---|---|
| /portfolio | none | — |
| /property/[id]/overview | none | — |
| /property/[id]/safety | 9 KPI rows (78.6%, 5/6 current, "Compliant", 18 days, "Fire safety · Apr 29 2026", 2, "1 medium · 1 low") | KPI derivation pending; user deferred. Schema gaps A/B/C tracked. |
| /property/[id]/ownership | row 31 OwnershipDocument status badge "Current" | A10: `OwnershipDocument.status` field missing |
| /property/[id]/valuation | rows 18–23 Market Insight (6) · 24–25 Comparables (2) · 27 Investment Performance (4) · 29 Value Drivers · 31 Appraisal | MarketSnapshot + PropertyComparable not built (Phase 6.9; Q4.Q resolved internal aggregation) |
| /property/[id]/rental | none | — |
| /property/[id]/location | row 9 map placeholder · 19–23 corner coords + comp sales · 27 ExpandedView Investment | PropertyComparable not built; PF5 absent address card; PF6 DefaultView hardcoded identity (trivial fix) |
| /property/[id]/documents | row 22 upload demo file list | deliberate UX placeholder |
| /analytics | row 18 KPI change badges "—" · row 25 timeline "MARCH 2024" | no prior-period query (P3 nits) |
| /rental | hero sparkline `[40,55,45,70,85,96]` · LeaseTable yield ranking | Q4.J point-in-time only (sparkline deferred); PF4 Phase 6.9 PropertyComparable |
| /directory | none | — |
| /directory/[id] | none | — |
| /estate-planning | 2 PARTIAL action stubs (Generate Report, Download Summary, Review All) | PDF infrastructure |
| /profile | none | — |
| /settings | NOTIFICATION_ROWS labels · HARD_DEFAULTS · 3 SelectOption arrays | all are CHROME config, not data |

## Entity reads per route (from `queries.ts`)

| Route | Entities |
|---|---|
| /portfolio | Property, Payment, Lease, PropertyValuation |
| /property/[id]/overview | PropertyValuation, Lease, Tenant, Payment, Expense, Notification, MaintenanceItem |
| /property/[id]/safety | Inspection, Certification, SafetyRisk, EmergencyContact |
| /property/[id]/ownership | OwnershipDocument, OwnershipHistory, CoOwner, OwnershipRecord, Lease |
| /property/[id]/valuation | PropertyValuation |
| /property/[id]/rental | Lease, Tenant, Payment, Expense, Document, Folder, MaintenanceItem |
| /property/[id]/location | LandParcel |
| /property/[id]/documents | Document, Folder |
| /analytics | Property, Payment, Lease, MaintenanceItem, PropertyValuation, Expense |
| /rental | Lease, Payment, MaintenanceItem, Property, Expense |
| /directory | Professional |
| /directory/[id] | Professional (single get) |
| /estate-planning | Property, Successor, Document, SuccessorPropertyAssignment, EstateActivityEvent |
| /profile | UserProfile |
| /settings | NotificationPreference, UserProfile |

## NOT yet audited

- `/` (home)
- `/add-property` (wizard)
- `/login`, `/register`, `/auth/*`

---

_Last sync: 2026-05-07. Source: `../ref/09-page-wiring-status.md`._
