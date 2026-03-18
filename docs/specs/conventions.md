# Code Conventions

## Component Style

- Named exports for all components (no default exports except `App.tsx`)
- Component files use PascalCase: `PortfolioPage.tsx`, `ShellLayout.tsx`
- Utility/hook files use camelCase: `utils.ts`, `use-mobile.ts`

## Styling

- Tailwind CSS v4 utility classes only — no CSS modules, no inline style objects unless unavoidable
- Font: `Inter` applied via `font-['Inter',sans-serif]` className
- Use design token classes (`bg-card`, `text-foreground`, `border-border`, etc.) over hardcoded colors
- Exception: status/type colors (e.g. `#059669` for green, `#F59E0B` for yellow) are currently hardcoded in data — these should eventually become token-based

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

## Icons

Use `lucide-react` for all icons. MUI icons (`@mui/icons-material`) are available but prefer Lucide for consistency.
