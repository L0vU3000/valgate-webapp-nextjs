# Valgate WebApp — Quickstart

Valgate is a **property portfolio management platform** built for property owners (and the managers who serve them). The app lets users build a verified digital record of every property — location, financials, rental, ownership, valuation, safety, estate planning, and documents — through a combination of manual entry, AI document scanning, and bulk spreadsheet import.

This is a **Next.js 15** application using the App Router, with **Neon Postgres + Drizzle ORM** for persistence, **Clerk** for authentication and organization management, **Tailwind CSS + shadcn/ui** for the frontend, and **S3** for file storage. AI features use **OpenAI** and **Anthropic** models via the Vercel AI SDK.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack, React 19) |
| Database | Neon Postgres (serverless WebSocket pool) + Drizzle ORM |
| Auth | Clerk (organizations, webhooks, OAuth for MCP) |
| UI | Tailwind CSS 4, shadcn/ui (Radix), Recharts, Mapbox GL |
| Storage | AWS S3 (presigned uploads/downloads) |
| AI | OpenAI + Anthropic via `ai` SDK (`generateObject` structured output) |
| Email | Resend |
| Rate Limiting | Upstash Redis (optional, in-memory fallback) |
| Testing | Vitest (unit), Playwright (E2E) |

## Getting Started

```bash
# Install dependencies
npm install

# Run dev server (Turbopack, port 3001)
npm run dev

# E2E dev mode (skips Clerk, enables demo writes)
npm run dev:e2e

# Run tests
npm test
npm run test:e2e

# Database
npm run db:generate   # generate migrations from schema changes
npm run db:migrate    # apply migrations
npm run db:check      # verify schema/migration sync
npm run seed          # seed test fixtures
```

### Required Environment Variables

See `/lib/env.ts` for the complete validated env boundary. Key variables:

- `DATABASE_URL` — Neon connection string (required)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk publishable key
- `CLERK_SECRET_KEY` — Clerk secret (set `sk_test_placeholder` for demo mode)
- `NEXT_PUBLIC_MAPBOX_TOKEN` — Mapbox access token (required, client-side)
- `OPENAI_API_KEY` — For AI document scanning and spreadsheet extraction
- `STORAGE_BUCKET`, `STORAGE_REGION`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY` — S3 config
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` — Transactional email
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — Rate limiting (optional)
- `CRON_SECRET` — Vercel cron job auth

See `.env.example` for placeholders.

## Documentation Sections

- [Architecture Overview](/openwiki/architecture/overview.md) — Layered architecture, auth context, middleware, and how requests flow from routes to database.
- [App Routes & Navigation](/openwiki/architecture/app-routes.md) — Route group structure, shell layout, property detail pages, API routes, and cross-org access.
- [Data Model](/openwiki/domain/data-model.md) — Database schema organization, multi-tenancy model, key entities, and the verification pillar system.
- [Ingestion Pipeline](/openwiki/domain/ingestion-pipeline.md) — AI-powered document scanning and bulk spreadsheet import for 14 entity types.
- [Integrations & Operations](/openwiki/operations/integrations.md) — External service integrations, environment config, MCP server, webhooks, and cron jobs.

## Current Branch State

The `cut-to-mvp-core` refactor (commit `5da1488f`) removed the entire Pro/manager cockpit (`app/(pro)/`), the AI overlay, the DB diagram tool, the professional directory, estate planning, analytics, compliance, work-orders, and Fumadocs documentation. The current branch focuses on the **consumer owner-facing app**: home dashboard, portfolio, rental, add-property wizard (with ingestion), property detail pages, and settings.

**Dormant directories:** `convex/` and `archive/` are not active on this branch.

## Key Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server on port 3001 with Turbopack |
| `npm run dev:e2e` | E2E mode: DEMO_MODE, no Clerk, demo writes enabled |
| `npm run build` | Production build (Turbopack) |
| `npm run seed` | Seed test fixtures (properties, clients) |
| `npm run db:generate` | Generate Drizzle migrations from schema |
| `npm run db:migrate` | Apply migrations |
| `npm run mcp:server` | Run the MCP server (for AI tool integration) |
| `npm run promote` | Fast-forward push current branch to `main` |
