---
slug: home
route: /
phase: 10
status: post-wiring
last_updated: 2026-05-26
---

# Plan — / (Home / Map)
_Phase 10.1 wiring complete for PF5 + PF7 · Remaining open items: PF1 (deferred), PF3 (open)_

_See [audit.md](./audit.md) for the surface inventory and PFn findings this plan acts on._

---

## Summary

The home page is in excellent wiring shape. The two highest-value P2 fixes from the Phase 10 audit are now closed: `computeProgress(p, ctx)` replaces the legacy `p.health ?? 0` assignment (PF5), and the CommandPalette document section now renders real `Document` entities fetched in `getHomePageData()` (PF7). The data layer fetches all 13 entity types in parallel, constructs a full `ProgressContext`, and attaches weighted progress scores to every `HomeProperty` before passing to the client. One hardcoded surface remains (drawer hero image, PF1), but it is gated on a storage infrastructure decision (Q5.C) and intentionally deferred. One structural improvement is still open: no `HomeListItem` narrowing type exists, so the full `Property` record (including financial and location sub-fields) flows to `MapView` and `CommandPalette` which each need only a handful of fields (PF3).

---

## Entity Backlog

| Entity / Gap | Status | Surfaces blocked | Notes |
|---|---|---|---|
| `Property` — weighted progress score | ✅ Resolved (PF5) | Drawer progress bar + %; legend `avgProgress`; CommandPalette dot | `computeProgress(p, ctx)` wired in `queries.ts` |
| `Document` — real list in CommandPalette | ✅ Resolved (PF7) | CommandPalette document rows (up to 5) | `documentsDb.list(userId)` added to `getHomePageData()`; prop passed to `<CommandPalette>` |
| `Property.photoUrl` / `photoStorageIds` | ⏸️ Deferred (PF1) | Drawer hero image | Gated on Q5.C (storage provider); `photoStorageIds[]` in schema but no upload infra |
| `HomeListItem` narrowing type | 🔲 Open (PF3) | `MapView` (4 fields), `CommandPalette` (8 fields) receive full `Property` | No `HomeListItem` type in `queries.ts` or `lib/data/types/`; over-serialization risk on multi-user |

---

## Open Questions

### Q5.Y — `Property.imageUrl` field vs `photoStorageIds[0]` for drawer hero image
**Filed:** Phase 10 (2026-05-14)  
**Status:** DEFERRED — gated on Q5.C (storage provider)  
**Question:** When storage is chosen, how should the drawer hero image be stored? Candidates: (a) add `Property.imageUrl: string` for an external CDN URL; (b) use `photoStorageIds[0]` (already in `PropertyMediaSchema`) + resolve to a signed URL via the storage provider SDK.  
**Provisional resolution:** defer to Q5.C. The hardcoded Unsplash URL stays until Q5.C resolves.

---

## Findings Log

### PF1 — Drawer hero image is a single hardcoded Unsplash URL
**Severity:** P2  
**Finding:** `HomePage.tsx:304` — one Unsplash URL (`photo-1665691964802-956fc06b93cf`) is shared across all property drawer panels. No `Property.photoUrl` or resolved `photoStorageIds[0]` field available.  
**Fix:** Add a `photoUrl?: string` field to `Property` (or resolve `photoStorageIds[0]` to a CDN URL server-side in `queries.ts`) and replace the hardcoded `src` with `drawerProperty.photoUrl ?? FALLBACK_URL`.  
**Deferred:** Q5.C (storage provider decision) must land first. Photo upload wizard and drawer hero image fix must ship together.

---

### ~~PF5 — `p.progress` used legacy `Property.health` field~~ ✅ RESOLVED
**Severity:** P2 (was)  
**Finding:** `queries.ts` assigned `progress: p.health ?? 0`, causing all progress surfaces to show a raw legacy integer (or 0 if the field was removed) instead of the weighted 8-pillar completeness score.  
**Fix:** Replace `p.health ?? 0` with `computeProgress(p, ctx)` after building a `ProgressContext` from all 13 entity lists fetched in parallel.  
**Resolved:** 2026-05-26. `queries.ts` now imports `computeProgress` and `ProgressContext` from `lib/data/derivations/progress`; builds a full context; assigns `progress: computeProgress(p, ctx)` for every property. All downstream surfaces (legend `avgProgress`, drawer bar + %, CommandPalette dot) now show the correct weighted score.

---

### ~~PF7 — CommandPalette Documents section showed 4 hardcoded mock entries~~ ✅ RESOLVED
**Severity:** P2 (was)  
**Finding:** `CommandPalette.tsx` contained a `const mockDocs = [...]` inline array with 4 fake document entries, fake file names, and static relative-date strings. The `Document` entity was never queried.  
**Fix:** Add `documentsDb.list(userId)` to `getHomePageData()`, include `documents` in the `HomePageData` return type, and pass as `documents={documents}` prop to `<CommandPalette>`. Render `documents.slice(0, 5)` using `doc.name`, `doc.category ?? doc.extension`, and `doc.uploadedAt`.  
**Resolved:** 2026-05-26. `mockDocs` is gone. `CommandPalette` accepts `documents?: Document[]` and renders real document rows with `formatUploadDate(doc.uploadedAt)`. Document rows navigate to `/portfolio` on selection (no per-document deep-link route exists yet — acceptable).

---

### PF3 — No `HomeListItem` narrowing — full `Property` to Client Component
**Severity:** P2  
**Finding:** `HomeProperty = Property & { buy: string; progress: number }` spreads the full `Property` record. `MapView` needs only `{ id, lat, lng, name }`; `CommandPalette` needs only `{ id, name, code, province, type, status, buy, progress }`. Financial and location sub-fields flow to client unnecessarily.  
**Fix:** Define a `HomeListItem` narrowing type in `lib/data/types/property.ts` (or inline in `queries.ts`); use `select`-style picking in the `items.map()` in `getHomePageData()`. Update `MapView` and `CommandPalette` prop types accordingly.  
**Deferred:** No blocking dependency — can land in any Phase 10.x pass. Lower urgency than PF5/PF7 since there is no visible user-facing bug, only an over-serialization concern that matters most once multi-user auth (Q4.M) arrives.

---

### PF4 — Rotating trigger placeholders are hardcoded copy strings
**Severity:** P3  
**Finding:** Five strings in `triggerPlaceholders` (`HomePage.tsx:58-64`) are fixed copy; they cycle on a 3.5 s timer. They look like real data ("Find: Phnom Penh land plots") but never pull from actual property seed data.  
**Fix (optional):** Derive from `properties.slice(0, 5).map(p => \`Find: ${p.name} in ${p.province}\`)` at render time. Low priority; intentional UX acceptable as-is.  
**Deferred:** CHROME classification. No action unless user requests real-name cycling.

---

### PF2 — Auth shim `getCurrentUserId()` returns `"demo-user"` (cross-page)
**Severity:** P1  
**Finding:** All 13 entity queries in `getHomePageData()` are scoped to the fixed string `"demo-user"`. No real authentication boundary.  
**Fix:** Replace `getCurrentUserId()` shim with real Clerk `auth().userId` once Clerk integration lands (Q4.M).  
**Deferred:** Backend phase (Q4.M). Cross-page; tracked in `pages/portfolio/audit.md PF1`.

---

### PF6 — No audit log of property mutations (cross-page)
**Severity:** P1  
**Finding:** No chain-of-custody log for mutations affecting the properties displayed on the home route.  
**Fix:** Q4.P — partially resolved for estate actions; broader mutation log deferred to backend phase.  
**Deferred:** Backend phase. Cross-page; tracked in `pages/portfolio/audit.md PF2`.

---

## Audit Roadmap

Per-datapoint reports below. Table rows cite the portfolio audit — do not re-walk.

| Surface group | Template | Per-datapoint report | Status |
|---|---|---|---|
| Legend stats bundle (totalValue, totalProperties, rentedCount, vacantCount, avgProgress) | full | `pages/home/datapoints/legend-stats.md` | Ready — PF5 resolved; no further blocker |
| Drawer progress (bar + %) | full | `pages/home/datapoints/drawer-progress.md` | Ready — PF5 resolved |
| Drawer direct reads (code, name, city/province, status, buy, type, title, area, etc.) | lite | `pages/home/datapoints/drawer-direct-reads.md` | Ready — all 22 fields from `HomeProperty` |
| CommandPalette documents (real Document entity) | lite | `pages/home/datapoints/command-palette-docs.md` | Ready — PF7 resolved |
| CommandPalette property rows (name, type, province, status, buy, progress dot) | lite | `pages/home/datapoints/command-palette-properties.md` | Ready |
| Map pins (lat/lng/name/cluster count) | lite | `pages/home/datapoints/map-pins.md` | Ready (pending HomeListItem narrowing for full clean-up) |
| PropertyTable rows | **cite portfolio** | `pages/portfolio/datapoints/*.md` | Already audited — do not re-run |

---

## Fix Log

| PF | Priority | Description | Phase | Status | Notes |
|---|---|---|---|---|---|
| PF1 | P2 | Drawer hero image — hardcoded Unsplash URL | deferred (Q5.C gate) | ⏸️ deferred | — |
| PF2 | P1 | Auth shim `getCurrentUserId()` — cross-page | backend phase | ⏸️ deferred | — |
| PF3 | P2 | No `HomeListItem` narrowing — full Property to Client | Phase 10.x | 🔲 open | No blocking dep |
| PF4 | P3 | Rotating trigger placeholders — CHROME | Phase 10.x or later | 🔲 low | CHROME classification |
| PF5 | P2 | `p.health` drift — avgProgress + all progress surfaces | Phase 10.1 | ✅ done | `computeProgress(p, ctx)` wired |
| PF6 | P1 | No audit log of mutations — cross-page | backend phase | ⏸️ deferred | — |
| PF7 | P2 | CommandPalette mock documents — real Document query needed | Phase 10.1 | ✅ done | `documents` fetched + passed as prop |
