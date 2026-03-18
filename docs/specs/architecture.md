# Architecture

## Overview

Valgate is a React SPA with client-side routing. There is no backend yet — all data is currently hardcoded in component files.

## Folder Structure

```
src/
  app/
    pages/            # Route-level page components
    pages/property/   # Property sub-pages (nested under /property/:id)
    components/
      ui/             # Primitive UI components (shadcn/ui pattern over Radix UI)
      layout/         # ShellLayout (sidebar + outlet), Sidebar
      property/       # Property-specific layout and detail components
      figma/          # ImageWithFallback utility for Figma-exported assets
    routes.ts         # All route definitions (React Router v7)
    App.tsx           # RouterProvider entry point
  imports/            # Figma-exported static screen components + SVG assets
  styles/             # Global styles
```

## Routing

- `/` — HomePage (map + property list overview)
- `/portfolio` — Full property list with filters
- `/analytics` — Analytics dashboard
- `/succession` — Succession planning (marked "Soon")
- `/map` — Map view
- `/settings` — Settings
- `/property/:id/*` — Property detail with sub-routes: `overview`, `ownership`, `documents`, `safety`, `spatial`, `rental`, `valuation`, `surrounding`
- `/add-property` — Add property multi-step flow

All routes except `/` are wrapped in `ShellLayout` (sidebar + main content area).

## Key Conventions

- Pages live in `src/app/pages/`
- Shared UI primitives live in `src/app/components/ui/`
- Layout components live in `src/app/components/layout/`
- `src/imports/` contains auto-generated Figma exports — treat as reference/static, not production components
- Styling is Tailwind CSS v4 utility classes; no CSS modules

## Data Flow (Current — Mockup)

All data is hardcoded as static arrays at the top of each page file. There is no global state, no API calls, and no data fetching library in use yet.
