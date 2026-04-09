# Architecture

## Overview

Valgate is a React SPA with client-side routing. There is no backend yet — all data is currently hardcoded in component files.

## Folder Structure

```
src/
  app/
    pages/              # Route-level page components
    pages/property/     # Property sub-pages (nested under /property/:id)
    pages/add-property/ # AddProperty step components (Step0–Step6 + types)
    components/
      ui/               # shadcn/ui primitives (button, command, dialog, input, label, utils)
      layout/           # ShellLayout (sidebar + outlet), Sidebar
      property/         # Property-specific layout and detail components
      figma/            # ImageWithFallback utility for Figma-exported assets
      home/             # HomePage sub-components (CommandPalette, QuickStats)
      portfolio/        # Portfolio sub-components (PropertyTable, PropertyFilters)
      rental/           # RentalDashboard sub-components (KpiCards, HeatmapGrid, LeaseTable)
    lib/
      format.ts         # Currency formatting utilities (formatCurrency, formatCurrencyFull)
      property-helpers.ts # Property type/status/title badge classes, icon maps
      mock-data.ts      # Shared Property interface and mock data array (16 entries)
    routes.ts           # All route definitions (React Router v7)
    App.tsx             # RouterProvider entry point
  imports/              # Figma-exported static screen components + SVG assets
  styles/
    fonts.css           # Loads Inter + Plus Jakarta Sans from Google Fonts
    tailwind.css        # Tailwind v4 entry point (@import + content scan directives)
    theme.css           # All CSS custom properties (semantic token values for light/dark)
    index.css           # Root stylesheet — imports the three above in order
```

## Routing

- `/` — HomePage (map + property list overview)
- `/portfolio` — Full property list with filters
- `/analytics` — Analytics dashboard
- `/succession` — Succession planning (marked "Soon")
- `/map` — Map view (route exists, page component removed — dead code)
- `/settings` — Settings
- `/property/:id/*` — Property detail with sub-routes: `overview`, `ownership`, `documents`, `safety`, `spatial`, `rental`, `valuation`, `surrounding`
- `/add-property` — Add property multi-step flow

All routes except `/` are wrapped in `ShellLayout` (sidebar + main content area).

## Path Aliases

`@` maps to `./src` (configured in `vite.config.ts`). The codebase currently uses relative `../` imports. Both work.

## shadcn/ui Components

`src/app/components/ui/` contains only the shadcn/ui primitives that are actively used: `button`, `command`, `dialog`, `input`, `label`, and `utils` (plus `use-mobile` hook). Unused components have been removed — re-add any via `npx shadcn@latest add <name>`.

## Key Conventions

- Pages live in `src/app/pages/`
- Shared UI primitives live in `src/app/components/ui/`
- Layout components live in `src/app/components/layout/`
- `src/imports/` contains auto-generated Figma exports — treat as reference/static, not production components
- Styling is Tailwind CSS v4 utility classes; no CSS modules

## Data Flow (Current — Mockup)

Shared mock data (Property interface and 16-entry array) lives in `src/app/lib/mock-data.ts`. Page-specific data (rental heatmap, succession beneficiaries, etc.) remains in its respective page/component file. There is no global state, no API calls, and no data fetching library in use yet.
