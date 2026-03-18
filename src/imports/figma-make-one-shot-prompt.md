# Figma Make — One-Shot Prompt Template
## Valgate SaaS Dashboard → Next.js + Shadcn/ui

> **How to use:** Fill every `{PLACEHOLDER}` below, then paste the entire block into Figma Make.
> The structure is intentional — do not reorder sections.

---

## THE PROMPT

```
=== PROJECT IDENTITY ===
App name: Valgate
Type: Property Management SaaS Dashboard
Target users: Property managers, landlords, maintenance staff
Primary use case: Manage properties, tenants, rent collection, maintenance work orders, and portfolio financials
Stack: Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui

=== BRAND & DESIGN TOKENS ===
These map directly to globals.css CSS variables. Use them as-is:

  --background:        249 250 251    (hsl, #F5F6F7 light / #0F1117 dark)
  --foreground:        16 19 21       (#14181B light / #F5F6F7 dark)
  --card:              0 0 100        (#FFFFFF light / #111420 dark)
  --card-foreground:   same as foreground
  --primary:           220 91 60      (#2563EB light / #3B82F6 dark)
  --primary-foreground: 0 0 100       (#FFFFFF)
  --secondary:         220 14 96      (#F5F6F7 light / #202334 dark)
  --secondary-foreground: 207 11 9    (#14181B light / #EEF2F8 dark)
  --muted:             214 14 91      (#E8EAED light / #171B2B dark)
  --muted-foreground:  210 13 37      (#515D66 light / #8591A0 dark)
  --accent:            220 65 96      (#EEF2F8 light / #202334 dark)
  --destructive:       345 89 45      (#E11D48 light / #F43F5E dark)
  --border:            218 13 82      (#D1D5DB light / #202334 dark)
  --input:             same as border
  --ring:              220 91 60      (#2563EB light / #3B82F6 dark)
  --radius:            0.375rem       (6px — matches button radius)

Font: Inter (body, all sizes), Plus Jakarta Sans (display headings only)
Font source: Google Fonts

=== SCREENS TO GENERATE ===
Generate ALL of the following screens at 1440px width.
Frame names must match exactly as listed — these correspond to Figma frame names in `Main Pages Test`.

--- SHELL ---
All pages except Home and Auth use the persistent shell:
  Sidebar (280px, always visible, not collapsible on desktop) + main content area (fill)
  No top header bar — page titles live inside the content area.

---

1. Home Page - Light  /  Home Page - Dark
   Route: /
   Layout: FULL-SCREEN MAP — no sidebar, no header. Implement as a single page with a light/dark theme toggle.
   Structure:
   - map-canvas (fills viewport):
       - Basemap image (map background, full bleed)
       - map-toolbar (floating, top-left area):
           - map-overlay: property pins / cluster pins rendered on map
           - map-controls: zoom in/out, pan, layer toggle buttons (icon buttons, lucide icons)
           - tab-content: active filter tab content panel
       - sidebar-controls: floating vertical icon button strip (right side, lucide icons)
       - info-panel: slides open from right when a property pin is clicked
           - panel-section-1: property summary (name, address, status badge, key stats)
   Key interaction: clicking map-overlay property pin → opens/closes info-panel (no route change)
   Theme toggle: switches between light basemap and dark basemap + token mode

---

2. Main - Portfolio
   Route: /portfolio
   Layout: Sidebar shell + scrollable content-area
   Structure:
   - Main Headers: page title "Portfolio" + "Add Property" primary button (right)
   - kpi-section (stat row, 3 cards col-span-4 each):
       - KPI_Total Property: total count, trend badge
       - KPI_Number of Sales: completed sales count, trend badge
       - KPI_Total Sales: dollar value of sales, trend badge
   - province-filter-bar: horizontal scrollable geographic filter strip
       - filter-scroll: pill/chip buttons for provinces/regions (All, Ontario, BC, Alberta, Quebec…)
   - table-card (full-width):
       - settings-group: column visibility toggle, view switcher (table/grid), search input
       - Data table columns: Property Name, Address, Province, Type, Units, Status (badge), Value, Actions (...)
       - Row click → navigates to /portfolio/[id] (Property Overview)
       - pagination-footer: showing X of Y, prev/next
   Status badges: Active (green), For Sale (blue), Vacant (yellow), Archived (grey)

---

3. Property Overview  (detail hub — renders sub-page tabs)
   Route: /portfolio/[id]
   Layout: Sidebar shell + property-detail-page
   Structure:
   - Header - Property (shared across ALL sub-pages, sticky):
       - Property name (H1), address (secondary text), status badge
       - Back button → /portfolio
   - Container: tab bar with 6 tabs (Ownership, Rental, Safety, Valuation, Documents, Spatial)
   - Tab content renders below (see sub-pages 3a–3f)
   - pagination-row: bottom prev/next property navigation

   --- 3a. Ownership Page (default tab) ---
   Route: /portfolio/[id]/ownership
   - snapshotStatsRow (4 cols): Purchase Price, Current Value, Equity %, Ownership %
   - equityRow (col-span-8 + col-span-4): equity breakdown bar chart left, equity summary card right
   - ownerCardsRow: 2–3 owner profile cards with avatar, name, ownership %, contact
   - acquisitionRow: acquisition date, purchase price, financing type, lender — in a 2-col form-style card
   - documentsRow: linked document chips (title deed, insurance, mortgage)
   - activityLogRow (full-width): ownership activity log table — Date, User, Action, Notes

   --- 3b. Rental Page ---
   Route: /portfolio/[id]/rental
   - page-header: sub-title "Rental Overview" + "Add Lease" button
   - Row1Stats (4 cols): Current Rent, Occupancy, Lease End, Outstanding Balance
   - Row2Chart (col-span-8 + col-span-4): rental income line chart (12 months) left, occupancy donut right
   - Row3Cards (col-span-6 + col-span-6): active tenant card left, current lease details right
   - Row4Table (full-width): rental history — Tenant, Start, End, Monthly Rent, Status, Documents

   --- 3c. Property Safety Page ---
   Route: /portfolio/[id]/safety
   - search-bar: search safety records
   - tooltip-card: safety compliance checklist cards — each with icon, label, status badge, last inspection date
     Categories: Fire Safety, Electrical, Plumbing, Structural, Insurance

   --- 3d. Property Valuation Page ---
   Route: /portfolio/[id]/valuation
   - Full-width map area with two pin types overlaid:
       - property-pin: single pin for this property (highlighted)
       - cluster-pin: comparable properties nearby (grouped clusters)
   - Valuation summary card (floating or below map): estimated value, last appraisal date, comparables count

   --- 3e. All Document View (3 view modes, toggled via view-switcher) ---
   Routes: /portfolio/[id]/documents (list | grid | pages)
   Shared structure: Header - Property + view-switcher toggle (list/grid/pages icons)
   - Property Documents - List View: file rows — icon, name, type badge, size, uploaded date, download action
   - Property Documents - Grid View: thumbnail grid cards — icon, name, type, date
   - Property Document - Pages View:
       - content-panel (left, ~70%): document page viewer (PDF-style page display)
       - breadcrumb (top of content-panel): doc > section > page navigation trail

   --- 3f. Property Spatial Page (3 view states) ---
   Route: /portfolio/[id]/spatial
   - Default: standard map embed in page-body (within shell layout)
   - Full: expanded map in page-body + floating map-badge ("Map View" indicator chip)
   - Expanded (3D Aerial): full-screen takeover
       - layer-toggle: 3D layer controls panel (satellite, terrain, labels toggles)
       - content-panel: 3D aerial map render
       - spatial-mode-badge: floating chip "3D Aerial View — Interactive terrain scan, full immersive mode"

---

4. Main - Analytics
   Route: /analytics
   Layout: Sidebar shell + scrollable content-area
   Structure:
   - topbar: page title "Analytics" + quick-settings (date range picker, export button)
   - page-content (4 scroll sections, each full-width):
       - Section - Portfolio: portfolio-level KPI cards + portfolio value trend line chart
       - Section - Financial: income vs expenses bar chart + NOI trend + expense breakdown donut
       - Section - Occupancy: occupancy rate over time area chart + vacancy by property table
       - Section - Operations: maintenance open/closed counts + avg resolution time + work order table

---

5. Main - Succession
   Route: /succession
   Layout: Sidebar shell + succession-page
   Structure:
   - Container:
       - section-title: "Succession Planning" + subtitle
       - body-text: introductory paragraph
       - Content containers (2–3 cards): succession timeline card, beneficiary list card, estate documents card

---

6. Main - Settings
   Route: /settings
   Layout: Sidebar shell + settings-page
   Structure:
   - Container with settings sections (vertical stack):
       - Profile: avatar, name, email, phone — edit form
       - Security: change password, 2FA toggle
       - Notifications: toggle rows for email/push notification types
       - Billing: current plan card, usage meter, upgrade button
       - Team: member list table with role badges, invite button

---

7. Add Property Flow — 7-Step Wizard
   Route: /portfolio/add (steps advance in URL or via state)
   IMPORTANT: No step skipping allowed. Steps 3–6 use two-column layout (form-panel left + info-sidebar right) with sticky action-bar (Back + Next/Submit).
   Progress bar shows 6 steps; Step 1 is a pre-flow gate (no progress shown).

   Step 1 — New or Draft (/portfolio/add)
   - Tab nav header + option cards: "Create New Property" vs "Resume Draft"
   - Single CTA button per card

   Step 2 — Property Type
   - progress-bar (step 1 of 6 shown)
   - property-type-options: selection cards for types (Residential, Commercial, Industrial, Land, Mixed-Use)
   - action-bar: Back | Next

   Step 3 — Basic Info (Step 2 of 6)
   - page-heading "Add New Property" + cancel (X) button
   - step-indicator: progress-bar + "Step 2 of 6: Basic Information"
   - form-panel (left): Property Name, Address, City, Province/State, Postal Code, Country, Year Built inputs
   - info-sidebar (right): helper card explaining what basic info is used for
   - action-bar: Back | Next

   Step 4 — Financial Info (Step 3 of 6)
   - step-indicator: "Step 3 of 6: Financial Information"
   - form-panel: Purchase Price, Current Market Value, Annual Revenue, Annual Expenses, Mortgage Balance, Lender inputs
   - info-sidebar: helper card (financial data privacy note)
   - action-bar: Back | Next

   Step 5 — Photos & Documents (Step 4 of 6)
   - step-indicator: "Step 4 of 6: Photos & Documents"
   - TWO upload sections:
       1. "Property Photos" — upload-grid (drag-drop zone + thumbnail previews, max 10 photos)
       2. "Property Documents" — upload-list (file rows with type labels: Title Deed, Insurance, Mortgage)
   - action-bar: Back | Next
   NOTE: This is NOT a standard form — implement as upload UI components.

   Step 6 — Review (Step 5 of 6)
   - step-indicator: "Step 5 of 6: Review"
   - form-panel: read-only summary of all entered data (grouped: Basic, Financial, Media)
   - info-sidebar: checklist of completion status
   - action-bar: Back | Submit

   Step 7 — Success
   - Full-width success state (no form):
       - section-title: "Property Added Successfully" + check icon
       - success-content: property name, quick stats, two CTAs: "View Property" → /portfolio/[id] | "Add Another" → /portfolio/add
       - On confirm → redirect to /portfolio

=== LAYOUT RULES ===
- Sidebar: 280px fixed width, always visible on desktop, vertical nav
- Sidebar nav items (top to bottom): Home (map icon), Portfolio, Analytics, Succession — divider — Settings (bottom)
- Active nav item: surface/tint fill + interactive/primary text color
- NO top header bar — content areas manage their own titles
- Main content: 32px padding all sides, scrollable
- Grid: 12-column, 24px gap (gap-6 in Tailwind)
- ALL frames must use Auto Layout — no absolute positioned groups at top level
- Viewport: 1440px width, height = content height

=== SHADCN COMPONENT RULES ===
Use only shadcn/ui components. Map design elements as follows:
- Cards → <Card>, <CardHeader>, <CardTitle>, <CardContent>, <CardFooter>
- Buttons → <Button variant="default|secondary|outline|ghost|destructive" size="default|sm|lg|icon">
- Inputs, selects, textareas → <Input>, <Select>, <Textarea>
- Tables → <Table>, <TableHeader>, <TableBody>, <TableRow>, <TableHead>, <TableCell>
- Badges → <Badge variant="default|secondary|outline|destructive">
- Tabs → <Tabs>, <TabsList>, <TabsTrigger>, <TabsContent>
- Dialogs / modals → <Dialog>, <DialogTrigger>, <DialogContent>, <DialogHeader>
- Dropdown menus → <DropdownMenu> for action "..." menus
- Avatars → <Avatar>, <AvatarImage>, <AvatarFallback>
- Separators → <Separator>
- Tooltips → <Tooltip>, <TooltipContent>, <TooltipTrigger>
- Toasts → <Sonner> (sonner library)
- Skeleton loaders → <Skeleton> for loading states
- Date picker → <Popover> + <Calendar>

=== COMPONENT STATES ===
Every interactive component must include these states (as Figma variants):
- Button: default, hover, loading (spinner), disabled
- Input: default, focus, error (red border + error message), disabled
- Badge: color variants per status type (use Valgate status colors)
- Table row: default, hover, selected
- Card: default, loading (skeleton variant)
- Nav item: default, active (highlighted), hover

=== CODE GENERATION INSTRUCTIONS ===
Generate this as a Next.js 14 App Router project with TypeScript.

Project structure:
  app/
    layout.tsx                        ← Root layout: ThemeProvider only (no sidebar — home page is outside shell)
    globals.css                       ← Shadcn CSS variables (use Valgate token values above)
    page.tsx                          ← Home Page map view (full-screen, no shell)
    (shell)/                          ← Route group: all pages that use the sidebar shell
      layout.tsx                      ← Shell layout: Sidebar + content area wrapper
      portfolio/
        page.tsx                      ← Main - Portfolio
        add/page.tsx                  ← Add Property Flow (wizard state managed client-side)
        [id]/
          page.tsx                    ← Property Overview (redirects to /ownership tab)
          ownership/page.tsx
          rental/page.tsx
          safety/page.tsx
          valuation/page.tsx
          documents/page.tsx
          spatial/page.tsx
      analytics/page.tsx              ← Main - Analytics
      succession/page.tsx             ← Main - Succession
      settings/page.tsx               ← Main - Settings
  components/
    ui/                               ← shadcn auto-generated — DO NOT MODIFY
    app/
      layout/
        sidebar.tsx                   ← Persistent sidebar with nav items + active state
        shell.tsx                     ← Sidebar + main content wrapper
      map/
        map-canvas.tsx                ← Home page full-screen map ('use client')
        map-controls.tsx              ← Zoom/pan/layer icon buttons
        info-panel.tsx                ← Slide-in property info panel
        property-pin.tsx              ← Map pin component
      portfolio/
        property-table.tsx            ← Sortable property data table
        province-filter.tsx           ← Horizontal scrollable filter strip
        kpi-card.tsx                  ← KPI stat card with trend badge
      property/
        property-header.tsx           ← Shared sticky header (name, address, badge, back)
        property-tabs.tsx             ← Tab navigation for sub-pages
        ownership/ownership-view.tsx
        rental/rental-view.tsx
        documents/document-list.tsx
        documents/document-grid.tsx
        documents/document-viewer.tsx
        spatial/spatial-map.tsx
      add-property/
        wizard-shell.tsx              ← Step progress bar + action-bar
        step-1-gate.tsx
        step-2-type.tsx
        step-3-basic.tsx
        step-4-financial.tsx
        step-5-media.tsx
        step-6-review.tsx
        step-7-success.tsx
      analytics/
        analytics-section.tsx         ← Reusable titled section wrapper
      shared/
        data-table.tsx                ← Reusable table with sorting + pagination
        status-badge.tsx              ← Wraps <Badge> with Valgate status color variants
        page-header.tsx               ← Page title + optional action button slot
        stat-card.tsx                 ← KPI card (number, label, trend)
        upload-grid.tsx               ← Photo upload drag-drop grid ('use client')
  lib/
    utils.ts                          ← shadcn cn() utility
    types.ts                          ← Shared TypeScript interfaces (Property, Tenant, Document…)
    mock-data.ts                      ← All mock data (properties, owners, leases, docs, analytics)
  hooks/
    use-theme.ts                      ← Light/dark theme toggle (for home page map)
    use-wizard.ts                     ← Add Property wizard step state

Rules:
- Server Components by default. Mark 'use client' only for: sidebar toggle, charts, forms, dropdowns.
- Use Tailwind for all layout and spacing. No inline styles.
- Spacing: use only Tailwind scale values (p-1=4px, p-2=8px, p-3=12px, p-4=16px, p-6=24px, p-8=32px)
- Charts: use recharts (already in shadcn). Wrap in a 'use client' component.
- All data is mock/static — no API calls. Export mock data from lib/mock-data.ts.
- Icons: use lucide-react exclusively.
- No external component libraries. Only shadcn/ui + Tailwind + lucide-react + recharts.

=== REALISTIC PLACEHOLDER DATA ===
Use this data (do not use "Lorem ipsum"):

Portfolio KPIs: 46 total properties, 12 sold this year, $4.2M total sales value
Properties (use for table + map pins):
  - Oakwood Residences, 142 Elm Street, Toronto, ON — Residential, 12 units, Active
  - Riverside Lofts, 88 River Rd, Vancouver, BC — Residential, 8 units, For Sale
  - The Meridian Tower, 500 Bay St, Toronto, ON — Commercial, 20 units, Active
  - Sunset Terrace, 23 Hillcrest Ave, Calgary, AB — Residential, 6 units, Vacant
  - Harbour View, 1 Dock Lane, Halifax, NS — Mixed-Use, 4 units, Active
Province filter chips: All, Ontario, British Columbia, Alberta, Quebec, Nova Scotia

Property detail (use for Property Overview — default to Oakwood Residences):
  Ownership: Purchased 2019-03-14, $1,850,000, Current value $2,340,000, 79% owned by Marcus Rivera, 21% by Emily Chen
  Rental: $8,400/mo current rent, 92% occupancy, lease ends 2025-08-31, $0 outstanding
  Documents: Title Deed (PDF, 2.4MB), Insurance Policy (PDF, 1.1MB), Mortgage Agreement (PDF, 3.2MB)

Analytics data:
  Portfolio value trend: Jan–Dec 2025 ($18.2M → $21.4M, upward trend)
  Income vs Expenses: monthly for 6 months, income consistently ~$127K, expenses ~$48K
  Occupancy rate: 89% average, range 84%–94% over 12 months
  Open maintenance work orders: 7 open, 3 in progress, 28 completed this month

Owners / users: Marcus Rivera (Owner), Emily Chen (Co-Owner), James Carter (Tenant), Sarah Mitchell (Tenant), David Okonkwo (Maintenance Manager)

Add Property wizard sample data:
  Step 2 type: Residential
  Step 3 basic: "Pinecrest Heights", 77 Pinecrest Rd, Mississauga, ON, L5B 2T3, Canada, Built 2001
  Step 4 financial: Purchase $920,000, Market value $1,050,000, Annual revenue $96,000, Expenses $28,000, Mortgage $610,000, Lender: TD Bank
```

---

## PRE-EXPORT CHECKLIST (verify before exporting from Figma)

- [ ] Every top-level frame has Auto Layout applied
- [ ] Sidebar and header are components with collapse variant defined
- [ ] All colors use Figma Variables from `Valgate · 04 · Semantic Tokens`
- [ ] No hardcoded hex values anywhere in the frame
- [ ] All TEXT nodes have a Valgate text style applied (no null textStyleId)
- [ ] Spacing values are from `Valgate · 02 · Spacing` variables
- [ ] Radius values are from `Valgate · 03 · Radius` variables
- [ ] Component names match shadcn names exactly (Button, Card, Input, Badge, Table, etc.)
- [ ] Each component has default + interactive state variants
- [ ] Light mode looks correct — then verify Dark mode by switching collection mode

---

## POST-EXPORT: globals.css CSS Variables

After Figma Make exports, replace the CSS variables in `app/globals.css` with:

```css
@layer base {
  :root {
    --background: 249 250 251;       /* #F5F6F7 surface/page */
    --foreground: 16 19 21;          /* #14181B text/primary */
    --card: 0 0 100;                 /* #FFFFFF surface/base */
    --card-foreground: 16 19 21;
    --popover: 214 26 97;            /* #F5F6F7 surface/elevated */
    --popover-foreground: 16 19 21;
    --primary: 220 83 60;            /* #2563EB interactive/primary */
    --primary-foreground: 0 0 100;   /* #FFFFFF text/inverse */
    --secondary: 220 14 96;          /* #F5F6F7 interactive/secondary */
    --secondary-foreground: 16 19 21;
    --muted: 215 13 91;              /* #E8EAED surface/sunken */
    --muted-foreground: 210 12 37;   /* #515D66 text/secondary */
    --accent: 220 65 96;             /* #EEF2F8 surface/tint */
    --accent-foreground: 220 83 60;  /* #2563EB interactive/primary */
    --destructive: 345 89 45;        /* #E11D48 status/danger */
    --destructive-foreground: 0 0 100;
    --border: 218 13 82;             /* #D1D5DB border/default */
    --input: 218 13 82;
    --ring: 220 83 60;               /* #2563EB border/focus */
    --radius: 0.375rem;              /* 6px — Valgate radius/lg */
  }

  .dark {
    --background: 232 30 7;          /* #0F1117 surface/page */
    --foreground: 210 22 96;         /* #F5F6F7 text/primary */
    --card: 232 28 10;               /* #111420 surface/base */
    --card-foreground: 210 22 96;
    --popover: 228 27 16;            /* #202334 surface/elevated */
    --popover-foreground: 210 22 96;
    --primary: 213 94 68;            /* #3B82F6 interactive/primary */
    --primary-foreground: 0 0 100;
    --secondary: 228 27 16;          /* #202334 interactive/secondary */
    --secondary-foreground: 220 65 96;
    --muted: 231 28 11;              /* #171B2B */
    --muted-foreground: 212 14 58;   /* #8591A0 text/secondary */
    --accent: 228 27 16;             /* #202334 surface/tint */
    --accent-foreground: 213 94 68;
    --destructive: 350 89 60;        /* #F43F5E status/danger */
    --destructive-foreground: 0 0 100;
    --border: 228 27 16;             /* #202334 border/default */
    --input: 228 27 16;
    --ring: 213 94 68;
  }
}
```

---

## POST-EXPORT: components.json

Verify `components.json` has these settings after export:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

---

## ITERATION WORKFLOW (Figma ↔ Code)

### Figma → Code changes
1. Edit component in Figma (update variant, layout, text)
2. Re-export with Figma Make — specify only the changed component/page
3. Compare diff with existing `components/app/` files
4. Merge changes manually — never overwrite `components/ui/`

### Code → Figma changes
1. Edit the `.tsx` component in code
2. In Figma: find the matching component by the same name
3. Update the Figma component to match — keep Auto Layout and token bindings intact
4. Run the audit script (from `valgate-design-system-guide.md`) to verify no token drift

### Token drift prevention
- All Tailwind colors must reference CSS variables: use `bg-card`, `text-muted-foreground`, `border-border`, not raw hex or hardcoded colors
- Never add a new Tailwind color — extend the CSS variable mapping instead
- When adding a new component: add it to both `components/app/` (code) and Figma (component with variants)

---

## SHADCN INSTALL COMMAND

After project scaffolding, install all required components at once:

```bash
npx shadcn@latest add button card input select textarea table badge tabs dialog dropdown-menu avatar separator tooltip skeleton calendar popover sheet scroll-area progress breadcrumb
```

Add charts (recharts wrapper):
```bash
npx shadcn@latest add chart
```

Add toast:
```bash
npx shadcn@latest add sonner
```

Map library (for Home Page and Spatial/Valuation views):
```bash
npm install react-map-gl mapbox-gl
# or: npm install leaflet react-leaflet @types/leaflet
```
Use `react-map-gl` (Mapbox) for production quality. Use `react-leaflet` as a free fallback for mockup purposes.
