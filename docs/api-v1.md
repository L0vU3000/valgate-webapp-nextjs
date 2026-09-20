# HTTP API v1

> **Deployed.** The `/api/v1/*` surface is live in production at `https://www.valgate.co`.
> The read routes and property write routes are deployed; the document write routes below
> are the versioned contract for the next production rollout.

Additive HTTP surface alongside the existing MCP server (`/mcp`). It reuses the same
identity/org resolution as MCP (`ctxFromMcpAuth`) rather than duplicating auth logic.

## Auth

- Bearer token: `Authorization: Bearer <Clerk session token>` (a standard Clerk *session*
  token, not the MCP surface's OAuth/machine token). A valid session cookie also works, since
  Clerk's `acceptsToken: "session_token"` accepts either.
- The token resolves to a Valgate `{ userId, orgId, orgRole }` Ctx via the same org-lookup
  `/mcp` uses. A multi-org user with no explicit org gets their primary org (most senior role,
  tie-broken by org id) — identical to an MCP read.
- **No JIT provisioning.** Unlike `/mcp`, an unknown Clerk user (no existing
  Valgate row) is never auto-provisioned here — `ctxFromMcpAuth` is called with
  `provisionIfMissing: false`. An API request must never have the side effect of creating a
  user/org/membership row; an unknown caller just gets a generic 401.

## Routes

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/me` | The caller's own profile |
| GET | `/api/v1/properties` | Opaque-cursor page of the caller's org's properties |
| GET | `/api/v1/properties/{id}` | A single property's detail, org-scoped |
| GET | `/api/v1/properties/{id}/documents` | Opaque-cursor page of one property's documents, org-scoped |
| POST | `/api/v1/properties/{id}/documents` | Issue a direct object-storage upload ticket |
| POST | `/api/v1/properties/{id}/documents/complete` | Record a completed direct upload |
| GET | `/api/v1/properties/{id}/documents/{documentId}` | Resolve a short-lived document URL |
| PATCH | `/api/v1/properties/{id}/documents/{documentId}` | Rename or edit public document metadata |
| DELETE | `/api/v1/properties/{id}/documents/{documentId}` | Delete a document and its stored bytes |

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

`PropertyListItemDto` fields: `id`, `name`, `type`, `status`, `lat`, `lng`, `city`, `province`,
`createdAt`. `lat`/`lng` are the property's coordinates, for map pin placement.

Pagination is a real DB cursor (ordered by `createdAt, id`), not offset/limit — `nextCursor` is
`null` once there is no further page. The cursor is validated on decode: it must carry a finite,
nonnegative `createdAt` and a nonempty `id`, or the request is rejected as a 400 before any
query runs (a tampered/foreign cursor is never silently ignored or partially trusted).

### `GET /api/v1/properties/{id}`

Response body (`PropertyDetailDto`): the list fields above (including `lat`/`lng`) plus
`addressLine`, `country`, `totalArea`, `bedrooms`, `bathrooms`, `yearBuilt`.

A property that doesn't exist and a property that exists in a **different** org are
indistinguishable here — both return a plain 404. The lookup is org-scoped
(`WHERE orgId = ctx.orgId`), so there is no separate "exists but not yours" case to leak.

### `GET /api/v1/properties/{id}/documents`

Query params:

| Param | Required | Notes |
|---|---|---|
| `limit` | no | Integer, `1`–`100`. Default `20`. Anything else (non-integer, `0`, `>100`) → 400. |
| `cursor` | no | Opaque string from a previous response's `nextCursor`. Never construct or decode it yourself. |

Response body:

```json
{ "items": [DocumentListItemDto, ...], "nextCursor": "opaque-string-or-null" }
```

`DocumentListItemDto` fields: `id`, `propertyId`, `folderId`, `name`, `kind`, `mimeType`,
`extension`, `sizeBytes`, `category`, `description`, `uploadedAt`.

Pagination is a real DB cursor (ordered by `uploadedAt, id`), not offset/limit —
`nextCursor` is `null` once there is no further page. The cursor is validated on decode:
it must carry a finite, nonnegative `uploadedAt` and a nonempty `id`, or the request is
rejected as a 400 before any query runs (a tampered/foreign cursor is never silently
ignored or partially trusted).

A property that doesn't exist and a property that exists in a **different** org are
indistinguishable here — both return a plain 404, and documents are never listed for a
property the caller cannot see. An in-org property with no documents is a 200 with
`items: []` and `nextCursor: null`. Every org role (`viewer`, `member`, `admin`, `owner`)
may read; this route is not admin-gated.

This endpoint returns document **metadata only**. It never returns a file URL, a storage
id, or file bytes. Opening/downloading a document is not part of this read.

### `POST /api/v1/properties/{id}/documents`

Issues a five-minute presigned POST for a direct object-storage upload. Requires a `member`,
`admin`, or `owner` role. The caller must upload the returned form fields and file to `url`
before calling the completion endpoint.

Request body:

```json
{
  "name": "deed.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 123456,
  "category": "Title",
  "description": "Optional note"
}
```

`mimeType` must be one of the server's allowed upload types and `sizeBytes` must be between
1 byte and 10 MB. `category` is one of `Title`, `Rental`, `Photos`, `Legal`, `Financial`,
`Estate`, or `Other`.

Response body (`DocumentUploadTicketDto`):

```json
{
  "url": "https://storage.example/presigned",
  "fields": { "Content-Type": "application/pdf", "...": "..." },
  "storageId": "ORG-0001/DOC-0007/deed.pdf"
}
```

The `storageId` is an opaque completion handle. Clients must not construct or modify it.

### `POST /api/v1/properties/{id}/documents/complete`

Records the uploaded object after the direct POST succeeds. Requires the same write role as
the ticket endpoint. The `storageId` must belong to the caller's resolved organization.

Request body:

```json
{
  "storageId": "ORG-0001/DOC-0007/deed.pdf",
  "name": "deed.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 123456,
  "category": "Title",
  "description": "Optional note"
}
```

Returns `201` with `DocumentListItemDto`. Storage ids, uploader ids, and file bytes are never
returned.

### `GET /api/v1/properties/{id}/documents/{documentId}`

Returns a short-lived file URL for an in-org document. Every role may read. A document whose
property does not match `{id}` is returned as a plain 404.

Response body (`DocumentDownloadDto`):

```json
{ "url": "https://storage.example/signed-get", "urlExpiresAt": 1760000300000 }
```

`urlExpiresAt` is an epoch-milliseconds timestamp. The response contains no storage id.

### `PATCH /api/v1/properties/{id}/documents/{documentId}`

Renames a document or edits its public metadata. Requires `member`, `admin`, or `owner`.
Only `name`, `category`, and `description` are accepted; storage, property, uploader, and
verification fields cannot be changed through this API.

Returns `200` with the updated `DocumentListItemDto`.

### `DELETE /api/v1/properties/{id}/documents/{documentId}`

Deletes the org-scoped document row and performs best-effort object-storage cleanup. Requires
`admin` or `owner`. A successful deletion returns `204` with an empty body.

## DTO omissions (by design)

None of the v1 DTOs ever include: internal `userId`/`orgId`/`clientId`, any storage id
(`photoStorageIds`, `documentStorageIds`, `coverStorageId`, `storageId`, `thumbStorageId`),
any evidence-doc id array (`rentalEvidenceDocIds`, `estateEvidenceDocIds`,
`locationEvidenceDocIds`, `financialsEvidenceDocIds`), `uploadedBy`, `verifies`, AI-summary
internals (`aiStatus`, `aiSummary`, `aiKeyFields`, `pageCount`), or financial/`*Verified*`
internals — regardless of how many fields the underlying DB row carries.
`toMeDto`/`toPropertyListItemDto`/`toPropertyDetailDto`/`toDocumentListItemDto` in
`lib/api/v1/dto.ts` are hand-written field lists, never a spread of the full row.

## Errors

Every failure returns the same stable envelope:

```json
{ "error": { "code": "unauthorized", "message": "Authentication required." } }
```

| Status | `code` | When |
|---|---|---|
| 401 | `unauthorized` | No/invalid auth, or a resolved Ctx with no matching profile (`/me`) |
| 400 | `invalid_request` | Invalid `limit`, or an invalid/tampered `cursor` |
| 403 | `forbidden` | The caller's role cannot perform the requested mutation, or writes are disabled in demo mode |
| 404 | `not_found` | Property absent or in a different org (including the nested documents list) |
| 429 | `rate_limited` | Rate limit exceeded |
| 500 | `internal_error` | Unexpected service/serialization error |

A caught internal error's `message` is never echoed to the client — every response uses a
fixed, generic string per status/code. Every route's handler body runs inside a try/catch: any
unexpected error from the services layer or DTO serialization is logged server-side and answered
with the same generic 500 `internal_error` envelope — the surface fails closed rather than
letting a raw error reach Next's default error handling.

## Rate limit

Read routes allow 120 requests / minute / user (`apiReadLimiter`); mutation routes allow 30
requests / minute / user (`apiWriteLimiter`). Both are keyed on the resolved internal
`userId`, after auth succeeds — unauthenticated requests never count against either limiter.

## Non-goals

- No JIT user/org/membership provisioning on an unknown caller (see Auth above).
- No raw file-byte proxying through the API; uploads and downloads go directly through the
  short-lived object-storage URLs.
- No endpoints beyond `me`, `properties`, and property documents today — no leases, payments,
  tenants, or document search/filtering.
