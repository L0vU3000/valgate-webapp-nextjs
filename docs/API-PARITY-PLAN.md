# `/api/v1` Parity Plan — Native iOS Client

> **Status:** proposal / planning doc. No routes, migrations, or client code exist yet from this
> plan — see `docs/plans/IOS-APP-PLAN.md` for the original "why an API has to be built" case and
> `docs/api-v1.md` for the routes already shipped. This document is the sequel: what's still
> missing, in what order to build it, and what needs a product decision before it's built.
>
> **Scope boundary:** documentation only. No `app/api/v1/*` route, `lib/api/v1/*` module, schema,
> or test was touched to produce this plan.

---

## 1. Current public API inventory

Everything under `/api/v1/*` today, with exact file references. Source of truth cross-checked
against `docs/api-v1.md` (the maintained route table) and the file tree, not assumed from either
alone.

| Method | Path | Route file | Backing service | Auth kind |
|---|---|---|---|---|
| GET | `/api/v1/me` | `app/api/v1/me/route.ts` | `lib/services/me.ts` | read |
| GET | `/api/v1/properties` | `app/api/v1/properties/route.ts` | `lib/services/properties.ts` (`listPropertiesPage`) | read |
| GET | `/api/v1/properties/{id}` | `app/api/v1/properties/[id]/route.ts` | `lib/services/properties.ts` (`getProperty`) | read |
| GET | `/api/v1/properties/{id}/documents` | `app/api/v1/properties/[id]/documents/route.ts` | `lib/services/documents.ts` (`listDocumentsPage`) | read |
| POST | `/api/v1/properties/{id}/documents` | `app/api/v1/properties/[id]/documents/route.ts` | `lib/services/storage.ts` (presign) | write |
| POST | `/api/v1/properties/{id}/documents/complete` | `app/api/v1/properties/[id]/documents/complete/route.ts` | `lib/services/documents.ts` (`createDocument`) | write |
| GET | `/api/v1/properties/{id}/documents/{documentId}` | `app/api/v1/properties/[id]/documents/[documentId]/route.ts` | `lib/services/storage.ts` (signed GET) | read |
| PATCH | `/api/v1/properties/{id}/documents/{documentId}` | `app/api/v1/properties/[id]/documents/[documentId]/route.ts` | `lib/services/documents.ts` (`updateDocument`) | write |
| DELETE | `/api/v1/properties/{id}/documents/{documentId}` | `app/api/v1/properties/[id]/documents/[documentId]/route.ts` | `lib/services/documents.ts` (`deleteDocument`) | write |
| GET | `/api/v1/rental` | `app/api/v1/rental/route.ts` | `lib/services/rental-summary.ts` (`getRentalSummary`) | read |

Shared infrastructure (`lib/api/v1/`):

- `auth.ts` — `resolveApiV1Ctx(kind)`: Clerk bearer session token → `ctxFromMcpAuth(clerkUserId, { provisionIfMissing: false })` (same org-lookup as `/mcp`, **no JIT provisioning**) → rate limiter. Returns `{ ok: true, ctx: Ctx }` or `{ ok: false, response }`.
- `http.ts` — `apiError(status, code, message)`, the one error envelope shape.
- `dto.ts` — hand-written DTO mappers (`toMeDto`, `toPropertyListItemDto`, `toPropertyDetailDto`, `toDocumentListItemDto`, `toRentalSummaryDto`). Never a spread of a full row.
- `property-write.ts` — bounded `PropertyCreateBodySchema` / `PropertyPatchBodySchema`, unknown keys stripped (not rejected), `isWriteDeniedError` maps service-layer `"forbidden"` / `"Demo is read-only"` to 403 without echoing the message.
- `document-write.ts` — equivalent bounded schemas for the document upload-ticket / complete / patch bodies.

**Open discrepancy (flagged, not resolved here — see §7):** `property-write.ts` and its test
file (`lib/api/v1/properties.write.route.test.ts`) exist and are fully wired (create/patch body
validation, `toNewProperty`, `toPropertyPatch`), implying `POST /api/v1/properties` and
`PATCH /api/v1/properties/{id}` are live. `docs/api-v1.md`'s route table does **not** list them.
Before building on top of this plan, confirm which is stale — the doc or the route wiring — and
fix the gap. Everything else in this section was corroborated by both the doc and the file tree.

Reused, not public API: `/mcp` (`app/mcp/route.ts`, `mcp-server/*`) exposes 16 JSON-RPC tools
(`mcp-server/tool-defs.ts`) over properties, leases, tenants, payments, and maintenance. Per
`docs/plans/IOS-APP-PLAN.md` §1, this is intentionally **not** the iOS transport (wrong
granularity, no pagination, AI-tuned schemas, coupled roadmap) — but its `Ctx`-based service
calls are the proof that the same `lib/services/*` layer works headlessly, and its tool bodies
are a preview of which service functions already exist per domain (reused directly in §3).

---

## 2. Web user-facing domains with no public API route

Cross-referencing `app/(shell)/**` route segments and `lib/services/*` against the `/api/v1`
inventory above. A domain counts as "has a service" when `lib/services/<name>.ts` already
exports the full `list/get/create/update/delete` set for a `Ctx`-scoped entity — which is true
for nearly everything below; the gap is exclusively at the HTTP boundary, not the data layer.

| Web surface | Route segment | Service (exists) | Public API today |
|---|---|---|---|
| Rental — leases | `app/(shell)/property/[id]/rental` | `lib/services/leases.ts` | **None** (rollup only, `GET /api/v1/rental`) |
| Rental — tenants | same | `lib/services/tenants.ts` | **None** |
| Rental — payments | same | `lib/services/payments.ts` | **None** |
| Valuation | `app/(shell)/property/[id]/valuation` | `lib/services/property-valuations.ts` | **None** |
| Ownership — records (loan/mortgage) | `app/(shell)/property/[id]/ownership` | `lib/services/ownership-records.ts` | **None** |
| Ownership — history/timeline | same | `lib/services/ownership-history.ts` | **None** |
| Ownership — co-owners | same | `lib/services/co-owners.ts` | **None** |
| Ownership — successors/estate | same | `lib/services/successors.ts` | **None** |
| Maintenance | referenced from property overview + `mcp-server/writes.ts` | `lib/services/maintenance-items.ts` | **None** |
| Maintenance — vendor directory | same | `lib/services/professionals.ts` | **None** |
| Expenses | financials (property overview) | `lib/services/expenses.ts` | **None** |
| Documents — folders | `app/(shell)/property/[id]/documents` | `lib/services/folders.ts` | **None** (documents list/upload only; no folder CRUD) |
| Import flows | `app/(shell)/add-property/import*` | `lib/services/entity-import.ts` + `lib/services/*-import.ts` (lease, tenant, payment, expense, valuation, co-owner, successor, certification, emergency-contact, inspection, maintenance, safety-risk, land-parcel) | **None** |
| Notifications | in-shell bell/inbox | `lib/services/notifications.ts` | **None** |
| Certifications / safety risks / inspections / land parcels | property sub-tabs (Pro/estate overlay) | `lib/services/{certifications,safety-risks,inspections,land-parcels}.ts` | **None** |

Out of scope for this plan (Pro/manager-only web surfaces, not part of the "iOS matches core
owner product" goal per `vault/roadmap.md`'s live-vs-dormant split): `client-records.ts`,
`managers.ts`, `managed-orgs.ts`, `portfolio-members.ts` — the Pro cockpit multi-client
management layer. iOS is a single-owner client per `docs/plans/IOS-APP-PLAN.md` Phase C/D scope;
Pro parity is a separate future decision (see §7).

---

## 3. Dependency-ordered endpoint matrix

Ordered so each tier's routes only ever reference entities already public. `properties` is the
root every other domain FKs into; `documents` is next because uploads are needed to attach
evidence to everything downstream; `leases`→`tenants`→`payments` must land in that order because
`payments.leaseId`/`tenantId` and `leases.tenantId` are optional FKs into the prior tier.

| Tier | Domain | New routes | Depends on |
|---|---|---|---|
| 0 (done) | Properties | `POST /properties`, `PATCH /properties/{id}` (confirm per §1) | — |
| 0 (done) | Documents | shipped | Properties |
| 0 (done) | Rental rollup | shipped | Leases, Tenants, Payments (internally, via `getRentalSummary`) |
| 1 | **Valuation** | `GET/POST /properties/{id}/valuations`, `PATCH/DELETE /valuations/{id}` | Properties |
| 1 | **Ownership — records** | `GET/POST /properties/{id}/ownership-records`, `PATCH/DELETE /ownership-records/{id}` | Properties |
| 1 | **Ownership — history** | `GET/POST /properties/{id}/ownership-history`, `PATCH/DELETE /ownership-history/{id}` | Properties |
| 1 | **Ownership — co-owners** | `GET/POST /properties/{id}/co-owners`, `PATCH/DELETE /co-owners/{id}` | Properties |
| 1 | **Ownership — successors** | `GET/POST /successors`, `PATCH/DELETE /successors/{id}` | Properties (successor rows are org-scoped, not property-scoped per `listSuccessors(ctx)` signature — confirm FK shape before designing the route, see §7) |
| 1 | **Expenses** | `GET/POST /properties/{id}/expenses`, `PATCH/DELETE /expenses/{id}` | Properties |
| 2 | **Leases** | `GET/POST /properties/{id}/leases`, `PATCH/DELETE /leases/{id}` | Properties |
| 2 | **Maintenance — vendor directory** | `GET /professionals`, `POST/PATCH/DELETE /professionals/{id}` | — (org-scoped directory, no property FK) |
| 3 | **Tenants** | `GET/POST /properties/{id}/tenants`, `PATCH/DELETE /tenants/{id}` | Properties, (optionally) Leases for the `leaseId` link surfaced in list views |
| 3 | **Maintenance items** | `GET/POST /properties/{id}/maintenance`, `PATCH/DELETE /maintenance/{id}` | Properties, Professionals (vendor assignment) |
| 4 | **Payments** | `GET/POST /properties/{id}/payments` (or `/leases/{id}/payments`, see §7), `PATCH/DELETE /payments/{id}` | Leases, Tenants |
| 5 | **Import flows** | `POST /imports/{entity}/parse`, `POST /imports/{entity}/commit` (or a simplified single-shot variant, see §7) | Every entity above it targets (leases, tenants, payments, expenses, valuations, co-owners, successors) |

Rationale for import last: `lib/services/entity-import.ts` + `lib/services/lease-import.ts`
(and its siblings) implement a **human-review** pipeline — `planFieldSources` →
`sanitizePlan`/`assembleRows` → a `ReviewRow[]` the web UI lets a person edit → `bulkCreate*`.
That pipeline's commit step calls the same `create*` service functions each Tier 1–4 route
already wraps, so those routes must exist and be proven first; only the "parse a spreadsheet and
propose rows" half is genuinely new work.

Domains from §2 not in this matrix (`folders`, `notifications`, `certifications`,
`safety-risks`, `inspections`, `land-parcels`, `emergency-contacts`): all have the same
`list/get/create/update/delete(ctx, …)` service shape and can follow the identical pattern once
prioritized — omitted here only because they weren't named in the ask, not because they're
harder.

---

## 4. Proposed public DTO boundaries and auth/org/role rules

### DTO principles (carried forward from `lib/api/v1/dto.ts`'s existing convention)

Every new `to<Entity>Dto` function is a **hand-written field list**, never `...row`. The existing
file's header comment is the standing rule: no internal `userId`/`orgId`/`clientId`, no storage
id of any kind, no evidence-doc id array, no `uploadedBy`, no `*Verified*` boolean/timestamp
unless a product decision explicitly opts a domain in (see §7 — verification flags are currently
withheld everywhere they appear on `Property`, and the same default should apply to
`OwnershipRecord.verified`/`evidenceDocIds` and `Successor.verified` unless decided otherwise).

Proposed DTOs, built only from fields already in `lib/data/types/*` (no invented fields):

| DTO | Source type | Public fields |
|---|---|---|
| `PropertyValuationDtoV1` | `PropertyValuation` (`lib/data/types/property-valuation.ts`) | `id`, `propertyId`, `month`, `price` |
| `OwnershipRecordDtoV1` | `OwnershipRecord` | Public subset TBD by §7 — the type carries loan/lender/interest-rate fields that read as financial internals under the existing "no financial internals beyond purchase price" rule. Candidate safe subset: `id`, `propertyId`, `holdingType`, `distributionMethod`. Loan fields (`loanType`, `loanAmount`, `interestRate`, `lenderName`, `downPayment`, `closingCosts`) withheld pending decision. |
| `OwnershipHistoryDtoV1` | `OwnershipHistory` | `id`, `propertyId`, `text`, `color` |
| `CoOwnerDtoV1` | `CoOwner` | `id`, `propertyId`, `name`, `role`, `sharePercent`, `email`, `phone`. `ssnMasked` and `tax1099Status` withheld (PII/tax internals, no UI precedent for exposing them off-web). |
| `SuccessorDtoV1` | `Successor` | `id`, `name`, `initials`, `relation`, `role`, `share`, `email`, `phone`. `verified` withheld by default per the `*Verified*` rule; revisit if iOS needs to render it. |
| `ExpenseDtoV1` | `Expense` | `id`, `propertyId`, `date`, `category`, `amount`, `note` |
| `LeaseDtoV1` | `Lease` | `id`, `propertyId`, `tenantId`, `unit`, `stage`, `startDate`, `endDate`, `monthlyRent`, `termMonths`, `renewalStatus` |
| `TenantDtoV1` | `Tenant` | `id`, `propertyId`, `name`, `unit`, `rent`, `status`, `email`, `phone` |
| `PaymentDtoV1` | `Payment` | `id`, `leaseId`, `tenantId`, `date`, `kind`, `amount`, `method`, `status` |
| `MaintenanceItemDtoV1` | `MaintenanceItem` | `id`, `propertyId`, `title`, `severity`, `status`, `cost`, `vendorId` |
| `ProfessionalDtoV1` | `Professional` | Directory fields the "Assign a vendor" modal already shows on web (name, company, category, rating, availability) — mirror `mcp-server/tool-defs.ts`'s `search_professionals`, which already strips `userId` from this exact row for the same reason. |

Every list DTO gets the same envelope already proven by `properties` and `documents`:
`{ items: T[], nextCursor: string | null }`, opaque DB cursor (not offset/limit), decode
validated before any query runs — reuse `lib/services/properties.ts`'s `listPropertiesPage` /
`lib/services/documents.ts`'s `listDocumentsPage` cursor pattern (`ordered by <field>, id`)
rather than inventing a second pagination scheme.

### Auth / org / role rules (no new mechanism — apply the existing one everywhere)

- **Identity:** every route calls `resolveApiV1Ctx("read" | "write")` exactly once, first line of
  the handler. No route resolves Clerk auth itself.
- **Org scope:** every service query is already `WHERE orgId = ctx.orgId` — new routes inherit
  this for free by calling the existing `lib/services/*` functions unmodified. A property/lease/
  tenant/etc. that exists in a different org is a plain 404, identical to the existing
  `properties/{id}` behavior — never a distinguishable 403.
- **Role gate:** reuse `roleAtLeast`/`RANK` (`viewer:0 < member:1 < admin:2 < owner:3`,
  `lib/services/_mapping.ts`). Reads: any role. Writes: `member` minimum for create/update
  (matches every `mcp-server/tool-defs.ts` write tool's stated role requirement). Deletes:
  `member` minimum by default, **except** where the service already enforces stricter (property
  delete is admin-only per the existing MCP tool description — carry that same admin gate into
  `DELETE /api/v1/properties/{id}` when it's added). New domains should inherit whatever role the
  equivalent MCP tool already requires rather than a route author picking a fresh threshold.
- **Demo mode:** `assertCanMutate()` (`lib/services/_mapping.ts`) already throws on writes when
  `DEMO_MODE` is set without the dev escape hatch. `isWriteDeniedError` in `property-write.ts`
  already maps this and the role-forbidden case to the same 403 without echoing which one fired —
  every new write route reuses that exact function, not a re-implementation.
- **No JIT provisioning** stays true for every new route — `provisionIfMissing: false` is
  hard-coded in `resolveApiV1Ctx`, not per-route.
- **Rate limits:** reuse `apiReadLimiter` (120/min/user) and `apiWriteLimiter` (30/min/user) —
  no new limiter tier for any of the domains above; none of them are higher-risk than the
  existing document upload-ticket route.

---

## 5. OpenAPI / client-generation workflow

No OpenAPI spec exists in the repo today (`docs/` has no `openapi*` file, confirmed against the
full `docs/` listing during research for this plan). Proposed workflow, minimizing new tooling:

1. **Derive, don't hand-write, the spec.** Every route already validates its I/O with Zod
   (`PropertyCreateBodySchema`, `LeasePatchSchema`, etc. — all `lib/data/types/*` and
   `lib/api/v1/*` schemas are Zod). Add `zod-to-openapi` (one new dependency, already have `zod`
   as a peer) and a `scripts/generate-openapi-v1.ts` that imports every `lib/api/v1/*` request
   schema and every `to<Entity>Dto` return type's companion Zod schema, and emits
   `docs/openapi/v1.yaml`. This keeps the spec mechanically in sync with the same schemas the
   routes enforce at runtime — no second source of truth to drift.
2. **Commit the generated spec.** `docs/openapi/v1.yaml` is checked in (small, diffable, useful
   for review) even though it's generated — same treatment as `docs/api-v1.md` today.
3. **Gate CI on regeneration.** A CI step re-runs the generator and fails the build if the
   committed file differs (`git diff --exit-code docs/openapi/v1.yaml`) — the same "generated
   file must match its generator" pattern already used for Drizzle migrations in this repo
   (`npm run db:check`).
4. **iOS-side codegen.** `valgate-ios` consumes `docs/openapi/v1.yaml` (synced the same way
   `docs/API-CONTRACT.md` is mirrored today per `CLAUDE.md`'s sibling-repo note: *"API shape
   changes land in this repo first; iOS `docs/API-CONTRACT.md` only mirrors them"*) via
   `swift-openapi-generator` (Apple's own SPM plugin, code-generates request/response Swift
   types + a thin client from the YAML at iOS build time — no runtime dependency, no hand
   maintenance of DTOs on the Swift side). This is a decision for the iOS repo, not this one, but
   it's the natural pairing for a spec generated from typed Zod schemas.
5. **Human-readable docs stay put.** `docs/api-v1.md` remains the prose reference (auth, error
   envelope, pagination semantics, non-goals) — the OpenAPI file is for tooling, not for a human
   skimming what exists. Update `docs/api-v1.md`'s route table in the same PR as any new route,
   same as the existing convention.

---

## 6. Vertical implementation tasks with acceptance tests

Each vertical follows the shape already established by the properties/documents/rental work —
one PR per domain, not one PR for "the whole matrix." Acceptance tests are named to match the
existing `*.route.test.ts` convention (e.g. `lib/api/v1/rental.route.test.ts`).

**Task shape (repeat per domain in §3's tier order):**

1. **DTO** — add `<Entity>DtoV1` + `to<Entity>Dto` to `lib/api/v1/dto.ts`, per the field list in
   §4. Unit test in `lib/api/v1/dto.test.ts`: given a full service row (including every withheld
   field), assert the DTO contains *only* the allowed keys — same shape as the existing tests for
   `toPropertyListItemDto`/`toDocumentListItemDto`.
2. **Write-body schema** (if the domain has writes) — `lib/api/v1/<entity>-write.ts`, bounded
   Zod schema mirroring `property-write.ts`'s pattern (unknown keys stripped, not rejected;
   `toNew<Entity>`/`to<Entity>Patch` mappers that only copy present keys).
3. **Route handler(s)** — `app/api/v1/properties/[id]/<entity>/route.ts` (list/create) and
   `app/api/v1/<entity>/[id]/route.ts` (get/patch/delete), each: `resolveApiV1Ctx` → parse body
   (writes) → call the existing `lib/services/<entity>.ts` function → map through the DTO →
   `NextResponse.json`. Every handler body in a try/catch → generic 500 on unexpected throw,
   matching the standing rule in `docs/api-v1.md`'s Errors section.
4. **Route tests** — `lib/api/v1/<entity>.route.test.ts` covering, at minimum: 401 with no auth,
   404 for cross-org, 400 for invalid body/cursor, 403 for insufficient role, 200/201/204 happy
   path returns only DTO fields (assert absence of withheld fields explicitly, not just presence
   of allowed ones), 429 once the limiter is exhausted (reuse the existing test's fake-limiter
   approach from `rental.route.test.ts` / `properties.route.test.ts`).
5. **Docs** — append the new routes to `docs/api-v1.md`'s route table and per-route sections,
   in the same PR (never a follow-up), plus regenerate `docs/openapi/v1.yaml` (§5).
6. **`npm run typecheck && npm run lint && npm test`** green before merge — the three CI-gated
   commands per `AGENTS.md`; `npm run test:db` locally if the change touches a DB-level service
   test (e.g., a new cascade-count helper), otherwise not required to land.

**Acceptance gate for the whole vertical:** an iOS engineer can complete the equivalent web user
journey (e.g., "record a lease payment") using only the new endpoints plus already-shipped ones,
with no field in any response that the web UI itself doesn't render for that role.

---

## 7. Explicit open product decisions

These block parts of §3/§4 and need a call before (or during) implementation — not resolved by
this plan:

1. **`docs/api-v1.md` vs. `property-write.ts` discrepancy (§1).** Confirm whether property
   POST/PATCH are actually live in production and fix whichever side is stale before anyone
   builds on "the current inventory."
2. **Ownership financial internals.** `OwnershipRecord` carries `loanAmount`, `interestRate`,
   `lenderName`, `downPayment`, `closingCosts`. The standing DTO rule withholds "financial
   internals other than the public purchase price" — does the iOS Ownership tab need these to
   match the web Ownership tab, or does mobile deliberately show less? This changes the DTO in
   §4 and is a product call, not an engineering one.
3. **Successor scoping.** `listSuccessors(ctx)` takes no `propertyId` — confirm whether successors
   are truly org-wide (one estate plan per org) or property-scoped with the service just not
   filtering yet, before designing `GET /successors` vs. `GET /properties/{id}/successors`.
4. **Payment route shape.** Payments FK to both `leaseId` and `tenantId` (both optional per
   `lib/services/payments.ts`'s `listPayments(ctx, propertyId?)` — actually property-scoped at
   the service, but the DTO in §4 lists `leaseId`/`tenantId`, not `propertyId`). Decide: is the
   public route `/properties/{id}/payments`, `/leases/{id}/payments`, or both? Affects the
   pagination cursor's natural ordering field too.
5. **Verification flags off the wire, universally.** `co-owners`, `successors`, and
   `ownership-records` each carry `verified`/`evidenceDocIds`-shaped fields analogous to
   `Property.rentalVerified`/`estateVerified`. Confirm the blanket "never expose `*Verified*`"
   rule from `docs/api-v1.md` extends to every domain in this matrix, not just `Property` — or
   whether iOS actually needs verification badges to render parity UI (in which case it's a
   deliberate, documented exception per domain, not a silent inconsistency).
6. **Import flow shape for a phone.** The web import flow is an interactive, human-review
   pipeline (parse → editable `ReviewRow[]` → commit). Does iOS get the same two-step
   parse/commit API, or a simplified single-shot "upload a CSV, get a result summary" endpoint
   with no review step? This is a UX decision (screen real estate, whether mobile users will
   actually review 50 rows on a phone) before it's an API-shape decision.
7. **Maintenance/professionals sequencing.** Vendor assignment (`update_maintenance`'s
   `patch.vendorId`) is only useful once `GET /professionals` exists — confirm Tier 2 placement
   in §3 (before Tenants/Maintenance) is actually the wanted order, or whether maintenance can
   ship without vendor assignment in a first cut.
8. **Delete role thresholds per domain.** §4 defaults deletes to `member` except where an
   existing MCP tool says otherwise (property = admin). Audit every domain's intended delete
   role explicitly rather than inheriting `member` by default — some (e.g., deleting an ownership
   record with a linked loan) may warrant `admin` on product/compliance grounds even though no
   MCP tool exists yet to confirm it.
9. **Pro/manager domains.** `client-records`, `managers`, `managed-orgs`, `portfolio-members` are
   explicitly out of scope (§2) on the assumption iOS v1 is single-owner only. Confirm that
   assumption still holds — `vault/roadmap.md`'s "Next / open threads" doesn't rule out Pro-on-
   mobile later, and if it's wanted sooner, it changes the tier ordering materially (Pro parity
   would likely slot before or alongside Tier 3–4, not after).
10. **OpenAPI dependency.** §5 proposes adding `zod-to-openapi`. Confirm this is an acceptable
    new dependency (`package.json`/`package-lock.json` are otherwise untouched by this plan) versus
    hand-maintaining `docs/openapi/v1.yaml`, which would drift from the Zod schemas over time.

---

## Summary

`/api/v1` today covers properties (read + likely write, pending §7.1), documents (full CRUD +
storage), and one rollup (`rental`). Every other web-facing domain — valuation, ownership
(records/history/co-owners/successors), leases, tenants, payments, maintenance, expenses, and
import — already has a complete `Ctx`-scoped `lib/services/*` CRUD module and, for the
lease/tenant/payment/maintenance slice, a working MCP tool proving the exact same service calls
work headlessly. The gap is purely the HTTP boundary: DTOs, bounded write schemas, and routes,
all following the pattern `properties`/`documents` already established (opaque-cursor pagination,
hand-written DTOs with a fixed withheld-field list, `resolveApiV1Ctx` + role-gated writes, the
one error envelope). §3 orders nine new verticals by FK dependency; §6 gives each the same
five-step build/test/docs shape; §7 lists ten decisions — mostly "how much of this financial/
verification data should mobile actually see" — that need a product call before or during
implementation, not an engineering one.
