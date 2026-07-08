## ADDED Requirements

### Requirement: Browsable client portfolio sections in preview

The "View as client" preview SHALL let the owning manager navigate the client's portfolio sections — Home, Portfolio, Rental, Directory, Analytics, and Estate Planning — with each section's data scoped read-only to the client's org.

#### Scenario: Manager navigates to a portfolio section
- **WHEN** a manager viewing `/pro/clients/[clientId]/as-client` activates the Rental sidebar item
- **THEN** the preview navigates to the Rental section and renders the client's rental data (leases, tenants, payments) as the client would see it
- **AND** the preview chrome (exit bar, sidebar, blue-glow frame, Propose-changes control) remains present

#### Scenario: Section data is scoped to the client's org
- **WHEN** any preview section renders
- **THEN** its data is read with a viewer Ctx bound to the client's org (`orgRole: "viewer"`), never the manager's own org
- **AND** no Clerk organization switch occurs on the manager's session

#### Scenario: Sidebar reflects the active section
- **WHEN** the preview is on a given section
- **THEN** that section's sidebar item is shown as active
- **AND** activating a different section item updates the active state and the rendered section

### Requirement: Preview navigation is confined to the preview

Preview sidebar navigation SHALL target preview-scoped section routes under the client's `as-client` base path, not the manager's own owner routes.

#### Scenario: Nav item targets the preview base path
- **WHEN** a preview sidebar item for path `/rental` is activated for client `CLI-0011`
- **THEN** navigation goes to `/pro/clients/CLI-0011/as-client/rental`
- **AND** it does not navigate to the manager's own `/rental`

### Requirement: Account-level surfaces are excluded from preview

The preview SHALL NOT expose account-level surfaces (Settings, profile) as navigable, because there is no client user session to render and they would show the manager's own account.

#### Scenario: Settings and profile are non-navigating in preview
- **WHEN** the preview sidebar is shown
- **THEN** the Settings item and the profile avatar do not navigate anywhere
- **AND** the manager-only "Pro" item and the sign-out control remain hidden (as before)

### Requirement: Preview remains read-only

Browsing sections in preview SHALL NOT grant write access to the client's data; the only path to change client data remains the existing Propose-changes flow.

#### Scenario: A section's write action does not mutate client data
- **WHEN** a manager triggers a mutating action from within a browsed preview section
- **THEN** the service layer rejects the write because the Ctx role is `viewer`
- **AND** the client's data is unchanged

### Requirement: Contextual manager sidebar

The Pro shell sidebar SHALL present different navigation depending on context, following the active workspace tab: a **Portfolio context** (manager-wide) and a **Client context** (scoped to one client).

#### Scenario: Portfolio context shows manager-wide nav
- **WHEN** the active tab is the dashboard, or the route is a manager-wide page (`/pro/dashboard`, `/pro/clients`, `/pro/properties`, …)
- **THEN** the sidebar shows the manager-wide nav (Home, Properties, Rent & Collections, Work Orders, Compliance, Agent Hub) and the client book below it
- **AND** the client book is headed by a single "Clients" nav-styled button (routing to `/pro/clients`) with a collapse chevron and an add-client action — not a duplicate "Clients" nav item

#### Scenario: Client context shows client-scoped nav
- **WHEN** the active tab is a client (route under `/pro/clients/[clientId]`)
- **THEN** the sidebar shows a client-scoped nav: a "Back to Dashboard" control, the client's identity, the manager's per-client section items (Overview, Properties, Financials, Work Orders, Compliance, Activity), and a "View as client" entry into the read-only preview
- **AND** the manager-wide nav and client book are not shown in this context

### Requirement: Client context returns to the dashboard

The client-context sidebar SHALL provide a control that returns the manager to the dashboard (the Home destination).

#### Scenario: Back control returns to the dashboard
- **WHEN** the client-context sidebar renders
- **THEN** a "Back to Dashboard" control is shown that activates the dashboard tab (`/pro/dashboard`)

### Requirement: Client workspace sections are the manager's per-client cockpit

Each client section (Properties, Financials, Work Orders, Compliance, Activity) SHALL be reachable at `/pro/clients/[clientId]/<section>` rendered **inside the manager shell** (header + workspace tabs persist), showing the **manager's** Dashboard cards scoped to this one client — NOT the client's own owner views. Sections reuse the existing Dashboard components (`AssetsTable`, `FinancialsCard`, `OccupancyCard`, `MaintenanceQueueCard`, `ComplianceTable`, `ActivityFeed`) fed by `getClientPortfolioData(clientId)`. Overview is the base route (`/pro/clients/[clientId]`) and remains the full everything-page. The client's owner views (Portfolio, Rental, Analytics, Directory, Estate Planning) live only behind "View as client".

#### Scenario: Section shows the manager's per-client view, not the owner view
- **WHEN** a manager activates the Properties item in the client-context sidebar for client `CLI-0011`
- **THEN** navigation goes to `/pro/clients/CLI-0011/properties` and renders the manager's `AssetsTable` for this client's data
- **AND** the manager shell header and workspace tab bar remain visible (no full-screen takeover)

#### Scenario: The client's owner views stay behind View as client
- **WHEN** the manager activates "View as client" from the client-context sidebar
- **THEN** the full-screen `.../as-client` preview opens with the client's own owner sections (Portfolio, Rental, Analytics, Directory, Estate Planning) — the client's-eye view

### Requirement: Workspace tabs preserve per-client section

An open workspace tab SHALL remember the last section route visited within that client, and re-activating the tab SHALL restore that route rather than resetting to the client root.

#### Scenario: Switching tabs preserves section
- **WHEN** a manager is on client A's Rental section, switches to client B's tab, then re-activates client A's tab
- **THEN** the manager lands back on client A's Rental section, not client A's root
