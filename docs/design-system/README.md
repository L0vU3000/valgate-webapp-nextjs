# Valgate Design System — Foundation v0.1

## Status

Valgate **does have a design system**, but before this foundation it was distributed across a brand guide, a design-language document, `styles/theme.css`, and reusable components. This directory makes the relationship explicit without changing the live UI. It is a reference baseline—not a mandate that every feature or task must look identical. Product-specific creative direction can deliberately vary from it.

| Artifact | Role | Canonical for |
|---|---|---|
| [`../../DESIGN.md`](../../DESIGN.md) | compact, agent-readable system contract | token intent, visual rules, baseline component contracts |
| [`../valgate-brand-guide.md`](../valgate-brand-guide.md) | portable brand guidance | brand personality, marketing/presentation work |
| [`../design-language.md`](../design-language.md) | implementation patterns | current app page, table, KPI, and control recipes |
| [`../../styles/theme.css`](../../styles/theme.css) | live code source | actual light/dark semantic values and Tailwind mappings |
| [`../../components/ui`](../../components/ui) | live component source | React API, variants, behavior, and interaction states |
| [`../../tokens.json`](../../tokens.json) | generated interchange export | tooling integration; regenerate rather than hand-edit |

## Product premise

Valgate helps property owners understand their portfolios with clarity and control. The interface should feel calm, capable, and premium rather than dense, technical, or decorative.

**System rules:**

1. **Information wins.** Property data, images, and the user’s next decision are the visual focus.
2. **Blue is an action signal.** Reserve it for primary actions, links, focus, selection, and meaningful accents.
3. **Neutrals belong to Valgate.** Use blue-tinted semantic surface and border tokens rather than generic black/white/gray values.
4. **Hierarchy comes from type and space.** Do not compensate for weak hierarchy with extra icons, colored cards, or shadows.
5. **A component is a contract.** It includes behavior, states, accessibility, and responsive behavior—not only an appearance.

## How to build a new screen

1. Check whether `components/ui` or a shell primitive already meets the need.
2. Start with semantic tokens from `theme.css` (`surface-*`, `text-*`, `border-*`, `interactive-*`, `status-*`). Do not add local hex values.
3. Apply the typography and spacing roles in `DESIGN.md`.
4. Handle the states that can occur: default, hover/focus/pressed, disabled, loading, empty, error, and populated as relevant.
5. Test keyboard focus, screen-reader name/role/value, 44px touch targets where needed, a narrow phone viewport, and dark mode.
6. Add or update the relevant component/documentation contract before treating a new pattern as shared.

## Foundations that are already implemented

### Tokens

`styles/theme.css` has the strongest existing system layer:

- semantic surfaces: page, sunken, base, elevated, overlay, tint;
- semantic text: primary, secondary, tertiary, disabled, inverse, link;
- semantic borders: default, strong, subtle, focus;
- interactive primary and secondary states;
- status success/warning/danger/info foreground, background, and border values;
- light and dark themes;
- radius mapping, safe-area utilities, touch-target utility, fluid type opt-ins, and tabular-number utility.

The system must extend these semantic roles—not bypass them with literal Tailwind color classes except where an existing compatibility pattern is being migrated.

### Type

- **App UI:** Geist / system sans, with weight and whitespace defining hierarchy.
- **Display token:** Bricolage Grotesque remains exposed for legacy work but is not the recommended default for new app UI.
- **Data:** use `tabular-num` for aligned financial and time-series values.
- **Mobile:** use the existing fluid-type utilities only for genuinely large display values; ordinary UI text should stay predictable and readable.

### Core primitives

The first governed primitives are `Button`, `EmptyState`, responsive table helpers, loading feedback, confirmation actions, sheets, and application shell components. Existing page-local patterns are candidates—not automatically system components.

## Accessibility baseline

A new shared component is not complete until it meets these minimums:

- visible keyboard focus using the semantic ring/border token;
- an accessible name, native element where possible, and correct disabled behavior;
- text and control contrast at WCAG AA or better in each supported theme;
- state conveyed with text/icon/ARIA as well as color;
- a 44 × 44px hit target when used on touch interfaces;
- reduced-motion behavior for nonessential animation;
- responsive and keyboard checks in the context where it is used.

This follows the broadly established component-system practice of pairing reusable implementation with accessibility guidance and contextual testing. The [W3C Design Tokens Format Module](https://www.designtokens.org/tr/2025.10/format/) informs the exported token format; [USWDS accessibility guidance](https://designsystem.digital.gov/documentation/accessibility/) reinforces that component accessibility must be tested in product context.

## Governance

### Source-of-truth order

1. `styles/theme.css` for live visual values.
2. Component source and tests for executable behavior.
3. `DESIGN.md` for design intent and agent-facing constraints.
4. This foundation for workflow, inventory, and decisions.

When these disagree, correct the documentation or source deliberately; do not silently choose a convenient value in a new component.

### Change process

- **Token change:** document intent, audit light/dark and component impact, then update `theme.css` and regenerate exports.
- **New shared component:** state purpose, API/variants, all supported states, accessibility behavior, responsive behavior, and tests.
- **One-off page composition:** may combine existing primitives but should not create a new global token or component without an identified repeated need.
- **Visual regression:** add focused test coverage where practical and perform a real viewport check for interactive/mobile surfaces.

## Recommended next slices

This is a foundation, not a claim that every page is perfectly unified. The highest-value follow-ups are:

1. **Token cleanup:** replace remaining literal Tailwind slate/blue/status recipes with semantic aliases where they represent a reusable role.
2. **Component documentation:** add individual reference pages for Button, form fields, badges/status, data tables, cards, navigation, dialogs/sheets, and empty/loading/error states.
3. **Storybook or a `/design-system` route:** render component states in light/dark and mobile/desktop widths.
4. **Automated accessibility:** add component-level axe checks and keyboard-state coverage.
5. **Cross-platform contract:** map shared semantic roles to the native iOS palette/type roles while preserving iOS-native interaction and typography.

## Regenerating token exports

From the repository root:

```bash
npx -y @google/design.md lint DESIGN.md
npx -y @google/design.md export --format tailwind DESIGN.md > tailwind.theme.json
npx -y @google/design.md export --format dtcg DESIGN.md > tokens.json
```

`tokens.json` and `tailwind.theme.json` are generated outputs. Do not hand-edit them.
