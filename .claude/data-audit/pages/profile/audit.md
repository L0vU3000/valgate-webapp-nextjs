# Profile Page Data Audit

## Expected surface tally

| Class | Count |
|---|---|
| WIRED | 14 |
| PARTIAL | 0 |
| HARDCODED | 0 |
| CHROME | ~10 (section headings, field labels, button text, security note) |
| MISSING | 0 |

### Page-wide findings (PFn)

~~🔴 PF1 — All profile data falls back to hardcoded strings (P1)~~ — ✅ resolved in Revision 1
`getProfilePageData` reads from `db.userProfiles`, but falls back to `"Samuel Miller"`, `"Senior Asset Manager"`, etc., for almost all fields. If the profile doesn't have these fields, the page shows fake data instead of an empty state, making it look like it's a different user. 
**Resolved:** Replaced hardcoded fallbacks with `"—"` and wired directly to `db.userProfiles` in `queries.ts`.

~~🔴 PF2 — Edit Profile write-path missing (P1)~~ — ✅ resolved in Revision 1
The "Edit profile" button in `ProfilePage.tsx` is completely non-functional. It has no `onClick` handler and no associated form state or Server Action to persist changes to `db.userProfiles`.
**Resolved:** Replaced static ProfilePage with an editable form state powered by `saveProfileInfo` server action.
