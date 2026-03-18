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
      ui/             # 50+ shadcn/ui pre-built primitives (Button, Dialog, Table, etc.)
      layout/         # ShellLayout (sidebar + outlet), Sidebar
      property/       # Property-specific layout and detail components
      figma/          # ImageWithFallback utility for Figma-exported assets
    routes.ts         # All route definitions (React Router v7)
    App.tsx           # RouterProvider entry point
  imports/            # Figma-exported static screen components + SVG assets
  styles/
    fonts.css         # Loads Inter + Plus Jakarta Sans from Google Fonts
    tailwind.css      # Tailwind v4 entry point (@import + content scan directives)
    theme.css         # All CSS custom properties (semantic token values for light/dark)
    index.css         # Root stylesheet — imports the three above in order
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

## Path Aliases

`@` maps to `./src` (configured in `vite.config.ts`). Always use `@/` imports — never relative `../` chains.

```ts
import { Button } from '@/app/components/ui/button'
import { ShellLayout } from '@/app/components/layout/ShellLayout'
```

## shadcn/ui Components

`src/app/components/ui/` contains 50+ pre-built components generated from shadcn/ui (Button, Dialog, Table, Select, Tabs, etc.). Before building a new UI primitive, check if it already exists here. Do not rewrite these.

## Key Conventions

- Pages live in `src/app/pages/`
- Shared UI primitives live in `src/app/components/ui/`
- Layout components live in `src/app/components/layout/`
- `src/imports/` contains auto-generated Figma exports — treat as reference/static, not production components
- Styling is Tailwind CSS v4 utility classes; no CSS modules

## Data Flow (Current — Mockup)

All data is hardcoded as static arrays at the top of each page file. There is no global state, no API calls, and no data fetching library in use yet.
