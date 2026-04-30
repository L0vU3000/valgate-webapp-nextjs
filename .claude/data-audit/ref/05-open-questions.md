# 05 — Open Questions

> Every ambiguity surfaced during the audit. Resolve before implementation.
> Numbered Q1–Q9 by topic. Per-route entries at the bottom.

---

## Q1 — Pagination

**Q1.A** — `/portfolio` PropertyTable hardcodes `PAGE_SIZE = 20` (PortfolioPage.tsx:20). With Convex, switch to `paginate({ numItems, cursor })` or load all (current dataset is 16; will it stay small)?

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

**Q5.J — Schema validation at the FS DB boundary**: `listMergedRecords<T>` (`lib/data/db/_fs.ts:60–75`) casts merged JSON directly to the entity type without runtime validation. A corrupted `core.json` (e.g. missing `statusVariant`) would still be counted by `properties.length` but silently dropped by status-filtered counts, breaking cross-card identities without a visible error. Validate with Zod at the boundary, or wait until the Convex migration where `v.*` schemas enforce shape automatically? (See audit: `portfolio--properties-count`.)

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

- **Total**: ~58 distinct questions across 9 sections.
- **Per non-trivial route**: ≥ 1 (Q8 table covers all 18 non-auth routes).
- **Top three blockers** (Q9): drafts location, multi-user scope, KPI definitions.
