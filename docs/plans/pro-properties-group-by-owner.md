# Properties register — group by owner

- **Plan ID:** `plan-e389da3d972b4a2a`
- **Hosted:** https://plan.agent-native.com/plans/plan-e389da3d972b4a2a
- **Status:** shipped (recommended defaults A/A/A/A locked & implemented; tsc + eslint green on touched files) — pending manual browser QA
- **Authored:** 2026-07-02 (Opus) · branch `L0vU3000/pro-ui-ux`
- **Design refs (Mobbin):** Deel *Billing → Accounting* (expandable group header + count badge + aggregate total + nested rows) is the closest match; also Braintrust grouped table, Quicken subtotal tree / left-rail account grouping, Origin & Monarch per-account "see all" cards.

---

## Objective

`/pro/properties` is today a single flat table of every property the manager touches —
their own book and all client books interleaved, with ownership hidden in one **Client**
column. Past a couple of clients it stops answering the first question: *whose properties
am I looking at?*

Reorganise it **property-first** (it stays the asset register, distinct from `/pro/clients`
which is the relationship view) but grouped under each **owner**: **My Portfolio** pinned
first, then each client as a collapsible band with a one-line roll-up summary, each opening
into that owner's full portfolio view.

**Done when:** the register groups by owner with My Portfolio pinned first, each band shows
live roll-up stats and a working *View portfolio →*, bands collapse to a scannable overview,
and a *Flat list* toggle preserves today's cross-owner table for bulk actions.

## Core direction (settled)

Group the register by owner. **My Portfolio** (directly-held book) pinned first with an
accent edge; each **client** follows as a collapsible band ordered by portfolio value. Band
headers carry stats already computed in `ClientRollup`; *View portfolio →* routes to the
existing `/pro/clients/[clientId]` page (own book via `OWN_PORTFOLIO_ID`) — the drill-in is
zero new UI.

## What already exists (wire, don't build)

- **Every header stat** (count, total value, rented/vacant, occupancy, avg progress, alerts)
  is already derived per owner by `buildClientRollup` / `buildOwnPortfolioRollup` in
  `app/(pro)/pro/queries.ts` (the `ClientRollup` type).
- **Own vs. client split** is solved: `OWN_PORTFOLIO_ID` + `buildOwnPortfolioRollup` treat
  unassigned properties as one "My Portfolio" owner; dashboard + shell already prepend it.
- **Drill-in page exists:** `/pro/clients/[clientId]` (`getClientPortfolioData`) already
  renders a full portfolio and already handles `OWN_PORTFOLIO_ID`.
- **Row rendering** (name/address, type + status pills, `DrawInBar` progress, value,
  relative updated) is the current table markup — reused verbatim inside each band.

## The delta (three changes)

1. **Query** — `getProPropertiesData` returns `groups` (one per owner) alongside the
   existing flat `properties`.
2. **Page** — a *Group by owner ⇄ Flat list* toggle; group mode renders owner bands, flat
   mode keeps today's table.
3. **Component** — new `PropertyOwnerBand` (collapsible header + nested rows + *View
   portfolio* link).

## Planned data shape

```ts
// app/(pro)/pro/queries.ts — getProPropertiesData()
export type ProOwnerGroup = {
  ownerId: string;            // client.id, or OWN_PORTFOLIO_ID for the manager's book
  ownerName: string;          // "My Portfolio" | client.name
  isOwnPortfolio: boolean;
  initials: string;
  avatarBg: string;
  propertyCount: number;
  totalValueFormatted: string;
  rentedCount: number;
  vacantCount: number;
  occupancyRate: number;
  avgProgress: number;
  alertCount: number;
  properties: ProPropertyRow[];   // rows already built by buildPropertyRow()
};

export type ProPropertiesData = {
  groups: ProOwnerGroup[];        // My Portfolio first, then clients by value desc
  properties: ProPropertyRow[];   // flat list retained for Flat mode + bulk actions
  clients: Array<{ id: string; name: string }>;
  summary: BookSummary;           // unchanged — feeds the book-level KPI strip
};
```

Grouping is a client-side regroup of data `loadProContext` already fetches (own book +
client handoff orgs) — no new query cost. `groups` fields all come straight from
`ClientRollup`; `properties` stays flat so Flat mode + bulk assign/CSV keep a cross-owner
selection.

## Files touched

| File | Change | Reuses |
|---|---|---|
| `app/(pro)/pro/queries.ts` | Reshape `getProPropertiesData` to return `groups` (+ keep flat `properties`). | `buildClientRollup`, `buildOwnPortfolioRollup`, `buildPropertyRow`, `OWN_PORTFOLIO_ID` |
| `app/(pro)/pro/properties/_components/PropertiesRegisterPage.tsx` | Add Group/Flat toggle; render bands in group mode; keep current table in flat mode; retire client dropdown in group mode. | `KpiMetricStrip`, `WidgetCard`, existing row markup, search/type/status filters |
| `app/(pro)/pro/properties/_components/PropertyOwnerBand.tsx` **(new)** | Collapsible owner header band: stats + *View portfolio →* wrapping its property rows. | type/status pills, `DrawInBar`, `formatRelativeTime`, `next/link` |
| `app/(pro)/pro/clients/[clientId]/page.tsx` | No change — drill-in target already renders the full portfolio (own book via `OWN_PORTFOLIO_ID`). | `getClientPortfolioData` |

## Interaction & states

- **Collapse / expand** per band (`useState` keyed by `ownerId`). Chevron + whole header row
  toggle it; the *View portfolio →* link navigates instead.
- **Group order** — My Portfolio always first (shown even when empty, inviting a first
  property), then clients by total value descending.
- **Filters still apply** — search / type / status filter rows inside bands and hide any
  band left with zero matches. The **client dropdown is retired** in group mode.
- **Flat-list mode** restores today's exact table (Client column + client filter) so
  **bulk "assign to client"** and **CSV import** keep a cross-owner selection.
- **Empty book** — no owners yet → current empty-state copy under a single My Portfolio band.

## Design spec

- **Owner band header** (L→R): collapse chevron · owner avatar · name · `N properties`
  count pill · alert chip (only when alerts > 0, amber) · muted stat line
  (`$value · R rented / V vacant · P% avg progress`) · right-aligned *View portfolio →*.
- **My Portfolio distinction** — 3px accent left border + faint accent-tinted header +
  rounded **accent square** avatar (clients get a **circular** initials avatar). Reads as
  "you" without a separate tab.
- **Density & hierarchy** — band header is the emphasis line; nested rows indent and **drop
  the Client column** (the band already says who). Book-level **KPI strip** stays on top
  ("how big is everything") — bands answer "whose is what"; the two never repeat a number at
  the same altitude.
- **Alerts** — a small amber chip only on owners that have them, so attention lands on the
  one or two clients that need it.

## Scope & non-goals

- **In:** owner grouping, band component, Group/Flat toggle, retire client filter in group
  mode, drill-in wiring.
- **Out (unchanged):** `/property/[id]` detail route, Add Property / CSV / bulk-assign flows
  themselves, `/pro/clients` and `/pro/clients/[clientId]`, all server-side derivation math.

## Risks

- An owner with many properties makes a long expanded band → collapsed-by-default mitigates.
- Properties in client portfolio orgs already merge into `ctx.properties`; confirm the
  grouping key matches their `clientId` (not just the current org) so they land in the right
  band.

## Verification

1. `npm run dev` → `/pro/properties`: My Portfolio pins first with the accent edge; each
   client band's value / occupancy matches its `/pro/clients/[clientId]` page (they reconcile
   because both read `ClientRollup`).
2. Expand / collapse a band; **Collapse all** → scannable overview; *View portfolio →* on My
   Portfolio opens the own book, on a client opens that client's portfolio.
3. Toggle **Flat list** → today's table returns; select 2 properties across owners →
   **Assign to client** and **CSV import** still work.
4. Apply a status filter → bands with no matching rows disappear; result count stays accurate.
5. `npx tsc --noEmit` and `npm run lint` clean.

## Decisions (locked — recommended defaults chosen)

1. **Default state on load** — **Collapsed** (page opens as the scannable owner overview).
2. **Flat-list mode** — **Kept** as a Group ⇄ Flat segmented toggle; bulk assign / CSV live
   in flat mode.
3. **"View portfolio →" target** — the **existing** `/pro/clients/[ownerId]` portfolio page
   (own book via `OWN_PORTFOLIO_ID`).
4. **Band header stats** — the **full** set: count · value · rented/vacant · occupancy · avg
   progress · alert chip (actionable severities only).

## Implementation (shipped)

- `app/(pro)/pro/queries.ts` — added `ProOwnerGroup`; `getProPropertiesData` now returns
  `groups` (My Portfolio first via `buildOwnPortfolioRollup`, then client bands by value
  desc) alongside the flat `properties`. Stats come straight from `ClientRollup`;
  `alertCount` counts urgent+warning only.
- `app/(pro)/pro/properties/_components/PropertyOwnerBand.tsx` (new) — collapsible owner
  band (accent square avatar + tinted edge for My Portfolio; round avatar for clients),
  stat line, `View portfolio →` Link, nested rows (Client column dropped), empty-book hint.
- `app/(pro)/pro/properties/_components/PropertiesRegisterPage.tsx` — `viewMode` (`group`
  default) + `expandedOwners` state; segmented toggle; shared `rowMatches` filter; group
  view hides empty bands (keeps empty My Portfolio when no filter); Collapse/Expand-all;
  client dropdown + multi-select + bulk-assign confined to flat mode.

Verified: `npx tsc --noEmit` and `npx eslint` clean on all three files. Manual browser QA
(steps above) still to run.
