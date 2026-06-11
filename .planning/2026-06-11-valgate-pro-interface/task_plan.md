# Task Plan: Valgate Pro Interface (asset-manager cockpit)

## Goal
Rebuild the Valgate Pro interface so a pro-level asset manager can oversee many owner-clients' property portfolios, with every stat grounded in the **same shared schema + derivations as the client side**, made functional via the local-first JSON simulated backend.

## Current Phase
Phase 2 — Manager Dashboard (re-ground on real rollups + design polish)
> Phases 0 and 1 are complete (see progress.md). The full query layer
> (`app/(pro)/pro/queries.ts`, 1,387 lines) already returns real, schema-grounded
> data for every remaining phase. What's left (Phases 2–6) is wiring components to
> those queries **and** raising every surface to production design quality.

## Locked Decisions (user greenlit recommendations 2026-06-11)
1. Positioning: **asset-manager cockpit** (ops surfaced for triage, not tenant-ops CRM)
2. Main pages: ① Dashboard ② Client Portfolio + Owner Report ③ Rent & Collections ④ Work Orders
3. Phase 1 = `Client` entity + `clientId` + seed partition — locked
4. `Client` = thin new entity (engagement-level), not overloading Owner/CoOwner
5. Progress weights verified from live code: Loc 15 / Fin 30 / Rental 20 / Own 15 / Safety 10 / Estate 5 / Docs 5 (memory note was stale)
6. NEW: seed evolution happens against committed JSON via a validated `scripts/seed-pro.ts` (fixtures are stale vs committed JSON — do NOT `seed:reset`)
7. NEW: deliverable includes a build-report MD (checkpoints, hard decisions, review pointers, what's-what, token+time summary)
8. NEW (design bar): every page, modal, and interaction in Phases 2–6 ships at **production design quality** — well-designed modals, polished page layouts, and purposeful animation/micro-interactions. Not just wired — crafted.

## Design Standard & Tooling (applies to every remaining phase)
> The data is real; now the UI must feel premium. Treat the user (an expert frontend
> designer) as the bar. No generic AI-dashboard aesthetic.

**Tooling to use per design pass:**
- **Mobbin MCP** (`mcp__mobbin__search_screens` / `search_flows`) — pull real-world reference flows for each surface BEFORE building (e.g. "asset management dashboard", "rent collection table", "create work order modal", "owner report export"). Study patterns, then adapt — don't copy.
- **`/ui-ux-pro-max`** — run on each new page/modal for layout, hierarchy, spacing, and UX-pattern review.
- **`/impeccable`** (+ sub-skills `animate`, `polish`, `layout`, `delight`) — the craft pass: distinctive visual quality, motion, micro-interactions. Run `impeccable:animate` specifically for the animation work.

**Cross-cutting design requirements:**
- **Modals**: all "inputs the manager gives Valgate" (onboard client, assign properties, log payment, add/renew lease, create work order, assign vendor, generate owner report) ship as well-designed modals/sheets — focus-trapped, keyboard-dismissible, with enter/exit transitions, loading + success states, and inline Zod-validated errors. No raw forms dumped on a page.
- **Pages**: every new page (Rent, Work Orders, Compliance) gets a polished layout, real empty states, skeleton `loading.tsx`, and responsive behavior consistent with the existing Pro shell (1440px canvas).
- **Animation**: purposeful only — KPI/count-up on load, animated table row enter, alert chip dismiss, modal transitions, status-change transitions, chart draw-in. Motion serves comprehension, never decoration. Respect `prefers-reduced-motion`.
- **Consistency**: reuse the existing Pro shell tokens, `WidgetCard`, `StatusDot`, and shadcn/ui primitives so new surfaces feel native to the cockpit.

## Status legend
pending → in_progress → complete

## Phases

### Phase 0: Explore & align (CURRENT)
- [x] Audit current `/pro/dashboard` and the Pro mock layer
- [x] Map the shared client-side schema, local-db, and derivations
- [x] Read the project's wiring methodology corpus
- [x] Research asset-manager day-to-day, metrics, pain points, owner reporting
- [x] Capture all of the above in findings.md
- [x] **Resolve the 5 open questions with the user** (user greenlit recommendations)
- [x] Get sign-off on the main-page set and Phase 1 scope
- **Status:** complete

### Phase 1: Foundational schema — multi-owner overlay
> Nothing else can be real until properties belong to clients. This is the enabling phase.
> DONE — seed-pro.ts ran; smoke test + build verified.
- [x] Add a thin `Client` entity (Zod type + local-db module) — references owner(s); fields like name, type, engagement (fee/mandate), clientSince, status
- [x] Add `clientId` to Property (or a membership record) so each property maps to a client
- [x] Seed ~6–7 `Client` records and partition the existing 23 properties across them
- [x] Add a `getProProperties()` / grouping query that returns properties grouped by client
- [x] Verify migration alignment with Convex `owner` + `property_owner_membership`
- **Status:** complete (6 clients, 23 properties tagged; full query layer in `queries.ts`; build green — see progress.md)

### Phase 2: Manager Dashboard — re-ground on real rollups + design polish
> "What needs me today" — book-of-business triage. Query layer ready (`getProDashboardData`).
**Wiring:**
- [x] Replace `mockKpis` with real rollups: portfolio value = Σ currentMarketValue; NOI; collection rate (rolled-up computeKpis); occupancy (rolled-up computeStats); clients-needing-attention
- [x] Real alerts/triage: overdue rent, leases expiring <30d, certs expiring, high/critical safety risks, low-Progress records
- [x] Wire ClientsTable + AssetsTable to real grouped properties; convert page to Server Component; delete mock imports
**Design:**
- [x] Mobbin ref pass: "asset management dashboard", "portfolio overview" (Stripe overview density, Monarch KPI cards, Origin trend tables — adapted, not copied)
- [x] KPI cards with count-up animation on load; animated alert chips (enter + stagger + dismiss + strip collapse)
- [x] Table row enter animation (capped stagger); occupancy/financial bar draw-in; hover + active row states; section-level page stagger
- [x] Visual review pass via headless-browser screenshots — fixed th header crowding + made duplicate overdue chips distinguishable (due date added to label in queries.ts)
- [ ] Deep craft pass (`/impeccable` polish/delight) — deferred until user signs off on the established motion language (durations/easing/stagger now set in `_components/motion-primitives.tsx`, reused by Phases 3–6)
- **Status:** in_progress — wiring + animation pass complete & verified (tsc, eslint, build, live screenshots); deep craft pass pending user sign-off on motion language

### Phase 3: Client Portfolio + Owner Report
> Per-owner view scoped by clientId; basis for the #1 time-drain (owner reporting). Query ready (`getClientPortfolioData`).
**Wiring:**
- [x] Re-ground `/pro/clients/[clientId]` on real per-client derivations (remove buildClientOverview hardcoding); wire all 9 components
- [x] One-click owner statement: income/expenses/NOI/occupancy/work-orders/upcoming-expirations from real data
**Design + Modals:**
- [ ] **Owner Report modal/sheet** — well-designed preview of the monthly statement with a polished export/print layout; transition in/out; loading + ready states
- [x] **Onboard client modal** — multi-select property assignment, disabled-until-valid, success flash (OnboardClientModal)
- [ ] Standalone **assign/unassign properties modal** for existing clients (onboard covers initial assignment; post-onboard reassignment modal still pending)
- [ ] Mobbin ref pass: "client portfolio detail", "report export"; `/ui-ux-pro-max` + `/impeccable` pass
- **Status:** in_progress — wiring + onboard modal complete & verified; owner-report modal/sheet + standalone assign modal pending

### Phase 4: Rent & Collections (new page) — highest operational ROI
> Query ready (`getRentPageData`). Page + components do not exist yet — build from scratch at full design quality.
**Wiring:**
- [x] Rent roll across the book; expected vs collected; overdue list; leases expiring soon; occupancy
- [x] Wire to Lease + Payment + Tenant entities (real); empty states in place (`loading.tsx` skeleton still pending — design track)
**Design + Modals:**
- [x] **Log payment modal** (LogPaymentModal — amount+method, server-stamped date) + **renew lease modal** (RenewLeaseModal — current→new end confirmation); loading.tsx added
- [ ] **Record tenant modal** (no real flow yet — deferred)
- [ ] Animated rent-roll table (row enter, status-change transition); expected-vs-collected progress with draw-in (DrawInBar exists on dashboard; not yet applied to the rent page table)
- [ ] Mobbin ref pass: "rent collection", "payments table", "invoice/payment modal"; `/ui-ux-pro-max` + `/impeccable` pass
- **Status:** in_progress — log-payment + renew modals + loading.tsx complete & verified; rent-roll animation + record-tenant modal pending

### Phase 5: Work Orders / Maintenance (new page) — #1 industry pain point
> Query ready (`getWorkOrdersPageData`). Page + components do not exist yet — build from scratch at full design quality.
**Wiring:**
- [x] Open/in-progress/scheduled counts by priority and client (from MaintenanceItem)
- [x] Assign a work order to a vendor from the existing `Professional` directory; empty states in place (`loading.tsx` still pending — design track)
**Design + Modals:**
- [x] **Create work order modal** (NewWorkOrderModal — property/severity/vendor/cost, disabled-until-valid, success flash, full loop verified live); loading.tsx added
- [ ] Standalone **assign-vendor modal** (vendor picker with rating/availability) + **update-status / attach cost+document** flow — create-modal pre-assigns a vendor; the dedicated post-creation assign/status modal still pending (inline assign/status currently ship in WorkOrdersTable)
- [ ] Kanban/board or priority-grouped layout with status-change animation; count badges with motion
- [ ] Mobbin ref pass: "work order", "maintenance ticket", "task board", "assign vendor"; `/ui-ux-pro-max` + `/impeccable` pass
- **Status:** in_progress — create-WO modal + loading.tsx complete & verified; assign-vendor/status modal + board view pending

### Phase 6 (fast-follow): Compliance calendar + Properties register
**Wiring:**
- [ ] Compliance widget/page from Certification + Inspection + SafetyRisk (expiry calendar)
- [ ] Cross-client Properties register (asset list with filters)
**Design:**
- [ ] Polished calendar/timeline view with expiry-status color system; filter chips with transitions
- [ ] Mobbin ref pass: "compliance calendar", "asset register / data table with filters"; `/ui-ux-pro-max` + `/impeccable` pass
- **Status:** pending

## Key Questions (decision gate before Phase 1)
1. Positioning: asset-manager cockpit (recommended) vs full property-mgmt CRM?
2. Is the main-page set right: ① Dashboard ② Client Portfolio+Report ③ Rent & Collections ④ Work Orders? Swap any (e.g. promote Compliance / a Reports hub)?
3. Make foundational schema (`Client` + `clientId` + seed partition) the locked Phase 1? (recommended: yes)
4. `Client` scope: thin new entity referencing owners (recommended) vs reuse Owner/CoOwner directly?
5. Confirm live Progress pillar weights (code vs memory note conflict) before depending on them.

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Ground Pro on shared schema + derivations; no invented numbers | User requirement; preserves Convex migration path |
| Pro = multi-owner overlay (`Client` + `clientId`) | Smallest change that makes rollups real; matches Convex owner model |
| Asset-manager cockpit positioning | Matches Valgate DNA |
| Drop Asset = vehicle/equipment | No schema/seed support |
| Follow existing wiring playbook + dual-archive phase plans | Project convention (memory) |
| Phases 2–6 ship at production design quality (modals, polished pages, purposeful animation) | User is an expert frontend designer; "wired" is not enough — must be crafted |
| Per design pass use Mobbin MCP (reference) → `/ui-ux-pro-max` (UX review) → `/impeccable` incl. `animate`/`polish` (craft) | Right tool per stage: study real flows, review patterns, then raise visual quality |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| Write findings.md before reading | 1 | init-session pre-created file from template; Read first, then Write |
| tsx missing (fresh workspace) | 1 | npm install |
| Committed merge-conflict markers in ownership2/page.tsx broke tsc+build | 1 | Resolved to ownership2 side (pre-existing repo break) |
| Build prerender failed: missing NEXT_PUBLIC_MAPBOX_TOKEN | 1 | Created gitignored .env.local with placeholder |
| Workflow wf_935d651d: all 6 subagents died on monthly spend limit (0 files written, ~95K tokens lost) | 1 | Pivot: build all pages inline in main loop, sequentially |

## Notes
- Re-read this plan before major decisions.
- Each build phase now has TWO tracks: **Wiring** (component → real query, delete mock) and **Design** (Mobbin ref → `/ui-ux-pro-max` → `/impeccable`). Do wiring first so the design pass works on real data, then craft.
- Each build phase: run the three-rule pre-flight; helpers as pure functions in queries.ts; classify every surface WIRED/HARDCODED/etc.
- When a build phase is locked, also write the formal phase plan to `~/.claude/plans/` AND `.claude/data-audit/docs/plans/Plan-Phase-<n>-<title>.md` (project memory convention).
- Detailed research/external content lives in findings.md, not here.
- **Model note:** Phases 2–6 are wiring + design craft, not parallel research. Regular Sonnet (or Opus for the design passes) is the right fit — ultracode-level orchestration was only justified for the Phase 0/1 research + query-layer build.
