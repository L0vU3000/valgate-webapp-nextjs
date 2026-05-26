# /auth/* — Wiring Plan

**Route:** `/login`, `/register`, `/forgot-password`
**Last updated:** 2026-05-26

---

## Summary

All three auth routes are fully designed but contain zero real authentication logic. The Clerk SDK is listed in the stack but not installed or wired anywhere in the auth group. Login and forgot-password submit handlers explicitly toast/silently skip the Clerk API calls (TODOs are in-code). Register uses a fake `setTimeout` to simulate submission. Until Clerk is integrated, no user can actually sign in, register, or reset a password. The wiring effort is straightforward: install `@clerk/nextjs`, wrap the layout in `ClerkProvider`, replace the three stub `onSubmit` handlers with Clerk SDK calls, and wire the Google OAuth button. Legal route stubs and the resend-countdown are secondary concerns.

---

## Entity Backlog

| Entity / Gap | Status | Surfaces | Notes |
|---|---|---|---|
| Clerk `signIn.create()` — email/password | Not wired | #5, #6, #9 | `LoginPage.onSubmit` has TODO comment; replace with Clerk call |
| Clerk Google OAuth | Not wired | #4 | Button has no `onClick`; needs `signIn.authenticateWithRedirect({ strategy: "oauth_google" })` |
| Clerk `signUp.create()` | Not wired | #11–#16 | `RegisterPage.handleSubmit` fakes 800 ms delay; replace entirely |
| Clerk email verification polling | Not wired | #17, #18 | Success step should poll `signUp.reload()` for `emailAddress.verification.status` |
| Resend email cooldown timer | Not wired | #18 | Static "0:45" string; needs `useEffect` countdown + cooldown state gated on Clerk `prepareEmailAddressVerification` |
| Clerk `resetPassword` / forgot-password flow | Not wired | #20, #21, #22 | `ForgotPasswordPage.onSubmit` has TODO; replace with Clerk `signIn.create({ strategy: "reset_password_email_code", identifier })` |
| "Remember me" flag | Not wired | #7 | `rememberMe` captured in schema but never passed to Clerk; needs `signIn.create({ ..., sessionOptions: { expiresIn } })` |
| Confirm password mismatch validation | Not wired | #14 | No Zod `.refine()` or field-level comparison; add cross-field validation before Clerk call |
| Terms agreement gate | Not wired | #15 | `agreed` state is never checked before submit; add guard in `handleSubmit` |
| Legal routes | Not wired | #27–#28 | `/legal/privacy`, `/legal/terms`, `/legal/cookies`, `/security`, `/contact` are dead; defer until legal pages are built |
| `ClerkProvider` in auth layout | Missing | All | `app/(auth)/layout.tsx` has no provider; required for all Clerk SDK hooks |

---

## Findings log

### PF1 — Clerk integration deferred across all three flows
**Severity:** P0
**Finding:** `LoginPage.onSubmit`, `RegisterPage.handleSubmit`, and `ForgotPasswordPage.onSubmit` all skip real auth. Login fires `toast.error("Auth not yet wired up")`. Register uses `setTimeout`. Forgot-password transitions UI state without emailing anything. In-code TODOs confirm the deferral.
**Fix:** Install `@clerk/nextjs`. Add `ClerkProvider` to `app/(auth)/layout.tsx`. Replace each stub with the corresponding Clerk SDK call: `signIn.create` (login), `signUp.create` + email verification (register), `signIn.create({ strategy: "reset_password_email_code" })` (forgot-password).
**Deferred:** Clerk integration not yet started as of 2026-05-26.

### PF2 — Register submit is a fake timer, not a real API call
**Severity:** P0
**Finding:** `handleSubmit` in `RegisterPage` wraps `setIsLoading(true)` and `setTimeout(() => { setIsLoading(false); setStep("success"); }, 800)`. No server call is made; the success screen appears unconditionally after 800 ms.
**Fix:** Replace `setTimeout` block with `await signUp.create(...)` + email verification step. Retain the two-step UI (form → success) but gate the transition on a real Clerk response.
**Deferred:** Blocked on PF1 (Clerk not installed).

### PF3 — Resend countdown is a hardcoded static string
**Severity:** P2
**Finding:** The register success screen shows `<span className="... font-mono">0:45</span>` as a raw literal. The "Resend the email" button has no `onClick` handler. No cooldown state, no timer, no Clerk `prepareEmailAddressVerification` call.
**Fix:** Add `useEffect`-based countdown that starts at 45 s after the verification email is sent. Disable the resend button during cooldown. On click, call `signUp.prepareEmailAddressVerification({ strategy: "email_link" })`.
**Deferred:** Blocked on PF1; implement together with register Clerk wiring.

### PF4 — Legal and support links are dead stubs
**Severity:** P3
**Finding:** `AuthFooter` links to `/legal/privacy`, `/legal/terms`, `/legal/cookies`, and `/security` with an inline comment `// TODO: confirm route paths once legal pages exist`. `RegisterPage` ToS / Privacy links use `href="#"`. `ForgotPasswordPage` "Contact Support" links to `/contact`.
**Fix:** Create stub legal pages or redirect to external URLs. Update `FOOTER_LINKS` in `AuthFooter` once routes are confirmed. Replace `href="#"` anchors in `RegisterPage` with real hrefs.
**Deferred:** Waiting on legal/marketing to provide final URLs.
