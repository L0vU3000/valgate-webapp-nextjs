# Valgate — Production Handoff

> Snapshot of the current state of the app: what's built, what's wired to real data, what's live in production, and what's still open. Written 2026-07-06 against branch `L0vU3000/vercel-preview-only`, HEAD `e8fac2e`.

---

## 1. What Valgate is

Valgate is a real-estate portfolio management app with two user experiences on one codebase:

- **Standard (owner) cockpit** — an individual property owner tracks their own portfolio: financials, rental status, ownership docs, safety/compliance, valuation, and estate planning, per property.
- **Pro (manager) cockpit** — a property manager runs a book of clients' portfolios from one dashboard: rent collection, work orders, compliance deadlines, and a client-invitation workflow that hands a portfolio to its real owner while the manager keeps a scoped, permissioned view.

Both surfaces share the same backend entities and the same AI assistant infrastructure, and both are reachable through a Claude/MCP connector for AI-driven property management.

---

## 2. Tech stack

| Concern | Choice |
|---|---|
| Framework | Next.js 15 (App Router, Server Components by default) |
| Styling | Tailwind CSS + shadcn/ui |
| Auth | Clerk (organizations = tenants; roles: owner/admin/editor/viewer) |
| Database | Neon (serverless Postgres) + Drizzle ORM |
| Validation | Zod, shared between UI, Server Actions, and the MCP tool schemas |
| Forms | React Hook Form + Zod |
| Email | Resend |
| File storage | AWS S3 (property photos, documents) |
| Caching | Upstash Redis read-through cache (falls back to in-memory if unset) |
| Maps | Mapbox |
| AI | Anthropic (`claude-sonnet-4-6` via Vercel AI SDK) for the in-app assistant; OpenAI (`gpt-4o-mini`) for document summaries |
| MCP | `@modelcontextprotocol/sdk`, Clerk OAuth for the Claude connector |

---

## 3. Feature inventory

### 3.1 Auth & accounts

- **Clerk-backed** login, register, forgot-password (OTP-based reset), accept-invitation (client accepts a manager's portfolio handoff), and oauth-consent (branded consent screen for the MCP connector).
- **Site-password gate removed** from the live flow (commit `5b87dd8`) — the app is reachable without a shared password; only Playwright test stubs still reference `SITE_PASSWORD`.
- **Standard ⇄ Pro account type** — shipped 2026-07-06 (commit `a5be65a`). A segmented control in Settings → Account type flips a user between the two cockpits, backed by the existing `is_manager` flag. The Sidebar's "Pro" nav item, the header pill, and the `/pro` route are now gated identically, and flipping Pro → Standard while inside `/pro` redirects the user out.

### 3.2 Client (Standard owner) cockpit — `app/(shell)/**`

| Route | What it does |
|---|---|
| `/` (home) | Dual-panel dashboard: live Mapbox map with property pins/layer toggles on one side, a property table with color-coded progress bars on the other. Cmd+K command palette searches properties/documents/tenants. Portfolio KPIs (total value, expected rent) roll up from 14 service queries. |
| `/portfolio` | Portfolio-level KPIs and property list. Fully wired. |
| `/property/[id]/overview` | Per-property summary (lease, tenant, payments, expenses, notifications, maintenance). Fully wired. |
| `/property/[id]/rental` | Rent ledger — leases, tenants, payments, expenses, documents, maintenance. Fully wired. |
| `/property/[id]/ownership` | Co-owners, ownership history/records, ownership documents. Fully wired. |
| `/property/[id]/documents` | Document + folder management. Fully wired (one deliberate placeholder: the upload demo file list). |
| `/property/[id]/valuation` | Valuation KPI cards wired to real `PropertyValuation` data; market-insight/comparables sections are still placeholders — blocked on an external comparable-sales data source decision. |
| `/property/[id]/location` | Land parcel data wired; map placeholder and comparable-sales rows still hardcoded (same external-data blocker as valuation). |
| `/property/[id]/safety` | Inspections/certifications/risks/emergency contacts are fetched but the KPI row (compliance %, days-to-expiry, open-issue count) is still hardcoded — deliberately deferred pending a KPI-formula decision. |
| `/add-property` | 7-step wizard (type → basic info → financials → photos/documents → review → success, plus a start/draft-picker step). **Fully resumable** — drafts persist server-side per `(org, user)` in `property_drafts`/`property_draft_files` (S3 keys only), autosave on every step, survive refresh via URL param or localStorage fallback. Steps 2–6 are code-split. |
| `/analytics` | Portfolio-wide KPIs, yield ranking, lease pipeline. Fully wired. |
| `/rental` | Cross-portfolio rent pipeline dashboard (arrears, occupancy, lease expiry). Mostly wired; a hero sparkline and one heatmap section (would need a new `Unit` entity) remain hardcoded pending a multi-unit-vs-single-unit product decision. |
| `/directory`, `/directory/[id]` | Professional/vendor directory. Fully wired. |
| `/estate-planning` | Successors, beneficiary assignment, estate documents, activity timeline. Fully wired except 2 action stubs (Generate Report / Download Summary) waiting on PDF infrastructure. |
| `/activity` | Read-only, org-wide audit log (last 50 events across properties, payments, leases, documents, safety, estate, etc). |
| `/dbdiagram` | Live ER diagram auto-introspected from the Zod entity types, with per-entity wiring status — a dev/ops tool, not a customer-facing feature. |
| `/settings` | Restructured (2026-07-06) into one shell with a grouped left nav: **Account** (Profile, Security, Account type, Managers, Data & Privacy, Danger zone) and **App** (Notifications, Preferences, Connect Claude). The old standalone `/profile` route now redirects into Account → Profile. |
| Notifications | Bell + side panel, live-wired (Phase 8.8). 6 categories (maintenance, leasing, compliance, payment, applications, access), mark-read/mark-all/delete, per-user preferences, linked from Settings → Notifications. |

### 3.3 Pro (manager) cockpit — `app/(pro)/pro/**`

| Route | What it does |
|---|---|
| `/pro/dashboard` | Book-level KPIs, alerts, portfolio value/occupancy/rent-collection/expense roll-up. |
| `/pro/clients` | Cross-client directory with per-client roll-up stats and manager role assignments. |
| `/pro/clients/[clientId]` | Single client's portfolio, owner-statement preview, scoped derivations. |
| `/pro/properties` | Cross-client property register, **grouped by owner** (collapsible bands, "My Portfolio" pinned and styled distinctly), with a group/flat toggle and search/type/status filters. |
| `/pro/rent` | Rent roll, overdue triage, occupancy, lease-expiry timeline. |
| `/pro/work-orders` | Maintenance queue by severity, vendor pool, unassigned-urgent count, cost tracking. |
| `/pro/compliance` | Certification expiry timeline (90-day window), open safety risks, inspection log. |
| `/pro/add-account` | Manager-side client/portfolio creation (create tenant/lease as part of onboarding). |
| `/pro/agents` | Agent Hub page — present in the route tree but effectively a placeholder for future functionality, not a shipped feature. |

### 3.4 Manager-led client onboarding & permission system

A manager can build out a client's portfolio before the client ever signs up, then hand it over:

1. **Manager creates a portfolio** (with 0+ properties, invitee optional) — a new Clerk organization is created up front; invitations are deferred if no email is given yet (shows a "Draft" badge, still counts toward the 20-invite cap).
2. **Manager invites the client by email** — an invitation + in-app notification is sent with a sign-up link.
3. **Client accepts** (`/accept-invitation`) — becomes `org:admin` of their own organization; the manager's role in that org can be retained as read-only or exited.
4. **Change-request loop** — once a client owns their org, a manager with `org:viewer` there can no longer write directly. Instead they **propose** a change (property/lease/tenant/payment edit) via `lib/services/change-requests.ts`; the client approves or denies; approval applies the mutation, denial notifies the manager.

This is the "client is the permission leader" model: the real owner always has final say over their own data once they've accepted.

### 3.5 In-app AI assistant

Two layers exist, at different levels of readiness:

- **Overlay UI** (`components/layout/AIOverlay.tsx`) — a full-screen, 3-pane (Sessions / Chat / Assets) glass dialog, mounted today only on consumer routes (`/portfolio`, `/property/[id]`) — **not yet on `/pro/**`**.
- **Tool-using layer** (`lib/actions/ai-tools.ts`) — the assistant runs on Claude via the Vercel AI SDK with **5 read tools** (query properties/leases/payments/etc.) and **7 `propose_*` write tools** — writes are never executed directly, they render an approval card the user has to click. A simpler deterministic/keyword fallback exists for when the model call isn't available.
- **Planned, not yet built** (`docs/plans/mcp-tools-in-app-ai.md`, authored 2026-07-06): unify this with the MCP write surface — execute reads and non-destructive writes directly (same authorization guardrails as MCP), keep a human-confirm gate only for deletes. Also planned: mounting the overlay inside the Pro shell, streaming responses, and per-route slash commands.

### 3.6 MCP / "Connect Claude" surface

- **16 tools** live at `app/mcp/route.ts`: 2 reads (`list_workspaces`, `search_properties`) + 14 writes (property CRUD, lease CRUD, tenant CRUD, `record_payment`/`delete_payment`, `record_maintenance`).
- Authenticated via **Clerk OAuth** (RFC 9728 protected-resource metadata at `/.well-known/oauth-protected-resource/mcp`); writes are role-enforced in the service layer (viewers refused, member+ can write); deletes require an explicit confirm step.
- The legacy `/api/mcp` surface has been **removed** (commit `3e1f55d`) — `/mcp` is the only MCP endpoint now.
- **In-app setup UI**: Settings → App → Connect Claude (`ConnectClaudeSection.tsx`) shows the connector URL (computed live from request headers, no hardcoding) and starts the OAuth flow.

---

## 4. Backend & data

- All data access goes through `lib/services/*` (one module per entity — properties, leases, tenants, payments, expenses, documents, folders, notifications, change-requests, client-invitations, portfolio-members, estate/successors, safety/inspections/certifications, ownership, land parcels, valuations, professionals, activities, etc.), called from Server Actions. No component or route handler queries the DB directly.
- **~25 entities** are modeled end-to-end (see `.claude/data-audit/ai-data-ref/entities.md` for the full field-level reference).
- A route-by-route wiring audit (`.claude/data-audit/ai-data-ref/pages.md`) tracks exactly which on-screen numbers are real vs. placeholder; the summary above reflects its latest state. The three routes with remaining hardcoded surfaces are all **known and deliberately deferred**, not bugs:
  - Safety KPI derivation (formula decision pending)
  - Valuation/location market-comparable data (external data source decision pending)
  - Rental heatmap (`Unit` entity decision pending — multi-unit vs single-unit-per-property)
- Migrations: `npm run db:generate` → `npm run db:migrate`; verify with `npm run db:ping`. Seeding is `npm run seed:neon` — **never run `seed:reset`** against real data, it destroys evolved seed/demo data.

---

## 5. Testing

- **Unit/service tests:** Vitest (`npm run test`), plus a DB-backed suite (`npm run test:db`).
- **Authorization tests:** `tests/authz/` — 26/26 green, covering role-gating and IDOR (cross-org access) for every mutating service.
- **E2E:** Playwright (`npm run test:e2e`), plus a real-Clerk auth rig (`npm run test:e2e:auth`) that provisions real test users instead of mocking auth. Requires Node ≥ 24 for the auth project.

---

## 6. Deployment state (as of 2026-07-06)

The app is deployed and reachable, but the **production-hardening checklist is not fully complete** — treat this as "live but not fully hardened," not "fully launched." Full checklist: `docs/migration/PROD-DEPLOY-CHECKLIST.md`.

**Done:**
- Site-password gate removed from the deployed flow.
- Legacy `/api/mcp` surface removed; `/mcp` is the sole MCP endpoint.
- Domain decisions locked: app on `www.valgate.co`, Clerk subdomain on `clerk.valgate.co`.
- Decision locked: production launches with an **empty** database — no seed data for real users.

**Still open (blocking full production hardening):**
1. **Clerk production instance** — still running on dev/test Clerk keys; `pk_live_`/`sk_live_` + the `clerk.valgate.co` DNS record + the prod webhook are not yet set up. This is also what's blocking the branded (not default-Clerk) sign-in and OAuth-consent screens.
2. **Neon prod database password rotation** — the current prod connection string was exposed in chat earlier and must be rotated before it's trusted in Vercel.
3. **`MCP_ALLOW_ANY_OAUTH_CLIENT=true`** must be set in Vercel Production env — required for Claude's Dynamic Client Registration to work; without it `/mcp` fails closed in production.
4. **RLS (Row-Level Security)** on Neon — plan exists (`docs/migration/RLS-PLAN.md`) but not yet turned on; needs `DATABASE_AUTHENTICATED_URL` and real prod Clerk JWTs to test against.
5. **Error monitoring** — a Sentry connector exists but has not been authorized in this environment.
6. Full env var list and required secrets are itemized in `PROD-DEPLOY-CHECKLIST.md` §4.

---

## 7. Recommended next steps, in order

1. Stand up the Clerk production instance + `clerk.valgate.co` DNS (unblocks branded auth/consent and gives a stable origin for everything else).
2. Rotate the Neon prod password, run `db:migrate` against it, confirm empty-launch (no seed).
3. Set the full Production env var list in Vercel, including `MCP_ALLOW_ANY_OAUTH_CLIENT=true`.
4. Deploy + smoke-test: sign-up → add a property with a photo → sign out/in → connect Claude end-to-end (list properties, one write round-trip).
5. Turn on RLS, then wire up error monitoring (Sentry).
6. Product-side, resolve the three deferred data decisions (safety KPI formula, external comparable-sales source, Unit vs single-unit-per-Property) to close out the last hardcoded surfaces.
7. Execute `docs/plans/mcp-tools-in-app-ai.md` to give the in-app AI assistant the same real write access the MCP connector already has, and mount the assistant overlay inside the Pro cockpit.
