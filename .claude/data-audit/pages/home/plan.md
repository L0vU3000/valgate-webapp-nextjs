---
slug: home
route: /
phase: 10
status: audit-complete
last_updated: 2026-05-14
---

# Plan — / (Home / Map)
_Phase 10: Audit-only · Phase 10.1 (wiring) to be planned after Q-gate_

_See [audit.md](./audit.md) for the surface inventory and PFn findings this plan acts on._

---

## 1. Entity Backlog

> **Plain summary:** No missing entities are needed to wire the home page. All entities it touches (`Property`, `Document`) already exist in the local-db layer. The only gaps are: a formula drift (uses `p.health` instead of weighted Progress), an absent narrowing type (`HomeListItem`), and a missing Document query in `CommandPalette`.

| Entity | Status | Gap | Unblocks |
|---|---|---|---|
| `Property` | ✅ Exists | Formula drift: `p.health` vs weighted Progress (`queries.ts:27`) | PF5 fix (Q3.S resolution first) |
| `Document` | ✅ Exists | Not queried in `getHomePageData()` for CommandPalette | PF7 fix |
| `HomeListItem` | ❌ Missing type | No narrowing shape for home/map; `MapView` gets full `Property` | PF3 fix |

**No new entities required for Phase 10.1.**

---

## 2. Open Questions (Q-gate before Phase 10.1)

These two questions block specific fixes in Phase 10.1. Phase 10 files them; resolution happens between Phase 10 and 10.1.

### Q3.S — `Property.health` vs weighted Progress for `avgProgress` derivation
**Filed:** Phase 10 (2026-05-14)  
**Status:** OPEN — no provisional resolution  
**Question:** Is `Property.health` still present in `PropertyCoreSchema` (and all 16 PROP-XXXX `core.json` seed files), or was it removed as part of the Q5.K resolution ("Resolved 2026-05-06: REMOVE the field")?
- If `health` was removed: `queries.ts:27` evaluates to `0` for every property — all progress bars show 0% (silent correctness bug, P1)
- If `health` is still present: the formula is stale (reads a raw integer instead of the weighted pillar score) — values are wrong but not zero (P2 drift)

**What Phase 10.1 does once resolved:**
- Confirm `PropertyCoreSchema` state by reading `lib/data/types/property.ts` and one seed file
- If removed: wire `progress` to the weighted derivation function from `lib/data/derivations/progress.ts` (or derive inline in `queries.ts`)
- If still present: replace `p.health ?? 0` with weighted derivation; remove `health` from schema + seeds as cleanup

**Cross-reference:** PF5 in `audit.md`; Q5.K (health field removal decision); memory `project_property_progress_stat`

---

### Q5.Y — `Property.imageUrl` field vs `photoStorageIds[0]` for drawer hero image
**Filed:** Phase 10 (2026-05-14)  
**Status:** DEFERRED — gated on Q5.C (storage provider)  
**Question:** When storage is chosen (Q5.C), how should the drawer hero image be stored? Candidates: (a) add `Property.imageUrl: string` for an external CDN URL; (b) use `photoStorageIds[0]` (already in schema intention) + resolve to a signed URL via the storage provider SDK.  
**Provisional resolution:** defer entirely to Q5.C. No `homeListItem.imageUrl` work in Phase 10 or 10.1. The hardcoded Unsplash URL stays until Q5.C resolves (PF1 deferred-upfront).

---

## 3. Audit Roadmap

> **When Phase 10.1 kicks off:** run per-datapoint audits only on surfaces that changed. Table rows do NOT get re-audited — they cite the portfolio audit.

| Surface group | Template | Per-datapoint report | Status |
|---|---|---|---|
| Legend stats bundle (totalValue, totalProperties, rentedCount, vacantCount, avgProgress) | full | `pages/home/datapoints/legend-stats.md` | Phase 10.1 — after Q3.S resolves |
| Drawer direct reads bundle (code, name, province, status, buy, size, type, title) | lite | `pages/home/datapoints/drawer-direct-reads.md` | Phase 10.1 — after HomeListItem narrowing |
| Drawer progress (bar + %) | full | `pages/home/datapoints/drawer-progress.md` | Phase 10.1 — after Q3.S resolves |
| CommandPalette documents (after wiring to real `Document` entity) | lite | `pages/home/datapoints/command-palette-docs.md` | Phase 10.1 — after PF7 fix |
| PropertyTable rows | **cite portfolio** | `pages/portfolio/datapoints/*.md` | Already audited — do not re-run |
| Map pins (lat/lng/name/cluster count) | lite | `pages/home/datapoints/map-pins.md` | Phase 10.1 — after HomeListItem narrowing |

---

## 4. Fix Log (seeded empty — Phase 10 is audit-only)

> Fixes land in Phase 10.1. Each entry will record the commit SHA, the PFn it closes, and the before/after wiring state.

| PF | Priority | Description | Phase | Status | Commit |
|---|---|---|---|---|---|
| PF1 | P2 | Drawer hero image — hardcoded Unsplash URL | deferred (Q5.C gate) | ⏸️ deferred | — |
| PF3 | P2 | No `HomeListItem` narrowing — full Property to Client Component | Phase 10.1 | 🔲 open | — |
| PF5 | P2 | `p.health` drift — avgProgress + drawer progress bars | Phase 10.1 | ✅ done | `queries.ts` fetches full ProgressContext; `computeProgress(p, ctx)` replaces `p.health ?? 0` |
| PF7 | P2 | CommandPalette mock documents — real Document query needed | Phase 10.1 | ✅ done | `documents` added to `HomePageData`; `CommandPalette` accepts `documents?` + renders real docs |
| PF4 | P3 | Rotating trigger placeholders — CHROME (low priority) | Phase 10.1 or later | 🔲 low | — |
| PF2 | P1 | Auth shim `getCurrentUserId()` — cross-page | backend phase | ⏸️ deferred | — |
| PF6 | P1 | No audit log of mutations — cross-page | backend phase | ⏸️ deferred | — |
