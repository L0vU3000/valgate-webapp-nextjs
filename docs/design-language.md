# Valgate Design Language

Extracted from `/directory` and `/portfolio` — the canonical visual reference for all new pages. When in doubt, refer here.

---

## Page Structure

Every shell page follows this skeleton:

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

**Background:** `bg-val-bg-page-alt` (`#f8f9ff` light / `#0F1117` dark)  
**Content max-width:** `max-w-[1200px]` or `max-w-6xl`, `mx-auto`  
**Horizontal padding:** `px-8`  
**Section gap:** `gap-5` in a `flex flex-col`

---

## Entrance Animations

All page content enters with `fade-slide-up` (defined in `theme.css`). Stagger by delay:

```tsx
// Page header
className="animate-[fade-slide-up_0.4s_cubic-bezier(0.22,1,0.36,1)_both]"

// Cards — stagger per index
style={{ animationDelay: `${100 + index * 80}ms` }}
className="animate-[fade-slide-up_0.45s_cubic-bezier(0.22,1,0.36,1)_both]"

// Table rows — stagger 25ms each
style={{ animationDelay: `${index * 25}ms` }}
```

For mount-based transitions (when CSS keyframes aren't enough):
```tsx
const [mounted, setMounted] = useState(false);
useEffect(() => { const t = setTimeout(() => setMounted(true), 50); return () => clearTimeout(t); }, []);

// On each element:
style={{
  opacity: mounted ? 1 : 0,
  transform: mounted ? 'none' : 'translateY(-8px)',
  transition: `opacity 400ms cubic-bezier(0.25,1,0.5,1) ${delay}ms, transform 400ms cubic-bezier(0.25,1,0.5,1) ${delay}ms`,
}}
```

---

## Cards & Surfaces

### Standard Content Card
```tsx
className="bg-white rounded-xl p-6 shadow-[0px_1px_4px_0px_rgba(18,28,40,0.06)]
  hover:-translate-y-0.5 hover:shadow-[0px_6px_20px_0px_rgba(18,28,40,0.10)]
  transition-all duration-200"
```

### Data/KPI Card
```tsx
className="bg-white rounded-lg border border-slate-200 p-5
  shadow-[0_1px_2px_rgba(0,0,0,0.05)]
  hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
```

### Table Container
```tsx
className="bg-white rounded-lg border border-slate-200
  shadow-[0_1px_2px_rgba(0,0,0,0.05)] overflow-hidden"
```

**Rule:** Only one level of card nesting. Never cards inside cards. Use spacing and `border-t` for sub-groupings.

---

## Typography Scale

| Role | Classes |
|---|---|
| Page title | `text-4xl font-extrabold text-val-heading tracking-tight leading-10` |
| Page subtitle | `text-slate-500 text-base mt-2` |
| Section heading | `text-base font-bold text-val-heading` |
| Table / KPI label | `text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500` |
| KPI value | `text-[24px] font-bold text-val-heading` |
| Table body | `text-[14px] text-val-heading` |
| Breadcrumb active | `text-xs font-semibold tracking-widest uppercase text-[--val-primary-dark]` |
| Breadcrumb separator | `text-xs text-slate-300` |
| Breadcrumb inactive | `text-xs font-semibold tracking-widest uppercase text-slate-400` |
| Badge / pill label | `text-[10px] font-semibold tracking-[1px] uppercase` |

---

## Color Tokens

Use CSS custom properties — never hardcode hex values in components.

| Token | Purpose |
|---|---|
| `var(--val-primary-dark)` | Brand blue (`#004ac6`) — CTAs, active states, breadcrumb accent |
| `var(--val-heading)` | Primary text (`#121c28` light / `#F5F6F7` dark) |
| `var(--val-bg-page-alt)` | Page background (`#f8f9ff` light) |
| `var(--val-bg-tint)` | Subtle tinted surface (`#eef4ff` light) — pill containers, segmented controls |
| `--surface-base` | Card/panel background (`#FFFFFF` light) |
| `--surface-tint` | Active nav, elevated rows (`#EEF2F8` light) |

### Status Color System (Tailwind pairs)
Each status maps to a `bg-{color}-50 text-{color}-{weight}` pair:

| Status | Bg | Text | Border |
|---|---|---|---|
| Success / Rented | `bg-emerald-50` | `text-emerald-700` | `border-emerald-200` |
| Warning / Vacant | `bg-amber-50` | `text-amber-700` | `border-amber-200` |
| Danger | `bg-rose-50` | `text-rose-700` | `border-rose-200` |
| Info | `bg-blue-50` | `text-blue-700` | `border-blue-200` |

### Category Badge Palette
Assign consistently across the app (don't vary per page):

| Type | Classes |
|---|---|
| Agent | `bg-blue-50 text-blue-700` |
| Lawyer | `bg-purple-50 text-purple-700` |
| Notary | `bg-indigo-50 text-indigo-700` |
| House | `bg-blue-50 text-blue-600` |
| Apartment/Building | `bg-amber-50 text-amber-600` |
| Land | `bg-emerald-50 text-emerald-600` |

---

## Interactive Controls

### Primary Button
```tsx
<button
  className="px-5 py-2.5 text-white text-[14px] font-semibold rounded
    hover:opacity-90 active:scale-[0.97] transition-all duration-150"
  style={{
    background: 'linear-gradient(168deg, var(--val-primary-dark) 0%, #2563eb 100%)',
    boxShadow: '0 4px 6px -1px rgba(0,74,198,0.25), 0 2px 4px -2px rgba(0,74,198,0.15)',
  }}
>
  Action
</button>
```

### Secondary / Outline Button
```tsx
className="px-4 py-2 bg-white border border-slate-200 rounded text-sm font-semibold
  text-val-heading hover:bg-slate-50 active:scale-[0.98] transition-all duration-150"
```

### Filter Pills (horizontal scrollable row)
```tsx
// Container
className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:h-[3px]
  [&::-webkit-scrollbar-track]:bg-val-bg-tint
  [&::-webkit-scrollbar-thumb]:bg-[--val-primary-dark]/25
  hover:[&::-webkit-scrollbar-thumb]:bg-[--val-primary-dark]/50"

// Active pill
className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap
  bg-[--val-primary-dark] text-white scale-[1.03] transition-all duration-200"

// Inactive pill
className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap
  bg-val-bg-tint text-slate-500 hover:bg-blue-100 hover:text-slate-700 transition-all duration-200"
```

### Segmented Control (e.g., List/Grid, Type selector)
```tsx
// Container
className="bg-val-bg-tint p-1 rounded flex"

// Active segment
className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium
  bg-white text-[--val-primary-dark] shadow-sm transition-all duration-200"

// Inactive segment
className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium
  text-slate-500 hover:text-slate-700 transition-all duration-200"
```

### Pagination
```tsx
// Page number — active
className="size-10 rounded text-sm font-semibold bg-[--val-primary-dark] text-white"

// Page number — inactive
className="size-10 rounded text-sm font-semibold bg-val-bg-tint text-slate-500
  hover:bg-blue-100 active:scale-95 transition-all duration-150"

// Prev/Next arrow
className="size-10 bg-val-bg-tint rounded flex items-center justify-center
  hover:bg-blue-100 transition-colors disabled:opacity-40"
```

---

## Table Pattern

```tsx
<div className="bg-white rounded-lg border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)] overflow-hidden">
  <table className="w-full">
    <thead>
      <tr className="bg-slate-50/80 border-b border-slate-200">
        <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.05em]">
          Column
        </th>
      </tr>
    </thead>
    <tbody>
      {rows.map((row, i) => (
        <tr
          key={row.id}
          className="border-t border-slate-100 hover:bg-blue-50/30 cursor-pointer transition-colors"
          style={{ animationDelay: `${i * 25}ms` }}
        >
          <td className="px-4 py-3.5 text-[14px] text-val-heading">…</td>
        </tr>
      ))}
    </tbody>
  </table>
  {/* Pagination bar */}
  <div className="bg-slate-50/60 border-t border-slate-200 px-4 py-3 flex items-center justify-between">
    …
  </div>
</div>
```

---

## KPI / Metric Row

```tsx
<div className="grid grid-cols-4 gap-4">
  {kpis.map((kpi, i) => (
    <div
      key={kpi.label}
      className="bg-white rounded-lg border border-slate-200 p-5
        shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-md hover:-translate-y-0.5
        transition-all duration-300"
      style={{ transitionDelay: `${100 + i * 80}ms` }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500">
          {kpi.label}
        </span>
        <div className="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center">
          <kpi.Icon className="size-4 text-blue-500" />
        </div>
      </div>
      <div className="text-[24px] font-bold text-val-heading leading-none">{kpi.value}</div>
      <div className="text-xs text-slate-400 mt-1">{kpi.sub}</div>
    </div>
  ))}
</div>
```

---

## Progress / Health Bar

```tsx
// Health percentage bar (animate width on mount)
<div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
  <div
    className={cn(
      "h-full rounded-full transition-all duration-[800ms]",
      value >= 80 ? "bg-emerald-500" : value >= 50 ? "bg-amber-500" : "bg-red-400"
    )}
    style={{ width: mounted ? `${value}%` : '0%', transitionTimingFunction: 'cubic-bezier(0.25,1,0.5,1)' }}
  />
</div>
```

---

## Empty State

Don't use generic "nothing here" text. Be specific and directive:

```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <div className="w-12 h-12 rounded-xl bg-val-bg-tint flex items-center justify-center mb-4">
    <Icon className="size-6 text-slate-400" />
  </div>
  <p className="text-sm font-semibold text-val-heading">No [items] yet</p>
  <p className="text-xs text-slate-400 mt-1 max-w-[220px]">Specific next action the user should take.</p>
</div>
```

---

## Motion Rules

- Easing: `cubic-bezier(0.22,1,0.36,1)` for entrances, `cubic-bezier(0.25,1,0.5,1)` for property transitions
- Duration: 200ms micro (hover), 300–450ms entrances, 800ms progress bars
- Only `opacity` and `transform` — never animate `width`, `height`, `padding`, or `margin`
- No bounce or elastic easing
- Respect `prefers-reduced-motion` on any custom keyframe

---

## Anti-patterns to Avoid

- No `border-left: 4px solid …` accent stripes on cards or list items
- No gradient text (`background-clip: text`)
- No nested cards (cards inside cards)
- No generic `shadow-lg` everywhere — use the specific shadow values above
- No pure `#000` or `#fff` — always use token colors
- No animations that run purely for decoration
