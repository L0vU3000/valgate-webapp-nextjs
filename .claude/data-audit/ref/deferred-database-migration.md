# Deferred work — Database migration

This file tracks two related items deferred until the NeonDB / Convex migration lands.

---

## F4 — Dual formatting paths for `totalValue`

**From audit:** `portfolio--total-value.md` §8 F4 (P3 render)

**What it is:** `PortfolioLegend` (Client Component) receives `stats.totalValue` as a raw `number` and calls `formatCurrency` client-side at `app/(shell)/_components/PortfolioLegend.tsx:37`. `KpiCard` receives `kpis.totalValueFormatted` — a pre-formatted string built server-side. The same number is formatted in two different places.

**Why deferred:** `PortfolioLegend` takes the whole `stats` object and uses 5 fields from it (`totalValue`, `totalProperties`, `rentedCount`, `vacantCount`, `avgHealth`). Swapping just one field to a pre-formatted string while the rest stay raw would make the interface inconsistent and add awkward prop surgery for a P3 nit. Not worth it until the data layer is redesigned.

**Fix when migration lands:** Extend `PortfolioKpis` (or a new `PortfolioFormatted` type) with a `totalValueFormatted` string. Pass it to `PortfolioLegend` and remove the client-side `formatCurrency` call from the component. Raw aggregate numbers should not reach the client bundle if a pre-formatted string is available.

---

## F2 — UTC month boundary for `monthlyExpected` / `monthlyCollected`

**From audit:** `portfolio--monthly-income.md` §8 F2 (P2 logic)

**What it is:** `computeKpis` derives `monthStart` from `new Date()` on the server, which is always UTC. A user in UTC+7 at 11pm on April 30th will see May figures while their local clock still says April. The card now shows a `(UTC)` label so the behaviour is at least transparent (Option A), but the underlying boundary is still wrong for non-UTC users.

**Why deferred:** The correct fix (Option B) requires knowing the user's timezone, which has nowhere to live until real user accounts exist. Storing it temporarily would just mean moving it again.

**Fix when migration lands:**
1. Add `timezone: string` to the user profile schema (e.g. `"Asia/Phnom_Penh"`).
2. Pass it from the session into `computeKpis` as a `userTimezone` parameter.
3. Replace `Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)` with the equivalent computed in the user's local timezone using the Intl API or a date library.
4. Remove the `(UTC)` qualifier from `monthLabel` — the label can just say the month name once the boundary is correct.
5. Same fix covers `newThisMonth` in the same function (line 64–66).

---

## F4 — Zod validation at the FS read boundary for `type` (and all entity fields)

**From audit:** `portfolio--property-type.md` §8 F4 (P3 nit)

**What it is:** `listMergedRecords<T>` in `lib/data/db/_fs.ts:77` merges JSON files and casts the result directly to `T` with no runtime validation. A corrupted or stale `core.json` — e.g. `type: "House"` left over before the `PropertyTypeCode` → `PropertyTypeChoice` migration, or any field with an unexpected value — passes through silently. The badge falls to the helper's default; no error surfaces.

**Why deferred:** The FS layer is a temporary stand-in for Convex. Adding Zod schemas now means writing and then immediately discarding them when the migration lands, since Convex's `v.*` table schemas enforce shape at the database boundary automatically.

**Fix when migration lands:** No separate action needed — Convex rejects writes and reads that don't match the schema at the query/mutation boundary. The equivalent of a Zod parse happens for free. Retire `lib/data/db/_fs.ts` and `listMergedRecords` entirely as part of the migration.

---

## PropertyLayout-Progress — Progress badge on property sub-pages

**From:** Phase 11 plan (Task A), deferred 2026-05-19

**What it is:** `components/property/PropertyLayout.tsx:68` shows `— % progress` on every property sub-page (Overview, Rental, Ownership, Safety, Valuation, Location). The `progress?: number` prop slot exists but no caller passes it. Computing it correctly requires a full `ProgressContext` (13 entity arrays fetched in parallel), the same pattern used in `app/(shell)/portfolio/queries.ts`.

**Why deferred:** On the FS layer this means 13 × N JSON file reads on every property page load — across 7 sub-pages per property. Doing it now would establish a pattern that has to be torn out when Convex lands, since Convex replaces all 13 parallel fetches with a single query + server-side joins.

**Fix when migration lands:**
1. Create a Convex query `getProgressContext(propertyId)` that joins all 13 related entity tables for a single property.
2. Each property page calls that query (one round-trip instead of 13).
3. Pass `progress={computeProgressDetails(property, ctx).score}` from each `page.tsx` to the page component.
4. Each page component forwards `progress` to `<PropertyLayout progress={progress}>`.
5. The `PropertyLayout` badge then shows the live score instead of `—`.

**Note:** The overview page (`overview/page.tsx`) already stubs 7 of the 13 ProgressContext arrays as `[]`, so even the overview shows a deflated score. The Convex fix corrects that too.

---

## After database migration — re-auditing verification commands

Each audit report in this folder includes a `📋 Manual verification commands` block — small scripts that read JSON files in `public/data/users/demo-user/` to double-check a number by hand.

When you migrate to a real database (NeonDB or Convex), those JSON files will no longer exist. The verification commands will fail because they're looking for files that have moved.

**This is not a big problem.** Here's what to do:

1. The re-audit step will detect that source files changed (SHA mismatch) and trigger a full re-audit automatically.
2. During that re-audit, rewrite the `📋 Manual verification commands` block in the report to query the database instead of reading files.
3. The rest of the report — entity shape, formula, findings, SSOT YAML — carries over as-is. Only the verification commands need updating.

Think of it like a recipe that says "check the fridge for eggs." If eggs are now delivered in a box by the door, the recipe still works — you just update the one line that says where to look.
