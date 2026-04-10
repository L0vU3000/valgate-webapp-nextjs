# Valgate Design System

> **Stack:** React · shadcn/ui · Tailwind CSS  
> **Style:** Bento / Soft Minimalist  
> **Version:** 1.0 — March 2026

This is the single source of truth for building Valgate interfaces. Every colour, spacing value, radius, and layout decision traces back to a Figma token — if it's not in this guide, it's not in the system.

---

## Table of Contents

- [1. Design Philosophy](#1-design-philosophy)
- [2. Visual Language](#2-visual-language)
- [3. Token Architecture](#3-token-architecture)
- [4. Colour System](#4-colour-system)
- [5. Token Application Rules](#5-token-application-rules)
- [6. Dark Mode](#6-dark-mode)
- [7. Elevation & Depth](#7-elevation--depth)
- [8. Typography](#8-typography)
- [9. Spacing](#9-spacing)
- [10. Radius](#10-radius)
- [11. Bento Grid Layout](#11-bento-grid-layout)
- [12. Sidebar](#12-sidebar)
- [13. Responsive Behaviour](#13-responsive-behaviour)
- [14. Component Patterns](#14-component-patterns)
- [15. Interaction & Animation](#15-interaction--animation)
- [16. Icons](#16-icons)
- [17. Figma Bridge](#17-figma-bridge)
- [18. Prohibited Practices](#18-prohibited-practices)
- [19. Checklist](#19-checklist)

---

## 1. Design Philosophy

Valgate follows a **Bento / Soft Minimalist** aesthetic. Every design decision is rooted in mathematical consistency, token-driven values, and full light/dark mode parity.

### Core Principles

1. **Everything aligns to the grid** — No exceptions. All elements snap to the 12-column system.
2. **Token-first approach** — Every colour, spacing value, and radius maps to a named token. No magic numbers.
3. **Base-8 spacing** — All spacing uses multiples of 8. Never use off-scale values like 13px, 15px, or 22px.
4. **Visual interest through size, not decoration** — Use varied card sizes and asymmetric layouts, not heavy shadows or gradients.
5. **Invisible scan lines** — Elements align horizontally across adjacent cards for clean visual rhythm.
6. **Mode-aware at all times** — Every token resolves correctly in both Light and Dark mode.

### The One Rule

> **Every colour must use a semantic token. Never use raw hex values or primitive colour names in components.**

```
✅ Correct:  className="bg-surface-base text-primary"
✅ Correct:  className="border-border-default"
❌ Wrong:    className="bg-white"
❌ Wrong:    className="bg-[#F5F6F7]"
❌ Wrong:    style={{ color: '#14181B' }}
```

---

## 2. Visual Language

Valgate should feel like a **well-engineered productivity tool** — the kind of interface that earns trust through consistency, not flair. Think financial terminal meets modern SaaS: structured, breathable, and precise. Every screen should feel like it was laid out by someone who cares deeply about alignment.

The aesthetic is achieved through **proportion and restraint**, not decoration. Visual interest comes from varied card sizes and intentional asymmetry — not gradients, heavy shadows, or illustration.

### Named Rules

**The Bento Rule**
> No two adjacent rows should use the same column split. Vary the rhythm (e.g. `3+3+3+3`, then `8+4`, then `4+4+4`) to create a curated, editorial layout. Repetition signals laziness.

**The Restraint Rule**
> If you're reaching for a gradient, a heavy shadow, or a decorative element — stop. Add visual weight through size and whitespace instead.

**The Token Parity Rule**
> Every token must resolve correctly in both modes. If it looks right in light and breaks in dark, the wrong token was used. There are no exceptions.

---

## 3. Token Architecture

Valgate uses a layered token system. Raw values (primitives) feed into semantic tokens that carry meaning. Code only ever references the semantic layer.

```
Primitive (hex value)
  └── Semantic Token (role-based name)
        └── Tailwind utility class / CSS variable
              └── Component
```

### Token Collections (Figma → Code mapping)

| Figma Collection | Purpose | Code Layer |
|---|---|---|
| `01 · Color Primitives` | Raw hex values | **Never reference directly** |
| `02 · Spacing` | Base-8 spacing scale | Tailwind spacing utilities |
| `03 · Radius` | Corner radius scale | Tailwind `rounded-*` utilities |
| `04 · Semantic Tokens` | All colour assignments | CSS custom properties → Tailwind |
| `05 · Typography` | Font size / line height | Tailwind text utilities + custom classes |
| `06 · Glass Tokens` | Glass/blur effects | `backdrop-blur-*` + custom bg |

---

## 4. Colour System

All colours are defined as CSS custom properties in your Tailwind config, mapped from Valgate · 04 · Semantic Tokens.

### 3.1 Surface Tokens

Used for backgrounds. Never apply to text.

| Token | CSS Variable | Light | Dark | Usage |
|---|---|---|---|---|
| `surface/page` | `--surface-page` | `#F5F6F7` | `#0F1117` | Page / screen background |
| `surface/sunken` | `--surface-sunken` | `#E8EAED` | `#0F1117` | Inset wells, recessed areas |
| `surface/base` | `--surface-base` | `#FFFFFF` | `#111420` | Cards, modals, dialogs, panels |
| `surface/elevated` | `--surface-elevated` | `#F5F6F7` | `#202334` | Dropdowns, popovers, tooltips, inputs |
| `surface/overlay` | `--surface-overlay` | `#14181B` | `#0F1117` | Modal backdrop / scrim |
| `surface/tint` | `--surface-tint` | `#EEF2F8` | `#202334` | Brand-tinted sections, accordion bg |

```tsx
// Page wrapper
<div className="bg-surface-page min-h-screen">

// Card
<div className="bg-surface-base border border-border-default rounded-2xl">

// Dropdown
<div className="bg-surface-elevated border border-border-default rounded-xl shadow-sm">
```

### 3.2 Text Tokens

Used for text fills only. Never apply to frame/container backgrounds.

| Token | CSS Variable | Light | Dark | Usage |
|---|---|---|---|---|
| `text/primary` | `--text-primary` | `#14181B` | `#F5F6F7` | Headings, body, labels, buttons |
| `text/secondary` | `--text-secondary` | `#515D66` | `#8591A0` | Supporting text, placeholders |
| `text/tertiary` | `--text-tertiary` | `#6B7684` | `#6B7684` | Captions, metadata, hints |
| `text/disabled` | `--text-disabled` | `#ACB4BC` | `#3E4850` | Disabled labels |
| `text/inverse` | `--text-inverse` | `#FFFFFF` | `#14181B` | Text on primary buttons / dark surfaces |
| `text/link` | `--text-link` | `#2563EB` | `#60A5FA` | Hyperlinks |
| `text/link-hover` | `--text-link-hover` | `#1D4ED8` | `#93C5FD` | Hyperlink hover |

```tsx
<h1 className="text-primary">Page Title</h1>
<p className="text-secondary">Supporting description</p>
<span className="text-tertiary text-xs">Updated 2 hours ago</span>
<a className="text-link hover:text-link-hover">Learn more</a>
```

### 3.3 Border Tokens

| Token | CSS Variable | Light | Dark | Usage |
|---|---|---|---|---|
| `border/default` | `--border-default` | `#D1D5DB` | `#202334` | Cards, panels, inputs |
| `border/strong` | `--border-strong` | `#ACB4BC` | `#515D66` | Strong dividers, emphasis |
| `border/subtle` | `--border-subtle` | `#E8EAED` | `#171B2B` | Soft dividers, disabled inputs |
| `border/focus` | `--border-focus` | `#2563EB` | `#3B82F6` | Focus rings |

```tsx
<div className="border border-border-default" />       {/* Standard card border */}
<hr className="border-border-subtle" />                 {/* Soft divider */}
<input className="border border-border-default focus:border-border-focus" />
```

### 3.4 Interactive Tokens

| Token | CSS Variable | Light | Dark | Usage |
|---|---|---|---|---|
| `interactive/primary` | `--interactive-primary` | `#2563EB` | `#3B82F6` | Primary button, active controls |
| `interactive/primary-hover` | `--interactive-primary-hover` | `#1D4ED8` | `#60A5FA` | Primary button hover |
| `interactive/primary-text` | `--interactive-primary-text` | `#FFFFFF` | `#FFFFFF` | Text on primary button |
| `interactive/secondary` | `--interactive-secondary` | `#F5F6F7` | `#202334` | Secondary button fill |
| `interactive/secondary-hover` | `--interactive-secondary-hover` | `#E8EAED` | `#202334` | Secondary button hover |
| `interactive/secondary-text` | `--interactive-secondary-text` | `#14181B` | `#EEF2F8` | Text on secondary button |
| `brand/subtle` | `--brand-subtle` | `#DBEAFE` | `#1E3A8A` | Tinted highlights, active nav bg |

### 3.5 Status Tokens

Each status type has 4 tokens: accent, background, border, and text.

| Status | Accent | Background | Border | Text |
|---|---|---|---|---|
| **Success** | `#059669` / `#10B981` | `#ECFDF5` / `#064E3B` | `#A7F3D0` / `#065F46` | `#065F46` / `#6EE7B7` |
| **Warning** | `#F59E0B` / `#F59E0B` | `#FFFBEB` / `#78350F` | `#FDE68A` / `#92400E` | `#92400E` / `#FCD34D` |
| **Danger** | `#E11D48` / `#F43F5E` | `#FFF1F2` / `#881337` | `#FECDD3` / `#9F1239` | `#881337` / `#FDA4AF` |
| **Info** | `#0284C7` / `#38BDF8` | `#F0F9FF` / `#0C4A6E` | `#BAE6FD` / `#075985` | `#0369A1` / `#7DD3FC` |

> Values shown as Light / Dark.

```tsx
// Success alert
<div className="bg-status-success-bg border border-status-success-border text-status-success-text rounded-lg p-4">
  <p>Changes saved successfully.</p>
</div>
```

---

## 5. Token Application Rules

Quick lookup: what token goes where.

### Fills (backgrounds)

| Element | Token | Tailwind |
|---|---|---|
| Page / screen bg | `surface/page` | `bg-surface-page` |
| Card, modal, dialog, panel | `surface/base` | `bg-surface-base` |
| Dropdown, popover, tooltip | `surface/elevated` | `bg-surface-elevated` |
| Inset / sunken area | `surface/sunken` | `bg-surface-sunken` |
| Modal backdrop / scrim | `surface/overlay` | `bg-surface-overlay` |
| Brand-tinted section | `surface/tint` | `bg-surface-tint` |
| Primary button | `interactive/primary` | `bg-interactive-primary` |
| Secondary button | `interactive/secondary` | `bg-interactive-secondary` |
| Destructive button | `status/danger` | `bg-status-danger` |
| Checkbox / radio / switch (on) | `interactive/primary` | `bg-interactive-primary` |
| Progress bar track | `border/subtle` | `bg-border-subtle` |
| Status badge | `status/[type]-bg` | `bg-status-{type}-bg` |

### Strokes (borders)

| Element | Token | Tailwind |
|---|---|---|
| Card, panel, modal | `border/default` | `border-border-default` |
| Input (default) | `border/default` | `border-border-default` |
| Input (focus) | `border/focus` | `focus:border-border-focus` |
| Input (error) | `status/danger` | `border-status-danger` |
| Input (disabled) | `border/subtle` | `border-border-subtle` |
| Divider / separator | `border/subtle` | `border-border-subtle` |
| Active tab underline | `interactive/primary` | `border-interactive-primary` |
| Alert border | `status/[type]` | `border-status-{type}` |

### Text fills

| Text Role | Token | Tailwind |
|---|---|---|
| Headings, body, labels, buttons | `text/primary` | `text-primary` |
| Supporting / descriptive | `text/secondary` | `text-secondary` |
| Placeholder | `text/secondary` | `placeholder:text-secondary` |
| Captions, metadata | `text/tertiary` | `text-tertiary` |
| Disabled labels | `text/disabled` | `text-disabled` |
| On primary button / dark bg | `text/inverse` | `text-inverse` |
| Hyperlinks | `text/link` | `text-link` |
| Required asterisk `*` | `status/danger` | `text-status-danger` |
| Eyebrow / section label | `interactive/primary` | `text-interactive-primary` |
| Alert title & body | `status/[type]-text` | `text-status-{type}-text` |

---

## 6. Dark Mode

### How It Works

Valgate uses CSS custom properties that swap values based on a `.dark` class (or `prefers-color-scheme`). Tailwind's `darkMode: 'class'` strategy is used. Components never need conditional dark logic — the tokens handle everything.

### Critical Rules

#### Rule 1 — Same hex, different token

In Light mode, `text/primary` and `surface/overlay` both resolve to `#14181B`. They are **not interchangeable**:

| Context | Correct Token | Dark Result |
|---|---|---|
| TEXT node with dark fill | `text/primary` | Becomes `#F5F6F7` ✅ |
| FRAME/container dark fill | `surface/overlay` | Stays `#0F1117` ✅ |

> ⚠️ Using `text-primary` as a background class = bright white background in dark mode.  
> ⚠️ Using `bg-surface-overlay` as a text colour = invisible text in dark mode.

#### Rule 2 — White text vs white backgrounds

| Context | Correct Token |
|---|---|
| Text on a dark background | `text-inverse` |
| White card/panel background | `bg-surface-base` |

#### Golden Rule

> **Never assume matching hex = correct token.** Always choose the token that matches the element's **semantic role**, even if a different token happens to share the same hex value in one mode.

---

## 7. Elevation & Depth

Valgate uses **tonal layering** to create depth — not shadows. Surfaces are stacked by lightness, not by z-index. A surface feels "higher" because it is lighter (in light mode) or lighter-tinted (in dark mode).

### The Stacking Model

```
surface/page        ← deepest (global background)
  └── surface/sunken   ← recessed wells, inset areas
  └── surface/base     ← cards, panels, modals
        └── surface/elevated  ← dropdowns, popovers, inputs
        └── surface/tint      ← brand-tinted sections
```

Never skip levels. A `surface/elevated` element should only sit on top of `surface/base` or `surface/page` — not directly on another `surface/elevated`.

### When to Use Each Surface

| Surface | Use When | Never Use For |
|---|---|---|
| `surface/page` | The outermost screen background | Cards, panels, or any container |
| `surface/sunken` | Inset data tables, code blocks, recessed input areas | Primary card backgrounds |
| `surface/base` | All cards, modals, dialogs, side panels | Page background |
| `surface/elevated` | Dropdowns, tooltips, popovers, input fills | Main card backgrounds |
| `surface/tint` | Brand-accented sections, active accordion rows | General content areas |
| `surface/overlay` | Modal scrims only | Any other use |

### Shadows

Use shadows sparingly. They exist only to communicate that something is **floating above the page**, not to add decoration.

| Context | Shadow | Tailwind |
|---|---|---|
| Default card | None — border only | `border border-border-default` |
| Dropdown / popover | Subtle lift | `shadow-sm` |
| Modal / dialog | Floating | `shadow-lg` |
| Dragging / active drag | Strong lift | `shadow-xl` |

```
✅ Correct:  shadow-sm on a dropdown
✅ Correct:  no shadow on a standard card
❌ Wrong:    shadow-lg on a static card
❌ Wrong:    shadow with a custom opacity value
```

### Glass Tokens

Glass is reserved for **overlaid HUD elements** — panels that float over content like maps, images, or video. Do not use glass as a general card style.

| Token | CSS Variable | Usage |
|---|---|---|
| `glass/surface` | `--glass-surface` | Floating panel over media |
| `glass/border` | `--glass-border` | Border on a glass panel |
| `glass/blur` | `--glass-blur` | `backdrop-blur` value |

```tsx
{/* Glass panel — only over media/image backgrounds */}
<div className="bg-glass-surface border border-glass-border backdrop-blur-[var(--glass-blur)] rounded-xl p-6">
  <p className="text-primary text-sm">Floating content</p>
</div>
```

```
✅ Correct:  glass panel floating over a map or hero image
❌ Wrong:    glass card on a plain surface/page background
❌ Wrong:    glass used as a stylistic alternative to surface/base
```

---

## 8. Typography

Valgate uses two typefaces:
- **Plus Jakarta Sans** — Display-level text (hero, marketing, large headings)
- **Inter** — All UI text (headings, body, labels, code)

### Display Styles (Plus Jakarta Sans)

| Style | Size | Weight | Tailwind | Usage |
|---|---|---|---|---|
| `Display/Hero` | 72px | ExtraBold | `text-7xl font-extrabold font-display` | Hero / marketing |
| `Display/2XL` | 72px | Bold | `text-7xl font-bold font-display` | Large display |
| `Display/XL` | 60px | Bold | `text-6xl font-bold font-display` | Display sections |
| `Display/LG` | 48px | Bold | `text-5xl font-bold font-display` | Display sections |
| `Display/MD` | 36px | Bold | `text-4xl font-bold font-display` | Page headers |
| `Display/SM` | 30px | SemiBold | `text-3xl font-semibold font-display` | Sub-display |

### Heading Styles (Inter)

| Style | Size | Weight | Tailwind | Usage |
|---|---|---|---|---|
| `Heading/H1` | 24px | Bold | `text-2xl font-bold` | Page titles |
| `Heading/H2` | 20px | SemiBold | `text-xl font-semibold` | Section titles |
| `Heading/H3` | 18px | SemiBold | `text-lg font-semibold` | Card headers, dialogs |
| `Heading/H4` | 16px | SemiBold | `text-base font-semibold` | Sub-section headers |
| `Heading/H5` | 14px | SemiBold | `text-sm font-semibold` | Alert titles, strong labels |

### Body Styles (Inter)

| Style | Size | Weight | Tailwind | Usage |
|---|---|---|---|---|
| `Body/LG` | 18px | Regular | `text-lg` | Large body |
| `Body/MD` | 16px | Regular | `text-base` | Default body |
| `Body/SM` | 14px | Regular | `text-sm` | Standard body, forms |
| `Body/XS` | 12px | Regular | `text-xs` | Small body, card meta |
| `Body/2XS` | 10px | Regular | `text-[10px]` | Micro text |

### Label Styles (Inter)

| Style | Size | Weight | Tailwind | Usage |
|---|---|---|---|---|
| `Label/LG` | 16px | Medium | `text-base font-medium` | Large button labels |
| `Label/MD` | 14px | Medium | `text-sm font-medium` | Default button labels |
| `Label/SM` | 12px | Medium | `text-xs font-medium` | Small button labels |
| `Label/XS` | 12px | Medium | `text-xs font-medium` | Component labels |
| `Label/2XS` | 12px | Medium | `text-xs font-medium uppercase tracking-wide` | Eyebrow / caps labels |
| `Label/2XS Regular` | 12px | Regular | `text-xs` | Captions, hints |

### Code Styles (Inter)

| Style | Size | Tailwind | Usage |
|---|---|---|---|
| `Code/MD` | 14px | `text-sm font-mono` | Code (medium) |
| `Code/SM` | 12px | `text-xs font-mono` | Code (small) |

### Typography Hierarchy Quick Reference

When building a page, assign styles top-to-bottom:

```
Hero / page header          → Display/MD–Hero
Section title (24px bold)   → Heading/H1
Card title (18–20px)        → Heading/H2 or H3
Sub-section (14–16px)       → Heading/H4 or H5
Primary body (16px)         → Body/MD
Form text (14px)            → Body/SM
Card meta (12px)            → Body/XS
Button label (14px)         → Label/MD
Eyebrow / all-caps (12px)   → Label/2XS
Caption / hint (12px)       → Label/2XS Regular
```

### Tailwind Font Config

```js
// tailwind.config.js
module.exports = {
  theme: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      display: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
    },
  },
}
```

---

## 9. Spacing

All spacing uses **base-8 multiples** applied via Tailwind utilities. The system has two tiers: **component** spacing for internal gaps and **layout** spacing for section-level structure.

> ⚠️ **Never use off-scale values:** 13px, 15px, 18px, 20px, 22px, 26px, 28px — base-8 only.

### Component Spacing

| Token | Value | Tailwind | Usage |
|---|---|---|---|
| `component/3xs` | 2px | `gap-0.5` `p-0.5` | Tightest gaps (icon → label) |
| `component/2xs` | 4px | `gap-1` `p-1` | Tight inline spacing |
| `component/xs` | 8px | `gap-2` `p-2` | Icon padding, small gaps |
| `component/sm` | 12px | `gap-3` `p-3` | Input vertical padding |
| `component/md` | 16px | `gap-4` `p-4` | Standard component padding |
| `component/lg` | 24px | `gap-6` `p-6` | Comfortable component padding |
| `component/xl` | 32px | `gap-8` `p-8` | Large component padding |
| `component/2xl` | 40px | `gap-10` `p-10` | Extra-large component padding |
| `component/3xl` | 48px | `gap-12` `p-12` | Maximum component padding |

### Layout Spacing

| Token | Value | Tailwind | Usage |
|---|---|---|---|
| `layout/xs` | 16px | `gap-4` | Tight section gaps |
| `layout/sm` | 24px | `gap-6` | **Card gap — always** |
| `layout/md` | 32px | `gap-8` `p-8` | Medium card internal padding |
| `layout/lg` | 48px | `gap-12` | Section spacing |
| `layout/xl` | 64px | `gap-16` `px-16` | Container side padding |
| `layout/2xl` | 96px | `gap-24` | Large section spacing |
| `layout/3xl` | 160px | `gap-40` | Maximum section separation |

### Key Rules

- `gap-6` (24px) is the **standard gap between all cards** — no exceptions.
- Always match padding to the size tier of the card (see [§11 Bento Grid Layout](#11-bento-grid-layout)).
- Use Tailwind spacing utilities, not arbitrary values like `p-[18px]`.

---

## 10. Radius

All corner radii map to named tokens. Never hardcode a pixel value.

### Radius Scale

| Token | Value | Tailwind | Usage |
|---|---|---|---|
| `radius/none` | 0px | `rounded-none` | Table cells, dividers |
| `radius/sm` | 2px | `rounded-sm` | Subtle rounding (small chips) |
| `radius/md` | 4px | `rounded` | Badges, small buttons, inputs |
| `radius/lg` | 6px | `rounded-md` | Standard buttons |
| `radius/xl` | 8px | `rounded-lg` | Cards (compact), dropdowns |
| `radius/2xl` | 12px | `rounded-xl` | Cards (standard), modals, panels |
| `radius/3xl` | 16px | `rounded-2xl` | Cards (large), popovers |
| `radius/full` | 9999px | `rounded-full` | Pills, toggles, avatars |

### Component → Radius Reference

| Component | Token | Tailwind |
|---|---|---|
| Standard card / panel | `radius/2xl` | `rounded-xl` |
| Large card / modal | `radius/3xl` | `rounded-2xl` |
| Primary / secondary button | `radius/lg` | `rounded-md` |
| Input field | `radius/md` | `rounded` |
| Badge / chip | `radius/md` | `rounded` |
| Pill badge / tag | `radius/full` | `rounded-full` |
| Toggle / switch | `radius/full` | `rounded-full` |
| Avatar | `radius/full` | `rounded-full` |
| Tooltip | `radius/md` | `rounded` |
| Dropdown / popover | `radius/xl` | `rounded-lg` |

---

## 11. Bento Grid Layout

The Valgate layout is a **12-column Bento grid** designed for purposeful arrangement — mathematical consistency and perfect alignment.

### Base Measurements

| Property | Value |
|---|---|
| Max container width | `1440px` → `max-w-[1440px]` |
| Sidebar expanded | `280px` → `w-[280px]` |
| Sidebar collapsed | `72px` → `w-[72px]` |
| Available content (sidebar open) | `1160px` |
| Content padding | `32px` L + R → `px-8` |
| Grid area | `1096px` |
| Card gap | `24px` → `gap-6` **(always)** |
| Columns | `12` → `grid-cols-12` |
| Single column width | `69.33px` |
| Top bar height | `64px` → `h-16` |

### Grid Wrapper (always use)

```tsx
<div className="grid grid-cols-12 gap-6">
  {/* Cards here */}
</div>
```

### Column Width Reference

| Span | Width | Tailwind | Use Case |
|---|---|---|---|
| 2 cols | 162.67px | `col-span-2` | Very small elements |
| 3 cols | 256px | `col-span-3` ⭐ | Stat cards (4 per row) |
| 4 cols | 349.33px | `col-span-4` ⭐ | Feature cards (3 per row) |
| 5 cols | 442.67px | `col-span-5` | Medium sections |
| 6 cols | 536px | `col-span-6` | Half-width (2 per row) |
| 7 cols | 629.33px | `col-span-7` | Asymmetric main |
| 8 cols | 722.67px | `col-span-8` ⭐ | Main content area |
| 9 cols | 816px | `col-span-9` | Large content (3:1) |
| 12 cols | 1096px | `col-span-12` ⭐ | Full-width hero |

### "I Want X Cards in a Row"

| I Want... | Each Card Spans | Tailwind | Pattern |
|---|---|---|---|
| 1 card (full) | 12 columns | `col-span-12` | Full width |
| 2 equal cards | 6 columns each | `col-span-6` | Half split |
| 3 equal cards | 4 columns each | `col-span-4` ⭐ | Feature row |
| 4 equal cards | 3 columns each | `col-span-3` ⭐ | Stat row |
| 6 equal cards | 2 columns each | `col-span-2` | Icon grid |
| 1 main + sidebar | 8 + 4 cols | `col-span-8` + `col-span-4` ⭐ | Content + aside |
| 2 unequal | 7 + 5 cols | `col-span-7` + `col-span-5` | Unique balance |
| 2 unequal | 9 + 3 cols | `col-span-9` + `col-span-3` | Strong emphasis |

> ⚠️ **Common mistake:** "4 columns" means ONE card spanning 4 cols (349.33px wide), NOT 4 cards. For 4 cards in a row, use `col-span-3` on each.

### Card Padding by Size

| Size | Span | Padding | Tailwind |
|---|---|---|---|
| Small | 2–3 cols | 24px | `p-6` |
| Medium | 4–6 cols | 32px | `p-8` |
| Large | 7–9 cols | 40px | `p-10` |
| Extra Large | 10–12 cols | 40px | `p-10` |

### Layout Pattern Examples

**Dashboard page:**

```tsx
{/* Row 1: Stat cards (3+3+3+3) */}
<div className="grid grid-cols-12 gap-6">
  <div className="col-span-3 bg-surface-base border border-border-default rounded-xl p-6">
    <p className="text-secondary text-sm mb-1">Total Revenue</p>
    <p className="text-primary text-3xl font-bold mb-2">$45,231</p>
    <p className="text-status-success-text text-xs">+20.1% from last month</p>
  </div>
  <div className="col-span-3 bg-surface-base border border-border-default rounded-xl p-6">{/* ... */}</div>
  <div className="col-span-3 bg-surface-base border border-border-default rounded-xl p-6">{/* ... */}</div>
  <div className="col-span-3 bg-surface-base border border-border-default rounded-xl p-6">{/* ... */}</div>
</div>

{/* Row 2: Main + sidebar (8+4) */}
<div className="grid grid-cols-12 gap-6">
  <div className="col-span-8 bg-surface-base border border-border-default rounded-xl p-10">
    <h3 className="text-primary text-xl font-bold mb-2">Revenue Chart</h3>
    <p className="text-secondary text-sm mb-6">Monthly trends</p>
    {/* Chart component */}
  </div>
  <div className="col-span-4 bg-surface-base border border-border-default rounded-xl p-8">
    <h3 className="text-primary text-lg font-semibold mb-4">Activity Feed</h3>
    {/* Feed items */}
  </div>
</div>

{/* Row 3: Feature cards (4+4+4) */}
<div className="grid grid-cols-12 gap-6">
  <div className="col-span-4 bg-surface-base border border-border-default rounded-xl p-8">{/* ... */}</div>
  <div className="col-span-4 bg-surface-base border border-border-default rounded-xl p-8">{/* ... */}</div>
  <div className="col-span-4 bg-surface-base border border-border-default rounded-xl p-8">{/* ... */}</div>
</div>
```

### The Scan Line Principle

When multiple cards sit in the same row, their internal elements should align horizontally:

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ [icon]       │  │ [icon]       │  │ [icon]       │  ← Icons align
│ Title        │  │ Title        │  │ Title        │  ← Titles align
│ Description  │  │ Description  │  │ Description  │  ← Text aligns
│ [Button]     │  │ [Button]     │  │ [Button]     │  ← Buttons align
└─────────────┘  └─────────────┘  └─────────────┘
```

Achieve this with consistent padding + `flex flex-col justify-between` to push CTAs to the bottom.

---

## 12. Sidebar

### Dimensions

| State | Width | Tailwind |
|---|---|---|
| Expanded | 280px | `w-[280px]` |
| Collapsed | 72px | `w-[72px]` |
| Padding | 16px | `p-4` |

### Internal Structure

```tsx
<aside className="w-[280px] bg-surface-base border-r border-border-subtle flex flex-col h-screen">
  {/* Logo / brand — 64px */}
  <div className="h-16 flex items-center px-4">
    <Logo />
  </div>

  {/* Primary nav */}
  <nav className="flex-1 px-2 space-y-1">
    <NavItem icon={Home} label="Dashboard" active />
    <NavItem icon={Users} label="Customers" />
    <NavItem icon={Settings} label="Settings" />
  </nav>

  {/* Divider */}
  <hr className="border-border-subtle mx-4" />

  {/* Secondary nav */}
  <nav className="px-2 py-2 space-y-1">
    <NavItem icon={Folder} label="Projects" />
  </nav>

  {/* User profile — fixed bottom, 64px */}
  <div className="h-16 border-t border-border-subtle flex items-center px-4">
    <UserProfile />
  </div>
</aside>
```

### Nav Item States

| State | Background | Text |
|---|---|---|
| Default | `transparent` | `text-secondary` |
| Hover | `bg-surface-tint` | `text-primary` |
| Active | `bg-brand-subtle` | `text-interactive-primary` |

```tsx
function NavItem({ icon: Icon, label, active }) {
  return (
    <button className={cn(
      "flex items-center gap-3 w-full px-3 py-3 rounded-lg text-sm font-medium transition-colors",
      active
        ? "bg-brand-subtle text-interactive-primary"
        : "text-secondary hover:bg-surface-tint hover:text-primary"
    )}>
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </button>
  )
}
```

---

## 13. Responsive Behaviour

### Breakpoints

| Breakpoint | Sidebar | Card Padding | Gap | Container Padding |
|---|---|---|---|---|
| Desktop (default) | 280px expanded | `p-10` | `gap-6` (24px) | `px-8` (32px each) |
| Tablet (`md: 768px`) | 72px collapsed | `p-8` | `gap-6` (24px) | `px-6` (24px each) |
| Mobile (`sm: 640px`) | Hidden / overlay | `p-6` | `gap-4` (16px) | `px-6` (24px each) |

### Grid Collapse Patterns

| Desktop | Tablet | Mobile |
|---|---|---|
| `col-span-12` | `col-span-12` | `col-span-12` |
| `col-span-8` + `col-span-4` | both `col-span-12` | both `col-span-12` |
| `col-span-6` + `col-span-6` | both `col-span-12` | both `col-span-12` |
| `col-span-4` × 3 | `col-span-6` + `col-span-6` + `col-span-12` | all `col-span-12` |
| `col-span-3` × 4 | `col-span-6` × 4 | all `col-span-12` |

```tsx
{/* Responsive card */}
<div className="col-span-12 md:col-span-6 lg:col-span-4 bg-surface-base border border-border-default rounded-xl p-6 md:p-8">
  {/* Content */}
</div>
```

---

## 14. Component Patterns

Ready-to-use shadcn/ui-aligned patterns with correct token usage.

### Component Usage Context

Before reaching for a component, use this table to confirm you have the right one.

| Component | Use When | Don't Use When |
|---|---|---|
| **Primary button** | The main, irreversible action on a page (e.g. Submit, Save, Confirm) | There are two competing primary actions — only one per view |
| **Secondary button** | A supporting action alongside a primary (e.g. Cancel, Back) | It is the only action — use primary instead |
| **Ghost button** | Low-priority inline actions (e.g. Edit, View details in a table row) | The action is destructive |
| **Destructive button** | Permanent, irreversible actions (e.g. Delete, Remove) | The action can be undone |
| **Outline button** | Tertiary actions in toolbars or filter bars | In forms or dialogs |
| **Solid badge** | A definitive status — the item is clearly in one state (Active, Verified) | The state is ambiguous or transient |
| **Tinted badge** | A cautionary or in-progress status (Pending, In Review) | A binary on/off state |
| **Neutral badge** | A non-status label (Draft, Internal, v1.2) | Communicating urgency or health |
| **Inline alert** | Feedback tied to a specific form field or action | Page-level announcements — use a toast |
| **Toast** | Transient feedback after an action (saved, copied, error) | Persistent warnings — use an inline alert |

#### Badge — When to Use Each Variant

| Variant | When | Example |
|---|---|---|
| Solid (`bg-status-X text-inverse`) | Definitive, current state | Active, Paid, Verified |
| Tinted (`bg-status-X-bg text-status-X-text`) | Cautionary or in-progress | Pending, In Review, Expiring |
| Neutral (`bg-surface-elevated text-primary`) | Non-status labels | Draft, Internal, Beta |

---

### 14.1 Buttons

| Variant | Classes |
|---|---|
| Primary | `bg-interactive-primary hover:bg-interactive-primary-hover text-inverse rounded-md px-4 py-2 text-sm font-medium` |
| Secondary | `bg-interactive-secondary hover:bg-interactive-secondary-hover text-interactive-secondary-text border border-border-default rounded-md px-4 py-2 text-sm font-medium` |
| Ghost | `hover:bg-surface-tint text-primary rounded-md px-4 py-2 text-sm font-medium` |
| Destructive | `bg-status-danger hover:bg-status-danger/90 text-inverse rounded-md px-4 py-2 text-sm font-medium` |
| Outline | `bg-surface-base hover:bg-surface-elevated text-primary border border-border-default rounded-md px-4 py-2 text-sm font-medium` |

### 14.2 Inputs

```tsx
<div className="space-y-2">
  <label className="text-primary text-sm font-medium">
    Email <span className="text-status-danger">*</span>
  </label>
  <input
    className="w-full bg-surface-elevated border border-border-default rounded
               text-primary text-sm placeholder:text-secondary
               px-3 py-3
               focus:border-border-focus focus:ring-1 focus:ring-border-focus
               disabled:border-border-subtle disabled:text-disabled"
    placeholder="you@example.com"
  />
  <p className="text-tertiary text-xs">We'll never share your email.</p>
</div>
```

**Error state:**

```tsx
<input className="... border-status-danger focus:border-status-danger focus:ring-status-danger" />
<p className="text-status-danger-text text-xs mt-1">Please enter a valid email.</p>
```

### 14.3 Cards

```tsx
{/* Standard card */}
<div className="bg-surface-base border border-border-default rounded-xl p-8">
  <h3 className="text-primary text-lg font-semibold mb-2">Card Title</h3>
  <p className="text-secondary text-sm">Card description text.</p>
</div>

{/* Card with divider sections */}
<div className="bg-surface-base border border-border-default rounded-xl">
  <div className="p-8 border-b border-border-subtle">
    <h3 className="text-primary text-lg font-semibold">Section 1</h3>
  </div>
  <div className="p-8">
    <p className="text-secondary text-sm">Section 2 content</p>
  </div>
</div>
```

### 14.4 Alerts

```tsx
function Alert({ variant = 'info', title, children }) {
  const styles = {
    success: 'bg-status-success-bg border-status-success-border text-status-success-text',
    warning: 'bg-status-warning-bg border-status-warning-border text-status-warning-text',
    danger:  'bg-status-danger-bg border-status-danger-border text-status-danger-text',
    info:    'bg-status-info-bg border-status-info-border text-status-info-text',
  }

  return (
    <div className={cn('border rounded-lg p-4', styles[variant])}>
      {title && <p className="font-semibold text-sm mb-1">{title}</p>}
      <p className="text-sm">{children}</p>
    </div>
  )
}
```

### 14.5 Badges

```tsx
{/* Solid badge */}
<span className="bg-status-success text-inverse text-xs font-medium px-2 py-1 rounded">
  Active
</span>

{/* Tinted badge */}
<span className="bg-status-warning-bg text-status-warning-text border border-status-warning-border text-xs font-medium px-2 py-1 rounded">
  Pending
</span>

{/* Neutral badge */}
<span className="bg-surface-elevated text-primary border border-border-default text-xs font-medium px-2 py-1 rounded">
  Draft
</span>
```

### 14.6 Toast (Dark)

```tsx
<div className="bg-surface-overlay text-inverse rounded-lg px-4 py-3 shadow-lg">
  <p className="text-sm font-medium">Changes saved successfully.</p>
</div>
```

### 14.7 Navigation Header

```tsx
<header className="h-16 bg-surface-base border-b border-border-subtle flex items-center px-8">
  <h1 className="text-primary text-lg font-semibold">Dashboard</h1>
  <div className="ml-auto flex items-center gap-4">
    {/* Actions */}
  </div>
</header>
```

### 14.8 Tabs

```tsx
<div className="flex gap-1 border-b border-border-subtle">
  <button className="px-4 py-2 text-sm font-medium text-primary border-b-2 border-interactive-primary">
    Active Tab
  </button>
  <button className="px-4 py-2 text-sm font-medium text-secondary hover:text-primary border-b-2 border-transparent">
    Inactive Tab
  </button>
</div>
```

---

## 15. Interaction & Animation

All transitions use a consistent easing and duration scale. Never use linear easing for UI transitions — it feels mechanical.

### Duration Scale

| Token | Value | Use |
|---|---|---|
| `duration/fast` | 100ms | Micro-interactions (button press, checkbox tick) |
| `duration/base` | 150ms | Default — colour swaps, hover states |
| `duration/slow` | 250ms | Entrance/exit of panels, dropdowns |
| `duration/xslow` | 350ms | Page-level transitions, modals |

### Easing

All transitions use `ease-out` (decelerating). This feels natural — things arrive quickly and settle.

```css
transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
```

```tsx
{/* Standard hover transition */}
className="transition-colors duration-150 ease-out"

{/* Dropdown entrance */}
className="transition-all duration-250 ease-out"

{/* Modal entrance */}
className="transition-opacity duration-350 ease-out"
```

### Component Interaction States

| Component | Default | Hover | Focus | Active | Disabled |
|---|---|---|---|---|---|
| Primary button | `bg-interactive-primary` | `bg-interactive-primary-hover` | `ring-2 ring-border-focus` | `scale-[0.98]` | `opacity-50 cursor-not-allowed` |
| Secondary button | `bg-interactive-secondary` | `bg-interactive-secondary-hover` | `ring-2 ring-border-focus` | `scale-[0.98]` | `opacity-50 cursor-not-allowed` |
| Input | `border-border-default` | `border-border-strong` | `border-border-focus ring-1 ring-border-focus` | — | `border-border-subtle text-disabled` |
| Nav item | `text-secondary` | `bg-surface-tint text-primary` | `ring-2 ring-border-focus` | `bg-brand-subtle text-interactive-primary` | — |
| Card (clickable) | `border-border-default` | `border-border-strong shadow-sm` | `ring-2 ring-border-focus` | `scale-[0.99]` | — |

### Rules

```
✅ Correct:  transition-colors duration-150 for colour-only changes
✅ Correct:  transition-all duration-250 for panels that grow/shrink
❌ Wrong:    transition-none — always animate interactive elements
❌ Wrong:    duration > 400ms for any UI element (use only for illustrations)
❌ Wrong:    ease-in or linear for hover states
```

### Status Pulse (Alert Indicators Only)

Use a pulse animation exclusively on status dot indicators when a system requires immediate attention. Never pulse decoratively.

```tsx
{/* Active alert dot */}
<span className="relative flex h-2 w-2">
  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-danger opacity-75" />
  <span className="relative inline-flex rounded-full h-2 w-2 bg-status-danger" />
</span>
```

```
✅ Correct:  pulse on a live system health indicator
❌ Wrong:    pulse on a static badge or decorative dot
```

---

## 16. Icons

Valgate uses **Lucide React** as the icon library. Do not mix in Heroicons, Phosphor, or other libraries — inconsistent stroke weights break visual rhythm.

### Lucide Config

```tsx
import { Home, Users, Settings } from 'lucide-react'

// Always pass explicit size and strokeWidth — never rely on defaults
<Home size={20} strokeWidth={1.75} />
```

### Icon Size Scale

| Size | Pixels | Use |
|---|---|---|
| `xs` | 14px | Inline text icons, input adornments |
| `sm` | 16px | Badges, tight UI, table row actions |
| `md` | 20px | **Default — nav items, buttons, card actions** |
| `lg` | 24px | Section headers, empty states |
| `xl` | 32px | Feature icons, onboarding |
| `2xl` | 48px | Hero / marketing only |

### Stroke Weight

| Context | `strokeWidth` |
|---|---|
| All UI icons (default) | `1.75` |
| Small / tight contexts (14–16px) | `2` |
| Large display icons (32px+) | `1.5` |

### Colour

Icons inherit text colour. Always control icon colour through the parent's text token — never set a fill or colour directly on an icon.

```tsx
{/* ✅ Correct — icon inherits text-secondary */}
<div className="text-secondary flex items-center gap-2">
  <Settings size={20} strokeWidth={1.75} />
  <span>Settings</span>
</div>

{/* ❌ Wrong — hardcoded colour on the icon */}
<Settings size={20} color="#515D66" />
```

### Icon + Label Alignment

Always use `flex items-center` with `gap-2` (8px) for icon-label pairs. Never use margin to offset an icon.

```tsx
{/* ✅ Correct */}
<button className="flex items-center gap-2 text-sm font-medium text-primary">
  <Plus size={16} strokeWidth={2} />
  Add item
</button>

{/* ❌ Wrong */}
<button className="text-sm font-medium text-primary">
  <Plus size={16} className="mr-2" />
  Add item
</button>
```

### Rules

```
✅ Correct:  Lucide React, size={20}, strokeWidth={1.75} for all UI icons
✅ Correct:  Icon colour controlled by parent text token
❌ Wrong:    Mixing Lucide with Heroicons or any other library
❌ Wrong:    Setting color prop directly on <Icon />
❌ Wrong:    Using margin instead of gap for icon-label spacing
❌ Wrong:    Icons without explicit size and strokeWidth props
```

---

## 17. Figma Bridge

Valgate operates a **code ↔ canvas** workflow. Designs in Figma and implementations in React/Tailwind are mirrors of the same token system. This section provides the essential context for keeping them in sync.

### Figma File

| | |
|---|---|
| **File** | `variable-tester` |
| **File key** | `N4sncpBUdydiuAFXgATj4S` |
| **URL** | https://www.figma.com/design/N4sncpBUdydiuAFXgATj4S/variable-tester |
| **Token page** | `Design System` |

### Token Collection IDs

When working with the Figma API or plugins (e.g., code-to-canvas pipelines), these are the collection identifiers:

| Collection | ID | Code Relationship |
|---|---|---|
| `Valgate · 01 · Color Primitives` | `VariableCollectionId:1:67` | Source hex values (never bind directly) |
| `Valgate · 02 · Spacing` | `VariableCollectionId:1:33` | Maps to Tailwind spacing scale |
| `Valgate · 03 · Radius` | `VariableCollectionId:1:24` | Maps to Tailwind rounded-* classes |
| `Valgate · 04 · Semantic Tokens` | `VariableCollectionId:1:158` | Maps to CSS custom properties |
| `Valgate · 05 · Typography` | `VariableCollectionId:1:2` | Maps to Tailwind text-* / font-* |
| `Valgate · 06 · Glass Tokens` | `VariableCollectionId:1:204` | Maps to backdrop-blur + custom bg |

### Figma → Code Token Mapping

The Figma semantic token name maps directly to a CSS custom property and Tailwind class:

```
Figma token:     surface/base
CSS variable:    --surface-base
Tailwind:        bg-surface-base
```

```
Figma token:     text/primary
CSS variable:    --text-primary
Tailwind:        text-primary
```

```
Figma token:     border/default
CSS variable:    --border-default
Tailwind:        border-border-default
```

### Figma Dark Mode Context

Figma uses **variable modes** on collection `04 · Semantic Tokens` to switch between Light and Dark. In code, the same switch happens via the `.dark` class on the root element. The token names are identical — only the resolved values change.

### Primitives With No Semantic Token (Known Exceptions)

These colours are used as decorative accents and have no semantic mapping. They may appear as raw primitives in Figma and as one-off Tailwind classes in code:

| Primitive | Usage | Code Approach |
|---|---|---|
| `teal/400` | Avatar background accent | Custom class or inline style |
| `violet/50` | Avatar background accent | Custom class or inline style |
| `violet/500` | Avatar text accent | Custom class or inline style |
| `blue/50` | Card flat variant tint | Custom class or inline style |
| `blue/200` | Card image placeholder | Custom class or inline style |

### Known Style Gaps

| Issue | Figma State | Code Approach |
|---|---|---|
| 11px Inter Medium (badge labels) | No style — uses `Label/2XS` | `text-[11px] font-medium` + document deviation |
| 9px Plus Jakarta Sans (select chevrons) | No style — unstyled exception | `text-[9px] font-display` + document deviation |

### Workflow Summary

**Design → Code (Figma to React):**
1. Designer builds in Figma using `Valgate 04` semantic tokens
2. Every fill, stroke, text colour binds to a named token
3. Developer maps token names to CSS variables / Tailwind classes using this guide (§4–5)
4. If a colour can't be mapped, flag it — it may need a new semantic token

**Code → Design (React to Figma / Code-to-Canvas):**
1. Developer uses only Tailwind classes from this guide
2. Classes map 1:1 back to Figma token names
3. Figma plugin / code-to-canvas tool reads class names and binds the correct variables
4. Audit script in Figma verifies all bindings are correct

### Audit Criteria

A clean Figma frame returns:
```
{ library: [], primitives: [], hardcoded: [] }
```
with a high `semantic04` count. The full audit script is maintained in the Figma file.

---

## 18. Prohibited Practices

These will break dark mode, create inconsistency, or defeat the token system.

**Colour:**
- ❌ Use raw hex values (`bg-[#F5F6F7]`, `text-[#14181B]`)
- ❌ Use generic Tailwind colours (`bg-white`, `text-gray-500`, `border-gray-200`)
- ❌ Apply text tokens to backgrounds (`bg-text-primary`)
- ❌ Apply surface tokens to text (`text-surface-overlay`)
- ❌ Assume matching hex = correct token

**Spacing:**
- ❌ Use off-scale values (`p-[13px]`, `gap-[15px]`, `mt-[22px]`)
- ❌ Use arbitrary Tailwind values when a scale value exists
- ❌ Use anything other than `gap-6` (24px) between cards

**Radius:**
- ❌ Hardcode radius values (`rounded-[10px]`)
- ❌ Mix radius values within the same component type

**Typography:**
- ❌ Leave text unstyled (no size/weight specified)
- ❌ Use font sizes outside the type scale
- ❌ Use Plus Jakarta Sans for UI text (Inter only)
- ❌ Use Inter for hero/display text (Plus Jakarta Sans only)

**Layout:**
- ❌ Confuse column span with card count (`col-span-4` ≠ 4 cards)
- ❌ Vary padding between cards of the same size tier
- ❌ Repeat the same row pattern without variation (e.g., 8+4, 8+4, 8+4)
- ❌ Use heavy drop shadows — prefer borders or `shadow-sm`
- ❌ Manually set pixel widths instead of `col-span-X`

---

## 19. Checklist

### Before You Build

- [ ] Tailwind config has all CSS custom properties from §4
- [ ] `font-sans` = Inter, `font-display` = Plus Jakarta Sans
- [ ] `darkMode: 'class'` configured in Tailwind
- [ ] Grid wrapper uses `grid grid-cols-12 gap-6`
- [ ] Max container width = `max-w-[1440px]`
- [ ] Sidebar width = `w-[280px]` expanded / `w-[72px]` collapsed

### During Development

- [ ] All colours use semantic token classes (never raw hex or generic Tailwind)
- [ ] All spacing is base-8 (Tailwind scale values only)
- [ ] Card padding matches size tier (`p-6` / `p-8` / `p-10`)
- [ ] Card gaps are `gap-6` everywhere
- [ ] Border radius is consistent per component type
- [ ] Typography follows the hierarchy (Display → Heading → Body → Label)
- [ ] All text nodes have explicit size + weight

### Before PR / Handoff

- [ ] Toggle dark mode — verify no broken colours or invisible text
- [ ] Verify scan line alignment across card rows
- [ ] Responsive: cards collapse correctly at `md` / `sm` breakpoints
- [ ] No arbitrary Tailwind values (`[Xpx]`) unless documented exception
- [ ] Component tokens match the application rules in §5
- [ ] Run a visual diff against the Figma frame if available

---

*End of Valgate Design System Guide · v1.1 · March 2026*
