## Context

`PropertyProfileWizard.tsx` renders a React Hook Form (`editPropertySchema`) across three sections defined in `lib/property-form.ts` as `PROPERTY_PROFILE_STEPS` (each with `key`, `title`, `description`, `fields`). It is a stepper only because of its navigation logic:

- `stepIndex` state + `handleNext` gates advancing on `form.trigger([...currentStep.fields])`.
- The left rail (`WizardProgress`) is a read-only progress indicator (active / completed / pending dots).
- Save (`editPropertyAction`) fires only on the last step; Back/Continue drive movement.

The underlying action already takes the whole form at once (`editPropertyAction(property.id, form.getValues())`), so the linear gate is purely a UI construct. This change swaps the navigation model; nothing about the data layer needs to move.

## Goals / Non-Goals

**Goals:**
- Free navigation to any section, any order, no validation gate between sections.
- One always-visible Save that validates the full form and points the owner to any section with errors.
- Keep the desktop left-rail layout and the mobile experience coherent (section strip where the rail is hidden).
- Zero backend or schema change.

**Non-Goals:**
- Adding, removing, or reordering fields.
- Per-section autosave (still one Save for the whole form).
- Changing the wizard's open/close entry points (the cover-photo change adds `?edit=1`; this change stays compatible).

## Decisions

### D1: Replace `stepIndex`-as-a-gate with `activeSection`-as-a-selector

Keep a single `activeSection` state (which section is shown), but make every rail item / tab set it directly. Remove `handleNext`/`handleBack` advancement and the per-step `form.trigger(currentStep.fields)` gate.

- **Why:** The sections are already independent field groups; the only thing making it a stepper is that navigation is locked to ±1 with a validation gate. Turning the rail into a selector is the minimal change that satisfies the ask.
- **Alternative — show all sections on one scrolling page (no selector):** also valid and even simpler, but loses the section structure the rail already provides and changes the layout more than needed. The selector keeps the familiar chrome while unlocking navigation.

### D2: Validate the whole form on Save, not per section

Save calls `form.trigger()` (no field subset) → if invalid, block, and switch `activeSection` to the first section that contains an errored field (derive from `form.formState.errors` mapped back through `PROPERTY_PROFILE_STEPS[].fields`).

- **Why:** Free navigation means the owner may never "visit" a section, so validation must be global at submit time. Auto-focusing the offending section preserves the guidance the stepper used to give.
- **Alternative — validate only visited sections:** ambiguous and error-prone (an untouched-but-required field could slip through). Global validation is safer and matches the single Save model.

### D3: Rail items become buttons; mobile gets a section strip

Make `WizardProgress` items actionable (or render an actionable variant) with an `onSelect(sectionKey)`. On mobile (where the rail is `hidden`), replace the linear progress bar with a horizontal, scrollable tab strip of the section titles bound to the same `activeSection`.

- **Why:** Parity of "jump anywhere" on both form factors; reuses existing section metadata (titles) for labels.
- **Consideration:** show a subtle per-section state (e.g., an error dot) so the owner can see at a glance which section Save flagged.

### D4: Save always visible; drop Back/Continue

The footer shows a single primary **Save** at all times (plus Cancel/close). Remove Back/Continue.

- **Why:** With free navigation there is no "next"; a persistent Save matches the "edit whatever you want, then save" mental model.

## Risks / Trade-offs

- **Lost sense of progress** (stepper implied "you're 2/3 done") → the rail still shows section state (and error dots after a failed Save), which is more useful for editing than a linear count.
- **Global validation surprises** (Save flags a field in a section the owner never opened) → mitigate by auto-switching to that section and scrolling the errored field into view, so the fix is one glance away.
- **Mobile strip crowding** with three longer titles → use short section labels and horizontal scroll; the set is small (3), so this is low-risk.

## Migration Plan

1. Refactor `PropertyProfileWizard.tsx` navigation (D1–D4). No migration, no data change.
2. Make `WizardProgress` items actionable (extend props) or introduce a selector variant local to the wizard.
3. Verify with `tsc`/eslint and manual QA against the same fields/save path.
4. Rollback is a straight revert of the component; nothing else is touched.

## Open Questions

- Should an unsaved-changes guard prompt on close (since free navigation makes it easier to wander then close)? Leaning: keep current close behavior for now; add a guard only if QA shows accidental loss.
- Keep the section `description` sub-header per section? Leaning: yes — it is useful context and already exists in `PROPERTY_PROFILE_STEPS`.
