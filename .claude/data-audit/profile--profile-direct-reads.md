---
slug: profile--profile-direct-reads
data_point: "Profile fields bundle (14 surfaces)"
route: /profile
revision: 1
date: 2026-05-07
verdict: "✅ All 14 surfaces WIRED"
---

# Audit Bundle — Profile Direct Reads on /profile
_Last revised: 2026-05-07 · Revision 1_
_Bundle covers 14 surfaces: Initials, Full Name, Role, Member Since, Last Login, First Name, Last Name, Job Title, Employee ID, Email Address, Phone Number, Office Location, Language, Timezone, Currency. All read from `userProfiles` entity via `getProfilePageData()`. Lite template — derivation depth is trivially shallow._

📄 Page audit: see [pages/profile/audit.md](pages/profile/audit.md)

## TL;DR
- ✅ All 14 card fields correctly wired to DB — zero HARDCODED surfaces remaining
- ✅ PF1 and PF2 resolved in Revision 1 via write path and empty state convention updates

## Findings
- ✅ PF1 resolved: Hardcoded values replaced with `"—"` or empty strings.
- ✅ PF2 resolved: Write path added with `saveProfileInfo`.

<details>
<summary>🔍 Source files & hashes</summary>

```yaml
sources:
  - path: app/(shell)/profile/_components/ProfilePage.tsx
  - path: app/(shell)/profile/queries.ts
  - path: app/(shell)/profile/actions.ts
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-07
- Initial audit and immediate wiring complete. All 14 surfaces WIRED.
- Write path established.

</details>
