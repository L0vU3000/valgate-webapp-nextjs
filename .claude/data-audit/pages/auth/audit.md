# /auth/* — Surface Inventory

**Route:** `/login`, `/register`, `/forgot-password`
**Audit date:** 2026-05-26
**Revision:** 1
**Verdict:** 26 surfaces total · 0 WIRED · 1 PARTIAL · 14 CHROME · 10 DECORATIVE · 1 HARDCODED · PF1 (Clerk integration deferred), PF2 (Register submit is a fake delay), PF3 (Resend countdown is static), PF4 (Legal/support links are dead stubs)

---

## TL;DR

- All three auth flows are Clerk stubs — no identity provider is wired. `LoginPage.onSubmit()` fires `toast.error("Auth not yet wired up")`. `RegisterPage.handleSubmit()` fakes a 800 ms delay then flips to a success step locally. `ForgotPasswordPage.onSubmit()` skips the Clerk call entirely and transitions to `SuccessCard` with no email sent.
- The Google OAuth button on `/login` is a plain `<button>` with no `onClick` handler — it is a visual placeholder only.
- Several hardcoded brand claims in `AuthBrandPanel` ("127 active listings", "94% occupancy", "500+ portfolios") and a static countdown timer ("0:45") on the register success screen have no data backing.

---

## Page-wide findings

### PF1 — Clerk integration deferred across all three flows
`LoginPage`, `RegisterPage`, and `ForgotPasswordPage` each contain TODO comments pointing to future Clerk SDK calls. No `@clerk/nextjs` SDK calls exist in any auth component. The layout (`app/(auth)/layout.tsx`) does not include `ClerkProvider`.

### PF2 — Register submit is a fake timer, not a real API call
`RegisterPage.handleSubmit()` wraps a `setTimeout(..., 800)` that resolves `setStep("success")` regardless of any server response. No Convex mutation, Server Action, or Clerk call is made.

### PF3 — Resend countdown is a hardcoded static string
The "Resend the email" button on the register success screen shows `0:45` as a raw string literal inside `<span>`. There is no countdown timer, no resend handler, and no cooldown state.

### PF4 — Legal and support links are dead stubs
`AuthFooter` links to `/legal/privacy`, `/legal/terms`, `/legal/cookies`, and `/security`. A comment in the file reads `// TODO: confirm route paths once legal pages exist`. The "Terms of Service" and "Privacy Policy" anchors in `RegisterPage` link to `href="#"`. The "Contact Support" link in `ForgotPasswordPage` links to `/contact`.

---

## Surface inventory

### `/login` — LoginPage

| # | Section | Surface | Classification | Notes |
|---|---|---|---|---|
| 1 | Header | Valgate wordmark + icon (mobile) | DECORATIVE | Static `/valgate-icon.svg`; no data |
| 2 | Hero | "Welcome back" heading | CHROME | Static copy |
| 3 | Hero | "Sign in to your Valgate account" subtitle | CHROME | Static copy |
| 4 | OAuth | "Continue with Google" button | CHROME | Plain `<button>`, no `onClick`, no Clerk OAuth handler |
| 5 | Form | Email field | CHROME | Controlled by RHF; submitted value is discarded — `onSubmit` ignores `_values` |
| 6 | Form | Password field + show/hide toggle | CHROME | Same as above; toggle logic is functional UI chrome |
| 7 | Form | "Remember me" checkbox | CHROME | Bound to `rememberMe` in Zod schema but never consumed; no Clerk `remember` flag set |
| 8 | Form | "Forgot password?" link → `/forgot-password` | CHROME | Navigation affordance; correct route |
| 9 | Form | "Log In" submit button | CHROME | Calls `onSubmit` which toasts error; no auth effect |
| 10 | Footer nav | "Don't have an account? Register" link | CHROME | Navigation affordance |

### `/register` — RegisterPage

| # | Section | Surface | Classification | Notes |
|---|---|---|---|---|
| 11 | Form | Full Name field | CHROME | Captured in local state; never submitted to any backend |
| 12 | Form | Work Email field | PARTIAL | Captured in `email` state, shown in success step (`{email \|\| "alex.doe@example.com"}`); fallback literal is hardcoded |
| 13 | Form | Password field + strength meter | CHROME | `getPasswordStrength()` derives a score from local state; purely client-side, never sent |
| 14 | Form | Confirm Password field | CHROME | Captured in state; no mismatch validation exists |
| 15 | Form | "I agree to ToS / Privacy Policy" checkbox | CHROME | Not validated before submit; `agreed` state is never checked in `handleSubmit` |
| 16 | Form | "Create account" submit button | CHROME | Triggers fake 800 ms `setTimeout`; no real submission |
| 17 | Success | "Check your inbox" email display | PARTIAL | Shows captured `email` state; see PF2 — no actual email is sent |
| 18 | Success | "Resend the email" button + "0:45" countdown | HARDCODED | Countdown is a static `<span>` literal; resend button has no handler |
| 19 | Success | "Wrong email? Go back" button | CHROME | Functional local navigation (`setStep("form")`) |

### `/forgot-password` — ForgotPasswordPage

| # | Section | Surface | Classification | Notes |
|---|---|---|---|---|
| 20 | Form | Email field | CHROME | RHF-controlled; passed to `SuccessCard` via `submittedEmail` state but no Clerk call is made |
| 21 | Form | "Send reset link" button | CHROME | Calls `onSubmit` which skips the Clerk call (TODO comment) and directly sets `submitted = true` |
| 22 | Success | Email display in "We sent a reset link to {email}" | CHROME | Displays captured state; no email is actually sent (see PF1) |
| 23 | Success | "Try a different email" / "Back to login" links | CHROME | Navigation affordances; functional local reset |
| 24 | Footer | "Contact Support" → `/contact` | CHROME | Route may not exist; no dead-link check |

### Shared — AuthBrandPanel

| # | Section | Surface | Classification | Notes |
|---|---|---|---|---|
| 25 | Brand panel | "127 active listings · 94% occupancy" data card | DECORATIVE | Hardcoded SVG/HTML strings in a decorative product preview; no data entity |
| 26 | Brand panel | "SOC 2 Type II · 500+ portfolios · 99.9% uptime" trust strip | DECORATIVE | Static marketing copy |

### Shared — AuthFooter

| # | Section | Surface | Classification | Notes |
|---|---|---|---|---|
| 27 | Footer | "© 2025 Valgate Property Management" copyright | DECORATIVE | Hardcoded year; see PF4 |
| 28 | Footer | Privacy Policy / Terms / Cookies / Security links | CHROME | Dead stubs; see PF4 |

---

## Source files

- `app/(auth)/layout.tsx`
- `app/(auth)/login/page.tsx`
- `app/(auth)/login/_components/LoginPage.tsx`
- `app/(auth)/register/page.tsx`
- `app/(auth)/register/_components/RegisterPage.tsx`
- `app/(auth)/forgot-password/page.tsx`
- `app/(auth)/forgot-password/_components/ForgotPasswordPage.tsx`
- `components/auth/AuthBrandPanel.tsx`
- `components/auth/AuthFooter.tsx`
