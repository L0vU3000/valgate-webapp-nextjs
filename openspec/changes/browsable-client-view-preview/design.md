## Context

`/pro/clients/[clientId]/as-client` today is a single server page that fetches the client's home data + Tier-1 entity lists and hands them to `ClientViewPreview`, a `fixed inset-0` client-side takeover that renders `<Sidebar isPreview>` + `<HomePage>` + the Propose-changes panel. Navigation is intentionally inert (`Sidebar.handleNavigate` returns early when `isPreview`) because only Home is mounted.

Two facts from the codebase make full browsing cheap:

1. **The Ctx seam already exists.** `requireCtx()` (`lib/auth/ctx.ts`) is the only caller of Clerk `auth()`. `getHomePageData(ctxOverride?: Ctx)` already accepts an override — that is exactly how the preview scopes Home to the client's org (`viewerCtx = { userId: managerUserId, orgId: clientOrgId, orgRole: "viewer" }`). The other section query fns simply don't expose the param yet; they call `requireCtx()` internally.
2. **Section components are chrome-free and reusable.** `ShellLayout` owns `Sidebar` + `AppHeader`; each section `page.tsx` is a thin `const data = await getX(); return <XPage data={data} />`. `AppHeaderProperties` context has a safe default (`{ properties: [], isManager: false }`), so section components that read `useIsManager()` render correctly with no provider — and `isManager: false` is the correct value for a client view.

## Goals / Non-Goals

**Goals:**
- Manager can navigate Home, Portfolio, Rental, Directory, Analytics, Estate Planning in preview, each scoped read-only to the client's org.
- Reuse the existing section components and query functions — no forked "preview" variants.
- Preview chrome (exit bar, sidebar, glow, propose panel) persists across section navigation without remount/flash.
- Idiomatic to the codebase: server components, route segments, per-segment data fetch.
- Phased, independent rollout per section.

**Non-Goals:**
- Settings / profile / account pages in preview (account-level, no client user session).
- Write actions from within preview beyond the existing Propose-changes flow (reads stay `viewer`).
- Client-scoped versions of deep routes (e.g. `/property/[id]/*`) — out of scope; only the top-level sections.
- Any change to real owner-route behavior.

## Decisions

### D1: Nested route segments over a client-side section switch
Convert `as-client/` into a segment with `layout.tsx` (chrome) + one `page.tsx` per section. Each section page builds the viewer `Ctx` server-side and calls its query fn with the override.

- **Why:** matches the app's RSC + route-segment + per-segment `loading.tsx` conventions; pay-for-what-you-view (a section fetches only when visited); real URLs (back button, deep-link, shareable preview state); each section is an independent folder so phased rollout is native.
- **Alternative — single `useState` section switch in `ClientViewPreview`:** fewer files, but pre-fetches every section on open, grows one giant client component, violates the server-fetch convention, and has no URL state. Rejected.

### D2: `ctxOverride?: Ctx` param on section query fns
Add the identical seam `getHomePageData` uses:
```ts
export async function getRentalDashboardData(ctxOverride?: Ctx): Promise<RentalDashboardData> {
  const authCtx = ctxOverride ?? (await requireCtx());
  // ...unchanged
}
```
Applies to `getPortfolioPageData`, `getRentalDashboardData`, `getAnalyticsPageData`, `getDirectoryPageData`, `getEstatePlanningPageData`.

- **Why:** smallest, safest change; default branch is byte-for-byte the old behavior, so owner routes are untouched. One consistent pattern already blessed in the codebase.
- **Alternative — a request-scoped Ctx override (AsyncLocalStorage) so `requireCtx()` itself returns the client ctx:** more magical, wider blast radius, and `requireCtx` is `cache()`-memoized per request which complicates overriding. Rejected in favor of explicit param passing.

### D3: `previewBasePath` prop on `Sidebar`
```ts
// Sidebar props
previewBasePath?: string; // e.g. `/pro/clients/CLI-0011/as-client`
```
When `isPreview` + `previewBasePath` are set, `handleNavigate(path)` pushes `previewBasePath + (path === "/" ? "" : path)`, and active state compares the current pathname (stripped of `previewBasePath`) to `item.path`. Nav list is unchanged — no duplication. Settings item and profile avatar keep their inert behavior in preview.

- **Why:** one prop, single source of nav truth, no path table to maintain.
- **Alternative — a separate preview nav list:** duplicates the nav definition and drifts. Rejected.

### D4: Chrome lives in `as-client/layout.tsx`
The exit bar, preview `Sidebar`, blue-glow frame, and Propose-changes panel move from `ClientViewPreview` into the layout. The layout builds `viewerCtx` once and fetches the client identity + panel data (leases/tenants/payments). Section `page.tsx` files fetch and render only their section into the layout's `<main>` slot.

- **Why:** chrome persists across navigation (Next.js keeps the layout mounted); the propose panel's client-state survives section changes.
- **Note:** the propose-panel open/close is client state; it stays in a small client component rendered by the layout.

## Risks / Trade-offs

- **Section component pulls in unexpected shell context** → each reads only `AppHeaderProperties` (safe default) today; verify per section during its phase. If one needs a provider, wrap it in the layout. Mitigation: phased rollout catches this one section at a time.
- **A section triggers a write action while `orgRole: "viewer"`** → services enforce `assertCanMutate`/role checks, so writes fail closed; but a section that renders an enabled "Add" button would be a confusing dead end. Mitigation: preview is read-only by intent; audit each section's primary actions during its phase and hide/disable if they mutate. Track as a per-section checklist item.
- **Deep links inside a section (e.g. a property row → `/property/[id]`)** navigate out of the preview to the owner route (manager's own org) → out of scope, but note it: such links should be neutralized or left as known-limitation. Mitigation: documented Non-Goal; revisit if it bites.
- **Duplicate data fetch** — layout fetches panel data (leases/tenants/payments) and the Rental section also fetches rental data → acceptable; different queries, and `requireCtx`/reads are cheap per-request. Not optimizing yet.

## Migration Plan

Additive, no data migration. Rollout by phase (each independently shippable):
1. Scaffold `layout.tsx` + move chrome; keep Home working (regression gate).
2. Rental, Portfolio (data seams + section pages).
3. Directory, Analytics, Estate Planning.
Rollback = revert the route folder + the query-fn param additions; owner routes never depended on the new param.

## Read-only audit outcome (Option C)

Sections reuse the real owner components, which render mutating/escaping controls. Decision (Option C — neutralize the worst offender, accept the rest as v1 known-limitation):

- **Neutralized:** the "Add Property" button in `RentalDashboardPage` + `PortfolioPage` — both `router.push("/add-property")` into the *manager's own* org. Added a `readOnly?: boolean` prop (default `false`; owner routes unchanged); the preview section pages pass `readOnly`.
- **Accepted as known-limitation (v1):**
  - Deep-link escapes to owner routes — property-row → `/property/[id]`, portfolio card, and `HomePage`'s quick-actions / command-palette / New-Property (these last ones are *pre-existing* — they shipped in the original Home-only preview, not introduced here).
  - "Add Lease" modal in Rental — stays in-preview; its create action fails closed under the `viewer` Ctx (error toast, no data change).
- **Enforcement backstop:** all writes are blocked server-side by the `viewer` role regardless of any control that slips through — this is honesty polish, not a security boundary.

Full read-only treatment (threading `readOnly` through every section + `HomePage` + command palette + drawer) is deferred to a follow-up once the live preview reveals which escapes actually matter.

## D5: Contextual manager sidebar + tabbed client workspace (multitasking model "A")

The Pro shell sidebar (`ManagerSidebar`) is global today — identical on every `/pro` route. Manager feedback: it should be **contextual**. Two contexts, driven by the active workspace tab:

- **Portfolio context** (dashboard, clients index, manager-wide pages): manager-wide nav + client book. `Home` nav item is relabeled **"Portfolio"** (the manager's book-of-business overview).
- **Client context** (`/pro/clients/[clientId]/**`): swaps to a client-scoped nav — Back-to-Portfolio, client identity, section items (Overview, Portfolio, Rental, Analytics, Directory, Estate Planning), and a "View as client" entry.

Two orthogonal axes, VS-Code/browser-style: **workspace tabs = which client(s) open** (horizontal), **contextual sidebar = where inside this client** (vertical). They answer different questions, so they don't compete. The client book in Portfolio context is a launcher (opens a client tab), not a third switcher.

**Why "A" (keep tabs) over drill-in:** the manager is a multitasker — juggling several clients, switching mid-task with state preserved, comparing two at once. Tabs are the primitive for that; drill-in loses open state and cross-client speed. Cost is retaining `WorkspaceTabBar`/`WorkspaceTabProvider` (already built) + adding per-tab route memory.

**Two surfaces, shared sections (reconciles "merge / view-as-client is a toggle"):**
The client **workspace** (`/pro/clients/[id]/<section>`, manager chrome, operational view) and the **as-client preview** (`.../as-client/<section>`, client's own sidebar + blue glow, empathy/audit view) are distinct chrome wrappers over the **same** section components and the **same** `ctxOverride` seam this change already added. The sections merge (one component set, one data seam); the two framings stay as two entry points, with "View as client" as the toggle from workspace → preview. Rejected the single-tree chrome-toggle: it reworks the just-finished (QA-pending) preview and adds conditional chrome for no functional gain.

**Per-tab route memory (the one net-new mechanic):** `WorkspaceTabProvider` stores tabs by client id only and `activateTab` always pushes the client root — so switching tabs drops the section. Add a `lastPath` per tab, updated on navigation within the tab, restored on re-activation. This is what makes A's "state preserved" real.

**Scope boundary:** this is the navigation/IA layer and is **read-scoped** (sections render via the existing viewer/act-on-behalf Ctx). Making the workspace sections *editable inline* is `manager-act-on-behalf`'s job — cross-referenced, not re-decided here.

- **Alternative — drill-in (model "B"), retire tabs:** simpler (delete tab machinery) but loses multitasking. Rejected per the stated user priority.
- **Alternative — client-context sidebar links into the `as-client` takeover for every section:** zero new routes, but the full-screen takeover kills the header + tabs, breaking A. Rejected.

### D5.1 (revision): Client workspace sections are the manager's cockpit, not the client's owner views

Feedback on the first cut: the workspace sections rendered the *client's* owner pages (Portfolio/Rental/Analytics/Directory/Estate) — but the manager wants their own per-client views, "individual versions of the ones in the Dashboard." This also fixes a smell from D5: workspace sections and the as-client preview were rendering the *same* components in different chrome (near-duplication).

**Resolution — the two surfaces now hold genuinely different content:**
- **Client workspace** (`/pro/clients/[id]/…`, manager chrome): the manager's Dashboard cards scoped to one client. Sections = **Overview** (base, full everything-page) · **Properties** (`AssetsTable`) · **Financials** (`FinancialsCard` + `OccupancyCard`) · **Work Orders** (`MaintenanceQueueCard`) · **Compliance** (`ComplianceTable`) · **Activity** (`ActivityFeed`).
- **View as client** (`/pro/clients/[id]/as-client/…`): the client's own owner views (Portfolio/Rental/Analytics/Directory/Estate), unchanged.

**Why this is cheap:** `getClientPortfolioData(clientId)` already returns per-client, manager-shaped data using the exact row types the Dashboard cards consume (`ProPropertyRow`, `ProWorkOrderRow`, `ProComplianceRow`, `ProActivityEvent`, `CashflowPoint`), and `ClientPortfolioPage` (Overview) already renders every one of these cards with clean per-slice props. So each section page is a thin `getClientPortfolioData(clientId)` → render-the-matching-card wrapper. **No new queries or components.**

**Supersedes** the owner-view routes built under D5 tasks 6.4/6.6: `/pro/clients/[id]/{portfolio,rental,analytics,directory,estate-planning}` are deleted and replaced with `/pro/clients/[id]/{properties,financials,work-orders,compliance,activity}`. The `as-client/*` owner routes are untouched.

- **v1 scope:** sections render the same card the Overview shows. Making a tab *richer* than its Overview card (full `AssetsTable` with all columns, Work Orders incl. resolved + `WorkOrderStatusCard`) is a deliberate fast-follow, not v1.
- **Accepted cost:** each section re-runs `getClientPortfolioData` (the same query Overview runs). Fine per-request; not optimizing yet.

## Open Questions

- Should the preview `Sidebar` visually mark that deep links (property rows) leave the preview, or should those be disabled? Deferred to the phase that first surfaces one.
- Analytics takes a `period` arg — expose a period switcher in preview or default to `12M`? Default `12M` for v1.
