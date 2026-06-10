# Valgate Deck V2 — Slide Edit Prompt for Claude Design

> Paste this document into Claude Design. It contains 7 precise edits to align the deck with the presenter script. Make them in the order listed.

---

I need you to edit the HTML file `Valgate Deck V2 - Standalone.html`. The deck uses a `<deck-stage>` element containing 18 `<section class="slide ...">` elements. Each section has a hardcoded slide number in the form `<em>XX</em> &nbsp;/&nbsp; 18`. Make the following changes exactly as described.

---

## EDIT 1 — Slide 03 `s-story`: Replace the origin story

**Why:** The current slide tells a solo personal story ("This was my problem first"). The script's origin story is about a family — parents entrusting their life's work to the next generation.

Find the section `<!-- 03 — STORY -->` (`class="slide s-story"`).

Replace the `<h1 class="head">` content:
- **Old:** `This was my problem first.`
- **New:** `As our parents get older, they begin to entrust us with their life's work.`
- Remove any `<span class="ac">` accent on this h1. No accent word in the new headline.

Replace the `<p class="subhead">` paragraph(s) with two new paragraphs:
- **Para 1:** `They have a way of doing things that has always worked for them. But we're different — we grew up with technology, and the world we know isn't the world they built in.`
- **Para 2:** `We have a responsibility to honour how they've always done things while adapting their life's work to the world we now live in.`

Replace the footer signature line:
- **Old:** `Valgate's first user is the person who built it`
- **New:** `One family. Then another. The record was never ready when it mattered.`

---

## EDIT 2 — Slide 04 `s-scatter`: Replace "Scattered. Distrusted."

**Why:** The headline is an abstract label. The script tells concrete time-based scenarios. Keep the scattered scraps visual — only the text changes.

Find the section `<!-- 04 — SCATTER -->` (`class="slide s-scatter"`).

Replace the `<h1 class="head">` content:
- **Old:** `Scattered. <span class="ac">Distrusted.</span>`
- **New:** `The record was never ready when it mattered.`
- No `<span class="ac">` on the new headline.

Add a new `<p class="subhead">` immediately below the `<h1>`, before the `.scrap-field` div:
```
"Where's the lease?" Fifteen minutes of folder-digging.
"Did we collect rent?" Fifteen minutes scrolling Telegram.
Five properties — a few minutes. Two hundred — your whole week.
```
Style this paragraph with `style="max-width:640px;"` so it doesn't overlap the scrap visual. If space is tight, keep the headline change only and omit this paragraph.

---

## EDIT 3 — Slide 06 `s-today`: Fix headline tense + add Think/Act/Scale teaser

**Why:** The headline uses past participles ("Organised. Tracked. Proved.") but the script and column headers use the imperative form. The script also introduces "Think. Act. Scale." as a teaser on this slide.

Find the section `<!-- 06 — PRODUCT TODAY -->` (`class="slide s-today"`).

**3a. Fix the eyebrow:**
- **Old:** `What exists today`
- **New:** `What Valgate does today`

**3b. Fix the headline:**
- **Old:** `Organised. Tracked. <span class="ac">Proved.</span>`
- **New:** `Organise. Track. <span class="ac">Prove.</span>`

**3c. Add a roadmap teaser below the existing `<p class="floor-caption">`:**
Add a second `<p>` after the floor caption, styled with `style="margin-top:14px; font-size:12px; color:var(--muted); letter-spacing:0.02em;"`:
```
And where we're heading — Think. Act. Scale. We'll come back to that.
```

---

## EDIT 4 — Reorder slides 09–11: Map must come before Documents

**Why:** The script calls the Map slide the "first live screen" shown in the demo. Currently it appears after Documents and Rentals. Correct order: Map → Documents → Rentals.

Move the entire `<!-- 11 — MAP -->` section block (from its opening comment to just before `<!-- 12 — COPILOT -->`) and insert it between `<!-- 08 — EIGHT AREAS -->` and `<!-- 09 — DOCUMENTS -->`.

After moving, update the three hardcoded slide numbers:

| Slide class | Old number | New number |
|---|---|---|
| `s-map` | `<em>11</em>` | `<em>09</em>` |
| `s-docs` | `<em>09</em>` | `<em>10</em>` |
| `s-rentals` | `<em>10</em>` | `<em>11</em>` |

Also update the HTML comment labels above each section:
- `<!-- 09 — MAP -->`
- `<!-- 10 — DOCUMENTS -->`
- `<!-- 11 — RENTALS -->`

The total slide count (`/ 18`) does not change.

---

## EDIT 5 — Slide 05 `s-usp`: Remove the duplicate triad, sharpen as a tagline bridge

**Why:** The current slide has a 3-column triad (One place / Add fast / Made to prove) that duplicates the content already shown on Slide 06 (s-today). This slide should be a concise tagline moment that bridges the problem and the product.

Find the section `<!-- 05 — USP -->` (`class="slide s-usp"`).

**5a. Change the eyebrow:**
- **Old:** `What Valgate is`
- **New:** `The answer`

**5b. Keep the `<h1>` unchanged:** `Everything you own, in one place you can trust.`

**5c. Remove the 3-column triad** (the `.triad` div containing the three `.t-cell` blocks for One place / Add fast / Made to prove). Delete it entirely.

**5d. Replace the triad with a single centered paragraph** using `class="subhead"` and `style="max-width:700px; margin-top:32px;"`:
```
A property portfolio generates a lifetime of records. Valgate makes sure they're organised, instantly accessible, and backed by a collaborator that surfaces what matters before it slips.
```

---

## EDIT 6 — Slide 12 `s-copilot`: Add Think / Act / Scale framing

**Why:** The script positions Copilot as the payoff of "Think. Act. Scale." (previewed on Slide 06). The current slide jumps straight into the demo with no framing.

Find the section `<!-- 12 — COPILOT -->` (`class="slide s-copilot"`).

Add a small 3-column strip between the `<h1>` and the `.chat` grid. Insert a `<div>` with `style="display:grid; grid-template-columns:repeat(3,1fr); gap:0; margin:28px 0 0; border-top:1px solid var(--hair);"` containing three cells, each with `style="padding:20px 32px 0 0; border-left:1px solid var(--hair); padding-left:28px;"` (first cell has no left border):

- **Cell 1 label:** `THINK` — **Cell 1 text:** `Your AI collaborator across the whole portfolio. Ask anything in plain English.`
- **Cell 2 label:** `ACT` — **Cell 2 text:** `Overdue payments, expiring leases, missing docs — flagged before you ask.`
- **Cell 3 label:** `SCALE` — **Cell 3 text:** `Same clarity on 3 properties as on 300. No added headcount.`

Style each label with `font-size:10px; font-weight:700; letter-spacing:4px; text-transform:uppercase; color:var(--ink); margin:0 0 10px;` and each description with `font-size:13px; line-height:1.6; color:var(--muted);`.

---

## EDIT 7 — Slide 02 `s-aivo`: Add a personal hook sentence

**Why:** The script says the team intro should feel personal. The current slide ends abruptly after "Valgate is what we built first."

Find the section `<!-- 02 — AIVO -->` (`class="slide s-aivo"`).

Locate the final text line: `Valgate is what we built first`

After it, add a new paragraph (or `<br>` + new line in the same element) with `class="subhead"` or a `<p style="margin-top:16px; font-size:14px; color:var(--muted);">`:
```
One person's family problem. Our team's first product.
```

---

## Implementation notes

- All content lives inside a JSON string in a `<script type="__bundler/template">` tag. That JSON string is an HTML document.
- Characters `<`, `>`, `"` inside the JSON string are escaped as `<`, `>`, `\"`. Do not double-escape when editing.
- The `.ac` class on a `<span>` inside an `<h1>` applies the brand accent colour. Use it for at most one word per headline.
- Inline `<style>` blocks inside each `<section>` are layout-only. Leave them untouched for text-only edits.
- After Edit 4 (reorder), verify slide numbers in the deck nav are sequential (09 Map → 10 Documents → 11 Rentals) before saving.
