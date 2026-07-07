## 1. Chrome & routing scaffold (keep Home working)

- [x] 1.1 Add `previewBasePath?: string` to `Sidebar` props; when `isPreview` + `previewBasePath` set, `handleNavigate(path)` pushes `previewBasePath + (path === "/" ? "" : path)` instead of early-returning
- [x] 1.2 Compute preview active state against `pathname` stripped of `previewBasePath` (Settings item + profile avatar stay non-navigating)
- [x] 1.3 Create `as-client/layout.tsx`: build `viewerCtx` once (via `resolveClientOrgForManager`), fetch client identity + panel data (leases/tenants/payments), render exit bar + `<Sidebar isPreview previewBasePath=…>` + blue-glow frame + Propose-changes panel, with `{children}` in `<main>`
- [x] 1.4 Reduce `as-client/page.tsx` (Home segment) to fetch `getHomePageData(viewerCtx)` + render `<HomePage>` only; chrome moved into `ClientPreviewShell` (layout), panel split into `ProposeChangePanel.tsx`, old `ClientViewPreview.tsx` deleted
- [ ] 1.5 Verify Home still renders and the Propose-changes panel still opens/submits (regression gate) — tsc clean; live QA pending

## 2. Query-fn Ctx seam

- [x] 2.1 Add `ctxOverride?: Ctx` to `getRentalDashboardData` (`?? await requireCtx()`), unchanged default path
- [x] 2.2 Add `ctxOverride?: Ctx` to `getPortfolioPageData`
- [x] 2.3 Add `ctxOverride?: Ctx` to `getDirectoryPageData`
- [x] 2.4 Add `ctxOverride?: Ctx` to `getAnalyticsPageData` (default `period = "12M"`)
- [x] 2.5 Add `ctxOverride?: Ctx` to `getEstatePlanningPageData`
- [x] 2.6 `tsc` clean — confirm no owner-route call sites broke (0 errors)

## 3. Phase 1 sections — Rental + Portfolio

- [x] 3.1 `as-client/rental/page.tsx`: build viewerCtx → `getRentalDashboardData(viewerCtx)` → `<RentalDashboardPage>`
- [x] 3.2 `as-client/portfolio/page.tsx`: build viewerCtx → `getPortfolioPageData(viewerCtx)` → `<PortfolioPage>`
- [x] 3.3 Audit Rental + Portfolio primary actions under `viewer` role — Option C: `readOnly` prop hides the escaping "Add Property" button in both; Add-Lease left as known-limitation (fails closed)
- [x] 3.4 Extract the viewerCtx builder (resolve + notFound + `{ orgRole: "viewer" }`) into one helper reused by every section page (`_ctx.ts requirePreviewContext`)
- [ ] 3.5 QA: navigate Home ⇄ Rental ⇄ Portfolio; confirm client-scoped data + chrome persistence + active state — live QA pending

## 4. Phase 2 sections — Directory + Analytics + Estate Planning

- [x] 4.1 `as-client/directory/page.tsx` → `getDirectoryPageData(viewerCtx)` → `<ProfessionalDirectoryPage>`
- [x] 4.2 `as-client/analytics/page.tsx` → `getAnalyticsPageData("12M", viewerCtx)` → `<AnalyticsPage>`
- [x] 4.3 `as-client/estate-planning/page.tsx` → `getEstatePlanningPageData(viewerCtx)` → `<SuccessionPage>`
- [x] 4.4 Audit Directory/Analytics/Estate actions under `viewer` — no org-escaping "Add" controls (Analytics period switcher uses relative `?period=`, stays in-preview); deep-link escapes accepted as known-limitation per Option C
- [x] 4.5 Add `loading.tsx` per new segment (re-export each shell section skeleton)

## 5. Verify & close

- [x] 5.1 Confirm Settings + profile avatar remain non-navigating in preview; Pro item + sign-out remain hidden — code-verified: `handleNavigate` returns for `/settings*` in preview; Pro filtered by `isManager && !isPreview`; sign-out gated by `!isPreview`
- [x] 5.2 Deep-link escapes documented as known-limitation in design.md (row → /property/[id], HomePage quick-actions/command-palette — pre-existing; Add-Property neutralized)
- [~] 5.3 `tsc` + `eslint` clean ✓ — live QA of all six sections still pending (needs running app + real manager session)
- [x] 5.4 `graphify update .` (12223 nodes rebuilt)

## 6. Contextual manager sidebar + client workspace (A: multitasking tabs)

Navigation layer over the reused sections. Read-scoped here; inline write affordances belong to `manager-act-on-behalf`.

- [x] 6.1 Manager-wide nav: first item is "Home" (→ `/pro/dashboard`); the duplicate "Clients" nav item is removed and replaced by the client-book header button (a nav-styled "Clients" button + collapse chevron + add-client action)
- [x] 6.2 Add a chevron affordance (`ChevronsUpDown`) to the manager identity dropdown trigger in `ManagerSidebar` footer (feedback #2)
- [x] 6.3 Split `ManagerSidebar` into two rendered modes by context (derived from active client in pathname): **Portfolio context** (`PortfolioContextNav`) = manager-wide nav + client book; **Client context** (`ClientContextNav`) = Back to Dashboard + client identity + section items + "View as client". Shared identity footer
- [~] 6.4 SUPERSEDED by 6.8 — the first cut built owner-view routes `{portfolio,rental,analytics,directory,estate-planning}`; replaced by the manager-cockpit sections (see D5.1)
- [x] 6.5 Per-tab route memory in `WorkspaceTabProvider`: `lastPathByTab` state recorded via effect on pathname/activeTabId; `activateTab` + `openClientTab` restore the remembered path (fallback to tab root)
- [x] 6.6 "View as client" sidebar item routes into the existing `.../as-client` preview (entry point from the workspace)
- [ ] 6.7 QA (live): tab A on a section → switch to tab B → back to A restores the section; Portfolio↔Client context sidebar swaps correctly; header + tabs persist in client sections (no takeover); chevron reads as a menu — tsc + eslint clean; needs running app + real manager session

## 8. Client workspace = manager cockpit (D5.1 revision)

Replace the owner-view sections with the manager's per-client Dashboard cards. Reuse only — `getClientPortfolioData(clientId)` + existing Dashboard components.

- [x] 8.1 Delete the superseded owner-view routes `app/(pro)/pro/clients/[clientId]/{portfolio,rental,analytics,directory,estate-planning}/page.tsx`
- [x] 8.2 Add manager sections `app/(pro)/pro/clients/[clientId]/{properties,financials,work-orders,compliance,activity}/page.tsx` — each `getClientPortfolioData(clientId)` (→ `notFound()` if null) rendering the matching Dashboard card(s) in a scroll wrapper: Properties=`AssetsTable`, Financials=`FinancialsCard`+`OccupancyCard`, Work Orders=`MaintenanceQueueCard`, Compliance=`ComplianceTable`, Activity=`ActivityFeed`
- [x] 8.3 Update `CLIENT_SECTIONS` in `ManagerSidebar` to `[Overview, Properties, Financials, Work Orders, Compliance, Activity]` with fitting icons; drop unused icon imports (`BarChart3`, `ScrollText`)
- [ ] 8.4 QA (live): each section renders the client's manager card; Overview stays the full page; owner views only via "View as client"
- [ ] 8.5 Fast-follow (not v1): make tabs richer than their Overview card (full `AssetsTable`, Work Orders incl. resolved + `WorkOrderStatusCard`)
