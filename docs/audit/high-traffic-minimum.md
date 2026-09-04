# High-traffic readiness audit — Honolulu system-check worktree

Branch: `L0vU3000/system-check`
Date: 2026-09-03
Scope: minimum system needed to support 100–500 daily active users (DAU) on the Valgate webapp.

## Current runtime

- `vercel.json` only defines one cron job (`/api/cron/cleanup-drafts` at 04:00).
- `next.config.ts` configures Next.js 15 + Turbopack with server actions, barrel optimization for `lucide-react` and `motion`, and a 4 MB server-action body size limit.
- No explicit production host is declared in repo files; Vercel is the implied target.

## 1. Database layer

### Connection

- `lib/db/client.ts` uses `@neondatabase/serverless` with a lazy `Pool`.
- The pool is created on first DB access and shared per server instance.
- `DATABASE_URL` is validated via `@t3-oss/env-nextjs`.

### Concern: connection pool

Neon serverless `Pool` default size is small. For 100–500 DAU on Vercel serverless, the main risk is not max concurrent users (the app is unlikely to have hundreds of simultaneous connections) but **cold starts** and **pool churn** if many small invocations hit the DB.

Minimum recommendation:
- Use **Neon pooled connection string** (`?sslmode=require` or `pgbouncer` mode) for serverless.
- Set `max=10` on the Pool explicitly, or use Neon's pooled endpoint which already multiplexes.
- Monitor `active_connections` in Neon during launch.

### Migrations

- `drizzle-kit generate` / `migrate` workflow is in place.
- `drizzle-kit check` reported a collision between snapshots `0008` and `0011` in the audit run. This should be resolved before production traffic.

## 2. Caching strategy

### Next.js cache

- `lib/data/properties.ts` uses `unstable_cache` + React `cache()`.
- `lib/data/cached-reads.ts` implements a `readThrough` helper backed by **Upstash Redis**.
- `bustCache()` deletes Redis keys by tag when mutations occur.
- Loading skeletons exist for all major `(shell)` routes.

### Status

- Caching architecture is present and well-structured.
- Upstash is optional in dev; **production must set** `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` or every read goes straight to Neon.

## 3. Rate limiting

- `lib/ratelimit.ts` supports both Upstash and an in-memory fallback.
- Currently wired for:
  - `verifyLimiter` — 5/min/user on property pillar verify/revoke
  - `mcpLimiter` — 60/min/user on `/mcp`
  - `apiReadLimiter` — 120/min/user on API v1 reads
- Middleware has a per-IP rate limiter on `/mcp` and `/.well-known/*`.

### Gap

Most CRUD mutations (property, tenant, folder, document, lease, etc.) do **not** have an app-level rate limiter. They rely on Clerk session auth only. For 500 DAU this is acceptable if users are authenticated and non-abusive, but high-traffic minimum should add a shared `actionLimiter` (e.g., 30/min/user) to imports, uploads, and destructive actions.

## 4. File uploads and storage

- Uploads go through **presigned S3 POST** (`lib/services/storage.ts`).
- Client-side and server-side both enforce `ALLOWED_MIME` and `MAX_BYTES = 10 MB`.
- Server action body size limit raised to 4 MB for compressed photos; documents use presigned POST so they don't hit this limit.
- S3 error bodies are redacted before logging.

### Concern

Presigned POST fields expire. With 500 DAU, S3 costs and bandwidth are negligible, but a public presign endpoint could be abused if not rate-limited. Add the shared `actionLimiter` to `uploadDraftFileAction`.

## 5. Static assets and bundle

- `optimizePackageImports` reduces bundle size for icon and animation libraries.
- `outputFileTracingIncludes` includes `./public/data/**/*` for all routes.
- `serverExternalPackages: ["mapbox-gl"]` keeps Mapbox out of the client bundle.

### Concern

`public/data` may contain large seed/demo files. If those are included in every route's trace, cold-start bundle size grows. Review whether all routes truly need the full data directory, or scope it to routes that read it.

## 6. Cron / background work

- One Vercel cron: cleanup-drafts at 04:00.
- Cron route checks `CRON_SECRET` (server-only env var).
- No heavy background jobs defined.

## 7. Minimum production system recommendation

For 100–500 DAU, the minimum stack is:

| Layer | Recommendation |
|---|---|
| Host | Vercel Pro (for function duration, concurrency, and support) |
| Framework | Next.js 15 on Vercel |
| DB | Neon serverless Postgres with **pooled connection string** |
| Cache | Upstash Redis (enables `readThrough` cache and shared rate limits) |
| Auth | Clerk production instance |
| Storage | AWS S3 with private bucket + presigned POST |
| Rate limit | Upstash Redis + `lib/ratelimit.ts` |
| Cron | Vercel Cron (Pro) |

## 8. Quick fixes before high traffic

1. Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in production.
2. Use Neon pooled `DATABASE_URL` and consider a small `max` pool size.
3. Add a shared `actionLimiter` to all mutation actions, especially uploads and imports.
4. Resolve the `drizzle-kit check` snapshot collision.
5. Scope `outputFileTracingIncludes` for `public/data` to only routes that need it.
6. Add a simple load test (k6/Artillery) against preview for `/login`, `/app`, and `/app/property/[id]`.

## 9. Verdict

The architecture can support 100–500 DAU with the recommended minimum stack. The app already has caching, lazy DB pooling, presigned uploads, and partial rate limiting. The main missing pieces are production-grade Upstash config, uniform mutation rate limits, and resolving the migration-chain warning.
