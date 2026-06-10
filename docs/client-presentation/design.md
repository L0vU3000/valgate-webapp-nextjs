# Valgate Design & Brand System

This document provides a comprehensive overview of Valgate's design language and brand identity. It acts as the canonical visual reference for all projects.

> [!TIP]
> **Core Principle:** Valgate helps property owners see their portfolio clearly and feel in control. The brand turns complex property data into something calm, simple, and confident.

## 💎 Brand Identity & Voice

**Personality:** Confident, modern, sharp.  
**Feeling we create:** Clarity and calm.  
**North Star — Airbnb:** Airy, generous whitespace, photography-first, refined sans-serif type, premium without being cold. Nothing decorative that doesn't earn its place.

### The 8 Principles

1. **Hierarchy over decoration** — every visual choice serves the hierarchy. If it doesn't help the eye find the point faster, cut it.
2. **Space is intentional** — whitespace is how the interface communicates calm. Vary it; asymmetric, rhythmic spacing over uniform padding everywhere.
3. **Blue is precious** — guard the brand blue. Actions and accents only.
4. **Content is the hero** — the data, the property, the story is why people came. Frame it; don't compete with it.
5. **Motion earns its place** — animate only to communicate state or smooth a transition. Never for visual interest alone.
6. **Containers only when content is truly distinct** — not every section needs a card. Use space and a 1px border to group. **Never nest cards inside cards.**
7. **Badges are metadata** — status, tags, and labels are supporting detail. They sit inline or low in the hierarchy, never as a headline.
8. **Copy earns its space** — every word specific and action-oriented. Say what's true and what to do next. No vague filler.

### Voice & Copy
- **Tone:** confident, calm, in-control — never overwhelmed, never flashy or casual.
- **Be specific and action-oriented.** Say exactly what's true and what to do next.
- **Cut filler.** "No drafts yet" beats "Your items will appear here." Every word pulls weight.

### Imagery & Composition
- **Photography-first.** Real property and real data over stock clip-art or generic illustration. Editorial, well-cropped imagery — like a magazine spread.
- **One idea per section.** Let a single point own each screen/slide. Don't crowd.
- **Generous margins.** Give content room to breathe; trust the whitespace.
- **Asymmetric layouts** over rigid centered columns — it reads more confident and modern.
- **Borders over shadows** for separation; reserve elevation for true overlays/modals.

---

## 🏗️ Page Structure & Layout

Every shell page follows this skeleton structure:

```tsx
<div className="flex-1 flex flex-col min-h-0 bg-val-bg-page-alt">
  {/* Sticky header area */}
  <div className="px-8 pt-8 pb-0">
    {/* Breadcrumb */}
    <div className="flex items-center gap-1.5 mb-3">
      <span className="text-xs font-semibold tracking-widest uppercase text-[--val-primary-dark]">Valgate</span>
      <span className="text-xs text-slate-300">/</span>
      <span className="text-xs font-semibold tracking-widest uppercase text-slate-400">Page Name</span>
    </div>
    {/* Title + primary CTA */}
    <div className="flex items-end justify-between">
      <div>
        <h1 className="text-4xl font-extrabold text-val-heading tracking-tight leading-10">Page Title</h1>
        <p className="text-slate-500 text-base mt-2">Supporting description.</p>
      </div>
      <button className="px-5 py-2.5 text-white text-[14px] font-semibold rounded
        hover:opacity-90 active:scale-[0.97] transition-all duration-150"
        style={{ background: 'linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)' }}>
        Primary Action
      </button>
    </div>
  </div>

  {/* Scrollable content */}
  <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-5">
    {/* page content */}
  </div>
</div>
```

**Layout Specifics:**
- **Background:** `bg-val-bg-page-alt` (`#f8f9ff` light / `#0F1117` dark)
- **Content max-width:** `max-w-[1200px]` or `max-w-6xl`, `mx-auto`
- **Horizontal padding:** `px-8`
- **Section gap:** `gap-5` in a `flex flex-col`

---

## 🎨 Color Tokens & Status Palette

> [!IMPORTANT]  
> **No pure colors.** No pure white, no pure black, no pure gray. Tint every neutral subtly toward brand blue.
> **Use CSS custom properties** — never hardcode hex values in components.

| Token / Role | Hex / Value | Purpose |
|---|---|---|
| `var(--val-primary-dark)` | `#004ac6` | Brand blue — CTAs, active states, breadcrumb accent |
| `var(--val-heading)` | `#121c28` / `#F5F6F7` | Primary text |
| `var(--val-bg-page-alt)` | `#f8f9ff` | Page background |
| `var(--val-bg-tint)` | `#eef4ff` | Subtle tinted surface — pill containers, segmented controls |
| `--surface-base` | `#FFFFFF` | Card/panel background |
| `--surface-tint` | `#EEF2F8` | Active nav, elevated rows |

### Status Colors (Signal real state only)

| Status | Background | Text | Border |
|---|---|---|---|
| **Success / Rented** | `bg-emerald-50` | `text-emerald-700` | `border-emerald-200` |
| **Warning / Vacant** | `bg-amber-50` | `text-amber-700` | `border-amber-200` |
| **Danger** | `bg-rose-50` | `text-rose-700` | `border-rose-200` |
| **Info** | `bg-blue-50` | `text-blue-700` | `border-blue-200` |

---

## ✒️ Typography

- **Primary face:** **Geist** (or any clean, modern grotesque).
- **Secondary Display face:** Evaluate **Neue Montreal**, **Satoshi**, or **Aktiv Grotesk**. Avoid Bricolage Grotesque.

> [!NOTE]
> Type does the heavy lifting; icons are the supporting cast. Reach for stronger type before reaching for an icon or a graphic.

| Role | Tailwind Classes |
|---|---|
| **Page title** | `text-4xl font-extrabold text-val-heading tracking-tight leading-10` |
| **Page subtitle** | `text-slate-500 text-base mt-2` |
| **Section heading** | `text-base font-bold text-val-heading` |
| **Table / KPI label** | `text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500` |
| **KPI value** | `text-[24px] font-bold text-val-heading` |
| **Table body** | `text-[14px] text-val-heading` |
| **Badge / pill label** | `text-[10px] font-semibold tracking-[1px] uppercase` |

---

## 🗂️ Cards, Surfaces & Controls

> [!WARNING]  
> **Nesting Rule:** Only one level of card nesting. **Never put cards inside cards.** Use space and a 1px border to group.

**Standard Content Card**
```tsx
className="bg-white rounded-xl p-6 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)] hover:-translate-y-0.5 hover:shadow-[0px_6px_20px_0px_rgba(18,28,40,0.10)] transition-all duration-200"
```

**Data/KPI Card**
```tsx
className="bg-white rounded-lg border border-slate-200 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
```

### Interactive Controls

```tsx
// Primary Button
className="px-5 py-2.5 text-white text-[14px] font-semibold rounded hover:opacity-90 active:scale-[0.97] transition-all duration-150"
style={{ background: 'linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)', boxShadow: '0 4px 6px -1px rgba(0,74,198,0.25), 0 2px 4px -2px rgba(0,74,198,0.15)' }}

// Segmented Control (Container)
className="bg-val-bg-tint p-1 rounded flex"

// Filter Pill (Active)
className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap bg-[--val-primary-dark] text-white scale-[1.03] transition-all duration-200"
```

---

## 🎬 Motion & Entrances

> [!TIP]
> Respect `prefers-reduced-motion` on any custom keyframe. Use `opacity` and `transform` exclusively—never animate `width`, `height`, `padding`, or `margin`.

**Entrance Animations (Fade Slide Up)**
```tsx
// Page header
className="animate-[fade-slide-up_0.4s_cubic-bezier(0.22,1,0.36,1)_both]"
```

**Motion Rules:**
- **Purposeful only:** reveal-on-scroll, smooth section transitions, state feedback.
- **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` or `cubic-bezier(0.22,1,0.36,1)` for entrances.
- **Duration:** `200ms` micro (hover), `300–480ms` entrances, `800ms` progress bars.
- **No bounce or elastic easing.**

---

## 🚫 Anti-patterns to Avoid

> [!CAUTION]
> Avoid the following practices to maintain design consistency. *If it feels like Airbnb's calm and not a busy dashboard, you're on brand.*

- ❌ **Brand blue used as a background / everywhere.** Blue is precious.
- ❌ **Decorative gradients or gradient text** (`background-clip: text`)
- ❌ **Pure `#000`, pure `#fff`, or untinted gray.**
- ❌ **Side-stripe accent borders** on cards or list items (`border-left: 4px solid …`)
- ❌ **Cards nested inside cards**
- ❌ **Icon-heavy, generic-SaaS chrome** that adds no information
- ❌ **Animation that runs purely for decoration**
- ❌ **Vague filler copy** (e.g., "Your items will appear here")
- ❌ **Bloomberg Terminal / generic dashboards** style. No dense, technical crowding.
