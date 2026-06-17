# Demo Screens — Visual Anchors for Claude Design

Real screenshots of the live Valgate product, captured at 1440×900 (retina @2x, light mode,
animations resolved). These are the **visual target** for the 40-second demo — pair them with
`../product-demo-context.md`, which carries the tokens, timing, and scene script.

> All data shown is real seed data (a Phnom Penh, Cambodia portfolio). Match these names and
> numbers in the generated scenes — don't invent placeholders.
>
> **Deliverable is Lottie, 16:9, 40s** — see §5 "Output & Motion Spec" in
> `../product-demo-context.md`. These screenshots are the source of truth for **data, layout, and
> brand** — for the Lottie build, rebuild each scene as **simplified vector**, don't animate the
> raw screenshot.

**`0-valgate-mark.svg`** — the real Valgate brand mark (blue diamond), for Scenes 1 & 6. The
wordmark lockup = this mark + "Valgate" in the display face, extrabold, `-0.6px` tracking,
ink `#121c28` on the `#f8f9ff` canvas, tagline *"There when it matters."* beneath.

| File | Screen | Anchors scene | What's real in it |
|---|---|---|---|
| `1-home-map.png` | Home / Portfolio map | **Scene 2 — Map** | Full Cambodia map, clustered pin (21 properties), portfolio strip: **$14.07M · 21 properties · 5 rented · 14 vacant · 54% avg progress** |
| `2-portfolio.png` | Portfolio dashboard | context / Scene 2 | KPI cards (21 properties, $14.07M, $5K/mo income, 24% occupancy) + property table with real names, statuses, Progress % |
| `3-documents.png` | Documents (PROP-0001) | **Scene 3 — Documents** | **16 files across 7 folders** (Title / Legal / Financial / Rental / Estate / Insurance / Compliance). Real PDFs: `Title_Deed_Boeung_Trabek.pdf`, `Hard_Title_Certificate.pdf`, `Mortgage_Agreement_ABA_Bank.pdf`, `Valuation_Report_2026.pdf`, … — a "data-room ready" set |
| `4-rentals.png` | Rentals dashboard | **Scene 4 — Rentals** | KPIs (Income **$7,250**, Occupancy **26%**, Vacancy loss **$25,375**, Maintenance **$4,510**), Property Ranking, occupancy heatmap reading **"2 expiring soon"** (2 amber cells) |
| `5-copilot.png` | **Valgate Agent (AI overlay)** | **Scene 5 — Copilot** | The real 3-panel overlay: session sidebar · chat · Workspace Assets. Shows the exact Scene-5 query *"Which leases expire in the next 60 days?"* and the answer listing **3 leases ($5,050/mo, 2 within 30 days)** |

Scenes 1 and 6 are the wordmark on the `#f8f9ff` canvas — no screenshot needed (text on white).

### Narrative spine (deliberate)

The walkthrough follows **one property — Boeung Trabek Corner Building (Phnom Penh)** — end to
end: its pin in `1-home-map.png`, its 16-file data room in `3-documents.png`, an amber "expiring"
cell in `4-rentals.png`, and the **first** lease in Copilot's answer in `5-copilot.png`. When
generating, keep it the through-line — same property, four angles.

### Cross-screen consistency (deliberate)

Scenes 4 and 5 tell the same lease story from two angles: the Rentals heatmap reads **"2 expiring
soon"** (its window is 30 days) while Copilot answers **"3 in the next 60 days"** — two of the
three fall inside 30 days, so the numbers agree. This is wired from the same seed leases
(Boeung Trabek $850 · Chak Angre A $1,800 · Chak Angre B $2,400), not coincidental.

### How they were captured (for re-shooting)

`npm run dev` with the site-gate disabled (`SITE_PASSWORD=""`), then a headless Chromium pass:
- `/` → home/map
- `/portfolio` → portfolio (dismiss the first-visit "What is Progress?" modal with Escape)
- `/property/PROP-0001/documents` → documents
- `/rental` → rentals
- `/rental` then click the **"Valgate Agent"** sidebar button (`button[title="Valgate Agent"]`)
  → the AI overlay (opens to the newest session, `AI-0012`)

Seed data backing these shots lives in `public/data/users/demo-user/` — PROP-0001 documents
(`documents/DOC-0016…0027`, `folders/FLDR-0013…0016`), the three patched leases
(`leases/LEASE-0001 / 0003 / 0004`), and the Copilot session (`ai-sessions/AI-0012`,
`ai-messages/AIM-0066 / 0067`).
