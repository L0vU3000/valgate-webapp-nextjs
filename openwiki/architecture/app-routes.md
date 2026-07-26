# App Routes & Navigation

The Next.js App Router organizes routes into two route groups: **(auth)** for unauthenticated/auth flows and **(shell)** for the authenticated owner-facing app. The current branch focuses on the consumer owner experience after the `cut-to-mvp-core` refactor removed the Pro manager cockpit.

## Route Group Structure

```
app/
├── (auth)/               # Auth flows (no sidebar/shell)
│   ├── login/            # Sign-in + Clerk multi-step tasks
│   ├── register/         # Sign-up
│   ├── accept-invitation/ # Manager-invited client onboarding
│   ├── forgot-password/
│   └── oauth-consent/    # MCP OAuth consent screen
├── (shell)/              # Authenticated app shell
│   ├── page.tsx          # Home dashboard → /
│   ├── portfolio/        # Portfolio overview → /portfolio
│   ├── rental/           # Rental dashboard → /rental
│   ├── add-property/     # Multi-step property wizard → /add-property
│   ├── property/[id]/    # Property detail sub-routes → /property/[id]/*
│   ├── profile/           # Redirects to /settings?section=profile
│   └── settings/          # Settings → /settings
├── actions/              # Server actions (transport layer)
├── api/                  # API routes
└── mcp/                  # MCP server endpoint
```

## Auth Flow

```
Unauthenticated → /login or /register (or /accept-invitation with ticket)
                      ↓ (Clerk sign-in/up)
                 /launch (route decider — resolves home org, routes by role)
                      ↓
              /app/(shell)/*  (owner dashboard)
```

- **`/app/layout.tsx`**: Root layout wraps everything in `<ClerkProvider>` with custom auth pages at `/login` and `/register`. Post-sign-in redirect goes to `/launch`.
- **`/app/(auth)/actions.ts`**: `resolveDefaultHomeOrgAction()` ensures the user has a home workspace. `getInviteePrefillNameAction()` decodes Clerk invitation tickets.
- **`/app/(auth)/_lib/resolve-redirect-url.ts`**: Sanitizes `redirect_url` param — only same-origin relative paths, no auth-loop paths.

## Shell Layout

**Source:** `/app/(shell)/layout.tsx`

Server component with `force-dynamic`. On every request:

1. Calls `requireCtx()` for authenticated user/org context
2. Stamps `lastActiveAt` (for manager presence indicators)
3. Resolves manager status + managed accounts in parallel
4. Shows `<ManagerContextBanner>` if a manager is viewing a client's org
5. Shows `<ClientWelcomeBanner>` if a pending client welcome exists
6. Fetches properties + notifications
7. Wraps in `<AppHeaderProperties>` → `<ShellLayout>` → `<NotificationsProvider>`

### ShellLayout Component

**Source:** `/components/layout/ShellLayout.tsx`

Client component providing the app shell:
- **Desktop**: Collapsible `<Sidebar>` in a rail (hidden on mobile)
- **Mobile**: Sidebar in a `<Sheet>` drawer triggered by `<PhoneTopBar>`
- Dark mode state (currently disabled — toggle is `aria-disabled`)
- `<Toaster position="bottom-right">` for notifications

### Sidebar

**Source:** `/components/layout/Sidebar.tsx`

Two variants:
- **`"rail"`** (desktop): collapsible `w-16 ↔ w-52` with chevron toggle
- **`"drawer"`** (mobile): always expanded, closes on navigation

**Navigation items:**
| Label | Route |
|---|---|
| Home | `/` |
| Portfolio | `/portfolio` |
| Rental | `/rental` |
| Settings | `/settings` |

Uses Clerk's `useUser`, `useOrganization`, `useClerk` for avatar display. User avatar navigates to `/settings?section=profile`. Sign-out button calls `signOut({ redirectUrl: "/login" })`.

## Shell Routes

### Home Dashboard (`/`)

**Sources:** `/app/(shell)/page.tsx`, `/app/(shell)/queries.ts`

`getHomePageData()` fetches 13 data types in parallel (properties, payments, leases, valuations, tenants, ownership records, co-owners, ownership docs, safety risks, inspections, certifications, emergency contacts, estate assignments, documents), computes progress per property, and returns `HomePageData` with properties, portfolio stats, and documents.

### Portfolio (`/portfolio`)

**Sources:** `/app/(shell)/portfolio/page.tsx`, `/app/(shell)/portfolio/queries.ts`

Supports `?archived=true` query param. Uses `unstable_cache` for cached reads. Displays stats, KPIs, archived count. `canDelete` flag for admin/owner.

### Rental Dashboard (`/rental`)

**Sources:** `/app/(shell)/rental/page.tsx`, `/app/(shell)/rental/queries.ts`

Rental pipeline: arrears, maintenance, occupancy, income trends, eviction risk, heatmap.

### Add Property Wizard (`/add-property`)

**Sources:** `/app/(shell)/add-property/page.tsx`, `/app/(shell)/add-property/_components/`

Multi-step wizard with server-side draft persistence. Sub-routes:
- `/add-property/import` — Bulk spreadsheet import (unified ingestion)
- `/add-property/import-tenants` — Tenant-specific import
- `/add-property/import-valuations` — Valuation-specific import

Key components: `Step0NewOrDraft`, `AddPropertyFlow`, `Step6Success`, `LocationPickerModal`, `AdvisorModal`.

### Property Detail (`/property/[id]/*`)

Every property detail sub-route follows an identical pattern:

1. Await `params.id` + `searchParams.orgId`
2. Call `resolveCrossOrgCtx(orgId)` → returns `{ ctx, isCrossOrg }`
3. Fetch property (cross-org via `getPropertyForOrg`, else `getPropertyByIdParam`)
4. Fetch progress context + page-specific data in parallel
5. Wrap in `<PropertyShellProvider property={...} progressDetails={...}>`
6. Render page component

**Sub-routes:**

| Route | Page Component | Purpose |
|---|---|---|
| `/property/[id]/overview` | `PropertyOverviewPage` | Property overview with location, media, cover photo |
| `/property/[id]/ownership` | `PropertyOwnershipPage` | Co-owners, ownership records, ownership documents, history |
| `/property/[id]/rental` | `PropertyRentalPage` | Tenants, leases, payments, expenses |
| `/property/[id]/valuation` | `PropertyValuationPage` | Property valuations |
| `/property/[id]/documents` | `PropertyDocumentsPage` | Folders, documents, file management |
| `/property/[id]/location` | `PropertyLocationPage` | Map location, verification |
| `/property/[id]/edit` | `EditPropertyForm` | Owner-only property editing (no cross-org) |

**Cross-org access:** The `?orgId=` query param lets managers view client portfolios. `resolveCrossOrgCtx()` in `/lib/auth/cross-org.ts` handles this safely.

### Settings (`/settings`)

**Sources:** `/app/(shell)/settings/page.tsx`, `/app/(shell)/settings/queries.ts`

Fetches settings data, profile data, and MCP URL (`/mcp` from request host). Includes notification preferences, manager access section (admin+ only), and MCP endpoint display.

## API Routes

### `/api/add-property/scan`

**Source:** `/app/api/add-property/scan/route.ts`

Handles document upload and AI-powered property extraction. Accepts a file (image/PDF), sends to the document scan service, returns structured property data.

### `/api/cron/cleanup-drafts`

**Source:** `/app/api/cron/cleanup-drafts/route.ts`

Vercel cron job that cleans up expired property drafts. Protected by `CRON_SECRET` (sent as `Authorization: Bearer` header).

### `/api/webhooks/clerk`

Clerk webhook handler. Authoritative steady-state writer for user/org/membership mirror tables. Handles user creation, org creation, membership changes.

### `/api/webhooks/resend`

Resend webhook handler for email delivery events and bounces.

### `/api/documents`

Document-related API routes (presigned S3 uploads/downloads).

## MCP Endpoint

**Source:** `/app/mcp/`

The `/mcp` route exposes an MCP (Model Context Protocol) server that allows AI tools (like ChatGPT) to interact with the user's property portfolio. Auth uses Clerk OAuth tokens with client ID allowlisting. See [Integrations & Operations](/openwiki/operations/integrations.md) for details.
