# Valgate Design System — Skill Test Prompts

> Personal notes. Run these manually in Claude Code or Figma to check the skill is behaving.  
> Judge by feel — no scripts, no pass/fail. Just: "does this look right?"

---

## How to use

1. Paste a prompt into Claude Code (or Figma context where noted)
2. Look at the output against the checklist below each prompt
3. If something's off, note it and tweak `SKILL.md`

---

## Code prompts

### 1. Basic card component
```
Build a Valgate card with a title, supporting text, and a primary action button.
```
**Check:**
- Uses `bg-surface-base border border-border-default rounded-xl`
- Title is `text-primary text-lg font-semibold`
- Supporting text is `text-secondary text-sm`
- Button uses `bg-interactive-primary text-inverse rounded-md`
- No raw hex, no `bg-white`, no `text-gray-*`

---

### 2. Dashboard stat row
```
Build a dashboard stat row with 4 equal metric cards showing a number and a label.
```
**Check:**
- Grid is `grid grid-cols-12 gap-6`
- Each card is `col-span-3` (not `col-span-4`)
- Card padding is `p-6` (small span)
- Numbers are `text-2xl font-bold text-primary`
- Labels are `text-xs text-secondary`

---

### 3. Dark mode token discipline
```
Build a sidebar navigation for Valgate with active state highlighted.
```
**Check:**
- Active item uses `bg-brand-subtle` not a raw colour
- No `dark:` conditionals in the component — tokens handle it
- Text uses `text-primary` / `text-secondary`, never `text-white`
- Sidebar width is `w-[280px]` expanded / `w-[72px]` collapsed

---

### 4. Adversarial — generic Tailwind trap
```
Build a simple alert component with success, warning, and error variants.
```
**Check (this one's likely to fail):**
- Does NOT use `bg-green-100`, `bg-yellow-100`, `bg-red-100`
- Uses `status/*-bg`, `status/*-text`, `status/*-border` tokens
- If it uses generic Tailwind colours → skill needs a stronger status token rule

---

### 5. Typography scale
```
Build a page header section with an eyebrow label, hero title, and subtitle for Valgate.
```
**Check:**
- Hero title uses `font-display` (Plus Jakarta Sans)
- Eyebrow is `text-xs font-medium uppercase tracking-wide text-secondary`
- Subtitle is `font-sans` (Inter), not display
- No mixing of font families within the same role

---

### 6. Layout — column span confusion
```
Build a 3-column feature row for Valgate with an icon, heading, and description in each.
```
**Check:**
- Each card is `col-span-4` (3 cards × 4 cols = 12)
- Card padding is `p-8` (medium span)
- Gap is always `gap-6`

---

## Figma prompts

### 7. Variable binding check
```
I have a card frame in Figma. Bind the fill to the correct surface token and the text to the correct text token.
```
**Check:**
- Fill bound to `surface/base` variable (not a raw colour style)
- Text bound to `text/primary`
- Variables come from the correct collection in the `variable-tester` file

---

### 8. Code-to-canvas
```
Take this React card component and recreate it as a Figma frame using Valgate variables:
<div className="bg-surface-base border border-border-default rounded-xl p-8">
  <h3 className="text-primary text-lg font-semibold mb-2">Title</h3>
  <p className="text-secondary text-sm">Description</p>
</div>
```
**Check:**
- Radius is 12px (rounded-xl)
- Padding is 32px (p-8)
- Fill and text are variable-bound, not hardcoded
- Border uses `border/default` variable

---

### 9. Canvas-to-code
```
Here's a Figma frame — convert it to Valgate React + Tailwind code.
```
*(Attach a frame in Figma when running this)*  
**Check:**
- Outputs token classes, not hex values
- Doesn't invent spacing — maps to nearest base-8 value
- Flags if the Figma frame uses raw colours instead of variables

---

## Red flags to watch for

If you see any of these in an output, the skill needs work:

- `bg-white` or `text-gray-*` → token rule not strong enough
- `bg-[#...]` or `style={{ color: '...' }}` → hardcoded hex slipping through
- `dark:bg-...` conditional → skill not enforcing mode-aware tokens
- `gap-4` on a card grid → gap-6 rule not landing
- `col-span-4` for a 4-card row → column span confusion not caught
- Plus Jakarta Sans on a button label → font role confusion
- `p-5` or `p-7` → off-scale spacing (not base-8)

---

*Last updated: March 2026*
