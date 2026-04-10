# Code Conventions

## Component Style

- Named exports for all components (no default exports except `App.tsx`)
- Component files use PascalCase: `PortfolioPage.tsx`, `ShellLayout.tsx`
- Utility/hook files use camelCase: `utils.ts`, `use-mobile.ts`

## Styling

> **See `docs/specs/design-system.md` for the full token system, colour rules, typography, spacing, radius, layout grid, and component patterns.**

- Tailwind CSS v4 utility classes only — no CSS modules, no inline style objects unless unavoidable
- All colours must use Valgate semantic token classes (e.g. `bg-surface-base`, `text-primary`, `border-border-default`) — never raw hex or generic Tailwind colours
- Fonts: `Inter` for all UI text (`font-sans`), `Plus Jakarta Sans` for display/hero text (`font-display`)
- All spacing uses base-8 multiples; card gaps are always `gap-6` (24px)
- Dark mode is handled by tokens — components never need conditional dark logic

## File Placement

| What | Where |
|---|---|
| Route-level pages | `src/app/pages/` |
| Property sub-pages | `src/app/pages/property/` |
| Shared UI primitives | `src/app/components/ui/` |
| Layout components | `src/app/components/layout/` |
| Domain components | `src/app/components/<domain>/` |
| Figma static exports | `src/imports/` (reference only) |

## `src/imports/` Rule

Do not edit files in `src/imports/`. They are auto-generated from Figma. When implementing a screen for real, create a new component in `src/app/pages/` or `src/app/components/` and use the import as a visual reference only.

## State Management

- All UI state (panel open/close, selected tab, view mode, form field values) lives in `useState` inside the relevant page component.
- No global state library (no Redux, no Zustand, no Context) is currently used.
- When real data fetching is added, use **React Query** — it is the intended library (per `CLAUDE.md`).

## Libraries Already Chosen

Do not install alternatives to these — they are already the chosen tools:

| Purpose | Library | Status |
|---|---|---|
| Charts | `recharts` | In use — `AnalyticsPage` uses `BarChart`, `ResponsiveContainer` |
| Forms | `react-hook-form` | Installed, not yet wired to any form |
| Data fetching | `@tanstack/react-query` (React Query) | Not yet installed — add when API work begins |

## "Coming Soon" Page Pattern

Pages for planned features display a centered placeholder (not an empty shell). See `SuccessionPage` for the reference implementation: icon, badge, title, description, email input, feature list.

## Icons

Use `lucide-react` for all icons. MUI icons (`@mui/icons-material`) are available but prefer Lucide for consistency.
