# Integrations & Operations

Valgate integrates with several external services for authentication, storage, AI, email, and rate limiting. All integration configuration is validated through a single env boundary.

## Environment Configuration

**Source:** `/lib/env.ts`

All environment variables are validated through `@t3-oss/env-nextjs` with Zod schemas. Key design principle: **optional vars with fail-closed defaults** — an unset secret means "locked, never open."

### Server Variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `CLERK_SECRET_KEY` | Optional* | Clerk server API key (`sk_test_placeholder` for demo mode) |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Optional | Verifies Clerk webhook payloads |
| `DEMO_MODE` | Optional | `true`/`false` — skips Clerk auth, uses `DEMO_CTX` |
| `DEMO_ALLOW_WRITES` | Optional | `true`/`false` — allows writes in demo mode (local dev only) |
| `STORAGE_BUCKET` | Optional | S3 bucket name |
| `STORAGE_REGION` | Optional | S3 region |
| `STORAGE_ACCESS_KEY_ID` | Optional | S3 access key |
| `STORAGE_SECRET_ACCESS_KEY` | Optional | S3 secret key |
| `UPSTASH_REDIS_REST_URL` | Optional | Upstash Redis URL for rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Optional | Upstash Redis token |
| `DATABASE_AUTHENTICATED_URL` | Optional | Neon RLS authenticated role URL |
| `CRON_SECRET` | Optional | Vercel Cron job auth secret |
| `OPENAI_API_KEY` | Optional | OpenAI API key for AI extraction |
| `RESEND_API_KEY` | Optional | Resend API key for transactional email |
| `RESEND_WEBHOOK_SECRET` | Optional | Verifies Resend webhook payloads |
| `RESEND_FROM_EMAIL` | Optional | Sender email for Resend |
| `MCP_ALLOWED_OAUTH_CLIENT_IDS` | Optional | Comma-separated OAuth client ID allowlist for MCP |
| `MCP_ALLOW_ANY_OAUTH_CLIENT` | Optional | `true`/`false` — open MCP for DCR (fail-closed in production) |
| `SCAN_MODEL` | Optional | AI model slug for document scanning (default: `gpt-5.6-terra`) |
| `ANTHROPIC_API_KEY` | Optional | Required if `SCAN_MODEL` starts with `claude` |

### Client Variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Optional* | Clerk publishable key |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Yes | Mapbox access token for map components |

*In production, Clerk keys are required. In demo mode, they can be omitted.

## Clerk (Authentication)

**Sources:** `/lib/auth/ctx.ts`, `/middleware.ts`, `/app/layout.tsx`

Clerk handles user authentication, organization management, and OAuth for MCP.

- **Middleware** (`/middleware.ts`): Protects all non-public routes with `auth.protect()`. Public routes: `/login`, `/register`, `/accept-invitation`, `/forgot-password`, `/oauth-consent`, `/contact`, webhooks, `/mcp`, `/.well-known/*`, `/docs`.
- **`requireCtx()`** (`/lib/auth/ctx.ts`): The single caller of Clerk's `auth()`. Resolves Clerk user/org IDs to internal IDs (`ORG-0001`, `USR-0001`). JIT-syncs missing mirror rows.
- **Webhooks** (`/app/api/webhooks/clerk/`): Authoritative steady-state writer for user/org/membership mirror tables.
- **DEMO_MODE**: When `CLERK_SECRET_KEY` is `sk_test_placeholder`, middleware skips Clerk and uses `DEMO_CTX` (refused in production).

### Identity Sync

**Source:** `/lib/services/identity-sync.ts`

Single writer for Clerk mirror tables (`users`, `organizations`, `organization_memberships`). Functions: `upsertUser()`, `upsertOrg()`, `upsertMembership()`, `ourOrgId()`, `ourUserId()`, `normaliseRole()`. Called by `requireCtx()` for JIT bootstrapping and by Clerk webhooks for steady-state updates.

## Neon Postgres + Drizzle ORM

**Sources:** `/lib/db/client.ts`, `/lib/db/schema/index.ts`

- **Client**: `@neondatabase/serverless` Pool with `ws` WebSocket constructor. Single `db` export marked `"server-only"`.
- **Schema**: 15 Drizzle modules, ~35 tables. See [Data Model](/openwiki/domain/data-model.md) for schema details.
- **Migrations**: `drizzle-kit` generates SQL migrations in `/drizzle/`. Run `npm run db:generate` / `npm run db:migrate`.
- **Schema assertions**: `npm run db:assert` runs `/scripts/schema-assert.ts` to verify schema integrity.

## S3 Storage

**Sources:** `/lib/services/s3Client.ts`, `/lib/services/storage.ts`

- **`s3Client.ts`**: Creates AWS S3 client from env vars.
- **`storage.ts`**: Presigned upload/download URLs, file lifecycle management, best-effort cleanup.
- **Upload constants**: `/lib/upload-constants.ts` defines file size/type limits.
- **Property photos**: `/app/actions/property-photos.ts` handles photo upload, gallery management, and cover photo selection.

### Draft File Staging

`property_draft_files` stores staged S3 keys during the add-property wizard. On submit, these keys are reused verbatim as `documents.storage_id` — no re-keying or re-upload needed.

## AI Integration (OpenAI + Anthropic)

**Sources:** `/lib/services/document-scan.ts`, `/lib/services/unified-extract.ts`

Uses the Vercel AI SDK (`ai` package) with `generateObject` for structured output.

- **Document scanning**: Vision models extract property data from scanned documents. Model is swappable via `SCAN_MODEL` env var. Supports OpenAI (default: `gpt-5.6-terra`) and Anthropic (`claude` prefix). Uses self-consistency voting across multiple extractions.
- **Spreadsheet extraction**: OpenAI `generateObject` with `unifiedPlanSchema` maps spreadsheet columns to Valgate fields for all 14 entity types. Strict structured-output mode (arrays, not records, to comply with API constraints).
- **API key**: `OPENAI_API_KEY` is read automatically by `@ai-sdk/openai`. `ANTHROPIC_API_KEY` is required for Claude models.

See [Ingestion Pipeline](/openwiki/domain/ingestion-pipeline.md) for pipeline architecture.

## Resend (Email)

**Sources:** `/lib/email-templates/`, `/app/api/webhooks/resend/`

- **Transactional email**: Client invitation emails, bounce notifications.
- **Webhooks**: `/app/api/webhooks/resend/` handles delivery events and bounces.
- **Templates**: Email templates in `/lib/email-templates/`.

## Upstash Redis (Rate Limiting)

**Sources:** `/lib/ratelimit.ts`

- **Rate limiting**: Used for MCP endpoint protection (200 req/min/IP).
- **In-memory fallback**: When Upstash vars are unset, falls back to an in-memory limiter (dev/test only).
- **MCP rate limiting**: Applied in middleware for `/mcp` and `/.well-known/*` routes.

## MCP Server

**Sources:** `/app/mcp/`, `/lib/auth/mcp-ctx.ts`, `/mcp-server/index.ts`

Exposes a Model Context Protocol server at `/mcp` that allows AI tools (like ChatGPT) to interact with the user's property portfolio.

- **Auth**: Uses Clerk OAuth tokens (not session cookies). Separate context resolver: `mcp-ctx.ts`.
- **Client ID allowlisting**: `MCP_ALLOWED_OAUTH_CLIENT_IDS` comma-separated allowlist. When unset, `MCP_ALLOW_ANY_OAUTH_CLIENT` must be `true` to accept any client (fail-closed in production, permissive in dev).
- **Run locally**: `npm run mcp:server` or `npm run mcp:inspect` (with MCP Inspector).

## Cron Jobs

**Source:** `/app/api/cron/cleanup-drafts/route.ts`

- **Draft cleanup**: Removes expired property drafts. Protected by `CRON_SECRET` (Vercel sends as `Authorization: Bearer` header). Vercel Cron triggers this route on a schedule.

## OpenSpec

**Source:** `/openspec/changes/`

The project uses OpenSpec for tracking architectural changes. Each change contains a proposal, spec, and tasks. Active/recent changes:

- `cut-to-mvp-core` — The ruthless MVP cut that removed the Pro cockpit, AI overlay, and secondary features.
- `unify-ingestion-pipeline` — Unified document scan + spreadsheet import into one pipeline.
- `property-cover-photo` — Cover photo picker and `cover_storage_id` column.
- `property-edit-section-nav` — Free-nav edit sections for property details.

## Testing

| Command | Purpose |
|---|---|
| `npm test` | Vitest unit tests |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:db` | Vitest with DB config |
| `npm run test:e2e` | Playwright E2E tests |
| `npm run test:e2e:auth` | Playwright with auth setup |
| `npm run dev:e2e` | Dev server in E2E mode (demo, no Clerk) |

Test files are colocated with source (e.g., `/lib/services/properties.test.ts`) or in `/tests/` for integration tests.
