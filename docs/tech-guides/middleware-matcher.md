# middleware.ts matcher scope — Valgate

> Role: why the edge matcher is a catch-all, which routes skip `auth.protect()`, and how that stays fail-closed.
> Last reviewed: 2026-09-11 against `middleware.ts` on `main` (TM1-68).
> Live code: [`middleware.ts`](../../middleware.ts) · tests: [`lib/auth/middleware-matcher.test.ts`](../../lib/auth/middleware-matcher.test.ts)
> Clerk docs: https://clerk.com/docs/references/nextjs/clerk-middleware

This is the TM1-68 review write-up. It is not a second copy of the allowlist — if the code and this page disagree, the code wins, and the test that pins `config.matcher` should fail.

---

## Two different "matchers"

`middleware.ts` has two layers. Mixing them up is how routes get left unprotected.

### 1. `config.matcher` — "does middleware run at all?"

Next.js only invokes `middleware.ts` when the request path matches `export const config.matcher`.

If a path is **missing** here, `clerkMiddleware` never runs. Then `auth.protect()` never runs. `auth()` inside a route handler also sees an empty session (see [clerk.md](./clerk.md) §5).

The live matcher is Clerk's recommended catch-all, plus two always-on prefixes:

```ts
matcher: [
  // Run on every path except `_next` internals and static files (png, css, …).
  "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  // Always run for Route Handlers, even if the path looks like a file.
  "/(api|trpc)(.*)",
  // Clerk frontend API (handshake, etc.).
  "/__clerk/(.*)",
]
```

**Why this is fail-closed:** every App Router page and every `/api/*` handler is included. The first pattern skips only Next internals and static assets. Those assets are not user data.

`js(?!on)` skips `.js` bundles but **does not** skip `.json`. API JSON stays inside middleware.

### 2. `isPublicRoute` / `shouldSkipAuthProtect()` — "does auth.protect run?"

Once middleware is running, signed-out visitors hit `auth.protect()` unless `shouldSkipAuthProtect()` is true.

`shouldSkipAuthProtect` is **not** "this route is unauthenticated data." It means "do not do Clerk's **browser-session** redirect." Two cases:

| Kind | Paths | What actually authenticates |
|---|---|---|
| Truly public | `/`, `/login`, `/register`, `/forgot-password`, `/accept-invitation`, `/oauth-consent`, `/login/tasks` | Nothing. These are the marketing and auth screens. |
| Public by design (own auth) | `/api/webhooks/clerk`, `/mcp`, `/.well-known/*`, `/__clerk` | Clerk Svix signature, MCP bearer token, or Clerk's own frontend API. |
| API v1 (not public) | `/api/v1/*` | `resolveApiV1Ctx()` returns **JSON 401**. Skipped only so `auth.protect()` cannot rewrite the request to an HTML 404. |

Everything else — `/app`, `/portfolio`, `/settings`, `/add-property`, `/api/add-property/scan`, … — calls `auth.protect()`, which redirects the browser to `/login` (`signInUrl` in `app/layout.tsx`).

Shell pages have a second gate: `app/(shell)/layout.tsx` calls `requireCtx()`. A matcher miss would still fail closed there (thrown `"unauthenticated"`), but API handlers that forgot their own auth would not. That is why the catch-all matcher matters.

---

## Allowlist review (2026-09-11)

Confirmed accurate for **not leaving real routes unprotected**:

- No product page under `app/(shell)/` is on the public list.
- `/docs` is not public (that stale matcher was already removed; a navigation-integrity test pins it).
- `/api/v1/*` is separate from "public" so iOS still gets JSON 401, not a login HTML page.

Known extras that do **not** unprotect anything (no matching `app/` page or handler today):

- `/contact(.*)` — no contact page in `app/`.
- `/api/mcp(.*)` — no `app/api/mcp/route.ts`; the live MCP server is `/mcp`.

Do not treat those extras as a reason to widen the matcher. They are leftover allowlist rows.

Self-authenticated handlers that currently **also** go through `auth.protect()` (over-protected, not unprotected):

- `POST /api/webhooks/resend` — verifies Svix itself.
- `GET /api/cron/cleanup-drafts` — checks `CRON_SECRET` itself.

Those are tracked on TM1-67, not this ticket. This review does not change `middleware.ts` so that in-flight PR can own the allowlist edit.

---

## What an anonymous visitor should see

| Path | Middleware runs? | `auth.protect`? | Anonymous result |
|---|---|---|---|
| `/portfolio` | yes | yes | redirect to `/login` |
| `/api/v1/me` | yes | no (v1 skip) | JSON `{ error: { code: "unauthorized" } }` status 401 |
| `/login` | yes | no | the login page |
| `/favicon.ico` | no | n/a | static file |

The test `lib/auth/middleware-matcher.test.ts` asserts the `/portfolio` redirect and the `/api/v1/me` 401 using the live `config.matcher` and `shouldSkipAuthProtect()`.

---

## How to add a route without making a hole

1. **New signed-in page** (`app/(shell)/…`): do nothing to the matcher. The catch-all already covers it. Do not add it to `isPublicRoute`.
2. **New public marketing page**: add it to `isPublicRoute` **and** add a row to `lib/auth/middleware-matcher.test.ts`.
3. **New `/api/v1/…` handler**: do nothing here. `isApiV1Route` already matches `/api/v1(.*)`. The handler must call `resolveApiV1Ctx()`.
4. **New webhook / cron that authenticates itself**: skip `auth.protect()` the same way `/api/webhooks/clerk` does, and document why. Do not skip the `config.matcher` — middleware should still run so the skip is explicit.
5. **Never** narrow `config.matcher` to a list of dashboard prefixes. That is the usual way a new page ships unprotected.
