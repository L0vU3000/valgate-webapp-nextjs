# Prompt for Claude Design — Valgate Annotated Presenter Script

> Paste everything below the line into Claude Design. Attach the inputs listed in §2 first.
> The output is a **printable two-column teleprompter** that pairs each deck slide with the exact
> words to say over it, annotated for pacing, delivery, and live-demo stagecraft.

---

**Build me a printable, annotated presenter script for the Valgate pitch deck.** It is a *run-of-show
teleprompter* — a document the presenter holds (or runs on a second screen) that pairs **each of the
18 slides** with **the exact words to say over it**, plus margin annotations for timing, delivery,
and live-demo actions. This is a companion to the deck, not the deck itself.

The two source documents are attached: the **presenter script** (`pitch-deck-script.md`, the spoken
words and notes) and the **18 slide images** (the deck). Your job is to *weave them together* into one
annotated artifact, following the spec below exactly.

---

## 1. What to build (format)

- A **single self-contained HTML file**, print-optimised, that exports to a clean PDF.
- **Page setup:** US Letter **landscape** (11in × 8.5in), ~0.5in margins. `@media print` rules so it
  paginates cleanly; `page-break-inside: avoid` on every slide-row so a row never splits across pages.
- **Structure:**
  - **Page 1 — Cover + control panel:** title (“Valgate — Annotated Presenter Script”), the total
    runtime (**20 minutes**), a compact **pacing-checkpoint strip** (the cumulative-time milestones
    from §3 so the presenter can glance at a clock and know if they’re behind), and the **annotation
    legend** (§5).
  - **Then one row per slide — 18 rows total**, in deck order, grouped under the **3 Act dividers**
    (Act 1 / Act 2 / Act 3 from §3). The row, not the section, is the unit — because the presenter
    advances one slide at a time.
- This is a **two-column row** (see §4 for the layout of a single row).

---

## 2. Inputs to attach

1. **`pitch-deck-script.md`** — the presenter script (spoken words + Notes + Tips). **This is the
   source of the words.** Its structure per section: `_framing line_` → `**On slide:**` description →
   `**Note:**` content checklist → `*Tip:*` stagecraft → `> "spoken words"`.
2. **The 18 slide images**, one per slide, **in the correct current order** (§3). 

> ⚠ **Image note (important):** the existing PNG exports named `09-documents`, `10-rentals`,
> `11-map` are from an **older build** — they show the wrong slide numbers (Map baked as “11 / 18”)
> and stale data (“14 properties” instead of 24). **Re-export the 18 slides from the current
> `Valgate Deck V2 - Standalone.html`** before attaching, so thumbnails match the live deck. If you
> must reuse the old PNGs, remap them per §3 (the file `11-map.png` is really slide **09**,
> `09-documents.png` is slide **10**, `10-rentals.png` is slide **11**) and ignore their baked-in
> counters.

---

## 3. The run-of-show — authoritative mapping & 20-minute pacing

This table is the spine. The script has **13 sections**; the deck has **18 slides** — they do **not**
map 1:1. Use the slide numbers and timings below exactly. “Cumulative” is where the clock should read
when that slide *ends*.

| # | Slide | Act | Script § (source of words) | Target | Cumulative |
|---|---|---|---|---|---|
| 01 | Cover | 1 | 00 Personal Intro | 0:30 | 0:30 |
| 02 | AIVO | 1 | 01 Who We Are | 0:45 | 1:15 |
| 03 | Story | 1 | 02 Origin Story | 1:00 | 2:15 |
| 04 | Scatter | 1 | 03 The Problem | 1:30 | 3:45 |
| 05 | USP | 1→2 | 04 What Valgate Is — **USP paragraph only** | 0:45 | 4:30 |
| 06 | Product Today | 2 | 04 — **“Organise / Track / Prove”** block + the “where we’re heading — Think·Act·Scale” teaser on the floor | 1:15 | 5:45 |
| 07 | Foundation | 2 | 04 — **⚠ no spoken words in script → draft a bridge** (§6) | 0:30 | 6:15 |
| 08 | Eight Areas | 2 | 04 — **⚠ no spoken words in script → draft a bridge** (§6) | 0:30 | 6:45 |
| 09 | Map | 2 | 05 Map | 0:45 | 7:30 |
| 10 | Documents | 2 | 06 Documents *(longest demo — most care)* | 1:45 | 9:15 |
| 11 | Rentals | 2 | 07 Rentals | 1:30 | 10:45 |
| 12 | Copilot | 2 | 08 Copilot *(climax — protect the pause)* | 1:45 | 12:30 |
| 13 | Structure | 3 | 09 Two-Sided Platform | 1:15 | 13:45 |
| 14 | Security | 3 | 10 Security & Philosophy — **Security half** | 1:00 | 14:45 |
| 15 | Philosophy | 3 | 10 — **Philosophy half** | 1:00 | 15:45 |
| 16 | Verify | 3 | 11 Where It’s Going — **Valgate Verified words, part 1** | 0:45 | 16:30 |
| 17 | Standard | 3 | 11 — **Valgate Verified words, part 2 (the Stripe analogy)** | 0:45 | 17:15 |
| 18 | Close | 3 | 12 Close → **then open the conversation** | 0:45 + open | 18:00 |

**Scripted delivery ≈ 18:00.** The remaining ~2 minutes (to 20:00) and beyond belong to the **closing
conversation** that slide 18 opens — mark this clearly as open-ended, not scripted.

**Two distribution rules to apply when splitting a script section across multiple slides:**
- **Section 04 (What Valgate Is) covers four slides (05–08).** Put the USP paragraph on **05**, the
  “Organise / Track / Prove” block on **06**, and draft bridges for **07** and **08** (§6).
- **Sections 10 and 11 are already split** in the script (Security/Philosophy; Verified part 1/2) —
  honour those splits across slides 14/15 and 16/17.

---

## 4. Layout of a single slide-row (the core repeating unit)

Two columns. **Left ≈ 38%, right ≈ 62%.**

**LEFT column — “what the audience sees”:**
- The **slide image** (16:9), framed with a 1px hairline.
- Below it, a compact meta block:
  - Big slide number **`09 / 18`** (Archivo, tabular figures).
  - Slide title (e.g. “Map”) and **Act label**.
  - **Pacing line:** `⏱ 0:45 · clock 7:30` (target duration · cumulative).
  - A small **tone chip** for this beat (e.g. *Warm · Serious · Confident · Invitational*).

**RIGHT column — “what the presenter does”:**
1. **Framing line** at the top — the script’s `_italic line_`, set in **Newsreader italic, muted** —
   as the beat’s intent.
2. **Note checklist** — the script’s `**Note:**` bullets, rendered as a **compact, visually secondary
   sidebar** titled “MUST LAND” (this is the *content checklist*, not words to read). Small, muted,
   scannable.
3. **Spoken words** — the script’s `> "..."` lines, set as the **largest, most readable text on the
   row** (≥18px). This is the teleprompter copy. Preserve line breaks and the speaker’s flow.
4. **Inline annotation chips** layered onto the spoken words (see §5 for the palette):
   - **▸ ADVANCE** cue where the presenter should click to the next slide.
   - **★ anchor lines** — phrases to say verbatim, emphasised (accent weight/underline). Pull these
     from the script’s most quotable lines (e.g. *“Same records. Different jobs to do.”*, *“we’re its
     first user.”*, *“Five properties, a few minutes. Two hundred, your whole week.”*).
   - **⏸ PAUSE / beat** markers where the script says to pause (e.g. slide 12’s
     `[Let it answer. Pause.]`).
   - **▶ DEMO ACTION** callouts on the live-app slides (09–12) — the physical actions (“type the
     question”, “scroll the folder tree”, “pull up to portfolio view”) as accent-tint boxes,
     visually distinct from words to *speak*.
5. **Tip / objection sidebar** at the bottom of the row — the script’s `*Tip:*` content, as a muted
   “IF / THEN” sidebar (objection handling, stagecraft, read-the-room cues). Don’t inline it with the
   spoken words; it’s glance-down reference.

---

## 5. Visual design system

**Match the *deck’s* own system (NOT the webapp).** This document should feel like a calm,
premium companion to the slides.

- **Type:** **Archivo** (all UI, headings, numbers, labels) + **Newsreader italic** (framing lines,
  editorial accents only). Google Fonts.
- **Colour tokens (exact):** `--accent #006AFF` · `--accent-deep #003A8C` ·
  `--accent-tint #EAF2FF` / `#F3F7FF` · `--ink #10121A` · `--ink-soft #3A4150` · `--muted #6B7280` ·
  `--hair #D8DCE3` / `#E9ECF1` · `--paper #FBFBFC` · `--bg #FFFFFF`. Warning amber `#F59E0B` is
  reserved **only** for ⚠ flags (drafts, gaps, mismatches).
- **Craft:** generous, asymmetric whitespace; 1px hairlines over heavy shadows; weight contrast over
  colour; **precious blue — accents only, never a background wash**. Airbnb-deck calm, not a busy
  dashboard. Tabular figures on all numbers.

**Annotation legend (print this on page 1, and keep the palette limited and consistent):**

| Marker | Meaning | Style |
|---|---|---|
| **▸ ADVANCE** | click to next slide | accent `#006AFF`, bold, tracked |
| **★** | say this line **verbatim** | accent underline / heavier weight on the phrase |
| **⏸ PAUSE** | hold the beat | small muted pill |
| **▶ DEMO** | live-app action (do, don’t say) | accent-tint `#EAF2FF` box, `#003A8C` text |
| **MUST LAND** | content checklist (Note) | muted sidebar, secondary |
| **IF / THEN** | objection / room handling (Tip) | muted sidebar, bottom of row |
| **⏱** | pacing (target · cumulative clock) | muted, tabular |
| **⚠** | draft / gap / mismatch — review before presenting | amber `#F59E0B` |

---

## 6. Handle the gaps explicitly (don’t paper over them)

The script and deck were authored semi-independently. Surface every seam:

1. **Orphan slides 07 (Foundation) & 08 (Eight Areas)** — the script has **no spoken words** for
   these. **Draft a short bridge** (1–2 sentences each) from the slide’s own `On slide` description in
   the script (Foundation = “your whole portfolio the moment you log in”; Eight Areas = “everything
   about a property, in one place”). **Badge every drafted line with `⚠ DRAFT — review`** so it’s
   obviously not yet approved copy. Keep these short — they’re connective tissue, 0:30 each.
2. **Phantom “Think · Act · Scale”** — script §11 contains a Think/Act/Scale narrative that has **no
   dedicated slide** in the deck (Act 3 goes Structure → Security → Philosophy → Verify → Standard →
   Close). Place that narrative as a **⚠ verbal-bridge annotation leading into slide 16 (Verify)** —
   words spoken during the advance, with no slide of its own — and add a one-line ⚠ note telling the
   presenter to *deliver it as a bridge or cut it*. Do not invent a slide for it.
3. **Content mismatches** — where the words the presenter speaks describe something **different from
   what the attached slide image shows**, add a small `⚠ mismatch` flag on that row naming the
   discrepancy (e.g. if slide 03’s art still says “This was my problem first” but the script tells the
   *family* origin story). Flag only; don’t rewrite the slide.

---

## 7. Output & QA

Return **one self-contained HTML file** (inline CSS, Google Fonts via `<link>`). Before handing back,
confirm:

- [ ] **18 rows**, deck order, grouped under Act 1 / Act 2 / Act 3 dividers.
- [ ] Every row pairs the **correct slide image** with the **correct script words** per §3 (Map = 09,
      Documents = 10, Rentals = 11 — current order).
- [ ] Pacing line on every row; cumulative clock matches §3; page-1 checkpoint strip present.
- [ ] Spoken words are the largest text; Note (“MUST LAND”) and Tip (“IF / THEN”) are clearly
      secondary; demo actions on slides 09–12 are visually distinct from spoken words.
- [ ] Anchor lines (★) and pause (⏸) markers present where the script signals them; ▸ ADVANCE cue on
      each row.
- [ ] Orphans 07 & 08 carry **drafted, ⚠-badged** bridges; the Think/Act/Scale phantom is a ⚠ verbal
      bridge into 16, not a slide; content mismatches flagged.
- [ ] Brand: Archivo + Newsreader; `#006AFF` sparingly; amber only on ⚠; calm, premium, print-clean.
- [ ] `page-break-inside: avoid` holds — no row splits across a printed page; exports to a tidy PDF.

**Done when:** a presenter who has never seen the deck could run the full 20-minute pitch from this
one document — knowing, on every slide, what’s on screen, what to say, what to *do*, how long to spend,
and how to handle pushback — with every script-vs-deck seam visibly flagged rather than hidden.
