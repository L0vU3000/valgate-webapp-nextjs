# Prompt for AI Coding Agent (HeyGen Hyperframes)

> Copy everything below the line into your AI coding assistant (Cursor, Windsurf, or Antigravity), and ensure the "Files to attach" are accessible in the workspace context.

---

You are building a **40-second animated product demo of Valgate**, a property-portfolio platform.
The deliverable is a **Programmatic HTML/React component rendered via HeyGen Hyperframes, 16:9 (1920×1080), 40 seconds** — a web-native simulation of the app (the style of a professional SaaS product demo), **not** a screen recording.

## 0. What I'm giving you
- **`product-demo-context.md`** — the master brief. Read it fully first; it is self-contained.
  - §1 brief & narrative spine · §2 design system · §3 screen references · **§4 the timecoded
    shot-by-shot script (the master)** · **§5 output format + motion vocabulary** · **§6 pre-flight
    QA checklist** · **§7 production & motion-craft bar** · §8 done-when.
- **`demo-screens/`** — real screenshots of the live app + a `README.md` caption sheet, plus
  **`0-valgate-mark.svg`**, the real Valgate logo for the open/close.

## 1. How to use the screenshots
The screenshots are the **source of truth for data, layout, and brand — not frames to trace
literally.** Rebuild each scene as **clean DOM elements (React/Tailwind/CSS)** (strip secondary chrome — extra
sidebar icons, breadcrumbs, scrollbars, idle placeholders — and hyper-focus the hero element).
A calmer, cleaner version of the real screen beats a literal trace. Stay on the real spacing and
the §2 tokens.

**Frame the function, not the page.** The screenshots show the *whole* dense SaaS page, but the
video should **rarely show the full page** — each scene shows **only the essential component(s)**
for its job, isolated as a floating element on the canvas (a single Documents card, the KPI cards +
heatmap, the chat column), with the app shell dropped. Compose it **editorially**: a focused UI
fragment + a short on-screen headline, arranged asymmetrically with generous margins.

**Use on-screen editorial text.** Like the reference, **big display type carries the story** (it's
the narration substitute — there is *no voiceover*). One short headline per product scene, in the
display face, extrabold, ink on canvas: *"Your whole portfolio. One view."* (Map) · *"Every
document. Found in seconds."* (Documents) · *"Rent, arrears, occupancy — always live."* (Rentals) ·
*"Ask anything. In plain English."* (Copilot) · *"Valgate. There when it matters."* (Close). See §5.

## 2. Non-negotiables
- **Follow the narrative spine.** The demo tracks **one property — Boeung Trabek Corner Building
  (Phnom Penh)** — end to end: its map pin → its document data room → its expiring lease → Copilot
  naming it first. Same property, four angles. One story, not a feature tour.
- **Real data only.** Use the exact names and numbers in §4 (the three expiring leases; rentals
  KPIs $7,250 / 26% / $25,375 / $4,510; 16 files across 7 folders). No placeholders, no lorem.
- **Build the motion programmatically from §4 + §5.** Every element enters, behaves, and exits using the named
  moves in §5's motion vocabulary on the timecodes in §4's scene tables. Use CSS transitions, Keyframes, or GSAP for orchestration.
- **Brand discipline (§2).** Canvas `#f8f9ff`; ink `#121c28`; blue (`#004ac6`/`#2563EB`) only on
  actions/accents, **never as a background**; amber only on the 2 expiring cells + the 3 answer
  dots; `rounded-xl` soft-shadow cards, no nested cards; Geist type, weight contrast over colour.
- **Never show a loading state** — no spinners, skeletons, or empty states. Every screen is
  resolved and confident.

## 3. The six scenes (full detail in §4)
1. **Open (0:00–0:03)** — the mark draws in → "Valgate". No tagline yet.
2. **Map (0:03–0:10)** — pull back from Boeung Trabek's pin to the whole Phnom Penh portfolio
   (pins individual, not clustered) → match-cut into its Documents screen.
3. **Documents (0:10–0:18)** — its data room (7 folder chips + files stagger in) → cursor → type
   "Title Deed" → the row highlights instantly.
4. **Rentals (0:18–0:25)** — KPIs count up (Income leads $0→$7,250) → heatmap, 2 amber "expiring
   soon" cells (one is Boeung Trabek).
5. **Copilot (0:25–0:37)** — the hero (12s). Tap "Valgate Agent" → overlay whooshes in (chat
   centred, side panels dimmed) → query types → answer reveals line by line, **Boeung Trabek
   first**, amber dots tying back to Scene 4.
6. **Close (0:37–0:40)** — wordmark + tagline "There when it matters." on the clean canvas. No CTA.

## 3a. The "Cowork" Design Rules (Critical)
To achieve the premium look of the Anthropic "Cowork" reference, strictly adhere to these design mechanics:
- **Never show the entire application window.** Treat individual SaaS elements as standalone physical "blocks" floating on an infinite grid. The camera pans from block to block.
- **The Core SaaS Elements:**
  - **Chat Input & AI Feed:** Clean, borderless white card, soft drop shadow.
  - **Source File / Document Pills:** Small, neat horizontal pills with a tiny icon and sans-serif file name. Appears instantly.
  - **Actionable Checklist / Task Blocks:** Vertical text rows with empty circular checkboxes. Checkmarks snap in instantly, and the row fades to a muted grey to show completion.
  - **Modal "Popup" Alert:** Compact rectangular card appearing over other elements (for approval moments).
- **The Text Elements (Split into two buckets):**
  - **Type A (Narrative Text):** Tells the story. Large, elegant Serif font directly on the background. Fades or slides up smoothly and slowly.
  - **Type B (Interactive UI Text):** Executes the tasks. Smaller, crisp Sans-Serif font inside the white SaaS cards. Pops into existence instantly mimicking rapid computation.
- **Orchestration:** Use a "Trigger and Response" mechanic. Animate isolated components and pan the camera over the grid as workflows execute.

## 4. Deliverable
A functional codebase containing the HTML/React components and animation orchestrator that renders the 40-second video composition correctly via the **HeyGen Hyperframes** framework.

---

## Files to attach
Ensure the following files are available in your workspace context:
1. `docs/client-presentation/product-demo-context.md`  ← the master brief (required)
2. `docs/client-presentation/demo-screens/README.md`
3. `docs/client-presentation/demo-screens/0-valgate-mark.svg`
4. `docs/client-presentation/demo-screens/1-home-map.png`
5. `docs/client-presentation/demo-screens/2-portfolio.png`
6. `docs/client-presentation/demo-screens/3-documents.png`
7. `docs/client-presentation/demo-screens/4-rentals.png`
8. `docs/client-presentation/demo-screens/5-copilot.png`
