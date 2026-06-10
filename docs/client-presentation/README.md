# Valgate — Client Presentation

Everything needed to deliver the pitch, run the slide deck, and generate the animated product demo.

---

## At a glance

| Artifact | Status | File |
|---|---|---|
| Presenter script | Working doc | [`pitch-deck-script.md`](./pitch-deck-script.md) |
| Slide deck edits | Ready to paste | [`deck-edits-prompt.md`](./deck-edits-prompt.md) |
| Animated demo brief | Master spec | [`product-demo-context.md`](./product-demo-context.md) |
| Animated demo build prompt | Ready to paste | [`heygen-hyperframes-prompt.md`](./heygen-hyperframes-prompt.md) |
| Product summary | Reference | [`summary-for-presentation.md`](./summary-for-presentation.md) |
| Design & brand reference | Reference | [`design.md`](./design.md) |
| Demo screen anchors | Screenshots | [`demo-screens/README.md`](./demo-screens/README.md) |

---

## 1. The Pitch Deck

### `pitch-deck-script.md` — Presenter script
The live speaker notes for the room. 13 slides (00–12): personal intro → origin story → problem → product → live demo → security → roadmap → close. Every slide has speaker lines, on-slide direction, and notes. **Work here when writing or rehearsing the talk.**

### `deck-edits-prompt.md` — Slide deck edit instructions
7 precise edit instructions for `Valgate Deck V2 - Standalone.html`. Covers: origin story rewrite (Slide 03), problem headline (Slide 04), Think/Act/Scale teaser (Slide 06), Map slide reorder to appear before Documents (Slides 09–11), USP slide cleanup (Slide 05), Copilot framing strip (Slide 12), personal hook (Slide 02). **Paste into Claude Design to apply edits to the HTML deck.**

---

## 2. The Animated Product Demo

A 40-second animated walkthrough of the product, built as a HeyGen Hyperframes HTML/React component. Not a screen recording — a web-native simulation with motion choreography.

**Narrative spine:** one property (Boeung Trabek Corner Building, Phnom Penh) tracked end to end: map pin → document data room → expiring lease → Copilot answer. Six scenes, one story.

### `product-demo-context.md` — Master brief
The complete self-contained spec a developer needs to build the demo. Contains:
- §1 Brief & narrative spine
- §2 Design system (colours, type, motion tokens)
- §3 Screen reference (what each app screen contains and where it lives in the codebase)
- §4 Visual script — timecoded shot-by-shot for all 6 scenes (the master)
- §5 Output format + full motion vocabulary (FADE-UP, WHOOSH, COUNT-UP, TYPE-IN, etc.)
- §6 Pre-flight QA checklist
- §7 Production & motion craft bar (the "Cowork" polish level)
- §8 Done-when criteria

**This is the source of truth for the demo. All other demo files reference it.**

### `heygen-hyperframes-prompt.md` — Build prompt for the coding agent
A ready-to-paste brief for Cursor, Windsurf, or any AI coding agent. Summarises the master brief into direct build instructions and lists the exact files to attach to the agent's context. **Paste this (with the demo-screens attached) to generate the demo codebase.**

### `demo-screens/` — Visual reference screenshots
Real screenshots of the live Valgate app, captured at 1440×900. Used as source-of-truth for data, layout, and brand during demo generation — not frames to trace, but references to rebuild cleanly.

| File | Scene |
|---|---|
| `0-valgate-mark.svg` | Open / Close (Scenes 1 & 6) |
| `1-home-map.png` | Map (Scene 2) |
| `2-portfolio.png` | Portfolio context |
| `3-documents.png` | Documents (Scene 3) |
| `4-rentals.png` | Rentals (Scene 4) |
| `5-copilot.png` | Copilot (Scene 5) |

See [`demo-screens/README.md`](./demo-screens/README.md) for full captions and re-shooting instructions.

---

## 3. Reference

### `summary-for-presentation.md` — Full product summary
A structured breakdown of what Valgate is, who it serves, how users move through it, and what makes it technically distinctive. Covers: the two-layer model, 8 pillars, user journeys, core features, tech stack, data model, design system, and build progress. **Use this when you need to go deep on the product — for Q&A prep or adding context to any of the above.**

### `design.md` — Design & brand system
The canonical visual reference: colours, typography, cards, motion rules, and anti-patterns. The `product-demo-context.md` (§2) condenses this for demo generation, but this file is the full authority. **Check here when brand or visual decisions come up.**

---

## How the files connect

```
pitch-deck-script.md  ←→  deck-edits-prompt.md
       ↓                         ↓
   (script drives           (edits align the
    the talk)                HTML deck to it)

product-demo-context.md  ←→  heygen-hyperframes-prompt.md
       ↓                              ↓
   (master spec)            (condensed build prompt)
       ↓
  demo-screens/
  (visual anchors)

summary-for-presentation.md  ←  deep product context
design.md                    ←  brand & visual decisions
```
