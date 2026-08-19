# HTTP API v1

> **Not deployed.** This surface exists in the codebase but is not exposed/announced in
> production yet. Treat everything below as the contract it will have when it ships, not a
> live integration point.

Read-only, additive HTTP surface alongside the existing MCP server (`/mcp`). It reuses the
same identity/org resolution as MCP (`ctxFromMcpAuth`) rather than duplicating auth logic.

## Auth

- Bearer token: `Authorization: Bearer <Clerk session token>` (a standard Clerk *session*
  token, not the MCP surface's OAuth/machine token). A valid session cookie also works, since
  Clerk's `acceptsToken: "session_token"` accepts either.
- The token resolves to a Valgate `{ userId, orgId, orgRole }` Ctx via the same org-lookup
  `/mcp` uses. A multi-org user with no explicit org gets their primary org (most senior role,
  tie-broken by org id) — identical to an MCP read.
- **Read-only, no JIT provisioning.** Unlike `/mcp`, an unknown Clerk user (no existing
  Valgate row) is never auto-provisioned here — `ctxFromMcpAuth` is called with
  `provisionIfMissing: false`. A read must never have the side effect of creating a
  user/org/membership row; an unknown caller just gets a generic 401.

## Routes

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/me` | The caller's own profile |
| GET | `/api/v1/properties` | Opaque-cursor page of the caller's org's properties |
| GET | `/api/v1/properties/{id}` | A single property's detail, org-scoped |

### `GET /api/v1/me`

Response body (`MeDto`):

| Field | Type | Notes |
|---|---|---|
| `email` | `string` | |
| `displayName` | `string \| null` | |
| `role` | `"owner" \| "admin" \| "member" \| "viewer"` | The caller's role in their resolved org |
| `orgName` | `string` | |

No internal `userId`/`orgId` is ever included.

### `GET /api/v1/properties`

Query params:

| Param | Required | Notes |
|---|---|---|
| `limit` | no | Integer, `1`–`100`. Default `20`. Anything else (non-integer, `0`, `>100`) → 400. |
| `cursor` | no | Opaque string from a previous response's `nextCursor`. Never construct or decode it yourself. |

Response body:

```json
{ "items": [PropertyListItemDto, ...], "nextCursor": "opaque-string-or-null" }
```

`PropertyListItemDto` fields: `id`, `name`, `type`, `status`, `city`, `province`, `createdAt`.

Pagination is a real DB cursor (ordered by `createdAt, id`), not offset/limit — `nextCursor` is
`null` once there is no further page. The cursor is validated on decode: it must carry a finite,
nonnegative `createdAt` and a nonempty `id`, or the request is rejected as a 400 before any
query runs (a tampered/foreign cursor is never silently ignored or partially trusted).

### `GET /api/v1/properties/{id}`

Response body (`PropertyDetailDto`): the list fields above plus `addressLine`, `country`,
`totalArea`, `bedrooms`, `bathrooms`, `yearBuilt`.

A property that doesn't exist and a property that exists in a **different** org are
indistinguishable here — both return a plain 404. The lookup is org-scoped
(`WHERE orgId = ctx.orgId`), so there is no separate "exists but not yours" case to leak.

## DTO omissions (by design)

None of the v1 DTOs ever include: internal `userId`/`orgId`/`clientId`, any storage id
(`photoStorageIds`, `documentStorageIds`, `coverStorageId`), any evidence-doc id array
(`rentalEvidenceDocIds`, `estateEvidenceDocIds`, `locationEvidenceDocIds`,
`financialsEvidenceDocIds`), or financial/`*Verified*` internals — regardless of how many
fields the underlying DB row carries. `toMeDto`/`toPropertyListItemDto`/`toPropertyDetailDto`
in `lib/api/v1/dto.ts` are hand-written field lists, never a spread of the full row.

## Errors

Every failure returns the same stable envelope:

```json
{ "error": { "code": "unauthorized", "message": "Authentication required." } }
```

| Status | `code` | When |
|---|---|---|
| 401 | `unauthorized` | No/invalid auth, or a resolved Ctx with no matching profile (`/me`) |
| 400 | `invalid_request` | Invalid `limit`, or an invalid/tampered `cursor` |
| 404 | `not_found` | Property absent or in a different org |
| 429 | `rate_limited` | Rate limit exceeded |
| 500 | `internal_error` | Unexpected service/serialization error |

A caught internal error's `message` is never echoed to the client — every response uses a
fixed, generic string per status/code. Every route's handler body runs inside a try/catch: any
unexpected error from the services layer or DTO serialization is logged server-side and answered
with the same generic 500 `internal_error` envelope — the surface fails closed rather than
letting a raw error reach Next's default error handling.

## Rate limit

120 requests / minute / user (`apiReadLimiter`, keyed on the resolved internal `userId`, after
auth succeeds — unauthenticated requests never count against it). Looser than the MCP limiter
(60/min) since every route here is a plain read.

## Non-goals (read-only surface)

- No write/mutation endpoints (no POST/PUT/PATCH/DELETE).
- No JIT user/org/membership provisioning on an unknown caller (see Auth above).
- No endpoints beyond `me` and `properties` today — no leases, payments, documents, tenants,
  etc.
