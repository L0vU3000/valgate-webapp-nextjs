# Plan — Phase Pro-2.0: Manager Role + cross-org access grants

> Status: DRAFT for review. Created 2026-06-24.
> Supersedes the single-org "client" grouping with a real multi-tenant
> manager↔owner access model. Also resolves the open Phase-3 finding P-IDOR-4
> (`/pro` org-scoping unverified).

---

## 1. Goal

Introduce a **Manager** persona who manages **multiple owners' portfolios**, where
each managed portfolio is a **separate owner organization**. A manager gains
access to an owner's org only when the owner **approves a request**, at a
granted **permission level**. One of those levels lets the manager **propose
changes the owner must approve** before they apply.

Plain-English: today one manager-org holds everything and tags properties with a
"client" label. We are moving to: every owner has their own org; a manager is
granted scoped access to each owner's org; the Pro cockpit aggregates across the
orgs a manager can reach.

---

## 2. Current state (what we are migrating FROM)

- **Roles** live inside ONE org: `RANK = { viewer:0, member:1, admin:2, owner:3 }`
  (`lib/auth/ctx.ts`), mapped from Clerk org roles via `normaliseRole`
  (`lib/services/identity-sync.ts`).
- **`requireCtx()`** resolves to exactly ONE active org per request.
- **"Clients"** are NOT orgs. `lib/data/db/clients.ts` stores them on the local
  **filesystem** (`./_fs`, prefix `CLI`), scoped by `userId`. (Still pre-Neon —
  intersects the backend migration, see §10.)
- **Properties** (Neon) have `orgId` (NOT NULL, FK → organizations) AND a nullable
  `clientId` tag. So a property belongs to the manager's org and is *labelled*
  with a client.
- **Pro cockpit** (`app/(pro)/pro/*`) groups everything by `Property.clientId`
  and rolls up per client — all inside the single signed-in org.

**Consequence / the P-IDOR-4 finding:** because the Pro layer is single-org with
soft client labels, there is no real cross-org boundary to test — owner-b could
render another account's `/pro` page. The new model gives `/pro` a real boundary.

---

## 3. Target architecture

- **Owner org** = the existing per-user org created by JIT sync on signup. The
  unit a manager is granted access to. (No new concept — regular users already
  get their own org.)
- **Manager** = a user flagged `is_manager`; their default route is
  `/pro/dashboard`. A manager has NO portfolio of their own by default — they
  operate inside owner orgs they have been granted access to.
- **Access grant** = the manager is an **organization member of the owner's org**
  at a role, created only after the owner approves. Reuses the existing
  membership + RANK machinery. No parallel permission system.
- **Pro cockpit** lists the owner orgs a manager has active grants in (their
  "managed accounts") and lets them act inside one at a time.

---

## 4. Terminology (UI + code)

- "Client" → **"managed account"** (an owner org a manager has access to).
  Placeholder — final UI naming is the designer's call.
- "Manager" — the persona. "Owner" — the account holder who approves.
- Code: phase out `clientId` / `clients` collection in favour of owner `orgId`
  + grant records (see §10 migration).

---

## 5. Data model

New/changed (all Neon + Drizzle, `lib/db/schema/*`, services in `lib/services/*`):

1. **`users.is_manager`** (boolean, default false) — drives `/pro` default
   routing and "may request access" capability.
2. **`access_requests`** — the request→approve flow for *gaining access to an org*:
   - `id, manager_user_id, owner_org_id, requested_level (view|full),
      status (pending|approved|denied), decided_by_user_id, created_at, decided_at`.
   - On approve → create an `organization_memberships` row (manager in owner org
     at the mapped role: view→`viewer`, full→`admin`).
3. **`change_requests`** — the propose→approve flow for *editing data*:
   - `id, owner_org_id, manager_user_id, entity_type, entity_id,
      proposed_patch (jsonb), status (pending|approved|rejected),
      decided_by_user_id, created_at, decided_at`.
   - On approve → apply the patch via the normal service (server re-validates
     ownership + role at apply time). On reject → just record it.
4. **Permission level** maps onto existing roles, so enforcement reuses
   `roleAtLeast` / `requireRole` already proven in `tests/authz`:
   - **view** → `viewer` membership (read-only; may file change_requests).
   - **request-updates** → `viewer` membership + change_requests workflow.
   - **full** → `admin` membership (direct mutate, no approval needed).

> Note: "view" and "request-updates" share the `viewer` role; the difference is
> purely whether the UI exposes the "propose change" affordance. Keep them as one
> stored level (`viewer`) with the propose affordance always available to a
> viewer-manager — simplest correct model.

---

## 6. The two approval flows

### A. Access request → approve (gain entry to an owner org)
1. Manager finds/enters an owner identifier (email or invite code) in `/pro`.
2. `access_requests` row created (pending).
3. Owner sees pending requests in their account settings; approves at a level or
   denies.
4. Approve → `organization_memberships` row (manager in owner org). Manager's
   dashboard now lists that managed account.
5. Owner can revoke later (delete the membership) — manager loses access.

### B. Change request → approve (the propose-and-approve flow)
1. Manager with `viewer` access opens a property in an owner org, edits a field,
   submits as a **proposal** (not a direct save).
2. `change_requests` row created (pending) with the proposed patch.
3. Owner reviews a diff (current vs proposed), approves or rejects.
4. Approve → server applies the patch through the normal service (which
   re-checks org + role), records `approved`. Reject → records `rejected`.
5. A `full`-access manager skips this entirely (direct save).

---

## 7. Multi-org context (the core backend change)

`requireCtx()` returns ONE active org. Two needs:
- **Dashboard rollup** across all managed accounts → add manager-scoped queries
  that span the manager's granted `owner_org_id`s (NOT the single active org).
- **Acting inside one account** → manager selects a managed account; we set the
  **active org** (Clerk `setActive` / org switcher) so `requireCtx` resolves to
  that owner org and all existing per-org services/role gates work unchanged.

Recommendation: lean on **active-org switching** for "acting inside an account"
(reuses everything) and add a **thin manager-rollup query layer** only for the
cross-account dashboard. Avoid rewriting every Pro query to be multi-org.

---

## 8. Phasing

- **Pro-2.1 — Foundation & terminology.** `users.is_manager` + `/pro` routing;
  rename client→managed account in code/UI; stand up `access_requests` schema +
  service (no UI yet). No behaviour change for existing owners.
- **Pro-2.2 — Access request→approve flow.** Manager request UI, owner approval
  UI in settings, membership creation on approve, dashboard lists granted owner
  orgs via the rollup layer. **Resolves P-IDOR-4** (manager only sees granted
  orgs; add the e2e test that proves it). Active-org switching to act inside one.
- **Pro-2.3 — Propose→approve change flow.** `change_requests` schema + service;
  manager "propose change" affordance for `viewer` access; owner review/diff UI;
  apply-on-approve through existing services. The largest, riskiest phase.
- **Pro-2.4 — Permission enforcement + polish.** Audit every Pro page so view vs
  full is honoured in the UI (mirrors the doc-delete gate from 1482cbc); revoke
  flow; notifications for pending requests.
- **Pro-2.5 — Data migration (see §10).** Can run earlier if needed; sequenced
  last here because it is the highest-blast-radius and benefits from the model
  being settled.

---

## 9. Resolves / relates

- **P-IDOR-4** (`e2e/auth/role-idor.spec.ts`, currently `test.fixme`): once a
  manager only sees orgs they hold a grant in, un-fixme with a real test —
  manager-without-grant is blocked from an owner org's Pro pages.
- Builds on the role machinery proven in `tests/authz` (Phase 1) and the
  real-Clerk e2e rig (Phases 0/2/3).

---

## 10. Data migration (clientId → owner orgs) — highest risk

Today: properties sit in the manager's org, tagged `clientId`; client records are
on the filesystem. Target: each client becomes a real owner org; its properties
move to that org; the manager gets a grant.

- This intersects the in-flight Neon migration (clients are still filesystem;
  see memory `project_backend_migration_state`). Decide: migrate clients to Neon
  first, or fold that into Pro-2.5.
- Demo/seed data: the seed catalog currently lives in ORG-0001 with `clientId`
  (memory `project_seed_org_rehomed`). Migration must create owner orgs for each
  seed client and re-home their properties — without `seed:reset`.
- Needs a reversible, audited migration script + a verification pass.

---

## 11. Open decisions (confirm as we go)

1. **Migration timing** — migrate the filesystem `clients` to Neon orgs up front,
   or stage it in Pro-2.5? (Affects whether 2.2/2.3 run against real or
   transitional data.)
2. **Manager onboarding** — how does a user become a manager? Self-serve flag,
   or invite/admin-set?
3. **Account discovery** — how does a manager identify an owner to request access
   (email lookup, owner-generated invite code, directory)? Invite code is the
   privacy-safest default.
4. **Revoke semantics** — on revoke, do pending change_requests get cancelled?
   (Recommend yes.)
5. **Notifications** — in-app only for v1, or email (Resend) too?

---

## 12. Lazy-path notes

- Reuse memberships + RANK for grants; do NOT build a second permissions engine.
- Active-org switch for "act as one account"; thin rollup only for the dashboard.
- One stored level for view/request-updates (`viewer`); the propose affordance is
  the only difference.
- Server re-validates on apply — the UI gates are defence-in-depth, the service
  layer (Phase 1) is the enforcement of record.
