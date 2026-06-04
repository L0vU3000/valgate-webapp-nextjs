# Valgate Brand Guide

> A portable, self-contained brand reference for any Valgate project — built for
> presentation-style websites and AI agents working on them. Copy this file into a sibling
> repo and an agent can produce on-brand work with no other context.
>
> Scope: brand fundamentals only (identity, color, type, principles, voice). No CSS tokens,
> no SaaS dashboard component code.

---

## 1. What Valgate is

Valgate helps property owners see their portfolio clearly — rental income, valuations,
occupancy, documents — and feel in control of it. The brand turns complex property data into
something calm, simple, and confident.

**Personality:** confident, modern, sharp. **Feeling we create:** clarity and calm.

**North star — Airbnb.** Airy, generous whitespace, photography-first, refined sans-serif
type, premium without being cold. Nothing decorative that doesn't earn its place.

**Anti-references — what we are NOT:**
- Bloomberg Terminal — too dense, too technical.
- Generic SaaS dashboards — icon-heavy nav, color-coded KPI tiles, chrome everywhere.

---

## 2. Color

Use these as plain hex values. The discipline matters more than any single swatch.

### Brand blue — use sparingly
| Role | Hex |
|---|---|
| Brand blue (primary) | `#004ac6` |
| Interactive blue (links, CTAs, accents) | `#2563EB` |

> **Blue is precious.** Blue appears only on actions, links, and key accents — never as
> wallpaper. The moment it's everywhere, it's nowhere.

### Ink & surfaces
| Role | Hex |
|---|---|
| Heading / ink | `#121c28` |
| Page background (off-white) | `#f8f9ff` |
| Blue-tinted surface | `#eef4ff` |
| Subtle border | `#d8e3f4` |

> **No pure colors.** No pure white, no pure black, no pure gray. Tint every neutral subtly
> toward brand blue — that subtle warmth-toward-blue is what makes a surface feel "Valgate"
> rather than generic.

### Status colors (use only to signal real state)
| State | Hex |
|---|---|
| Success | `#059669` |
| Warning | `#F59E0B` |
| Danger | `#E11D48` |
| Info | `#0284C7` |

> No decorative gradients on type or chrome. Solid, confident color only.

---

## 3. Typography

- **Primary face:** Geist (or any clean, modern grotesque). Use it for everything.
- **Type does the heavy lifting; icons are the supporting cast.** Reach for stronger type
  before reaching for an icon or a graphic.
- **Avoid Bricolage Grotesque** in new work. If you want a distinct display face, evaluate
  **Neue Montreal**, **Satoshi**, or **Aktiv Grotesk** — confident and modern without being
  overused.

**For a presentation site specifically:**
- Large, confident headlines. Let them dominate the viewport.
- Tight letter-spacing on big headings (`tracking-tight`); generous line spacing in body copy.
- Strong weight contrast (extrabold headline → regular body) instead of color contrast.

---

## 4. The 8 principles

1. **Hierarchy over decoration** — every visual choice serves the hierarchy. If it doesn't
   help the eye find the point faster, cut it.
2. **Space is intentional** — whitespace is how the interface communicates calm. Vary it;
   asymmetric, rhythmic spacing over uniform padding everywhere.
3. **Blue is precious** — guard the brand blue. Actions and accents only.
4. **Content is the hero** — the data, the property, the story is why people came. Frame it;
   don't compete with it.
5. **Motion earns its place** — animate only to communicate state or smooth a transition.
   Never for visual interest alone.
6. **Containers only when content is truly distinct** — not every section needs a card. Use
   space and a 1px border to group. **Never nest cards inside cards.**
7. **Badges are metadata** — status, tags, and labels are supporting detail. They sit inline
   or low in the hierarchy, never as a headline.
8. **Copy earns its space** — every word specific and action-oriented. Say what's true and
   what to do next. No vague filler.

---

## 5. Imagery & composition

*(Guidance specific to a presentation-deck / marketing website.)*

- **Photography-first.** Real property and real data over stock clip-art or generic
  illustration. Editorial, well-cropped imagery — like a magazine spread.
- **One idea per section.** Let a single point own each screen/slide. Don't crowd.
- **Generous margins.** Give content room to breathe; trust the whitespace.
- **Asymmetric layouts** over rigid centered columns — it reads more confident and modern.
- **Borders over shadows** for separation; reserve elevation for true overlays/modals.

---

## 6. Motion

*(Tuned for scroll and presentation.)*

- **Purposeful only:** reveal-on-scroll, smooth section transitions, state feedback.
- **Animate only `opacity` and `transform`** — never `width`, `height`, `padding`, `margin`.
- **Standard easing:** `cubic-bezier(0.16, 1, 0.3, 1)`. Entrances **300–480ms**.
- **No bounce or elastic** easing. No motion that exists purely for decoration.
- **Respect `prefers-reduced-motion`** — collapse animations for users who ask for less.

---

## 7. Voice & copy

- **Tone:** confident, calm, in-control — never overwhelmed, never flashy or casual.
- **Be specific and action-oriented.** Say exactly what's true and what to do next.
- **Cut filler.** "No drafts yet" beats "Your items will appear here." Every word pulls weight.

---

## 8. Anti-patterns — never do this

- ❌ Brand blue used as a background / everywhere
- ❌ Decorative gradients or gradient text (`background-clip: text`)
- ❌ Pure `#000`, pure `#fff`, or untinted gray
- ❌ Side-stripe accent borders on cards or list items (`border-left: 4px solid …`)
- ❌ Cards nested inside cards
- ❌ Icon-heavy, generic-SaaS chrome that adds no information
- ❌ Animation that runs purely for decoration
- ❌ Vague filler copy

---

*Quick gut-check for any Valgate screen: confident type, precious blue, tinted neutrals,
content as the hero, and motion that means something. If it feels like Airbnb's calm and not
a busy dashboard, you're on brand.*
