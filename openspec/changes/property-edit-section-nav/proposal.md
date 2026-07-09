## Why

The "Edit property" flow (`PropertyProfileWizard`) is a linear 3-step stepper: **Details → Address → Financial**, gated with Back/Continue and a Save only on the last step. Editing one field in a later section means walking through earlier steps and re-validating them. Users asked to "make this page selectors instead of the stepper" so they can jump straight to any section and edit whatever they want. The wizard already renders every step in a left rail — it is a stepper only because navigation is locked to next/previous.

## What Changes

- Turn the wizard's left-rail step list into **clickable section navigation** — the owner can jump directly to any section in any order.
- Remove the linear gate: no per-step "validate to advance." Navigation between sections is always free.
- Show a single **Save** action at all times (not only on the last step); it validates **all** sections on submit and reports errors against the relevant section.
- On mobile (where the rail is hidden), replace the linear progress bar with a horizontal **section tab strip** (or section picker) so any section is one tap away.
- Keep everything else: the same fields, the same Zod schema, the same `editPropertyAction` (which already accepts the whole form at once).

## Capabilities

### New Capabilities
- `property-edit-section-nav`: The property edit form presents its sections as free-navigation selectors (jump to any section), with a single save that validates the whole form, replacing the linear stepper.

### Modified Capabilities
<!-- None: the property edit wizard has no existing OpenSpec capability spec; this behavior is captured under the new capability above. -->

## Impact

- **UI**: `components/property/PropertyProfileWizard.tsx` — replace linear `handleNext`/`handleBack` gating with section selection; make the rail items (`WizardProgress`) actionable; always-visible Save; mobile section strip.
- **Validation**: validate the full form on Save (`form.trigger()` with no field subset) instead of per-step; surface which section has errors.
- **No backend change**: `editPropertyAction` and `editPropertySchema` are unchanged; `PROPERTY_PROFILE_STEPS` (sections + fields) is reused as-is.
- **Non-goals**: not adding/removing any fields; not changing what the wizard saves; not the cover-photo work (separate change). The `?edit=1` auto-open entry point is added by the cover-photo change and is compatible here.
