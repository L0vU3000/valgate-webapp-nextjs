# Pages — AI ref (auto-generated)

> ⚠️ **Auto-generated.** Edit `../ref/09-page-wiring-status.md` and re-run `npm run regen-ai-ref`.
> Manual edits will be overwritten. If something important got stripped, add it
> to the source file as a heading/table/list and re-run.

# Page Wiring Status

> Current per-page wiring state, recomputed from the running code (`queries.ts` + components) on 2026-05-07. Supersedes the original `pages/<slug>/audit.md` Surface Inventory counts, which captured pre-wiring state (2026-05-04 → 2026-05-05).

- `ref/07-entity-fields.md` — every entity, every field
- `ref/08-backend-migration-readiness.md` — Convex migration plan
- `pages/SUMMARY.md` — historical cross-page rollup
- `pages/INDEX.md` — master cross-page entity backlog

---

## TL;DR

- **15 routes audited** — 11 ✅ fully wired · 3 🟡 partial · 1 ⏸️ deferred (Safety, per user)
- **Pre-wiring HARDCODED count:** ~108 surfaces. **Post-wiring HARDCODED:** ~28 surfaces (74% wired).
- **Remaining HARDCODED clusters** are concentrated in 3 places:
  - `/rental` heatmap LeaseTable yield ranking (PF4 — gated on PropertyComparable)
  - `/property/[id]/valuation` MarketSnapshot + PropertyComparable cards (12 rows — Q4.Q resolved to internal aggregation, not yet built)
  - `/property/[id]/location` PropertyComparable section (rows 19–23, 27)
- **No new entities required to clear remaining HARDCODED surfaces** beyond PropertyComparable (Phase 6.9). Sparkline data (Q4.J — point-in-time only) and Safety KPI derivation (deferred) are the only other live HARDCODED clusters.

---

## Status table

| # | Route | WIRED | HARDCODED | PARTIAL | Verdict | Latest phase |
|---|---|---|---|---|---|---|
| 1 | `/portfolio` | 16 | 0 | 0 | ✅ Fully wired | 6.0 + YoY Rev 2 |
| 2 | `/property/[id]/overview` | 16 | 0 | 0 | ✅ Fully wired | 6.1 + 6.2 + 6.8 + 8.8 |
| 3 | `/property/[id]/safety` | 16 | 9 | 3 | ⏸️ **DEFERRED** (per user) | — |
| 4 | `/property/[id]/ownership` | 31 | 1 | 0 | ✅ Fully wired (1 OwnershipDocument.status field gap) | 6.5 + 6.6 |
| 5 | `/property/[id]/valuation` | 10 | 12 | 0 | 🟡 Partial (MarketSnapshot + PropertyComparable cards still mocked) | 6.0 valuation Rev 2 |
| 6 | `/property/[id]/rental` | 32 | 0 | 0 | ✅ Fully wired | 6.1 + 6.2 + 6.3 + 6.7 + 6.8 |
| 7 | `/property/[id]/location` | 15 | 7 | 0 | 🟡 Partial (PropertyComparable section + map placeholder) | 6.4 |
| 8 | `/property/[id]/documents` | 16 | 1 | 0 | ✅ Fully wired (upload demo deliberately stubbed) | 6.3 + 6.7 |
| 9 | `/analytics` | 28 | 2 | 1 | ✅ Fully wired (2 minor: change-badge "—", "MARCH 2024" timeline label) | 8.1 |
| 10 | `/rental` | ~58 | ~16 | 1 | 🟡 Partial (LeaseTable yield ranking + sparkline) | 8.2 + 6.8b |
| 11 | `/directory` | 99 | 0 | 0 | ✅ Fully wired | 8.4 |
| 12 | `/directory/[id]` | 11 | 0 | 0 | ✅ Fully wired | 8.4b |
| 13 | `/estate-planning` | 18 | 0 | 2 | ✅ Fully wired (2 PARTIAL: action stubs) | 8.5 |
| 14 | `/profile` | 14 | 0 | 0 | ✅ Fully wired | 8.6 |
| 15 | `/settings` | 16 | 3 | 0 | ✅ Fully wired (NOTIFICATION_ROWS labels are CHROME config) | 8.7 |

---

## Per-page detail

### 1. `/portfolio` — ✅ Fully wired

### 2. `/property/[id]/overview` — ✅ Fully wired

### 3. `/property/[id]/safety` — ⏸️ DEFERRED (per user)

- Schema gap A — `SafetyRisk.resolved` field missing (currently `risks.length` collapses)
- Schema gap B — `Inspection.date` is a display string, not a timestamp (countdown arithmetic fragile)
- Schema gap C — `Certification.status`, `Inspection.status`, `SafetyRisk.severityLabel` are open strings; need typed unions

### 4. `/property/[id]/ownership` — ✅ Fully wired

### 5. `/property/[id]/valuation` — 🟡 Partial

- Rows 18–23 — Market Insight card (location label, market trend, +12% above list, days on market, inventory, buyer demand) — all 6 need MarketSnapshot
- Rows 24–25 — Comparable Sales table (4 rows + footer derivations) — needs PropertyComparable
- Row 27 — Investment Performance metrics (Cash-on-Cash, Cap Rate, Total ROI, Equity) — derivation pending; needs PropertyValuation + Payment
- Row 29 — Value Drivers — deferred, lowest priority
- Row 31 — Professional Appraisal details — service-model decision (may not need an entity)

### 6. `/property/[id]/rental` — ✅ Fully wired

### 7. `/property/[id]/location` — 🟡 Partial

- Row 9 — Map area placeholder (needs map library; `lat`/`lng` are on Property already)
- Rows 19–23 — Comparable corner coordinates + sales table (PropertyComparable not yet built)
- Row 27 — ExpandedView Investment tab (PropertyComparable)
- PF5 — absent address card (`property.addressLine`/`city`/`zip`/`country` exist but no UI surface)
- PF6 — DefaultView still shows "SR00015 Land" / "Siem Reap, Cambodia" hardcoded (thread-`property`-prop bug fix; trivial)

### 8. `/property/[id]/documents` — ✅ Fully wired

### 9. `/analytics` — ✅ Fully wired

### 10. `/rental` — 🟡 Partial

- Hero sparkline 6 bars (`sparklineHeights = [40,55,45,70,85,96]`) — F1 in `rental--kpi-strip-mocked.md`. Q4.J resolved as point-in-time only; sparkline deferred.
- LeaseTable property yield ranking (rows 25–39) — PF4. Gated on Phase 6.9 (PropertyComparable yield comparison).

### 11. `/directory` — ✅ Fully wired

### 12. `/directory/[id]` — ✅ Fully wired

### 13. `/estate-planning` — ✅ Fully wired

### 14. `/profile` — ✅ Fully wired

### 15. `/settings` — ✅ Fully wired

- `NOTIFICATION_ROWS` constant (3 rows, label + description) — labels are CHROME config, not data
- `HARD_DEFAULTS` (3-row × 3-channel default matrix) — fallback for first-load before user has preferences
- 3 SelectOption arrays (dashboardView, language, timezone) — UI options, CHROME config

---

## Pages NOT yet audited

- `/` (home) — map + dashboard composite
- `/add-property` (6-step wizard) — autosave/Draft entity decision pending (Q4.A)
- `/login`, `/register`, `/auth/*` — auth flows (Clerk)

---

## Method (how this file was built)

1. Read `app/(shell)/<route>/queries.ts` — count entity reads + derivations passed to component
2. Read `pages/<slug>/plan.md` Fix Log — confirm phase markers (`Rev N`, "wired", "shipped")
3. Cross-check against component code for any remaining string literals or hardcoded arrays
4. Mark CHROME (config arrays, static UI labels) as wired

## Verification (spot-checks performed)

- ✅ `/profile` — `queries.ts` returns 9 fields directly from `UserProfile`; `Partial<UserProfile>` typing confirmed in `rawProfile`. No string literals in `ProfilePage.tsx` for data fields.
- ✅ `/rental` — `queries.ts` returns `maintenanceTotal` (Phase 6.8b just added); `KpiCards.tsx` line 192 reads `{maintenanceTotal}` (was `"$4,800"`). `sparklineHeights = [40,55,45,70,85,96]` confirmed remaining HARDCODED.
