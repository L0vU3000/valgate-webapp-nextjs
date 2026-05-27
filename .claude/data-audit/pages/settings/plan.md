# Settings Page Data Plan

## Status: ✅ Phase 8.3 Audit Complete (2026-05-26)

All PF1–PF5 wiring complete. Remaining items deferred to Phase 9.

---

## Fix Log

- [x] PF1: Add Profile section
- [x] PF2: Wire notification auto-save (saveNotificationPreference)
- [x] PF3: Fix notification seed data mismatch (keys aligned)
- [x] PF4: Use Profile entity for preference initial values (UserProfile fetched in queries.ts)
- [x] PF5: Wire preference saves (saveUserPreferences)
- [ ] PF6: MFA status → Phase 9 (Clerk integration)
- [ ] PF7: Action stubs (Update Password, Export, Delete) → Phase 9
- [ ] PF8: Silent save feedback → small UX fix, can be standalone

---

## Q-numbers resolved

- Q1.K: ✅ Auto-save on toggle via startTransition + Server Action
- Q1.L: ✅ Profile section added; "Edit Profile" = CHROME stub
- Q5.X: ✅ `dashboardView: z.string().optional()` added to UserProfileSchema
