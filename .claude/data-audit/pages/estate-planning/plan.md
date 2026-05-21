---
revision: 3
date: 2026-05-07
status: "post-wiring complete · close-out synced"
route: /estate-planning
slug: estate-planning
---

# Page Plan — `/estate-planning`

> Sub-phase 2 (Wiring) and sub-phase 3 (Post-Wiring close-out) are complete for the current estate-planning scope.
>
> See `audit.md` for the post-wiring page snapshot.

---

## 1. Summary

| | |
|---|---|
| Route | `/estate-planning` |
| Latest status | post-wiring complete |
| Current mix | 18 WIRED · 0 HARDCODED · 2 PARTIAL · 6 CHROME |
| Primary wins | KPI derivations wired, property-scoped successors, estate docs wired, activity timeline wired |
| Remaining scope | action stubs (`Generate Portfolio Report`, `Download Summary`, `Review All`, row menu, footer actions) |

---

## 2. Q Resolution Gate (closed)

| Q | Decision | Wiring outcome |
|---|---|---|
| Q4.V | join-table assignment model (`successorId` x `propertyId`) | `successor-property-assignments` collection added; table now scopes per selected property |
| Q4.C | use existing `Document` entity | estate docs resolved as `Document.category = "Estate"` |
| Q3.R | keep Completion KPI; replace others with better operational KPIs | stats now derived from assignments/docs/events/verification |
| Q3.G | enforce primary-share validation | `addSuccessorAndAssign` blocks primary totals over 100% per property |
| Q4.P | keep estate activity log | `estate-activity-events` collection added; timeline wired from events |
| Q3.F | remove old Cambodia caption | replaced with neutral assignment/verification copy |
| Q5.W | soften encryption claim | copy softened to "Secured by Valgate" / private-data wording |

---

## 3. Entity Backlog (post-wiring state)

| Entity / gap | Status | Notes |
|---|---|---|
| Successor | shipped, fully wired for this page | direct reads + verified status + per-property scoping via assignment join |
| Successor-Property assignment | shipped | implemented as `successor-property-assignments` |
| Estate activity event | shipped | implemented as `estate-activity-events` |
| Document (estate category) | shipped for this page | estate docs + estate-document KPI now sourced from `Document` |
| EstatePlan formal entity | deferred | v1 uses derivation checks; no separate persistent EstatePlan record yet |

---

## 4. Post-Wiring Audit Bundle (completed)

| Bundle | Scope | Result |
|---|---|---|
| stats + property state | KPI cards + property list + status panel | wired to derived data |
| successor table + verification | beneficiary rows + count + verified badge | wired and corrected |
| estate documents | doc cards + KPI surface tie-in | wired from `Document` |
| recent activity | timeline events | wired from `estate-activity-events` |
| action stubs | header/panel/footer action buttons | partial: core actions wired, exports/review/history still stubs |

---

## 5. Fix Log

| Finding | Status | Phase | What changed | Commit |
|---|---|---|---|---|
| PF1 — mixed real data and literals in estate payload | ✅ Resolved | 8.5-Wiring | `queries.ts` now derives `stats/properties/documents/timeline` from DB entities and derivations | pending |
| PF2 — verified flag ignored (always green Verified) | ✅ Resolved | 8.5-Wiring | table status now branches on `s.verified` and shows Unverified state correctly | pending |
| PF3 — unbacked encryption/security claims | ✅ Resolved | 8.5-Wiring | copy softened (`Secured by Valgate`; private-data wording) | pending |
| PF4 — assignment action stub/no-op | ✅ Resolved | 8.5-Wiring | `addSuccessorAndAssign` writes assignments + activity events; pre-validates primary-share overflow | pending |
| PF5 — table not scoped by selected property | ✅ Resolved | 8.5-Wiring | successors filtered by assignment relation for selected property | pending |
| PF6 — auth shim gap | 🔵 Deferred | backend phase | still `demo-user` auth shim until Convex/real auth migration | pending |

