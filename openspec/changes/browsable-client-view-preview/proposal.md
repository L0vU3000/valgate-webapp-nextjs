## Why

The manager's "View as client" preview (`/pro/clients/[clientId]/as-client`) renders the client's Home only. Every other sidebar nav item (Portfolio, Rental, Directory, Analytics, Estate Planning) looks clickable but is inert — `Sidebar.handleNavigate` early-returns whenever `isPreview` is true. Managers can't inspect the sections where a client's problems usually live (rent status, estate structure, analytics), which is the whole point of previewing as the client.

## What Changes

- Convert `as-client` from a single-page client takeover into a **route segment with nested section pages**. A shared `layout.tsx` owns the preview chrome (exit bar, preview `Sidebar`, blue-glow frame, Propose-changes panel); each section is its own `page.tsx`.
- Add a `ctxOverride?: Ctx` seam to the section query functions that don't have one yet — `getPortfolioPageData`, `getRentalDashboardData`, `getAnalyticsPageData`, `getDirectoryPageData`, `getEstatePlanningPageData` — mirroring the seam `getHomePageData` already exposes. Default path (`?? await requireCtx()`) is unchanged, so real owner routes are unaffected.
- Teach `Sidebar` a `previewBasePath` prop: in preview, nav items push `previewBasePath + item.path` and compute active state against the current pathname instead of being inert.
- Preview scope is the **portfolio sections only**: Home, Portfolio, Rental, Directory, Analytics, Estate Planning. Settings and the profile avatar stay non-navigating in preview (account-level, no client user session to render).
- Rollout is phased and independent per section: Home + Rental + Portfolio first, then Directory + Analytics + Estate Planning.
- **Contextual manager sidebar (multitasking model "A")** — the global `ManagerSidebar` becomes context-aware: a Portfolio context (manager-wide nav + client book; `Home` relabeled **"Portfolio"**) and a Client context (client-scoped section nav + "View as client"), driven by the active workspace tab. Adds a `ChevronDown` affordance to the identity dropdown. Surfaces the reused sections a second way — as a manager-shell **client workspace** at `/pro/clients/[clientId]/<section>` (header + tabs persist), distinct from the full-screen `as-client` preview. Workspace tabs gain per-tab route memory so switching clients preserves the section. Read-scoped; inline editing of these sections is `manager-act-on-behalf`'s concern. See D5.

## Capabilities

### New Capabilities
- `client-view-preview`: A manager may browse a client's portfolio sections, scoped read-only to the client's org, through the "View as client" preview without a Clerk org switch.

### Modified Capabilities
<!-- None. No existing spec's requirements change; section query fns gain an optional param (implementation detail, not a spec-level behavior change for owner routes). -->

## Impact

- **Routes**: new `app/(pro)/pro/clients/[clientId]/as-client/{layout,portfolio,rental,directory,analytics,estate-planning}` segments; existing `page.tsx` becomes the Home segment.
- **Queries**: `app/(shell)/{portfolio,rental,analytics,directory,estate-planning}/queries.ts` gain an optional `ctxOverride?: Ctx` param.
- **Component**: `components/layout/Sidebar.tsx` gains `previewBasePath` handling; `ClientViewPreview.tsx` chrome moves into the new layout.
- **Auth**: reuses `resolveClientOrgForManager` + hand-built viewer `Ctx`; no new auth surface. Reads stay `orgRole: "viewer"` (read-only).
- **No** new dependencies, schema, or migrations.
- **Shell (contextual sidebar)**: `ManagerSidebar` (context split + Portfolio rename + chevron), `WorkspaceTabProvider` (per-tab `lastPath` memory); new `app/(pro)/pro/clients/[clientId]/{portfolio,rental,analytics,directory,estate-planning}/page.tsx` thin wrappers reusing the section components + Ctx seam. `ClientPortfolioPage` becomes the workspace "Overview".
