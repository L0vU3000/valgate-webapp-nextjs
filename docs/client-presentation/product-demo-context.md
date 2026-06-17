# Valgate — 40-Second Product Demo (Context for HeyGen Hyperframes)

> **What this file is.** A single, self-contained brief that gives a developer — human or AI agent —
> everything needed to programmatically generate a 40-second visual product demo of Valgate using the 
> **HeyGen Hyperframes** framework, on-brand and accurate to the real product, with no other context required.
>
> **Read this much, then build:** the Design System (§2) sets the look, the Screen Reference
> (§3) tells you what each screen actually contains, and the Visual Script (§4) is the
> shot-by-shot timeline to code.

---

## 1. Brief

| | |
|---|---|
| **Purpose** | A 40-second visual demo of the Valgate product. Six generated scenes, not a screen recording. |
| **Audience** | A COO / asset manager at a property fund. **Research posture, not a sales pitch** — we are showing the product to learn from their reaction, not to close. Confident and calm, never hype. |
| **Deliverable** | An animated product walkthrough — **Programmatic HTML/React component rendered via HeyGen Hyperframes, 16:9 (1920×1080), 40s**. A web-native simulation of the app, not a screen recording. Full motion spec in §5. |
| **Length** | 40 seconds, 6 scenes (3 / 7 / 8 / 7 / 12 / 3). |
| **Narrative arc** | Portfolio clarity → Find anything instantly → Live data always → Ask anything → There when it matters. |
| **Narrative spine** | The demo follows **one real Phnom Penh property — Boeung Trabek Corner Building — end to end** (its pin → its documents → its expiring lease → Copilot names it). One story, not a feature tour. See §4. |
| **Tagline** | **"Valgate. There when it matters."** (opens and closes the demo.) |
| **What Valgate does** | Three things today: **Organise** (every document, lease, record — structured and found in seconds), **Track** (rent, arrears, occupancy, expiring leases — always live), **Prove** (records secure, permanent, and yours to export — ready to prove to a lender, lawyer, or co-owner; **Valgate Verified** is NEXT). **Everything in the demo is live — not a roadmap.** |

The demo follows the same arc as the pitch deck (`pitch-deck-script.md`): a clean open → the
map (clarity) → documents (organise) → rentals (track) → Copilot (the payoff) → a clean close.

**And where Valgate is heading — Think · Act · Scale.** (Context, not a separate scene — but it's
*why* Copilot is the payoff. Scene 5 is "Think" in action; the rest is the near future.)
- **Think.** Valgate Copilot is not a chatbot — it's a digital collaborator that knows your entire
  portfolio. Ask anything in plain English (which leases expire next month, total arrears across the
  book, pull everything for a deal); it surfaces what matters before you think to ask.
- **Act.** It doesn't wait to be asked. Overdue payments, expiring leases, missing documents,
  anomalies across the portfolio — it flags them and moves on them. Intelligence that acts, not just answers.
- **Scale.** The same clarity a family gets on three properties, a fund gets on three hundred —
  no added headcount, no added complexity. Valgate scales with the portfolio.

---

## 2. Design System Essentials

Condensed for generation. Full references: `docs/design-language.md` (in-app product system —
the authority for these demo screens), `docs/valgate-brand-guide.md` (portable brand guide),
`styles/theme.css` (live tokens).

### Colour

| Role | Hex | Use |
|---|---|---|
| Brand blue (primary) | `#004ac6` | CTAs, active states, breadcrumb accent — **sparingly** |
| Interactive blue | `#2563EB` | Links, accents, gradient endpoint |
| Heading / ink | `#121c28` | All primary text |
| Page background | `#f8f9ff` | Off-white, faintly blue-tinted — the canvas |
| Blue-tinted surface | `#eef4ff` | Soft fills, selected states |
| Subtle border | `#d8e3f4` | 1px separators — borders over shadows |
| Surface | white (tinted, never pure `#fff`) | Cards |

**Status colours** (only to signal real state): Success `#059669`, Warning / amber `#F59E0B`,
Danger `#E11D48`, Info `#0284C7`.

> **Blue is precious.** Brand blue appears on actions and accents only — **never as a
> background or wallpaper.** The moment it's everywhere, it's nowhere.
>
> **No pure colours.** No pure white, black, or grey. Every neutral is tinted faintly toward
> brand blue — that subtle warmth is what makes a surface read as "Valgate."

### Typography

- **Geist** for everything (clean modern grotesque). Type does the heavy lifting; icons are
  the supporting cast.
- **Bricolage Grotesque** appears as a display face in the current in-app screens. *(Note: the
  portable brand guide now prefers Geist-only or Neue Montreal / Satoshi for new display work —
  if in doubt, use Geist and lean on weight, not a second face.)*
- **Weight contrast over colour contrast.** Extrabold headline → regular body.
- **Page title:** `text-4xl font-extrabold tracking-tight` in heading ink.
- **KPI value:** ~`24px`, bold, heading ink. **Breadcrumb / eyebrow:** `11px` semibold,
  uppercase, letter-spaced, in brand blue.

### Cards & layout

- **Card:** white surface, `rounded-xl`, soft shadow `0px 1px 4px rgba(18,28,40,0.06)`,
  generous internal padding (`p-6`).
- **One nesting level max — never a card inside a card.** Group with whitespace and a 1px
  border before reaching for a container.
- **Generous, asymmetric whitespace.** Airbnb-calm, not dashboard-dense. Content is the hero.

### Primary button

Gradient, rounded, white label:
`background: linear-gradient(168deg, #004ac6 0%, #2563EB 100%)`, soft blue-tinted shadow.

### Motion

- Entrances use **`fade-slide-up`**: fade in + rise ~8px. Duration **300–450ms**.
- Easing **`cubic-bezier(0.22, 1, 0.36, 1)`** (in-app standard). No bounce, no elastic.
- **Stagger 80–100ms** per item so groups cascade in.
- **Animate only `opacity` and `transform`** — never width, height, padding, or margin.
- Motion earns its place: reveal state or smooth a transition, never decoration.

---

## 3. Screen Reference

These describe the **real product screens** the demo recreates. Paths are accurate; data is
real seed data from `public/data/users/demo-user/` (a Phnom Penh, Cambodia portfolio — keep the
local property names, they read as authentic).

> **Visual anchors:** real screenshots of every screen below live in `demo-screens/` (see its
> `README.md`). Generate against those images — they are the look to match.

### Home / Portfolio Map
- **Path:** `app/(shell)/page.tsx` → `app/(shell)/_components/HomePage.tsx`
- **Layout:** Full-bleed map centred in the viewport; a portfolio stats strip and legend
  (`PortfolioLegend.tsx`) sit below / over it. This is the first thing seen on login.
- **Above the fold:** the whole portfolio, spatially — every property pinned at once.
- **Most prominent:** the map itself. Let it do the work; minimal chrome.

### Portfolio Map (the map engine)
- **Path:** `components/map/MapView.tsx`
- **Layout:** 3D Mapbox with **`pitch: 45°`** tilt and a slight `bearing: -17.6°`, extruded 3D
  buildings, **Supercluster** clustering that splits into individual pins as you zoom.
- **Key visuals:** custom blue map pins that scale on hover; clusters animate in with a
  `cluster-ring-pulse`. A **satellite ↔ light** style toggle lives in `MapControls.tsx`
  (light = `streets`, satellite = `satellite-streets-v12`).
- **Most prominent:** one property pin pulsing to draw the eye, parcel context around it.

### Documents  → `demo-screens/3-documents.png`
- **Path:** `app/(shell)/property/[id]/documents/page.tsx`
  → `_components/PropertyDocumentsPage.tsx`
- **Layout:** Folder chips row up top, document list (Name / Folder / Size / Modified) below,
  a search bar across the top, "Upload File" CTA on the right.
- **Folder chips (real, for PROP-0001):** **Title · Legal · Financial · Rental · Estate ·
  Insurance · Compliance** — 7 folders, 16 files. *(The underlying document `category` enum is
  `Title · Rental · Photos · Legal · Financial · Estate · Other` — "Insurance"/"Compliance" are
  folder names whose files carry the `Other` category. There is no "Tax" category.)*
- **Most prominent:** the search bar and an instantly-appearing result — this is the payoff to
  "the 15-minute folder dig." The fullness of the folder set sells "ready for a data room."

### Rentals Dashboard
- **Path:** `app/(shell)/rental/page.tsx` → `_components/RentalDashboardPage.tsx`
  (KPIs in `components/rental/KpiCards.tsx`, table in `LeaseTable.tsx`, grid in `HeatmapGrid.tsx`)
- **Layout:** **KPI cards** across the top (gross income, occupancy %, collection rate,
  maintenance / arrears), a **lease table** below, and an **occupancy heatmap grid** panel.
- **Above the fold:** the KPI row — the numbers a COO recognises: occupancy, arrears, income.
- **Most prominent:** the KPI cards animating in; one overdue lease row flagged in amber.

### Copilot — the "Valgate Agent" (a real, shipped screen)  → `demo-screens/5-copilot.png`
- **Path:** `components/layout/AIOverlay.tsx` (+ `components/layout/ai-overlay/*`). Mounted
  globally in `ShellLayout.tsx`, so it's available over every `(shell)` route. Opened from the
  **"Valgate Agent"** button (Sparkles icon) at the bottom of the left sidebar.
- **Layout:** a full-bleed **frosted-glass overlay** with three panels —
  **left:** session history sidebar ("New Session", searchable list);
  **centre:** the chat — the user's question as a blue bubble top-right, the assistant's answer
  as clean markdown below, a "follow-up or command" input pinned at the bottom;
  **right:** a **Workspace Assets** panel listing the portfolio's real documents plus tools
  (Yield Projection, Portfolio Snapshot).
- **Most prominent:** the typed question and the streamed answer. Calm and authoritative — no
  robot/chatbot kitsch, no loading spinners.
- **Note:** This is no longer a concept — it exists and is seeded. The screenshot already shows
  the exact Scene 5 query and answer; generate against it.

---

## 4. Visual Script

40 seconds, six scenes, one continuous animated walkthrough (not six separate clips).

### The narrative spine — follow one property

The demo follows a **single real Phnom Penh property the whole way through**:
**Boeung Trabek Corner Building** (a commercial building, currently rented). We meet it as a pin
on the map, open *its* document data room, see *its* lease flagged among the expiring ones, and
watch Copilot surface *it* by name. Same property, four angles — so the demo reads as one story,
not a feature menu. Every other property (Chak Angre, BKK1, Olympic…) is real supporting cast.

> Keep the spine visible: Boeung Trabek's pin stays subtly highlighted in Scene 2, its name heads
> the Documents screen in Scene 3, it's one of the amber "expiring" units in Scene 4, and it's the
> **first** lease in Copilot's answer in Scene 5.

### Timeline

| # | Scene | Time | Dur | The one thing | Feeling |
|---|---|---|---|---|---|
| 1 | **Open** | 0:00–0:03 | 3s | The mark draws in → "Valgate" | Trust, stillness |
| 2 | **Map** | 0:03–0:10 | 7s | Pull back from Boeung Trabek's pin → the whole portfolio | Spatial clarity, scale |
| 3 | **Documents** | 0:10–0:18 | 8s | Boeung Trabek's data room → instant search find | Speed, organisation |
| 4 | **Rentals** | 0:18–0:25 | 7s | KPIs count up → 2 amber "expiring soon" cells | Control, live data |
| 5 | **Copilot** | 0:25–0:37 | 12s | Ask in plain English → 3-lease answer, Boeung Trabek first | Intelligence, payoff |
| 6 | **Close** | 0:37–0:40 | 3s | Wordmark + "There when it matters." | Confidence |

### Scene-by-scene

Each scene below lists **every element with the exact move it makes** (preset names from §5's
motion vocabulary) and a scene-relative timecode `t+`. This is the choreography sheet — built the
way a SaaS demo is animated in After Effects: nothing cuts in hard, every element enters, behaves,
and exits on an eased curve.

---

**1 · Open — 0:00–0:03** · canvas `#f8f9ff`, dead centre
- **In frame (essentials only):** the wordmark, nothing else.
- **On-screen text:** none yet (the tagline is held for the close).

| Element | Move in | Behaviour | Move out |
|---|---|---|---|
| Valgate **mark** | `DRAW-IN` @ t+0.0 (chevrons build L→R) | settle | `FADE-OUT` + scale 1→1.04 @ t+2.5 |
| **"Valgate"** wordmark | `FADE-UP` @ t+0.7 (sets beside the mark) | hold | `FADE-OUT` with the mark |
| Background | — | — | map **`CROSSFADE`** rises behind @ t+2.6 |

*No tagline — saved for the close so it lands once, hard.*

---

**2 · Map — 0:03–0:10** · 3D map, 45° tilt throughout
- **In frame (essentials only):** the map + pins + the spine pin & callout + a slim stats strip.
  **Drop the app shell** — no left sidebar, no top nav, no search chrome. Map fills the frame.
- **On-screen text:** *"Your whole portfolio. One view."* (editorial headline, sets in a clean
  corner as the camera pulls back, then clears before the dive-in)

| Element | Move in | Behaviour | Move out |
|---|---|---|---|
| **Boeung Trabek pin** (spine) | already centred from the cut — `PULSE` from t+0.0 | stays subtly highlighted | anchor of the dive-in |
| Pin **callout** ("Boeung Trabek Corner Building · Phnom Penh") | `FADE-UP` @ t+0.3 | holds | `FADE-OUT` @ t+5.3 |
| **Camera** | `CAMERA pull-back` @ t+0.5 → t+3.5 | de-clustered reveal | `CAMERA push-in` (dive to pin) @ t+5.3 → 7.0 |
| Other **portfolio pins** | `STAGGER 60ms` `FADE-IN` as the camera widens (t+1.0–3.5) | individual, **no "21" cluster** | hold |
| **Stats strip** ($14.07M · 21 · 5 · 14) | `WHOOSH up` @ t+3.6; `$14.07M` runs `COUNT-UP` | holds | `FADE-OUT` during the dive |
| **Seam → Scene 3** | — | — | **`MATCH-CUT`**: the pin **opens into** Boeung Trabek's Documents screen @ t+7.0 |

---

**3 · Documents — 0:10–0:18** · Boeung Trabek's data room
- **In frame (essentials only):** one **floating Documents card** on the canvas — the 7 folder
  chips + the file list + the search field. **Drop** the property tab bar, breadcrumbs, left
  sidebar, header, and the Upload button. A component, not the page.
- **On-screen text:** *"Every document. Found in seconds."*

| Element | Move in | Behaviour | Move out |
|---|---|---|---|
| Screen + header ("Boeung Trabek Corner Building · Documents · 16 files") | `MATCH-CUT` settle @ t+0.0 | — | `CROSSFADE` @ t+7.5 |
| **7 folder chips** (Title·Legal·Financial·Rental·Estate·Insurance·Compliance) | `STAGGER 90ms` `WHOOSH-left` @ t+0.4 | — | hold |
| **File rows** (`Title_Deed_Boeung_Trabek.pdf`, `Hard_Title_Certificate.pdf`, `Mortgage_Agreement_ABA_Bank.pdf`, `Valuation_Report_2026.pdf`…) | `STAGGER 80ms` `FADE-UP` @ t+1.4 | reads as a full data room | hold |
| **Cursor** | `CURSOR-GLIDE` to search bar @ t+4.0 | parks | — |
| **Search field** | — | `TYPE-IN` **"Title Deed"** @ t+4.6 (hero typing) | — |
| **Camera** | `CAMERA pan` to the result row @ t+5.6 | — | — |
| `Title_Deed_Boeung_Trabek.pdf` row | `HIGHLIGHT` @ t+6.0 + lift 4px | the instant find | row carries the `CROSSFADE` out |
| **Seam → Scene 4** | — | — | `CROSSFADE`; Rentals KPI cards `WHOOSH` in @ t+7.6 |

---

**4 · Rentals — 0:18–0:25**
- **In frame (essentials only):** the **4 KPI cards + the occupancy heatmap**, composed on the
  canvas. **Drop** the sidebar, header, search, the Actions row, and the property-ranking table.
- **On-screen text:** *"Rent, arrears, occupancy — always live."*

| Element | Move in | Behaviour | Move out |
|---|---|---|---|
| **KPI cards** (4) | `STAGGER 90ms` `WHOOSH-up` @ t+0.0 | — | hold |
| **Income** $7,250/mo | `COUNT-UP` $0→$7,250 @ t+0.3 (**leads**) | — | — |
| **Occupancy** 26% | `COUNT-UP` 0→26% @ t+0.6 | — | — |
| **Vacancy** $25,375 · **Maintenance** $4,510 | `COUNT-UP` @ t+0.9 | — | — |
| **Camera** | `CAMERA drift` KPI row → heatmap @ t+2.5 | — | `CAMERA push` toward amber @ t+6.0 |
| **Heatmap cells** | `STAGGER 40ms` `BAR-GROW` @ t+3.0 | occupied = blue | hold |
| **2 expiring cells** (one is **Boeung Trabek**) | `PULSE` amber on @ t+4.0 | amber `PULSE` loop | hold the eye |
| **"Valgate Agent"** button | `CURSOR-GLIDE` + `TAP` @ t+6.2 | ripple | triggers the overlay |
| **Seam → Scene 5** | — | — | overlay `WHOOSH-up` over the dashboard @ t+6.6 |

---

**5 · Copilot — 0:25–0:37** · the hero, 12s — let it breathe
- **In frame (essentials only):** the **chat column** (query + answer) front and centre; the
  sessions/assets panels kept only as **dim context** at the edges. **Drop** the app behind the overlay.
- **On-screen text:** *"Ask anything. In plain English."* (sets as the overlay opens, then clears
  before the query types)

| Element | Move in | Behaviour | Move out |
|---|---|---|---|
| **Overlay** (frosted) | `WHOOSH-up` + scale 0.98→1 @ t+0.0 | — | flows away @ t+11.0 |
| **Side panels** (sessions left · assets right) | `FADE-IN` **dimmed/blurred** @ t+0.4 | held quiet (~50%) so focus stays on the chat | fade with overlay |
| **Query bubble** *"Which leases expire in the next 60 days?"* | `TYPE-IN` @ t+1.8 (hero typing, blue bubble top-right) | stays | — |
| **Thinking** indicator | `PULSE` @ t+3.8 (~1s) — **never a spinner** | — | replaced by answer |
| Answer **line 1 — Boeung Trabek** ($850, 28 Jun, 23 days) | `FADE-UP` @ t+4.8 + amber-dot `TAP`-pop | — | hold |
| Answer **lines 2–3** (Chak Angre A $1,800 · B $2,400) | `REVEAL-LINES` (170ms apart) + amber dots | callback to Scene 4 amber | hold |
| **Summary** "$5,050/mo up for renewal" | `FADE-UP` @ t+8.0 | — | hold |
| Rest | — | hold t+9.5 → 11.0, **Boeung Trabek on top** | overlay + app flow away → clean canvas |

---

**6 · Close — 0:37–0:40** · canvas `#f8f9ff`, dead centre
- **In frame (essentials only):** the wordmark lockup + tagline. Nothing else.
- **On-screen text:** *"Valgate. There when it matters."* (the tagline — its single landing).

| Element | Move in | Behaviour | Move out |
|---|---|---|---|
| **Lockup** (mark + "Valgate") | `FADE-UP` + scale 1.02→1 @ t+0.0 | settle centre | `FADE-OUT` @ t+2.4 |
| **Tagline** "There when it matters." | `FADE-UP` @ t+0.8 | its single landing | `FADE-OUT` with the lockup |
| Canvas | — | — | fade to `#f8f9ff` |

*No URL, no CTA — research posture; let it stop, confident.*

**Total: 40s.**

### Real data to use (from seed data — use these, don't invent)

- **Property names:** Boeung Trabek Corner Building · BKK1 Commercial Building 191D ·
  Chak Angre Building A / B · BKK1 Villa No.158 · Camko City Condo A105. (All Phnom Penh.)
- **The three expiring leases (Copilot's Scene 5 answer — soonest first, today = 2026-06-05):**
  1. Boeung Trabek Corner Building — Ground Floor — **$850/mo** — expires **28 Jun 2026** (23 days)
  2. Chak Angre Building A — Full Building — **$1,800/mo** — expires **30 Jun 2026** (25 days)
  3. Chak Angre Building B — Full Building — **$2,400/mo** — expires **25 Jul 2026** (50 days)
  Total **$5,050/mo** up for renewal; **2** of the 3 fall inside the next 30 days — which is why
  the Rentals heatmap (Scene 4) reads "2 expiring soon." The two scenes are intentionally consistent.
- **Document folder chips (PROP-0001):** Title · Legal · Financial · Rental · Estate · Insurance ·
  Compliance (7 folders, 16 files). Real file names: `Title_Deed_Boeung_Trabek.pdf`,
  `Hard_Title_Certificate.pdf`, `Sale_Purchase_Agreement_2025.pdf`, `Mortgage_Agreement_ABA_Bank.pdf`,
  `Valuation_Report_2026.pdf`, `Rent_Roll_Q1_2026.pdf`, `Beneficiary_Designation.pdf`, etc.
- **Rentals KPIs (real values):** Monthly gross income **$7,250**, Occupancy **26%**, Vacancy loss
  **$25,375**, Collection **0%**, Maintenance **$4,510**. Use these exact figures.

### Rules for Coding the Demo

- **No voiceover narration** — but **on-screen editorial text IS used** (one headline per scene,
  §5). Text on screen carries the story; no spoken narration.
- **Frame the function, not the page** — show only the essential component(s) per scene as a
  floating element on the canvas, not the full app shell (§5).
- **No UI chrome outside the product** — no browser tabs, address bars, or device frames.
- **Real data only.** Use the seed-data names and numbers above. No "Property 1," no lorem,
  no placeholder figures.
- **Never show a loading state.** Every screen is resolved and confident — no spinners,
  skeletons, or empty states.
- **Blue is precious** — actions and accents only, never as a background fill.
- **Motion:** `fade-slide-up` entrances, `opacity` + `transform` only, 80–100ms stagger,
  `cubic-bezier(0.22, 1, 0.36, 1)`. No bounce. Use CSS transitions or GSAP for timeline orchestration.
- **Copilot is the only scene allowed a longer hold** — 12s, let the answer breathe.
- **Copilot is a real screen** — the Valgate Agent overlay exists and is seeded; match
  `demo-screens/5-copilot.png` (three panels, the exact query and answer). Not a mockup.

---

## 5. Output & Motion Spec

| | |
|---|---|
| **Deliverable** | An **animated product walkthrough** — a web-native simulation of the app, built with HTML/CSS/React and orchestrated by HeyGen Hyperframes. |
| **Format** | **HeyGen Hyperframes** (Programmatic HTML-to-video rendering). |
| **Canvas** | **16:9 — 1920×1080.** |
| **Length** | **40s**, the six scenes in §4. |
| **Sound (optional)** | No narration. A light, upbeat bed + sparse UI cues — a crisp click on each cursor tap, a soft whoosh as panels slide in. Handled via the video renderer. |

This maps to the standard 1-minute-SaaS-demo arc, compressed to 40s:
**Hook / Intro** (Scenes 1–2) → **Proof: 3 core features** (Scenes 3–5: Documents · Rentals ·
Copilot) → **CTA** (Scene 6). Pacing is dynamic — never let a scene sit still.

### Build from DOM elements, not from pixels
The screenshots in `demo-screens/` are the **source of truth for data, layout, and brand — not
frames to trace literally.** For the HeyGen Hyperframes build, **rebuild each scene using clean React/HTML** and
*simplify*, the way a professional SaaS demo rebuilds the UI:
- Keep the **hero element** of the scene; strip secondary chrome (extra sidebar icons,
  breadcrumbs, scrollbars, idle placeholders). Hyper-focus on the "most prominent" line from §3.
- Stay on the real spacing and the §2 tokens — don't trace pixel-for-pixel, but stay on-grid and
  on-brand. A cleaner, calmer version of the real screen reads better than a literal one.

**Frame the function, not the page.** This is the biggest shift from the screenshots: the screens
show the *whole* dense SaaS page, but the video should **rarely show the full page**. Each scene
shows **only the element(s) that serve its one job** — isolate them as a **floating component on
the canvas** (a single Documents card, the KPI cards + heatmap, the chat column) and drop the rest
of the app shell (sidebar, top nav, breadcrumbs, unrelated panels). Like the reference: only the
essential UI for the function is on screen.

**Compose it editorially.** Each product scene = a **focused UI fragment + a short headline**,
arranged **asymmetrically** on the grid canvas (component on one side, text on the other / above) —
generous margins, lots of breathing room. Not a centred full-screen app.

### On-screen text (editorial messaging — yes, there IS text)
Like the reference, **big editorial type carries the story** — it's the narration substitute (we
still use *no voiceover*). One short headline per product scene, in Valgate's voice:

| Scene | On-screen line |
|---|---|
| 2 Map | *"Your whole portfolio. One view."* |
| 3 Documents | *"Every document. Found in seconds."* |
| 4 Rentals | *"Rent, arrears, occupancy — always live."* |
| 5 Copilot | *"Ask anything. In plain English."* |
| 6 Close | *"Valgate. There when it matters."* |

- **Type:** the **display face** (Bricolage / Geist display), **extrabold, `tracking-tight`**, ink
  `#121c28` on the canvas; large but not shouting. Weight does the work, not colour. One key word
  may carry **precious blue** if it earns it (e.g. *"**Ask anything.**"*).
- **Placement:** a consistent editorial zone (e.g. upper-left or beside the component), inside the
  safe frame, never overlapping the UI it describes.
- **Motion:** snappy entrance — **word-by-word** `FADE-UP` (~10–15 frames orchestrated via CSS/JS), dwell ~2s, then `FADE-OUT` before the scene's action peaks. It frames the moment, then
  gets out of the way.
- **Rhythm:** one line per scene — never two competing lines, never a paragraph. Specific and
  confident; cut filler (§2 voice).

### Motion technique (applies to every scene)
- **Faked cursor.** A vector cursor glides along smooth **bezier curves** to each target. On tap:
  a subtle **scale-bounce** (compress → pop) + a **ripple ring**. Never jagged real-mouse paths.
- **Ease everything.** Elements enter fast and **decelerate** into place using
  `cubic-bezier(0.22, 1, 0.36, 1)` (the in-app `fade-slide-up`). Never linear. No bounce/elastic.
- **Virtual camera.** Don't sit static — **zoom** into the field being shown, **pan** across to
  reveal the result on the other side of the screen. Keep the frame alive.
- **Smart data populating.** KPI numbers **count up from 0** to their final value
  ($7,250, 26%); bars/graphs **scale up from zero**; text fields fill **near-instantly** —
  *except* the two hero typing moments (the Copilot query and the "Title Deed" search), which
  type visibly for emphasis.
- **Transition-rich.** Heavy element-level motion: staggered fade-slide of cards/rows
  (80–100ms), panels **whoosh** in from an edge, the outgoing scene's elements fade/flow out as
  the next flows in. **Crossfade** scene-to-scene; a **match-cut** from the Scene 2 map pin into
  the property it represents is a strong seam.

### Motion vocabulary (named moves — reuse these)

Every element enters, behaves, and exits using one of these presets. Default easing **`E` =
`cubic-bezier(0.22, 1, 0.36, 1)`**; animate **opacity + transform only**. §4 references these by
name with a scene-relative timecode (e.g. `FADE-UP @ t+0.7`).

| Name | What it does | Params |
|---|---|---|
| **DRAW-IN** | Sub-shapes reveal in sequence (the mark's 3 chevrons L→R) | 600ms · E |
| **FADE-UP** | opacity 0→1 + translateY +14px→0 | 360ms · E |
| **FADE-IN / FADE-OUT** | opacity only | 300ms · E |
| **WHOOSH ‹dir›** | translate from off-edge (~72px) → 0 + fade in | 420ms · E · soft whoosh SFX |
| **STAGGER ‹ms›** | same move down a group, delay between items | default 90ms |
| **COUNT-UP** | number rolls 0 → value, tabular figures, no layout shift | 900ms · ease-out |
| **BAR-GROW** | scaleY 0→1 from baseline + fade in (chart bars, heatmap cells) | 600ms · E |
| **CURSOR-GLIDE** | vector cursor travels a curved **bezier** to its target | 600ms · ease-in-out |
| **TAP** | on arrival: target scale 1→0.96→1 (compress→pop) + ripple ring (scale 0→1, opacity .4→0) | 180 / 400ms · click SFX |
| **TYPE-IN** | characters appear ~55ms each + blinking caret — **hero typing only**; all other text fills instantly | per char |
| **HIGHLIGHT** | surface fill tweens to blue-tint `#eef4ff` + 1px `#d8e3f4` border | 300ms · E |
| **PULSE** | gentle scale 1↔1.06 + opacity oscillation — "alive" accents (map pin, amber cell) | 650ms loop |
| **SPRING-POP** | a tactile snap for **small accents only** (amber dots, a check, the highlight): scale 0 → **104%** → 100% | ~150ms · the *one* allowed overshoot (§7) |
| **REVEAL-LINES** | list items FADE-UP one after another (Copilot answer) | 170ms apart |
| **CAMERA ‹move›** | zoom / pan / push-in / pull-back — slow-in, slow-out | 1.5–3s · ease-in-out |
| **CROSSFADE** | default scene cut — outgoing opacity→0 as incoming →1 | 400ms |
| **MATCH-CUT** | a shared element scales/morphs across a cut so it reads continuous (pin → screen) | — |

> **Per-scene choreography** (which element uses which move, when) lives in §4's scene tables —
> that's the master. §5 is the global *how*; §4 is the *what, when & in what order*.

### The wordmark (Scenes 1 & 6)
Lockup = **`demo-screens/0-valgate-mark.svg`** (the blue mark) + the word **"Valgate"** set in the
display face, **extrabold**, letter-spacing **`-0.6px`**, in heading ink `#121c28` on the
`#f8f9ff` canvas. Tagline beneath: *"There when it matters."*

---

## 6. Pre-flight QA — check before exporting

Animated UI demos break in predictable ways. Run this list against **every scene** (and scrub the
final render frame-by-frame at the transitions). Most failures are **layering** — an element on
the wrong z-level so text hides behind a card, or the cursor slips under the UI.

### Layering & z-order (the #1 source of bugs)
- [ ] **Text is always above its own background** — no label, KPI value, file name, or answer line
  rendered *behind* its card, chip, image, or another panel. Check during entrances, when two
  elements briefly overlap mid-stagger.
- [ ] **The faked cursor is the top-most layer** in the whole comp — above every panel, overlay,
  and modal. Its ripple sits just beneath the cursor tip but above the UI.
- [ ] **Stacking order matches reality:** map < pins < pin callout < stats strip < cursor;
  app < dimmed side-panels < Copilot chat < typed bubbles < cursor.
- [ ] **Copilot overlay** sits above the whole app; the dimmed sessions/assets panels are *behind*
  the chat column but *above* the blurred app underneath.
- [ ] No element animates **from off-canvas straight through** another element in a way that
  overlaps illegibly — enter from just outside its own slot, not across the screen.

### Text & numbers
- [ ] No text **clipped or truncated** by its container; nothing runs past a card edge.
- [ ] `COUNT-UP` numbers use **tabular figures** so width doesn't jitter or reflow mid-roll.
- [ ] Contrast holds: ink `#121c28` on light surfaces; **never** light/white text on the
  `#f8f9ff` canvas or on a white card.
- [ ] The `TYPE-IN` caret doesn't overlap the next character; the typed string fits its field.

### Layout & frame
- [ ] Everything lives inside the **1920×1080 safe frame**; keep ~5% (~96px) margin so key text and
  the wordmark never touch the edges.
- [ ] Staggered cards/rows/chips **don't collide or overlap** as they settle.
- [ ] The vector rebuild stays **on-grid and on the §2 spacing** — no drifted alignment.

### Motion correctness
- [ ] **Only `opacity` + `transform`** animate — no width/height/padding/margin (prevents reflow jank).
- [ ] Everything is **eased** (`cubic-bezier(0.22,1,0.36,1)`); nothing linear; no bounce/elastic.
- [ ] **Stagger order follows reading order** (top→bottom, left→right), never random.
- [ ] A `COUNT-UP` / `TYPE-IN` **finishes before the camera leaves it** — no value still rolling
  off-frame.
- [ ] Only **one hero typing moment at a time** (search in S3, query in S5 — never overlapping).
- [ ] No element **flashes** (visible for a frame at opacity 0→1 with no transform) or pops without easing.

### State & brand correctness
- [ ] **No loading states** anywhere — no spinners, skeletons, shimmer, or empty states.
- [ ] **Real data only**, matching §4 exactly (the three leases, $7,250 / 26% / $25,375 / $4,510,
  16 files / 7 folders). No placeholder names or numbers.
- [ ] **Blue is never a background fill**; **amber** appears *only* on the 2 expiring heatmap cells
  (S4) and the 3 answer dots (S5).
- [ ] The **spine property** reads identically everywhere it appears (name, $850, Ground Floor, 28 Jun).

### Continuity & timing
- [ ] `MATCH-CUT` elements share **size and position** across the cut (the S2 pin lands where the
  Documents screen opens).
- [ ] Scene durations sum to **exactly 40s**; the Copilot hold (S5) isn't rushed; no dead air.
- [ ] Each scene's **exit** and the next scene's **entrance** are choreographed as one move (no
  hard cut unless intended).

### Export
- [ ] **HeyGen HTML-to-video render, 16:9 1920×1080**, DOM elements (no baked-in raster screenshots).
- [ ] Renders correctly via the HeyGen framework — no missing elements, no layout shifts during capture.
- [ ] Transform origins are set where the motion implies (scale-from-center for the lockup,
  scale-from-baseline for `BAR-GROW`).

---

## 7. Production & motion craft — the polish bar

Reference: Anthropic's *Cowork* launch film — an **"Organic Editorial / Minimalist Tactility"**
look. We are **not** adopting its palette (warm cream, terracotta, editorial serif) — that's a
different brand; Valgate stays cool and precise (§2). What we take is its **craft**: the physical,
tactile motion and the production discipline that make a demo feel hand-built, not auto-generated.
This is the bar — a flat, generic generation that ignores this section is a fail.

### Surface — translate the craft, keep our brand
| Reference move | Valgate version |
|---|---|
| Warm cream canvas + faint graph-paper grid | Keep `#f8f9ff`; ground scenes on a **very faint cool grid** (1px lines, `#d8e3f4` at ~6–8% opacity) so the canvas reads as a workspace — Open/Close especially. *Optional — see decision below.* |
| Soft diffused drop shadows (blur 20–24px, 5–8%) | Floating cards & the Copilot overlay use a **soft diffused shadow** (≈ `0 12px 32px rgba(18,28,40,0.08)`) over the page's base `0 1px 4px` — layered depth, never glossy. |
| Editorial serif headings | Stay on Geist / Bricolage display; get "premium" from **weight contrast + generous whitespace**, not a serif. |
| Terracotta "spark" accent | Our accent is **precious blue**; amber only for the expiring state. |

### Motion physics — snappy & kinetic, not robotic
- **Snappy text.** Typing is **fast and crisp** — characters/words pop in over ~200-300ms. The two hero `TYPE-IN` moments
  use this rhythm; it keeps the 40s driving. Implement this via precise JS timing or GSAP `stagger`.
- **Explosive ease-out.** Cards and camera **blast out of their start position and decelerate**
  over the final ~60%. That's our `cubic-bezier(0.22, 1, 0.36, 1)` intent. Never linear.
- **A touch of tactility — `SPRING-POP`.** Completion accents (the amber answer dots, a check, the
  search highlight) may **overshoot subtly, scale 0 → 104% → 100%**. This is a deliberate, *tiny*
  exception to §2's "no bounce" — **small accent elements only**, never cards, panels, or the camera.
- **Intentional camera panning.** Beyond zoom/push, **pan horizontally across the workspace** to
  shift focus from an action to its result (typing → highlighted file; KPI row → heatmap) — the way
  the reference slides between a user doing something and the app responding.

### Foley sound (still no narration)
Sound is half the tactility. Layer clean, real-world foley **under** a light bed, locked to keyframes:
- **Mechanical key clicks** on each `TYPE-IN` character (sparse, soft).
- **Soft wooden / paper pop** on `TAP`, `SPRING-POP`, completions, and the amber dots.
- **Paper-rustle swoosh** on every `WHOOSH` / panel slide / scene `CROSSFADE`.
- Mix all cues **below** the bed — tactile, never harsh. No voiceover.

### Production pipeline (how it's built programmatically)
1. **Build the DOM scenes in React/HTML** on the §2 grid — white cards, 8px+ radius, soft diffused shadow using Tailwind/CSS.
2. **Implement motion with CSS/GSAP** ensuring crisp text rendering and precise layouts.
3. **Snappy text** via JS timing functions or GSAP staggers.
4. **Heavy easing** via `cubic-bezier(0.22, 1, 0.36, 1)` on every card & camera move.
5. **Foley pass** — trigger audio elements or use the renderer's audio capabilities aligned to timeline events.
6. **Export Video** using HeyGen Hyperframes (HTML-to-video).

### The "Cowork" Design Rules (Critical)
To achieve the premium look of the Anthropic "Cowork" reference, strictly adhere to these design mechanics:
- **Never show the entire application window.** Treat individual SaaS elements as standalone physical "blocks" floating on an infinite grid. Panning the camera across this grid controls the viewer's focus.
- **The Core SaaS Elements:**
  - **Chat Input & AI Feed:** Clean, borderless white card, soft drop shadow.
  - **Source File / Document Pills:** Small, neat horizontal pills with a tiny icon and sans-serif file name. They appear instantly (no progress bars).
  - **Actionable Checklist / Task Blocks:** Vertical stack of text rows with empty circular checkboxes. Checkmarks snap in instantly, and the row fades to a muted grey to show completion.
  - **Modal "Popup" Alert:** Compact rectangular card appearing over other elements with a title, description, and two buttons ("Approve"/"Cancel").
- **The Text Elements (Split into two buckets):**
  - **Type A (Narrative Text):** Tells the story (Human Voice). Large, elegant Serif font directly on the canvas background. Fades or slides up smoothly and slowly.
  - **Type B (Interactive UI Text):** Executes the tasks (App Voice). Smaller, crisp Sans-Serif font trapped inside the white SaaS cards. Pops into existence instantly (line-by-line or word-by-word) mimicking rapid computation.
- **Orchestration:** Use a "Trigger and Response" mechanic. Animate isolated components and pan the camera from one floating card to the next as the software executes its workflow.

> **Decision for the designer:** keep Valgate **strictly cool/precise** (recommended), or warm the
> neutrals *slightly* toward the reference's editorial calm? Default = stay on-brand. The **craft
> above** — snappy text, explosive easing, tactile pops, camera pans, foley — is what closes the
> gap to the reference, **not** the palette.

---

## 8. Done when

- A developer with no prior Valgate knowledge could code each of the six scenes from §4 + §5 alone.
- The visuals are on-brand: correct colours (precious blue, `#f8f9ff` canvas, tinted neutrals),
  Geist type with weight contrast, `rounded-xl` soft-shadow cards, no nested cards.
- Every screen reference in §3 points to a real file and matches its screenshot in `demo-screens/`.
- The scene table has no ambiguity — timing, layout, data, and motion intent are all specified.
- The deliverable is unambiguous: **HeyGen Hyperframes programmatic video, 16:9, 40s**, built with simplified DOM elements (not raster screenshots), with faked-cursor / eased / camera-driven / transition-rich motion per §5.
- It hits the **§7 craft bar** — snappy text, explosive ease-out, tactile `SPRING-POP` accents,
  intentional camera pans, soft diffused depth, and foley sound. Not flat, not generic.
