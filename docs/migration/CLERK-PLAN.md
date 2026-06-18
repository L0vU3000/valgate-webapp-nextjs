# Item 1 — Clerk Auth: leave DEMO_MODE (headless integration)

## Context

The app must stop running on the hardcoded demo user (`USR-0001`/`ORG-0001`) and authenticate
real users via Clerk, so `DEMO_MODE` can be flipped to `false` (required before deploy — and the
prerequisite that unblocks RLS, item 5). The **backend is already wired**: `clerkMiddleware()`
(`middleware.ts`), `requireCtx()` (`lib/auth/ctx.ts`) with JIT identity bootstrap, the webhook
(`app/api/webhooks/clerk/route.ts`), and the Postgres mirror tables. **All remaining work is
frontend.** Because the auth pages are bespoke (you're the designer), we wire your existing UI to
Clerk's **headless hooks** (`useSignIn`/`useSignUp`) — we do NOT replace them with Clerk's prebuilt
`<SignIn>`/`<SignUp>` components.

**Locked decisions:** D1 email **code/OTP** (not link) · D2 **auto-create** `"<Name>'s Workspace"`
on signup · D3 **hide** the Google button (wire later) · D4 **include** real user in sidebar/profile
+ sign-out. Deferred: Google OAuth, org switcher.

> Clerk API note: use the version-stable headless API the existing stubs target —
> `signIn.create()/attemptFirstFactor()`, `signUp.create()/prepareEmailAddressVerification()/
> attemptEmailAddressVerification()`, `setActive()`. Confirm method names against the installed
> `@clerk/nextjs@^7.5.2` during Phase 1 (newer builds also expose `.password()/.finalize()` shorthands;
> either is fine, pick what the installed version documents).

---

## Phase 0 — Clerk dashboard + env (you do; I guide)

No code. In the Clerk dashboard (dashboard.clerk.com):
1. Create the application; copy **Publishable key** + **Secret key**.
2. **Organizations** → enable; **personal accounts OFF** (every user is in an org); **allow users to
   create organizations** = ON (the signup flow calls `createOrganization`). This is the
   "Membership required" model already documented in `docs/tech-guides/clerk-organizations.md`.
3. **Email/verification** → set email verification to **Email verification code** (matches D1).
4. **Paths** → sign-in `/login`, sign-up `/register` (so Clerk links/redirects hit the custom pages).
5. **Webhooks** → add endpoint `https://<host>/api/webhooks/clerk`, subscribe to `user.*`,
   `organization.*`, `organizationMembership.*`; copy the **Signing secret**.
6. Fill `.env.local`: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`,
   `CLERK_WEBHOOK_SIGNING_SECRET` (schema already in `lib/env.ts:11-13`). Keep `DEMO_MODE=true` until Phase 6.

Update `.env.example` with the three keys (already listed) + new public redirect vars from Phase 1.

---

## Phase 1 — Foundation: ClerkProvider + middleware protection

**`app/layout.tsx`** — wrap the tree in `<ClerkProvider>` (currently absent). Point it at the custom
pages and post-auth landing:
```tsx
import { ClerkProvider } from "@clerk/nextjs";
// ...
<ClerkProvider
  signInUrl="/login"
  signUpUrl="/register"
  signInFallbackRedirectUrl="/portfolio"   // confirm canonical shell home
  signUpFallbackRedirectUrl="/portfolio"
>
  <html lang="en">…</html>
</ClerkProvider>
```

**`middleware.ts`** — today it runs the site-gate inside `clerkMiddleware` but never protects routes,
so an unauthenticated hit to a `(shell)` page makes `requireCtx()` *throw* (ugly error) instead of
redirecting to `/login`. Add `createRouteMatcher` for public routes and `auth.protect()` for the rest,
**preserving the existing site-gate chain**:
```tsx
const isPublic = createRouteMatcher([
  "/login(.*)", "/register(.*)", "/forgot-password(.*)",
  "/api/webhooks/clerk(.*)", SITE_GATE_PATH, "/__clerk/(.*)",
]);
// inside clerkMiddleware(async (auth, request) => { … siteGate first …
if (!isPublic(request)) await auth.protect();  // redirects to signInUrl
```
Keep the `hasClerk` fallback (`siteGateOnly`) untouched for the no-key path.

**Reuse:** `requireCtx()` (`lib/auth/ctx.ts:14`) is unchanged — it already returns the demo ctx while
`DEMO_MODE=true`, so Phases 1–5 can be built and visually checked before the flip.

---

## Phase 2 — Sign in (`app/(auth)/login/_components/LoginPage.tsx`)

Replace the stub at line ~65 (`toast.error("Auth not yet wired up")`). Keep the RHF+Zod form as-is.
```tsx
const { isLoaded, signIn, setActive } = useSignIn();
// onSubmit:
const res = await signIn.create({ identifier: values.email, password: values.password });
if (res.status === "complete") {
  await setActive({ session: res.createdSessionId });
  router.push("/portfolio");
} // else surface res.status; map Clerk error codes → field/toast errors
```
- Map Clerk errors (`err.errors[0].code/longMessage`) to the existing toast/field error UI.
- **D3:** hide the Google button block (lines ~110-118) behind a `false` flag / comment, leaving the
  markup for later. "Remember me" stays cosmetic (Clerk persists sessions by default).

---

## Phase 3 — Sign up + OTP + auto-org (`app/(auth)/register/_components/RegisterPage.tsx`)

This page uses raw `useState` and has **no Zod validation** and a fake `setTimeout` success. Rework:
1. Add Zod validation (email format, password rules, **confirm-password match**, terms agreed).
2. Wire `useSignUp()`:
   ```tsx
   const { isLoaded, signUp, setActive } = useSignUp();
   const [firstName, ...rest] = fullName.trim().split(" ");
   await signUp.create({ emailAddress, password, firstName, lastName: rest.join(" ") || undefined });
   await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
   setStep("verify");   // reuse the existing "success" screen slot, repurposed as OTP entry
   ```
3. **OTP step (D1):** convert the current "check your inbox" screen (lines ~266-356) into a **6-digit
   code entry** screen (a small OTP input — 6 single-char boxes or one numeric input). On submit:
   ```tsx
   const res = await signUp.attemptEmailAddressVerification({ code });
   if (res.status === "complete") {
     await setActive({ session: res.createdSessionId });        // 1) sign in
     const org = await createOrganization({ name: `${firstName}'s Workspace` }); // 2) D2
     await setActive({ organization: org.id });                 // 3) make it active so requireCtx has orgId
     router.push("/portfolio");
   }
   ```
   `createOrganization` from `useOrganizationList()` (or `useClerk().createOrganization`). Order matters:
   session active → create org → set org active, **before** redirecting into `(shell)`.
   - Keep "Resend code" (wire to `prepareEmailAddressVerification` again) and the countdown (make it real).
   - The webhook + JIT bootstrap (`ctx.ts:33-44`) mirror the new user/org/membership into Postgres automatically.

---

## Phase 4 — Forgot/Reset password (`app/(auth)/forgot-password/_components/ForgotPasswordPage.tsx`)

The `reset_password_email_code` strategy keeps the whole flow on **one page** — no new `/reset-password`
route needed. Keep the existing two-step (form → second screen) shape; second screen becomes
**code + new password**:
```tsx
const { signIn, setActive } = useSignIn();
// Step 1 (replace stub ~line 135): request the code
await signIn.create({ strategy: "reset_password_email_code", identifier: email });
setSubmitted(true);                       // step 2 screen
// Step 2: enter code + new password
const res = await signIn.attemptFirstFactor({ strategy: "reset_password_email_code", code, password });
if (res.status === "complete") { await setActive({ session: res.createdSessionId }); router.push("/portfolio"); }
```
Existing users already have an org, so **no org creation here**. Add the OTP + new-password fields to
the step-2 screen (currently a static "check your inbox" card).

---

## Phase 5 — Shell: real user + sign-out (D4)

**`components/layout/Sidebar.tsx`** (lines ~195-239) — replace hardcoded `"John Doe"`/`"JD"`/`"Owner"`:
```tsx
const { user } = useUser();
const { organization, membership } = useOrganization();
// name = user.fullName; initials from user.firstName/lastName; role = membership?.role ?? "member"
```
Add a **sign-out** affordance (menu item or button near the avatar):
```tsx
const { signOut } = useClerk();
await signOut({ redirectUrl: "/login" });
```
**`app/(shell)/profile/`** — the page is already server-rendered via `getProfilePageData()` →
`getMyUserProfile()` (real DB data, fixed earlier this session). Add a **sign-out** action here too
(client island). No data rewiring needed.

> `useUser`/`useOrganization` return null in DEMO_MODE (no Clerk session) — guard with fallbacks so the
> shell still renders while `DEMO_MODE=true`; real values appear after the Phase 6 flip.

---

## Phase 6 — Flip + end-to-end verification

1. Set `DEMO_MODE=false` in `.env.local` (real Clerk keys now present). Restart dev server.
   - `requireCtx()` now refuses demo (`ctx.ts:19` — real `CLERK_SECRET_KEY` set) and uses live auth.
2. **Manual E2E (local):**
   - **Sign up** new email → receive code → enter OTP → lands in `/portfolio`; confirm a row appears in
     `organizations` + `users` + `organization_memberships` (dev branch), org named `"<Name>'s Workspace"`.
   - **Sign out** → redirected to `/login`; hitting `/portfolio` while signed out → redirected to `/login`
     (middleware protect works).
   - **Sign in** with that account → back into the app; sidebar shows the **real** name/role.
   - **Forgot password** → request code → enter code + new password → signed in.
   - **Create a property** (writes work under real auth, scoped to the new org).
3. Confirm the webhook fires (Clerk dashboard → Webhooks → recent deliveries = 2xx).

**Rollback:** set `DEMO_MODE=true` (and blank the Clerk keys) to fall back to the demo path; all Phase
1–5 code is inert in demo mode.

---

## Files touched (summary)

| File | Change |
|---|---|
| `app/layout.tsx` | mount `<ClerkProvider>` |
| `middleware.ts` | add `createRouteMatcher` public list + `auth.protect()` (keep site-gate) |
| `app/(auth)/login/_components/LoginPage.tsx` | wire `useSignIn`; hide Google (D3) |
| `app/(auth)/register/_components/RegisterPage.tsx` | Zod + `useSignUp` + OTP screen + auto-org (D2) |
| `app/(auth)/forgot-password/_components/ForgotPasswordPage.tsx` | `reset_password_email_code` 2-step |
| `components/layout/Sidebar.tsx` | `useUser`/`useOrganization` + sign-out (D4) |
| `app/(shell)/profile/` (client island) | sign-out action |
| `.env.local` / `.env.example` | Clerk keys + sign-in/up URL vars |

**Deferred (separate follow-ups):** Google OAuth (D3), `<OrganizationSwitcher>` / org-name display.

**On execution:** also copy this plan to `docs/migration/CLERK-PLAN.md` (git-tracked, next to
`RLS-PLAN.md`) and tick STATUS.md item 1 as it progresses.

## Verification recap
Phase 6 manual E2E above is the gate: signup→OTP→org-created→portfolio, signout→protected-redirect,
signin, forgot-password, and a real write — all against the dev Neon branch with `DEMO_MODE=false`.
`npx tsc --noEmit` + `npm run build` clean after each phase.
