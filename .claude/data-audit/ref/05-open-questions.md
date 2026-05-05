# 05 — Open Questions

> Every ambiguity surfaced during the audit. Resolve before implementation.
> Numbered Q1–Q9 by topic. Per-route entries at the bottom.

---

## Q1 — Pagination

**Q1.A** — `/portfolio` PropertyTable hardcodes `PAGE_SIZE = 16` (PortfolioPage.tsx:21). With Convex, switch to `paginate({ numItems, cursor })` or load all (current dataset is 16; will it stay small)? Note: "Showing X of Y properties" footer currently displays cross-page totals rather than a per-page range — needs fixing once pagination is real (see audit: `portfolio--filtered-count` F1).

**Q1.B** — `/property/[id]/documents`: how many documents per property is "a lot"? Does the tree need lazy-loading?

**Q1.C** — `/directory` shows "142" professionals (HARDCODED) but renders 6. What's the real expected scale? Pagination required?

**Q1.D** — `/rental` upcoming-events list: bounded window or unbounded? Suggest "next 30 days" as default.

**Q1.E** — `/analytics` revenue chart shows 9 months. Is the time window fixed or user-selectable beyond the MTD/QTD/YTD toggle?

---

## Q2 — Real-time vs one-shot

**Q2.A** — Notifications panel: should new notifications appear live (Convex `useQuery` reactivity) or be polled? Pattern doc implies live.

**Q2.B** — `/portfolio` and `/` (home): live or one-shot? Live makes "newThisMonth" tick up when you add a property in another tab; one-shot is cheaper.

**Q2.C** — `/property/[id]/documents` upload progress: today simulated client-side. Should other tabs viewing the same property see it happen live?

**Q2.D** — `/rental` dashboard: live or refresh-on-action?

**Q2.E** — Multi-user (Q4.M): when CoOwners are added, do they see updates from each other live?

---

## Q3 — Hardcoded KPIs need real definitions

The four `TODO(backend):` markers in `app/(shell)/portfolio/queries.ts:17–20`:

**Q3.A** — `totalValueFormatted: "$42.8M"`. Is "total value" the sum of `buyNumeric` (purchase price) or `currentMarketValue`? They differ — purchase is historical, market is current.

**Q3.B** — `monthlyIncome: "$312,450"`. Define: "sum of `monthlyRentCents` across all leases where `stage = 'Active'` and the current month is between `startDate` and `endDate`"? Or "sum of `payments.amountCents` where `kind='Rent'` and `status='Paid'` and `date in current month`"? These give different numbers — the first is *expected*, the second is *received*.

**Q3.C** — `yoyGrowth: "4.2%"`. Define: "(this-month total `currentMarketValue` − same month last year) / last-year value × 100"? What if some properties didn't exist last year — exclude or include at purchase price?

**Q3.D** — `newThisMonth: 2`. Trivial: `count(properties WHERE _creationTime >= startOfMonth(now))`. Confirm.

**Q3.E** — `/rental` arrears bucketing: 0–30 / 31–60 / 61–90. Aged from due date or invoice date? What field carries that?

**Q3.F** — Estate-planning caption "Verified across 32 properties in Cambodia" — is that count of `properties` where `country = "Cambodia"` AND `successors` are linked? Or `successors.linkedPropertyIds` flattened and country-filtered?

**Q3.G** — Successor share validation: should the sum of `Primary` successors' shares equal exactly 100? What about `Contingent`? Currently no validation.

**Q3.I** — Define "Attention Count": should it derive from `health < 30` (current) or from real operational signals — pending maintenance tasks, overdue rent, expiring leases, or expired certificates? The current sub-label "Critical tasks pending" implies a task system that does not exist. Until this is resolved, the label should describe the actual formula (`health < 30`), not implied task semantics. (See audit: `portfolio--attention-count` F1, F2.)

**Q3.J** — Define the "Compliance" KPI on `/property/[id]/safety`. The KPI card currently hardcodes "Compliant" and "All obligations met". What makes a property compliant vs. partially compliant vs. non-compliant? Options: (a) `all certifications have status === "Valid"` → binary Compliant/Non-compliant; (b) `count(valid) / count(all) >= threshold` → partial states like "Mostly Compliant" (75%+) and "At Risk" (<50%); (c) any expired certification (past `expiresAt`) immediately flags Non-compliant regardless of other certs. Pick a canonical definition before wiring — it determines whether the KPI card shows text, a percentage, or a color-coded status. (See audit: `pages/property-id-safety/audit.md` PF4.)

**Q3.H** — Define the "Occupancy" KPI: should it be `Math.round(rentedCount / totalProperties * 100)` (standard occupancy rate) or `Math.round(average(health))` (portfolio health score)? Today the card uses the latter but is labelled with the former — they produce 44% vs 52% on current seed data. Pick one canonical formula and rename the card or field accordingly. (See audit: `portfolio--occupancy` F1.)

---

## Q4 — Architecture / scope decisions

**Q4.A — Drafts: client-only vs Convex?** Today drafts are localStorage (`valgate:add-property:drafts:v1`, 500ms debounce). Tradeoffs:
- *Keep client-only*: zero backend cost; user loses drafts when switching devices.
- *Migrate to Convex*: cross-device drafts; need `api.drafts.upsert`/`delete` and `saveDraftAction`/`deleteDraftAction` (already stubbed in `actions.ts:16–17`).
- Recommendation: ship Convex variant. localStorage is a 30-min hack that costs sync support.

**Q4.B — Tenant entity vs tenants embedded in Lease**? Current UI suggests Tenant exists separately (`/property/[id]/overview` lists tenants) but Lease is the unit-of-rent record. Are Tenants the canonical "person" record, or just labels on Lease?

**Q4.C — EstateDocument vs Document**? Estate documents (Will & Testament, etc.) likely belong in `documents` with `category="estate"`, sharing storage and folder logic. Confirm vs separate table.

**Q4.D — Property soft-delete vs sold-state**? UI doesn't show archived/sold; future-proof now or wait?

**Q4.E — Equity, ROI, cap rate: stored or derived per render**? Stored avoids recompute but requires recalculation on every market value/mortgage change. Derived per render is simpler. Recommendation: derive (one multiply on read is cheap).

**Q4.F — Auto-create Notification rows on events?** E.g., document uploaded, lease expiring soon, certificate expiring. Cron-driven (Convex scheduled function) or event-driven (mutation side-effects)? Both?

**Q4.G — Map pin click on `/`**: today highlights only. Should it route to `/property/[id]/overview`?

**Q4.H — Expenses table**? Analytics shows "Expenses" line (NOI, maintenance spend) but no entity captures expenses today. Add `expenses` table with `category`, `amountCents`, `propertyId`, `date`? Maintenance has its own table — combine or keep separate?

**Q4.I — SavedReports**? Analytics page lists 3 saved reports (HARDCODED). Real entity? Out of scope for v1?

**Q4.J — Daily snapshots for sparklines/historical charts**? `propertyValuations` already snapshots monthly. Add a Convex cron job for daily occupancy/income snapshots, or compute on the fly from primary data?

**Q4.K — RentalEvent: a real table or pure derivation?** UI surfaces "upcoming events" mixing lease, maintenance, payment, inspection. Three options:
1. Pure derivation (server query unions across the four sources).
2. Real `rentalEvents` table populated by triggers (denormalized).
3. Hybrid: derive for "auto-generated", store user-authored events (e.g. manual reminders).
Recommendation: option 1 unless users need to author events.

**Q4.L — PDF/document parsing**? `PropertyDocumentsPage` shows extracted metadata (transfer tax, agent fee). Implies PDF parsing on upload. AI extraction (Convex action calling Anthropic), regex extraction, or user-entered metadata?

**Q4.M — Multi-user / sharing**? UI suggests CoOwners on `OwnershipRecord.coOwnerProfileIds` and Successor links. But there's no invite flow, no role assignment UI. v1 scope: single-user only? Future: per-property collaborator invites?

**Q4.N — Ownership tab visibility**? Should Viewers see ownership/equity? Sensitive financial info; default to hide unless explicitly granted.

**Q4.O — File storage choice**? Convex storage (`v.id("_storage")`) is the simplest; S3 / Cloudinary / Supabase storage are alternatives. Tradeoffs: cost, CDN, image transforms (Cloudinary wins on transforms).

**Q4.P — Audit log**? Property edits, document deletes, ownership changes — log to a separate `auditLog` table? Required for an estate-planning use-case where chain-of-custody matters.

**Q4.Q — MarketSnapshot + MarketComparable: external data integration for the Valuation tab**? The Market Insight panel and the Comparable Sales table on `/property/[id]/valuation` both need regional real-estate market data that Valgate does not own. Options:
1. *AVM API (Automated Valuation Model)*: integrate a third-party provider (e.g., Attom, CoreLogic, Zoopla, or a local provider for Cambodia). Returns comparables + market signals per address/region. Licensing cost; covers MarketComparable + MarketSnapshot in one call.
2. *Manual curation*: staff or users enter comparable sales and market conditions manually. Zero licensing cost; becomes stale quickly.
3. *AI-assisted*: Claude action searches public real-estate listings and synthesises a market summary. Intermediate cost; similar quality to AVM for high-inventory markets.
4. *Hardcoded constants per market*: for MVP, keep current constants but make them editable per `property.province`. No API dependency; obvious accuracy limit.

Decision affects: `MarketSnapshot` entity design (stored vs. pass-through query result), `MarketComparable` entity design (stored vs. ephemeral), and whether a scheduler is needed to refresh market data periodically. Resolve before building either entity. (See audit: [property-id-valuation rows 18–25](../pages/property-id-valuation/audit.md); comparables source also in Q8 for `/property/[id]/valuation`.) **Update (2026-05-05):** the location page also surfaces comparable-sales data (comp prices, price/m², nearby sales list — rows 19–23 in [property-id-location audit](../pages/property-id-location/audit.md)) under the name "PropertyComparable". These may be the same entity concept as MarketComparable — resolve the naming and entity boundary together with Q4.Q before building either page's data. See Q4.R for the naming decision.

**Q4.R — LandParcel entity: physical attributes of a property's land plot?** The `/property/[id]/location` page surfaces six types of physical land data that are absent from the current `Property` entity: total area (m² + hectares), plot dimensions (width × length), zoning classification (zone type + code e.g. "A-2"), development potential (use-type bullets), elevation (metres above sea level), slope (degrees), and terrain type (Flat / Hilly etc.). None of these fields exist in `PropertyCore`, `PropertyLocation`, or `PropertyFinance`. Three design options:

1. *Denormalised fields on Property*: add `landSizeM2`, `landWidth`, `landLength`, `zoningCode`, `zoningClass`, `developmentBullets`, `elevationM`, `slopeAngle`, `terrainType` to `Property`. Simplest for v1; couples physical land data with ownership/financial data; works for single-parcel properties.
2. *Separate `LandParcel` table* (1→1 with Property for v1; 1→N for multi-parcel future): `{ _id, userId, propertyId, sizeM2, widthM, lengthM, zoningCode, zoningClass, developmentPotential: string[], elevationM, slopeAngle, terrainType }`. Cleaner separation; enables multi-parcel support without schema migration. Adds a query join.
3. *Sub-document on Property* (JSON field): embed the above as `property.landParcel: LandParcelData`. Same query path as option 1; avoids join; harder to index.

Recommendation: option 1 for v1 (single parcel assumed), option 2 if multi-parcel is a near-term requirement. Decide before building — the location page's KPI cards depend on this schema. (See audit: [property-id-location](../pages/property-id-location/audit.md) rows 12–18; Q8 for this route.)

---

## Q5 — Schema / data quality questions

**Q5.A — Redundant fields in mock-data.ts**: `Property.status` ("Rented"|"Vacant") vs `statusVariant` ("rented"|"vacant"); `Property.title` ("Hard title"|"Soft title"|"—") vs `titleVariant` ("hard"|"soft"|"none"). The variants are CSS-aware enums. Drop them server-side and derive on the client?

**Q5.B — Add-property schema is too permissive**: every field is `z.string().optional()` (schemas.ts), including:
- `yearBuilt`, `totalArea`, `bedrooms`, `bathrooms`, `parkingSpaces` → should be `z.coerce.number().int().nonnegative()`
- All financial fields (`purchasePrice`, `currentMarketValue`, `outstandingMortgage`, etc.) → should be `z.coerce.number().nonnegative()` or a money type stored in cents
- `purchaseDate` → `z.coerce.date()` then store as Unix ms
- `propertyType` allows empty string (`""`) AND optional — collapse to optional only
Decide: tighten schemas.ts now (before form rewrite) or tighten at the Convex boundary in `api.properties.create`?

**Q5.C — Photos/documents in step4**: today stored as `string[]` of filenames; actual `File` blobs filtered out before localStorage (`drafts-storage.tsx:7–8`). On Convex, switch to `v.id("_storage")` for storage references. Confirm upload happens during the wizard (per file) or batched at submit?

**Q5.D — Mock-data fields not currently rendered in any UI**: `Property.statusVariant`, `Property.buyNumeric`, `Property.titleVariant` are present in `mock-data.ts` but only `buyNumeric` is consumed (in `getPortfolioPageData`'s sum). The `*Variant` fields drive CSS classes via `lib/property-helpers.ts` — keep server-side or compute client-side from the canonical fields? See Q5.A.

**Q5.E — Soft-delete vs hard-delete for documents**? "Deleted" state: hide from list, retain blob? Or remove blob too? Affects compliance/audit.

**Q5.F — `fullName` and `initials` derived vs stored**? `UserProfile.fullName` could derive from `firstName + " " + lastName`. `UserProfile.initials` could derive from those. Storing them costs nothing but goes stale on rename. Recommend: derive on read.

**Q5.G — Email verification: Clerk built-in vs Resend**? Clerk handles registration verification natively. Resend is in the stack — used for what? Notifications dispatch only?

**Q5.H — Currency/locale**: `UserProfile.currency` exists; UI displays USD throughout. Multi-currency support is implied but not yet active. v1: USD only? Or convert on display via FX rates?

**Q5.I — `RegisterPage.tsx:259` hardcodes "0:45" countdown** — when wired to Clerk, what's the real resend cooldown?

**Q5.Q — `SafetyRisk.resolved` field: catalog specifies it, type omits it.** `ref/00 §19` lists `resolved: v.boolean()` but `lib/data/types/safety-risk.ts` has no such field. Consequence: the "Open Issues" KPI on `/property/[id]/safety` cannot distinguish open vs. closed risks — it would collapse to `risks.length` (all risks are open by definition). Two sub-questions: (a) Is there a "close a risk" action in the planned UX? If not, risks are implicitly always open and `resolved` is not needed — change the KPI label to "Recorded Risks" and remove `resolved` from the catalog. (b) If risks can be resolved, add `resolved: boolean` to the type, add a write path (UI + DB mutation), and update seed data. Until decided, the hardcoded "2" on the KPI card is a silent correctness bug. (See audit: `pages/property-id-safety/audit.md` PF4; `pages/property-id-safety/plan.md` §3 Schema gap A.)

**Q5.J — Schema validation at the FS DB boundary**: `listMergedRecords<T>` (`lib/data/db/_fs.ts:60–75`) casts merged JSON directly to the entity type without runtime validation. A corrupted `core.json` (e.g. missing `statusVariant`) would still be counted by `properties.length` but silently dropped by status-filtered counts, breaking cross-card identities without a visible error. Validate with Zod at the boundary, or wait until the Convex migration where `v.*` schemas enforce shape automatically? (See audit: `portfolio--properties-count`.)

**Q5.K — What does `Property.health` (0–100) actually measure?** The field is in `PropertyCore` as a bare `number` with no definition of what 0 means, what 100 means, or how the value is authored. The add-property wizard has no step for setting it; seed values are hand-coded. Options: (a) computed field — derive from rent collection rate, maintenance status, and tenant satisfaction at query time (remove from storage); (b) operator-set score — define the scale and add a write path; (c) rename to something more specific once the semantics are agreed. The `attentionCount` KPI (`health < 30`) and the per-row health bar in the property table both depend on this definition. (See audit: `portfolio--occupancy` F2.)

**Q5.M — Dual type classification with no reconciliation**: `PropertyCore.type: PropertyTypeCode` (3 values: Land/House/Building) and `PropertyMedia.propertyType?: PropertyTypeChoice` (8 values) coexist on the same Property record and represent the same concept at different granularities. The table badge renders `type` only; `propertyType` is stored but never displayed. There is no documented mapping invariant between them, no enforcement that they stay in sync, and no UI path to see the finer-grained value after property creation. Decision needed: (a) display `propertyType` in the table when present (requires updating badge/icon/color helpers for all 8 values), (b) consolidate to a single field and drop the coarser `type`, or (c) keep both but document `type` as a display-bucketing field derived from `propertyType` and enforce the mapping exhaustively. (See audit: `portfolio--property-type` F2.)

**Q5.L — `Property.code` has no format definition, no generation strategy, and no uniqueness guarantee**: Is `code` (a) a user-defined reference number from a land certificate or official document, (b) a system-generated shorthand (e.g. province prefix + sequential count like "PP-2026-0017"), or (c) a legacy field from a prior data model with no current meaning? The add-property wizard never collects it (`form.propertyId` defaults to `""`, no input rendered in any step), so every new property gets `code: ""` — silently leaving the table's sub-label blank and breaking code-based search. Additionally, `form.propertyId` is aliased post-submit to the DB `id` (e.g. "PROP-0017") for the Step6Success display, conflating two distinct identifiers. Decision needed before shipping: (a) drop the field, (b) auto-generate server-side in `db/properties.ts:create()`, or (c) collect from user with a defined format and add to `step2Schema`. Also decide whether `code` must be unique per user. (See audit: `portfolio--property-id` F1, F3, F4.)

**Q5.O — `PropertyMedia.size` vs `PropertyMedia.totalArea`: same concept or distinct?** In `actions.ts:70–72`, both fields are written from the same form source: `size: form.totalArea || ""` and `totalArea: form.totalArea || undefined`. In all 16 seed records `totalArea` is absent while `size` is always present. No code reads `totalArea` for any display purpose. If they are the same thing (total built area in m²), drop `totalArea`. If distinct (e.g., `size` = built area, `totalArea` = lot area), rename both fields to be explicit, add separate form inputs, and update the "Size" column label. (see audit: `portfolio--size` F3)

**Q5.N — `FormData.state` / `PropertyLocation.stateProv` / `PropertyLocation.province` naming tangle**: Three identifiers represent the same concept (the administrative province/state where a property sits) with no documented distinction: (a) `FormData.state` — the wizard's free-text field (placeholder "State") that writes to `province` on submit; (b) `PropertyLocation.stateProv?: string` — an optional field written to `location.json` by `splitProperty()` but never read in any UI; (c) `PropertyLocation.province: string` — the required field displayed in the table and used for filtering. These three should be unified: rename `FormData.state` → `FormData.province`, drop `stateProv`, change the Step 2 input from a free-text `<input>` to a `<select>` populated from the canonical 25-province list (which should live in a shared `lib/constants/cambodia-provinces.ts` instead of being duplicated in `PortfolioPage.tsx`). (See audit: `portfolio--province` F1, F3.)

**Q5.P — `purchasePrice` / `buyNumeric`: can `purchasePrice` be dropped from storage?** `buy` was removed from storage in `portfolio--buy-price` Rev 2 — now derived at query time. Two representations remain: `purchasePrice?: string` (raw wizard input, e.g. `"1278000"`) and `buyNumeric: number` (canonical integer, e.g. `1278000`). Decision: drop `purchasePrice` from `PropertyFinance` and `splitProperty` when the edit-property form is built — pre-fill the price input from `buyNumeric` directly (no need to preserve the raw string). **Resolve when:** edit-property UI is implemented (see `.context/todo-ui.md` §Edit Property §4). (See audit: `portfolio--buy-price` F2.)

---

## Q6 — Validation surfaces

**Q6.A — `/login` and `/register` have no Zod**. After Clerk wiring, Clerk handles validation; do we still need our own Zod for client-side hints?

**Q6.B — `/settings` MFA, password change** — Clerk handles, no Convex Zod needed.

**Q6.C — `/settings` notification toggles** — no validation needed (boolean × enum).

**Q6.D — `/settings` selects (dashboardView, language, timezone)** — should be `v.union(...)` enums on the Convex side; today no client validation.

**Q6.E — `/property/[id]/documents` newFolderName** — currently only `.trim()` non-empty. Add max-length, character allowlist (no slashes, etc.)?

**Q6.F — `/profile` Edit form (when wired)** — need a `userProfileSchema` Zod.

---

## Q7 — React Hook Form

The dependency is installed but unused. The add-property wizard uses manual state. Adopt during Convex migration?

- *Adopt*: leverage existing Zod schemas via `zodResolver`; clean form state; better validation UX.
- *Don't*: more refactor scope; manual state works today.
- Recommendation: yes, adopt. The Zod schemas already exist; the cost is mostly mechanical replacement.

---

## Q8 — Per-route uncertainty (one entry per non-trivial route)

| Route | Specific question |
|---|---|
| `/login` | Clerk integration approach: in-page form vs Clerk hosted? |
| `/register` | Clerk-managed verification email + redirect URL? |
| `/` | Map pin click behaviour after route is property-aware (Q4.G). |
| `/portfolio` | Filtering server-side (paginated) or client-side (current) when scale grows? |
| `/property/[id]/overview` | What's the "Recent activity" log? Audit table (Q4.P)? |
| `/property/[id]/documents` | Folder rename UX (modal? inline edit?). Bulk delete confirmation pattern? Upload concurrency cap? |
| `/property/[id]/location` | Map content beyond placeholder — what data drives it (boundary polygons, easements)? |
| `/property/[id]/safety` | "Add Certificate" flow: form fields and required documents? |
| `/property/[id]/ownership` | Equity calculation — see Q4.E. |
| `/property/[id]/rental` | Lease renewal flow: in-app form, email to tenant, both? |
| `/property/[id]/valuation` | Comparables source — manually entered, AVM API, AI? |
| `/add-property` | Drafts to Convex (Q4.A); RHF adoption (Q7); schema tightening (Q5.B); File upload model (Q5.C). |
| `/rental` | Pipeline movement UI: drag-drop or modal? Is rent collection a separate flow? |
| `/analytics` | Period control wiring; Compare/Schedule Report/Export are stubs. |
| `/settings` | MFA: implement now or rely on Clerk dashboard? Password change UX. |
| `/profile` | Edit-profile flow not implemented at all today. |
| `/directory` | Per-user vs global directory (Q4.A); contact actions (call/email)? |
| `/estate-planning` | Successor share validation rules (Q3.G); document/timeline write surfaces. |

---

## Q9 — Cross-cutting decisions to make first (highest leverage)

If the implementer can only resolve five things before starting, do these:

1. **Q4.A — drafts**: client-only or Convex.
2. **Q4.M — multi-user scope**: v1 single-user is fine but will inform every `userId` index decision.
3. **Q3.A–E — KPI definitions**: blocks `/portfolio` and `/analytics` from being more than placeholders.
4. **Q5.B — schema tightness**: blocks `api.properties.create` design.
5. **Q4.F — notification triggers**: cron, mutation hooks, or both — affects every entity that creates notifications.

---

## Open-questions count

- **Total**: ~60 distinct questions across 9 sections.
- **Per non-trivial route**: ≥ 1 (Q8 table covers all 18 non-auth routes).
- **Top three blockers** (Q9): drafts location, multi-user scope, KPI definitions.
