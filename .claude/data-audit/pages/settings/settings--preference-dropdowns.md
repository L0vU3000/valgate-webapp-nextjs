---
title: Settings Page - Preference Dropdowns
template: full
surfaces: 3 (selected values + save path)
---

# Findings
- PF4: Resolved. Selected values now initialized properly using defaults derived from the `UserProfile` entity. `dashboardView` field added to `UserProfileSchema`.
- PF5: Resolved. Changing dropdowns now saves the selected option using a Server Action (`saveUserPreferences`) wrapped in a `startTransition`.
