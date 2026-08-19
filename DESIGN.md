---
version: alpha
name: Valgate Application System
description: Calm, high-trust property-management software. Information leads; blue signals action; surfaces are quietly blue-tinted rather than generic gray.
colors:
  primary: "#2563EB"
  primary-foreground: "#FFFFFF"
  brand-primary: "#004AC6"
  interactive-primary: "#2563EB"
  interactive-primary-hover: "#1D4ED8"
  interactive-primary-text: "#FFFFFF"
  interactive-secondary: "#F5F6F7"
  interactive-secondary-hover: "#E8EAED"
  interactive-secondary-text: "#14181B"
  surface-page: "#F5F6F7"
  surface-sunken: "#E8EAED"
  surface-base: "#FFFFFF"
  surface-tint: "#EEF2F8"
  text-primary: "#14181B"
  text-secondary: "#515D66"
  text-tertiary: "#6B7684"
  text-link: "#2563EB"
  border-default: "#D1D5DB"
  border-subtle: "#E8EAED"
  focus: "#2563EB"
  destructive: "#E11D48"
  destructive-foreground: "#FFFFFF"
  success: "#059669"
  warning: "#F59E0B"
  danger: "#E11D48"
  info: "#0284C7"
typography:
  display:
    fontFamily: Geist, ui-sans-serif, system-ui, sans-serif
    fontSize: 1.5rem
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: Geist, ui-sans-serif, system-ui, sans-serif
    fontSize: 1.25rem
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: Geist, ui-sans-serif, system-ui, sans-serif
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
  data:
    fontFamily: Geist, ui-sans-serif, system-ui, sans-serif
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: Geist, ui-sans-serif, system-ui, sans-serif
    fontSize: 0.75rem
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: "0.05em"
  badge:
    fontFamily: Geist, ui-sans-serif, system-ui, sans-serif
    fontSize: 0.625rem
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.1em"
rounded:
  xs: 2px
  sm: 4px
  md: 6px
  lg: 10px
  xl: 14px
spacing:
  1: 4px
  2: 8px
  3: 12px
  4: 16px
  5: 20px
  6: 24px
  8: 32px
  10: 40px
components:
  button-primary:
    backgroundColor: "{colors.interactive-primary}"
    textColor: "{colors.interactive-primary-text}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 16px
  button-primary-hover:
    backgroundColor: "{colors.interactive-primary-hover}"
    textColor: "{colors.interactive-primary-text}"
    rounded: "{rounded.md}"
    padding: 16px
  button-secondary:
    backgroundColor: "{colors.interactive-secondary}"
    textColor: "{colors.interactive-secondary-text}"
    rounded: "{rounded.md}"
    padding: 16px
  button-secondary-hover:
    backgroundColor: "{colors.interactive-secondary-hover}"
    textColor: "{colors.interactive-secondary-text}"
    rounded: "{rounded.md}"
    padding: 16px
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.destructive-foreground}"
    rounded: "{rounded.md}"
    padding: 16px
  button-ghost-hover:
    backgroundColor: "{colors.surface-tint}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: 16px
  card:
    backgroundColor: "{colors.surface-base}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.xl}"
    padding: 24px
---

## Overview

This is the **application** design system for Valgate's property-management web app. It consolidates the existing brand guide, semantic CSS token layer, Tailwind mappings, and reusable UI primitives into one implementation-facing base.

It is intentionally not a redesign and not yet a full component library. The source of truth for live values remains `styles/theme.css`; this document is a shared reference and starting point, not a strict visual constraint. A task may deliberately depart from a token or pattern when that better serves the product brief, provided the departure is intentional, accessible, and does not accidentally break an established reusable component.

## Colors

Use semantic roles, never component-local hex values:

- **Interactive roles:** `interactive-primary` is for high-emphasis actions, focus, selection, and links. `interactive-secondary` is the semantic low-emphasis control surface; use its default, hover, and text tokens rather than substituting a generic page surface.
- **Destructive:** reserve the destructive background/foreground pair for irreversible or high-risk actions and require confirmation when the consequence warrants it.
- **Blue-tinted neutrals:** page, base, sunken, and tint surfaces establish Valgate's calm property-data environment. Use a surface role rather than `white`, `gray`, or arbitrary slate values.
- **Status:** success, warning, danger, and info communicate real state only. Each status needs a background, border, and legible text treatment; color is never the only carrier of meaning.
- **Dark mode:** use the parallel semantic values already defined in `styles/theme.css`, not an inverted light palette.

Brand/reference values in `docs/valgate-brand-guide.md` are portable marketing guidance. The semantic token layer in `styles/theme.css` is canonical for the running application where values differ.

## Typography

**Current application face:** Geist (with system sans fallbacks) for all application-owned text. `--font-display` currently exposes Bricolage Grotesque for legacy display usage, but it is not the default for new application UI; follow the brand guide and use Geist hierarchy unless a future brand decision changes this.

Use semantic roles, not a one-off font size:

| Role | Typical web treatment | Use |
|---|---|---|
| Display / page title | 24px, 700, tight tracking | page identity and major values |
| Section heading | 16–20px, 600–700 | named content groups |
| Body | 16px, 400, 1.5 line height | descriptions and reading text |
| Data body | 14px, 400 | dense tables and structured records |
| Label | 11–12px, 600, uppercase + tracking | metadata and table headers |
| Badge | 10px, 600, uppercase + tracking | compact status/category metadata |

Use tabular figures for financial values, ledger columns, dates, and changing KPI numbers. Typography, whitespace, and weight contrast establish hierarchy before color or iconography.

## Layout

Use the 4px base spacing scale. Prefer purposeful, generous rhythm over every element receiving the same padding.

- Page shell: `px-8` desktop horizontal rhythm; responsive utilities reduce safely on narrow screens.
- Content width: use `max-w-6xl`/`max-w-[1200px]` for primary data pages.
- Section rhythm: 20px (`gap-5`) is the existing default between page content groups.
- Touch targets: interactive elements must meet the existing `touch-44` minimum (44 × 44 CSS pixels) when used on touch surfaces.
- Mobile: respect safe-area utilities and dynamic viewport sizing; do not introduce fixed desktop-width assumptions.

## Elevation & Depth

Surfaces are primarily separated by spacing and a 1px semantic border. Use a small shadow for a card and a stronger shadow only for overlays or active elevation.

- Do not nest cards inside cards.
- Prefer `border-subtle`/`border-default` over decorative shadows.
- Hover lift is reserved for genuinely actionable cards and should be slight (`translateY(-2px)` or less).

## Shapes

The core radius is 6px. Buttons and compact controls use the medium 6px radius; content cards may use 10–14px where the larger surface warrants it. Pills are reserved for filters, tags, and compact state—not generic containers.

## Components

The initial component inventory is already in the repository:

- **Button** — `components/ui/button.tsx`; default, destructive, outline, secondary, ghost, and link variants; sizes sm/default/lg/icon.
- **EmptyState** — `components/ui/EmptyState.tsx`; optional icon, title, description, and action.
- **TableScroll / StackedCardTable** — responsive data-table primitives.
- **DraggableSheet / ConfirmAction / Spinner / RequiredMark** — shared interaction and feedback primitives.
- **ShellLayout, AppHeader, Sidebar, PhoneTopBar** — application-shell primitives.

Every component addition must define its purpose, variants, disabled/loading/empty/error states where applicable, keyboard behavior, focus treatment, responsive behavior, and an accessibility test or review note before it is treated as shared.

## Do's and Don'ts

**Do**

- Start from a semantic token and an existing primitive before creating a new style; depart deliberately when a task calls for a distinct creative direction.
- Make data, property imagery, and clearly worded actions the visual hero.
- Use clear focus-visible states and text labels alongside unfamiliar icons.
- Keep motion purposeful: state feedback or transition only; respect `prefers-reduced-motion`.
- Use accessible names, real controls, and visible labels for critical actions.

**Don't**

- Hardcode colors, duplicate a button recipe, or use arbitrary opacity to invent a new surface.
- Use blue decoratively, pure black, pure white, or untinted generic gray.
- Nest cards, add side-stripe card accents, or turn badges into headlines.
- Make color the only signal for a state, error, or selection.
- Add animation solely for decoration, bounce/elastic easing, or layout-property animation.
