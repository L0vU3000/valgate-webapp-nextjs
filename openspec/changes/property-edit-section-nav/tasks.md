## 1. Navigation model

- [x] 1.1 `PropertyProfileWizard.tsx`: `stepIndex` is now a free section selector (kept the name to minimise churn); set directly, no gating
- [x] 1.2 Removed `handleNext`/`handleBack` and the per-step `form.trigger(currentStep.fields)` gate; added `goToSection(i)`
- [x] 1.3 Active section's fields still render via the existing `DetailsStep` / `AddressStep` / `FinancialStep` (keyed on `currentStep.key`)

## 2. Selectors (desktop rail + mobile strip)

- [x] 2.1 `WizardProgress` gained an optional `onSelect` (backward-compatible — the 2 other stepper callers are untouched); rail items jump to any section
- [x] 2.2 Replaced the mobile linear progress bar with a horizontal, scrollable section tab strip bound to the active section
- [x] 2.3 Per-section error dot (`hasError`) driven by `form.formState.errors`, shown in both the rail and the mobile tabs after a failed save

## 3. Single save + global validation

- [x] 3.1 One persistent **Save profile** in the footer (+ Cancel); Back/Continue removed
- [x] 3.2 Save calls `form.trigger()` (whole form); on invalid, blocks and switches to the first section containing an errored field
- [x] 3.3 On valid, calls the existing `editPropertyAction` (unchanged) → toast → close → `router.refresh()`
- [x] 3.4 After auto-switching, `form.setFocus` the first errored field (deferred so the newly-shown section is mounted)

## 4. Verify

- [x] 4.1 `tsc` clean (0 errors) + eslint clean (only a pre-existing unused-import warning, not from these changes)
- [ ] 4.2 QA (live): open the form, jump straight to Financial, edit, Save — persists without visiting other sections
- [ ] 4.3 QA (live): introduce an error in a non-active section, Save — blocked, auto-switches to that section with the field focused
- [ ] 4.4 QA mobile (live): section strip reachable, each section one tap away; saved data identical to the old stepper
