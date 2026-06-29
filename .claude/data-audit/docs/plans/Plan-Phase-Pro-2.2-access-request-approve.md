# Plan — Pro-2.2: Access request → approve → grant (Manager Role)

> Builds on **Pro-2.1 Foundation** (shipped this session: `is_manager`,
> `organizations.invite_code`, `access_requests` / `change_requests` tables +
> enums, manager routing, `/pro` guard). This phase wires the **first real
> cross-org flow**: a manager discovers an owner account by invite code, requests
> access, the owner approves, and a real `organization_memberships` grant is
> created — then the manager can **act inside** that account via Clerk active-org
> switching. Un-fixmes **P-IDOR-4**.

---

## 1. Context & what 2.1 already gave us

- Schema is live in Neon: `users.is_manager`, `organizations.invite_code`,
  `access_requests` (manager_user_id, owner_org_id, requested_level `view|full`,
  status `pending|approved|denied`, invite_code, decided_by/at), `change_requests`
  (2.3), `ARQ`/`CRQ` counters seeded.
- Routing: managers land on `/pro/dashboard`; `/pro` is gated on `is_manager`
  (DEMO_MODE bypass keeps the demo suite green).
- `lib/services/managers.ts` exists with `getIsManager(ctx)`.

### The one architecture fact that shapes this phase
The cockpit's **"clients" today come from the filesystem** (`lib/data/db/clients.ts`
→ `clientsDb.list(userId)`, consumed by `loadProContext` in
`app/(pro)/pro/queries.ts`). A "client" is **not** an org yet — the FS-clients →
owner-org migration is **deferred to Pro-2.5**. So Pro-2.2 introduces a **second,
real data path** (granted owner orgs) that runs *alongside* the FS-client cockpit,
not replacing it. We build and test 2.2 against **fresh Clerk test orgs**, where a
manager has granted orgs but no FS clients — so the two paths don't visually
collide during development.

**The bridge:** a granted owner org is a real Clerk org the manager is now a
member of (`viewer` or `admin`). To "act inside" it the manager calls
`setActive({ organization })` (confirmed available in `@clerk/nextjs` 7.5.3 via
the `useOrganizationList` hook). After the switch, `requireCtx()` returns that org
and **every existing per-org service and the owner's `(shell)` portfolio work
unchanged, authz-enforced**. We reuse the owner experience scoped by active org —
we do not rebuild per-org views in 2.2.

---

## 2. Permission-level mapping (locked)

| Request level (`access_level`) | Grant = `organization_memberships.role` | Capability |
|---|---|---|
| `view` | `viewer` | read-only inside the owner org; **propose** changes (affordance lands in 2.3) |
| `full` | `admin` | acts directly inside the owner org (full mutate) |

There is **no second permissions engine**. A grant is one membership row created by
`upsertMembership` (`lib/services/identity-sync.ts`). The service layer
(`tests/authz`) remains the enforcement of record; UI gates are defence-in-depth.

---

## 3. Services (`lib/services/managers.ts` — extend)

These are **cross-org** queries (a manager targets an owner org they are not yet in),
so they use **custom queries keyed on `manager_user_id` + `owner_org_id`**, NOT the
org-scoped `_crud` helpers. Every function takes explicit `Ctx` (C2), `"server-only"`,
a comment per function, and generic error strings (log internally).

**Manager side** (guard: `getIsManager(ctx)` true):
- `requestAccess(ctx, inviteCode, level)` — look up org by `invite_code`; reject if
  none, if it's the manager's own org, or if an active membership / pending request
  already exists (the unique index `uq_access_req_owner_manager` is the backstop);
  `nextId('ARQ')`; insert `access_requests` row (status `pending`); insert an in-app
  notification for the owner.
- `listManagedAccounts(ctx)` — orgs where the manager has an **active** membership at
  role `viewer`/`admin`, **excluding their home org**; return `{ orgId, clerkOrgId,
  name, role, level, lastActivityAt, propertyCount }` for the dashboard rollup. (A
  thin per-org count; no heavy aggregation in 2.2.)
- `listMyAccessRequests(ctx)` — the manager's own pending/decided requests (for the
  "Add account" screen's pending state).

**Owner side** (guard: `requireRole(ctx, "admin")` — owners are `admin`/`owner`):
- `getOrCreateInviteCode(ctx)` — return `organizations.invite_code`; if null, generate
  a short random code (nanoid/`crypto.randomUUID().slice`, 8 chars, no ambiguous
  glyphs) and persist. `regenerateInviteCode(ctx)` invalidates the old one.
- `listAccessRequestsForOwner(ctx)` — `pending` requests where `owner_org_id =
  ctx.orgId`, joined to the manager's display name/email.
- `listManagersForOwner(ctx)` — active grants (managers with a membership in this org),
  for the "Managers with access" table.
- `approveAccessRequest(ctx, requestId)` — verify the request belongs to `ctx.orgId`
  and is `pending`; `upsertMembership` at `viewer` (view) / `admin` (full); set request
  `status=approved`, `decided_by_user_id`, `decided_at`; notify the manager. Wrap in a
  `db.transaction`.
- `denyAccessRequest(ctx, requestId)` — same ownership check; `status=denied` + decided
  fields; notify the manager.

> **Reuse:** `nextId` (`_mapping.ts`), `upsertMembership` / `normaliseRole`
> (`identity-sync.ts`), `requireRole` (`auth/ctx.ts`), notifications service.

---

## 4. Server actions

- **Manager:** `app/(pro)/pro/actions.ts` — `requestAccessAction(formData)` (Zod:
  `inviteCode` non-empty, `level ∈ {view,full}`), `revalidateTag`. Switching active
  org is **client-side** (`setActive`), so no server action for the switch itself —
  just a `revalidatePath` helper after navigation if needed.
- **Owner:** `app/(shell)/settings/actions.ts` — `approveRequestAction(requestId)`,
  `denyRequestAction(requestId)`, `generateInviteCodeAction()`,
  `regenerateInviteCodeAction()`. All call `requireCtx()` → service; validate input;
  return generic errors; `revalidateTag` the settings data.

---

## 5. Active-org switching (the manager "acts inside")

Client component (e.g. `AccountSwitcher.tsx` under `app/(pro)/pro/_components/`):
```tsx
"use client";
const { isLoaded, setActive, userMemberships } = useOrganizationList({
  userMemberships: { infinite: true },
});
// on "Open account": await setActive({ organization: clerkOrgId });
//   then router.push("/")  → owner's (shell) portfolio, scoped by the new active org.
```
- The granted orgs come from `listManagedAccounts` (server, for the rollup) **and**
  `userMemberships` (client, for the actual `setActive` call) — they should agree;
  the server list is the display source of truth, `setActive` is the action.
- "Back to my cockpit" = `setActive({ organization: <manager home org> })` →
  `/pro/dashboard`.

**Open product decision (recommended default below):** when a manager opens an
account, they land on the **owner's `(shell)` portfolio** scoped by active org
(reuses the authz'd per-org path — least new code, safest). A bespoke manager-framed
per-account view is deferred; revisit when FS-clients unify with owner orgs in 2.5.

---

## 6. UI surfaces (4) — Mobbin refs + impeccable direction

Design context = `.impeccable.md` → **"Valgate Professional (Asset Manager POC)"**:
light mode, confident PM-SaaS (ClickUp/Linear/Wrike), browser-like workspace tabs,
calm density, **no side-stripe borders**, badge = metadata, blue is precious, borders
over shadows, Geist body. Every surface binds to **real services** (UI Design
Standard — no mocks).

### 6.1 Manager — "Add account" (invite-code entry)
- **Mobbin:** [Google Classroom "Join class"](https://mobbin.com/screens/03a7ba0c-b4af-4ff4-b5d2-624dc5f0879c)
  (signed-in-as context + code field + helper rules) ·
  [Cake Equity claim-invite](https://mobbin.com/screens/08722f65-af1a-4222-a3df-4688dd93d495).
- **Build:** centered single column; "You're signed in as {manager}"; invite-code input;
  a **View / Full** access-level segmented control with a one-line explanation of each;
  primary "Request access" (blue, precious). On submit → pending state ("Waiting for
  {owner} to approve"). Empty/again states teach (no vague filler).

### 6.2 Manager — Managed-accounts rollup (`/pro/dashboard`)
- **Mobbin:** [Hex "Choose your workspace"](https://mobbin.com/screens/3ba1c251-53e1-4628-9ddd-985a3e379024)
  (role-per-row: "You are an Admin/Editor") + existing `WorkspaceTabBar`.
- **Build:** a "Managed accounts" list — each row: org name, **your access-level badge**
  (View/Full), last activity, an "Open" action (→ `setActive`). Borders for separation,
  not cards-in-cards. Pending requests shown as a muted sub-list. This is the **new
  granted-org surface**; the existing FS-client tabs stay until 2.5.

### 6.3 Owner — Account settings → "Managers" section
- **Mobbin:** [Figma Members](https://mobbin.com/screens/e095b7ad-2d71-4ebf-8732-4fa585015a0c)
  / [Grok active+pending split](https://mobbin.com/screens/f1aa1583-3027-4d83-9917-4294f936b1ae)
  / [Anthropic Console Members](https://mobbin.com/screens/fb2112d6-4399-4c96-8ee9-ee6fcd739ffc).
- **Build:** lives in the existing `app/(shell)/settings` page. Two stacked sections:
  **(a) Invite code** — the code with copy + regenerate; one line on what it does.
  **(b) Managers with access** — table: name/email, level badge, granted date,
  row overflow (revoke arrives 2.4). Status as a badge (metadata), not a stripe.

### 6.4 Owner — Pending requests inbox (approve / deny)
- **Mobbin:** [Miro "Access requests"](https://mobbin.com/screens/05e59db8-5f5a-4f08-ae23-292fd64fe663)
  (Name / Requester / Date "Expires in Xd" / ✓✕ actions) ·
  [Airwallex review drawer](https://mobbin.com/screens/89c96631-be20-4176-be78-d24175e013ed)
  for single-request detail (pattern reused for 2.3 change-request review).
- **Build:** a "Pending requests" table under the Managers section: manager name,
  requested level, requested date, inline **Approve** (primary) / **Deny** (ghost).
  Optimistic update on action; toast on result. Empty state: "No pending requests."

---

## 7. Execution playbook — Mobbin + `/impeccable` (per the user's instruction)

**Every UI surface in §6 is built through this loop — not freehand:**

1. **Reference first (Mobbin MCP):** before writing a surface, run
   `mcp__mobbin__search_screens` (platform `web`) for that exact pattern; pick 2–3
   references (the ones cited in §6 are the starting set, refine as needed). Examine
   the actual screenshots — do not design from metadata.
2. **Build with impeccable:** invoke **`/impeccable craft <surface>`**, passing the
   surface description + the chosen Mobbin refs + the `.impeccable.md` "Valgate
   Professional" context. Produce real, wired code (bound to the §3 services — no
   mocks, no placeholder values; UI Design Standard).
3. **Polish pass:** run **`/impeccable polish`** on the built surface; then self-check
   against the impeccable **absolute bans** — no `border-left/right > 1px` accent
   stripes, no gradient text, no glassmorphism, borders over shadows, **blue only on
   the primary action**, badge = metadata at the bottom/inline.
4. **AI-slop test:** "would someone say an AI made this?" If yes, restructure.

This loop is part of the phase definition, not a suggestion: Mobbin grounds the
pattern, `/impeccable` enforces the house aesthetic, the services keep it real.

---

## 8. Un-fixme P-IDOR-4 + tests

- **`tests/authz` (Vitest, enforcement of record):** add cross-org cases —
  `approveAccessRequest` creates exactly one `viewer`/`admin` membership for the right
  org; a manager **without** a grant cannot read the owner org's resources (existing
  org-scoping already blocks this — assert it via the service with a synthetic
  manager Ctx whose `orgId` ≠ the target); deny leaves no membership; the unique index
  blocks a duplicate pending request.
- **E2E (`e2e/auth/`, real-Clerk rig, Node ≥24):** un-fixme **P-IDOR-4** in
  `role-idor.spec.ts` with the real flow — manager-a (from 2.1) without a grant is
  blocked from ORG-B; after owner-b approves a request, manager-a can `setActive` into
  ORG-B and load it; (revoke → blocked again lands in 2.4). Extend
  `provision-clerk-test-users.mjs` only if a second managed owner org is needed.
- **Never `page.waitForLoadState('networkidle')`** against the dev server.

---

## 9. Verification

1. `tests/authz` green incl. new cross-org cases (`npm run test`).
2. No new TS errors in touched files (`npx tsc --noEmit`, diff against baseline).
3. E2E happy path: invite code → request → owner approves → manager switches in and
   loads the owner portfolio; P-IDOR-4 negative (no grant → blocked) passes.
4. Regression: DEMO suite (`npm run test:e2e`) and existing auth suite
   (`npm run test:e2e:auth`) green; owners see **zero** behaviour change.
5. Each §6 surface passes the §7 impeccable bans check and is wired to real services.

---

## 10. Out of scope (→ later phases)

- **2.3** — `change_requests` propose→approve (manager proposes a patch, owner reviews
  a diff in the Airwallex-style drawer, apply-on-approve through normal services).
- **2.4** — per-page view-vs-full UI enforcement (mirror doc-delete gate `1482cbc`);
  **revoke** (cancels pending change_requests); full in-app notifications.
- **2.5** — `client → managed account` rename (~60 files) + FS-clients → owner-org data
  migration (reversible, audited, **never `seed:reset`**; recreate seed orgs per
  `project_seed_org_rehomed`). This is where the FS path and the granted-org path
  finally unify.

---

## 11. Open decisions (recommendations)

1. **`view` → which role?** → **`viewer`** (read-only, can propose in 2.3). *Recommend.*
2. **"Act inside" landing view?** → owner's `(shell)` portfolio scoped by active org
   (reuses authz'd path; least new code). *Recommend; revisit a unified manager view in 2.5.*
3. **FS-clients vs granted-orgs in the dashboard?** → keep **separate** in 2.2, unify in
   2.5. *Recommend* (avoids double-churn; dev runs against fresh test orgs anyway).
4. **Invite-code shape?** → one **reusable, regenerable** per-org code (simple, owner
   controls it). *Recommend; per-request expiring codes are a later hardening.*
5. **Notification depth in 2.2?** → minimal in-app insert on request/approve/deny now;
   full notification polish in 2.4. *Recommend.*

---

## 12. Critical files for Pro-2.2

- `lib/services/managers.ts` (extend: request/list/approve/deny/invite-code)
- `app/(pro)/pro/actions.ts` (manager: requestAccessAction)
- `app/(pro)/pro/_components/AccountSwitcher.tsx` (NEW: `setActive`) + dashboard rollup
- `app/(pro)/pro/dashboard/*` (managed-accounts surface)
- `app/(shell)/settings/{queries,actions}.ts` + `_components/*` (owner: invite code,
  managers table, pending-requests inbox)
- `lib/services/identity-sync.ts` (reuse `upsertMembership`)
- `e2e/auth/role-idor.spec.ts` (un-fixme P-IDOR-4) + `tests/authz/*` (cross-org cases)
