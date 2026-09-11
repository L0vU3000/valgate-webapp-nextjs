# Security baseline (minimum) — route handlers

Audit of every `route.ts` under `app/` as of TM1-67. This is the open item from the
security audit: each handler must authenticate the caller (or verify a signature /
shared secret) and validate input before it touches a service.

**Deliberate exceptions** (documented, not “fixed” into session-cookie auth):

- **Clerk webhook** is public by design. Auth is Svix/Clerk signature verification
  (`verifyWebhook`), not `auth.protect()` / `requireCtx()`.
- **API v1** skips `auth.protect()` on purpose so an unauthenticated bearer request
  returns the documented JSON `{ error: { code, message } }` envelope instead of an
  HTML login redirect / Clerk `protect-rewrite` 404. Each v1 handler still calls
  `resolveApiV1Ctx()` (Clerk session token → org-scoped `Ctx`).

A later documents GET (`/api/v1/properties/{id}/documents`) is in flight on another
PR and is not in this table until it lands on `main`.

## Handler table

| Route | Methods | Auth | Input validation | Result |
|---|---|---|---|---|
| `app/api/webhooks/clerk/route.ts` | `POST` | **Public by design.** Middleware skips `auth.protect()`. `verifyWebhook()` checks `CLERK_WEBHOOK_SIGNING_SECRET`. Bad signature → 400. | Event `type` is switched; payload fields are read after signature verify. Malformed-but-signed events can still 500 on a missing field (Clerk retries). No user session. | Deliberate exception. No session-cookie auth. |
| `app/api/webhooks/resend/route.ts` | `POST` | **Public to Clerk session; self-authenticated.** Middleware skips `auth.protect()`. Requires `RESEND_WEBHOOK_SECRET` (503 if unset). Verifies Svix headers (`svix-id`, `svix-timestamp`, `svix-signature`) via `resend.webhooks.verify`. Bad/missing signature → 400. | Recipient email is read only as a string or `string[]`. Unknown event types are ignored. Bounce type is accepted only when it is a string. | Fixed this audit: was behind `auth.protect()`, which blocked Resend. |
| `app/api/cron/cleanup-drafts/route.ts` | `GET` | **Public to Clerk session; self-authenticated.** Middleware skips `auth.protect()`. Requires `Authorization: Bearer ${CRON_SECRET}`. Missing secret or mismatch → 401 (fail closed). | No user body. The `30` day TTL is a server constant, not request input. | Fixed this audit: was behind `auth.protect()`, which blocked Vercel Cron. |
| `app/api/add-property/scan/route.ts` | `POST` | Clerk session via middleware `auth.protect()`, then `resolveRouteCtx()` (JSON 401 if unsigned-in / no org). `aiLimiter` 10/min/user. | Multipart `file` must be a `File`, MIME in `ALLOWED_MIME`, size ≤ 10 MB (`MAX_BYTES`). | Fixed this audit: unauthenticated `requireCtx()` throw is now JSON 401, not a framework 500. |
| `app/api/documents/[id]/summarize/route.ts` | `POST` | Same session path as scan: `auth.protect()` + `resolveRouteCtx()` → 401. `aiLimiter` 10/min/user. `getDocument(ctx, id)` is org-scoped (other-org id → 404, no IDOR leak). | Path `id` trimmed, non-empty (400 if blank). Model output validated with Zod `SummarySchema`. | Fixed this audit: JSON 401, id validation, paid-model rate limit. |
| `app/api/v1/me/route.ts` | `GET` | **Deliberate `auth.protect()` bypass.** `resolveApiV1Ctx()` (Bearer Clerk session token, `provisionIfMissing: false`). Missing/unknown caller → JSON 401. Read limiter 120/min. | No request body. Missing profile row is also a generic 401 (not 404). | Already correct. Exception is the middleware bypass only. |
| `app/api/v1/properties/route.ts` | `GET` | Same v1 bearer seam as `/me`. | `limit` must be a plain integer in `[1, 100]` or omitted (default 20) — never silently clamped. Invalid/expired `cursor` → 400. | Already correct. Writes on this path belong to a separate in-flight PR and were not changed here. |
| `app/api/v1/properties/[id]/route.ts` | `GET` | Same v1 bearer seam as `/me`. | Path `id` is passed to org-scoped `getProperty`. Missing or other-org → generic 404. | Already correct. PATCH/DELETE belong to a separate in-flight PR and were not changed here. |
| `app/mcp/route.ts` | `GET`, `POST` | **Public to Clerk session; self-authenticated.** Middleware skips `auth.protect()`. `withMcpAuth` + `verifyClerkToken` (OAuth machine token). OAuth client allowlist (fail-closed in production when unbound). Per-user `mcpLimiter`. Missing/invalid token → 401 + resource metadata pointer. | MCP protocol payload is handled by `mcp-handler`. Tools resolve `Ctx` via `ctxFromMcpAuth` (org-scoped services). Unauthenticated extra.userId fails closed. | Already correct. Rate-limit 429 is applied after the tool runs (documented limitation; not this ticket). |
| `app/.well-known/oauth-protected-resource/mcp/route.ts` | `GET`, `OPTIONS` | **Public discovery (RFC 9728).** No session. Tells MCP clients which Clerk authorization server to use. CORS preflight via `OPTIONS`. | No mutation input. `resource` origin is rebuilt from `x-forwarded-host` / `host` so a reverse proxy does not advertise an internal bind address. | Already correct. Public by spec. |

## What this audit changed

1. **Middleware** — `/api/webhooks/resend` and `/api/cron/cleanup-drafts` skip `auth.protect()`, matching the Clerk webhook pattern. The handlers still authenticate (Svix / `CRON_SECRET`). Session-cookie JSON routes (`scan`, `summarize`) stay protected.
2. **`resolveRouteCtx()`** — JSON routes map `requireCtx()`'s `"unauthenticated"` throw to HTTP 401. Other errors (including `DEMO_MODE` refused in production) still throw.
3. **Summarize** — path id is validated; paid-model `aiLimiter` matches document scan.

## What was left alone on purpose

- Clerk webhook payload Zod-parsing — signature verify is the auth; tightening field schemas is a separate hardening pass.
- API v1 write methods, documents GET, DTO / `docs/api-v1.md` — owned by in-flight PRs.
- MCP post-handler 429 (tool still executes) — documented in the architecture primer; not an auth-bypass.
