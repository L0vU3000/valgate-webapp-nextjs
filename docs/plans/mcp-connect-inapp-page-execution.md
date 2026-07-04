# Execution Prompt — In-app "Connect Claude" surface (MCP)

> **Hosted visual plan:** `plan-5a3f987798d547de` — https://plan.agent-native.com/plans/plan-5a3f987798d547de
> (canvas storyboard: Settings entry → setup Sheet → connected-later; this doc is its in-git mirror + execution prompt).
>
> Paste the block below into a fresh **Opus 4.8 (1M context)** chat opened in this repo.
> Self-contained: real file paths, tokens, and locked decisions from a codebase
> research pass. Companion doc for the *consent* screens (a separate surface, already
> planned): `docs/plans/mcp-connect-login-consent-ui.md` (plan `plan-f25c07c2625443d1`).

---

```
You are building a feature in the Valgate Next.js 15 app (this repo). Follow
CLAUDE.md exactly (Server Components by default; DB access only through
lib/services/*; Zod on inputs; await params; NO mocks/placeholders — every value
must trace to real data). This repo uses graphify: run `graphify query "<question>"`
BEFORE grepping/reading source, and `graphify update .` when you finish.

## What you're building

An in-app **"Connect Claude"** surface so a property owner can discover and set up
the Valgate MCP connector for Claude. Valgate is itself an MCP server: users connect
Claude (Desktop or claude.ai) to their property data over OAuth. The connection
already works end-to-end — but there is NO in-app entry point, so a user can't
discover it or get the server URL. That entry point is the whole job. It is a pure
product-UI surface fully in Valgate's control.

This is NOT the OAuth consent screen. The Valgate-branded sign-in/consent screens
shown mid-OAuth are a separate, already-planned surface (`/oauth-consent`, plan
`plan-f25c07c2625443d1`) — do not touch them.

## Where it goes (verified — confirm still true, don't rediscover from scratch)

Settings already exists and is a single stacked-section page:
- Shell: `app/(shell)/layout.tsx`; sidebar `components/layout/Sidebar.tsx`
  (nav: Home, Portfolio, Directory, Rental, Analytics, Estate Planning, Pro,
  Settings `/settings`). No new nav item needed.
- Settings page: `app/(shell)/settings/page.tsx` →
  `app/(shell)/settings/_components/SettingsPage.tsx`, a 3-column grid of stacked
  sections (Profile, Security, Notifications, Preferences, Managers, Data & Privacy,
  Danger Zone) using a `sectionStyle()` animation helper.

**Build: a new "Connect Claude" section in `SettingsPage.tsx`, matching the existing
section pattern**, with the detailed setup opening in a Sheet (`components/ui/Sheet.tsx`).
Do NOT create a new route or nav entry unless the Sheet genuinely can't hold the
content — the section + Sheet is the on-pattern, minimal choice.

## Locked decisions

- **Section (compact) + Sheet (detail).** The Settings section is a short card:
  title "Connect Claude" (or "AI assistant"), one line ("Ask Claude about your
  properties, log maintenance, and more"), and a "Set up" button that opens the
  Sheet. The Sheet holds the full setup content below.
- **Instructional-first, not stateful.** The surface explains what connecting does,
  shows the MCP URL with a copy button, and gives step-by-step connect instructions.
  Detecting whether THIS user has already connected needs Clerk OAuth-grant queries
  and is DEFERRED (see Open question).
- **Permissions = grouped View / Modify / Delete, Delete flagged destructive**
  (mirrors consent-screen D2). Plain-language labels, not raw tool names. Derive
  from the LIVE `/mcp` surface only — that is `mcp-server/register.ts` +
  `mcp-server/writes.ts` + `mcp-server/resources.ts`. (Ignore `mcp-server/tools.ts`;
  it powers a different endpoint, `/api/mcp`, which is NOT the URL users connect to.)
  The real capabilities:
    - View: "See which of your workspaces you're connected to" (`list_workspaces`);
      "Find and list your properties" (`search_properties`); "Open a property's full
      record — leases, tenants, payments, valuations, safety, documents"
      (resource `valgate://property/{id}`); "See each property's completeness score"
      (resource `valgate://property/{id}/progress`); "See portfolio stats —
      occupancy, total value, this month's rent" (resource
      `valgate://portfolio/snapshot`).
    - Modify: "Create a new property" (`create_property`); "Edit a property's
      details" (`update_property`); "Log a maintenance issue" (`record_maintenance`).
    - Delete: "Preview what deleting a property would remove" (`preview_property_delete`,
      read-only); "Permanently delete a property" (`delete_property`, two-step
      confirm) — flag destructive.
  Honesty note: writes are always registered on `/mcp`; the service layer enforces
  the caller's org role (a viewer can't mutate). Present them plainly — there is no
  env write-gate on this endpoint.
- **MCP URL = request origin + `/mcp`.** In a Server Component read the origin from
  `headers()` (host) so preview/prod are correct; fall back to `NEXT_PUBLIC_APP_URL`.
  NEVER hardcode a preview hash. Surface it read-only with a Copy button (reuse the
  app's existing clipboard/toast pattern).
- **Set expectations about sign-in.** One honest line: after adding the URL in Claude
  you'll sign in and approve access; on the current setup that sign-in is hosted by
  our auth provider and may not be Valgate-branded yet. (Branded sign-in/consent
  lands only with the production Clerk instance + custom domain — out of scope.)
- **Design = `.impeccable.md` + real tokens (from `styles/theme.css`):** light,
  confident/modern/sharp, Airbnb-referenced, borders over shadows (1px
  `--border-default` #D1D5DB), typography-led (body Geist; do NOT use Bricolage for
  display). Blue is precious: the accent `--interactive-primary` (#2563EB) appears
  ONLY on the one primary action (the Copy URL / primary button). Surfaces:
  `--surface-base` (#FFF), hover `--surface-tint` (#EEF2F8), danger
  `--status-danger` (#E11D48), success `--status-success` (#059669). Reuse
  `components/ui/*`: Button (default/secondary/outline/ghost/destructive), Sheet,
  Input, Badge, EmptyState, Spinner.

## Setup content (inside the Sheet)

1. App-forward headline: "Connect Claude to your Valgate workspace."
2. "What Claude can do" — the grouped View / Modify / Delete list above.
3. The MCP URL field + Copy button.
4. Step-by-step: Open Claude → Settings → Connectors → Add custom connector → paste
   the URL → sign in → Approve. One line each for Desktop and claude.ai; note custom
   connectors may need a paid Claude plan.
5. The expectations line about the provider-hosted sign-in.
Reference (adapt, don't copy chrome): Notion's "Connect with Notion MCP" card
(headline, permission checklist, trust/URL notice); integrations-list refs Charma /
incident.io / User Interviews.

## Scope

IN: the Settings "Connect Claude" section, the setup Sheet (permissions + URL + copy
+ steps + expectations), real capability content derived from the tools/resources.
OUT: the `/oauth-consent` screens (separate plan), connection-status detection,
server-side disconnect/revoke, production-Clerk + custom-domain work.

## Open question (use the recommended default unless told otherwise)

**Connection status + disconnect.** Live "Claude is connected" status + a Disconnect
would need to read/revoke the user's Clerk OAuth grants. Recommended default: ship
WITHOUT live status; add a small "Manage or remove this connection in Claude's
settings" note, and leave a marked TODO for a later phase that queries Clerk OAuth
grants.

## Verify before finishing

- `./node_modules/.bin/tsc --noEmit` → 0 errors.
- `npm run lint` → clean.
- Every rendered value traces to real data/tool metadata (CLAUDE.md UI standard) —
  no invented strings; capability list reflects the server's ACTUAL allowWrites.
- Run the app; confirm the section renders in the real Settings page and the Sheet
  opens with a working Copy button.
- `graphify update .`.

Deliver: files touched, the exact MCP-URL logic used, and whether write tools are
enabled on the current HTTP transport (so the permission list is provably honest).
```

---

**Locked:** Settings *section* + setup *Sheet* (no new route/nav), instructional-first
scope, View/Modify/Delete grouping from the real tools with an honesty gate on
`allowWrites`, URL-from-request-origin (never hardcoded), `.impeccable.md` + real
`styles/theme.css` tokens, consent screens out of scope. **One open question**
(connection status/disconnect) carried in with a recommended default.
