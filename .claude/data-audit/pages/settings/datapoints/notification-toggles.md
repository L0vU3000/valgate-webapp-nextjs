---
title: Settings Page - Notification Toggles
template: full
surfaces: 9 (toggle checkboxes × initial state + save action)
---

# Findings
- PF2: Resolved. Notification toggles now save using a Server Action (`saveNotificationPreference`) wrapped in a `startTransition`.
- PF3: Resolved. Seed data now uses the correct UI-matching keys (`valuationUpdates`, `teamComments`, `marketInsights`).
