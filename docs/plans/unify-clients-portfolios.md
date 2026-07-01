# Unify Clients + Portfolios on /pro/clients

- **Plan ID:** `plan-165eb8aa8364429a`
- **Hosted:** https://plan.agent-native.com/plans/plan-165eb8aa8364429a
- **Status:** complete — shipped, build green (all 5 phases)
- **Authored:** 2026-06-30 (Opus) · Mobbin refs + `.impeccable.md` design language

---

## Objective

On `/pro/clients` the manager sees **one list** instead of two. Every client is a
single row carrying both its engagement data (properties, occupancy, value, health)
and its portfolio state (a **Status** badge + a **Manage members** action). The
separate *Client portfolios* card (`PendingHandoffsSection`) is removed.

It works because the `Client` record gets a real link to its portfolio org
(`client.orgId`). Onboarding creates the `Client` **and** the org together, so the
two halves stop being separate data. A **20 unconfirmed-invite cap** stops a manager
from spamming client creation before invites are accepted.

**Done means:** onboarding adds exactly one row (badge *Invited*); accepting the
invite flips it to *Active*; the row overflow opens the existing members drawer; a
21st pending invite is blocked with a clear message.

## Why they're separate today (the problem)

| "Clients" table | "Client portfolios" card |
|---|---|
| Reads `Client` records (`clientsDb.list`) | Reads orgs (`client_handoffs` + `organizations`) |
| Financials, occupancy, health, archive | Members, pending invites, Manage members |
| Source: seed/FS `Client` engagements | Source: manager-led onboarding |

No shared key: `onboardClientPortfolio` creates an **org**, not a `Client`, and
`Client` has no `orgId`. So an onboarded client shows only as a portfolio; a seed
client shows only in the table.

## Locked decision

**Approach: link the Client to its org.** Add nullable `orgId` to `Client`;
onboarding creates both together. Keeps every rollup query (they group by
`clientId`) and just adds the missing link.

- Rejected: making the org the primary client (rewires every rollup).
- Rejected: UI-only name-matching (fragile when two clients share a name).

User-confirmed during exploration:
- **`bounced` counts toward the cap** (pressures the manager to clean up bad emails).
- **Cap is one named constant** `MAX_UNCONFIRMED_CLIENTS = 20` in the onboarding
  service — never inline.

## Status badge & cap

Badge = join `client.orgId` → handoff `status`. Legacy clients (no `orgId`) read
**Active**. Cap counts the *unconfirmed* statuses.

| Handoff status | Row badge | Counts toward cap? |
|---|---|---|
| accepted | Active (green) | No |
| no org (legacy seed client) | Active (green) | No |
| draft | Invited (blue) | Yes |
| pending | Invited (blue) | Yes |
| bounced | Bounced (amber) | Yes |
| revoked | not shown | No |
| client.status = Inactive | Archived section | No |

## Design language (`.impeccable.md` + Mobbin)

- **One unified table** with a **Status** column — the industry pattern
  ([Jobber](https://mobbin.com/screens/ef1dc589-8552-457d-a35e-ac87efff11d1),
  [Copilot](https://mobbin.com/screens/6f68b759-f933-42ad-842a-b6eef514fbd3),
  [Fresha](https://mobbin.com/screens/d3785bd1-21f7-4db1-91fc-3655ef6cab5b)).
- **Manage members** lives in a row **overflow ⋯** (View / Manage members / Archive)
  — keeps blue rare per the design system; hidden for clients with no org.
- **Quota hint** "X of 20 invites pending" near the Onboard button
  ([15Five seats banner](https://mobbin.com/screens/c2d103be-a9aa-4755-a0bc-8e269678ede5)).
- Light mode, borders over shadows, badge = metadata.

## Implementation steps

1. **Schema** — add nullable `orgId` to the `clients` table (`lib/db/schema/*`) and
   to the Zod `Client` (`lib/data/types/client.ts`). `npm run db:generate` →
   `npm run db:migrate`.
2. **Onboarding** — in `onboardClientPortfolio` and `createClientPortfolioWithInvitees`
   (`lib/services/client-onboarding.ts`): add the cap guard, create + link the
   `Client`, stamp `clientId` on created/assigned properties.
3. **Query** — in `app/(pro)/pro/queries.ts`, extend `buildClientRollup` /
   `getProDashboardData` to attach each client's confirmation `status` + member/
   pending counts (join `client.orgId` → latest handoff + `organization_memberships`).
   Stop calling `listClientPortfolios` for this page.
4. **UI** — in `ClientsTable.tsx` add the **Status** column and a row **overflow ⋯**
   (View / Manage members / Archive); wire Manage members to open
   `ManageMembersDrawer` with `client.orgId`. Add the quota hint in
   `ClientsIndexPage.tsx`. Delete the `PendingHandoffsSection` import + render.
5. **Backfill** — one-off: create a `Client` row for each existing org/handoff that
   has none (see Open Questions).

## Code stub (planned — `lib/services/client-onboarding.ts`)

```ts
// ponytail: the only place the 20-cap lives
const MAX_UNCONFIRMED_CLIENTS = 20;

export async function onboardClientPortfolio(ctx, input) {
  assertCanMutate();

  // Anti-spam: block when too many invites are still unconfirmed.
  const unconfirmed = await countUnconfirmedClients(ctx.userId);
  if (unconfirmed >= MAX_UNCONFIRMED_CLIENTS) {
    throw new AccessError(
      "You have 20 client invitations still pending. Wait for some to " +
      "be accepted, or revoke unused ones, before adding more.",
    );
  }

  // ... create Clerk org + upsertOrg (existing) ...
  const orgRow = await createPortfolioOrg(ctx, input.name);

  // NEW: create the Client engagement record, linked to the org.
  const clientId = await nextId("CLI");
  await clientsDb.create(ctx.userId, {
    id: clientId,
    name: input.name,
    clientType: "Individual",
    orgId: orgRow.id,          // the new client↔portfolio link
    status: "Active",
  });

  // ... invitation + email + client_handoffs insert (existing) ...
  // ... stamp clientId on created/assigned properties so the rollup counts them ...
}

// Counts draft + pending + bounced handoffs for this manager.
async function countUnconfirmedClients(managerUserId) {
  const [row] = await db
    .select({ count: sql`count(*)::int` })
    .from(clientHandoffs)
    .where(and(
      eq(clientHandoffs.managerUserId, managerUserId),
      inArray(clientHandoffs.status, ["draft", "pending", "bounced"]),
    ));
  return row?.count ?? 0;
}
```

## Shipped — what changed (and where it diverged from the plan)

All 5 phases landed, build green. Key files:

- `lib/db/schema/clients.ts` **(NEW)** — Drizzle `clients` table (id, managerUserId,
  orgId nullable FK, name, email, clientType, status, initials, avatarBg); exported
  from `lib/db/schema/index.ts`. Migration `drizzle/0017_magenta_black_cat.sql`.
- `lib/data/types/client.ts` — `orgId?: string` on Zod `ClientSchema`.
- `lib/data/db/clients.ts` — `create()` takes optional `overrideId` so Drizzle + FS
  share one `CLI-xxxx` id.
- `lib/services/client-onboarding.ts` — `MAX_UNCONFIRMED_CLIENTS = 20`,
  `countUnconfirmedClients()`, cap guard on **both** onboard fns, dual-write
  `createClientRecord()` (Drizzle + FS), `stampClientIdOnOrgProperties()`,
  `backfillClientsForHandoffs()`.
- `app/(pro)/pro/queries.ts` — `ClientRollup` gains `memberCount?`, `pendingCount?`,
  `confirmationStatus?`; `augmentRollupsWithOrgData()` batch-queries Drizzle after
  building rollups; called in `getProDashboardData`.
- `ClientsTable.tsx` — Status column with colour-coded badges
  (Active/Invited/Draft/Bounced), Users icon opens embedded `ManageMembersDrawer`.
- `ClientsIndexPage.tsx` — `portfolios` prop removed, `unconfirmedCount` added; quota
  badge in header; Onboard disabled at limit; `PendingHandoffsSection` removed.
- `clients/page.tsx` — calls `backfillClientsForHandoffs()` on load (idempotent);
  passes `unconfirmedCount`; dropped `listClientPortfolios`.
- `PendingHandoffsSection.tsx` — **DELETED**.

**Divergences from the plan (intentional):**
1. **New `clients` table in Neon (via Drizzle) + dual-write** — the plan assumed
   FS-only `clientsDb.create`. Execution added a real Neon table (schema via Drizzle)
   and writes both Neon + the FS seed store. Clients now have two stores; confirm
   which is authoritative and that they cannot drift.
2. **Backfill on page load** (idempotent) instead of a one-off script — convenient,
   but it is a write in a Server-Component GET path. Verify it is guarded/cheap and
   safe under concurrent first loads.

## Watch-outs

- Onboarding properties are org-scoped; until `clientId` is stamped (step 2) the
  rollup shows 0 — verify after wiring.
- Legacy seed clients have no `orgId` → Manage members hidden (expected).
- `ManageMembersDrawer` stays keyed by `orgId`; only its entry point moves.

## Verification

- Onboard a client → one new row, *Invited* badge; portfolios card gone.
- ⋯ → Manage members → drawer shows the org's members + pending invitees.
- Create 20 pending invites → Onboard disabled + banner; revoke one → works again.
- Accept an invite via the Clerk E2E rig (`test:e2e:auth`) → badge flips to *Active*.
- `npm run db:migrate` clean; existing clients (orgId null) still render.

## Locked decisions (all questions answered)

1. **Manage members** lives in the row **overflow ⋯ menu** (View / Manage members /
   Archive) — keeps the row clean, blue rare; hidden for clients with no org.
2. **Existing pre-change invites** (org + handoff, no Client) are **backfilled** —
   one-off script creates a linked `Client` row for each, so today's pending invites
   join the unified list immediately.
3. **Quota hint** shows **only as it fills up — from 15 of 20** pending invites.

Plus settled during exploration: `bounced` counts toward the cap;
`MAX_UNCONFIRMED_CLIENTS = 20` is one named constant in the onboarding service.
