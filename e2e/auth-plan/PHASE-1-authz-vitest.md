# Phase 1 — Authorization core (role + IDOR) via Vitest

> **Do this first.** No Clerk rig, no browser. Highest security value, lowest cost. Proves the actual
> enforcement logic that Role and IDOR checks are really about.

## Goal

Prove, at the service layer, that:
- **Role gating** — `viewer`/`member` cannot perform admin-only mutations (delete); `admin`/`owner` can.
- **IDOR / org-scoping** — a caller in org B cannot read, update, or delete a row owned by org A.

## Why the service layer

Authorization lives in `lib/services/_crud.ts`, not the UI:
- `scopedInsert` / `scopedUpdate` require **`member`**; `scopedDelete` requires **`admin`** (RANK check).
- Every scoped query/mutation filters by `ctx.orgId` — that filter **is** the IDOR defense.
- `lib/auth/ctx.ts` defines `Ctx = { userId, orgId, orgRole }`. In a unit test we just **construct a
  `Ctx` by hand** — no Clerk needed — and call the service. This tests the real boundary directly.

## Scope (representative, not exhaustive)

Cover one mutation + one read per a few core entities so the pattern is proven:
- **properties** (`lib/services/property.ts` or `lib/data/*` + `_crud`)
- **documents** (`lib/services/documents.ts`)
- **clients** (pro) and **work-orders** if time allows

## Tasks

- [ ] Locate the existing Vitest setup (`vitest.config.ts`; `npm run test`) and any current service tests; mirror their style.
- [ ] Add `tests/authz/role-gating.test.ts`:
  - [ ] `scopedDelete(...)` with `Ctx.orgRole = 'viewer'` → **expect throw** (forbidden).
  - [ ] same with `'member'` → **expect throw**.
  - [ ] same with `'admin'` and `'owner'` → **succeeds**.
  - [ ] `scopedInsert`/`scopedUpdate` with `'viewer'` → **expect throw** (needs ≥ member).
- [ ] Add `tests/authz/org-scoping-idor.test.ts`:
  - [ ] Seed a property under **ORG-A** (via the db helper).
  - [ ] Read it with `Ctx.orgId = 'ORG-B'` → **expect null / not found**.
  - [ ] Update it with `Ctx.orgId = 'ORG-B'` → **expect throw / 0 rows affected**.
  - [ ] Delete it with `Ctx.orgId = 'ORG-B'` → **expect throw / 0 rows**; row still exists for ORG-A.
  - [ ] Repeat the read-leak check for **documents** and **clients**.
- [ ] Clean up all seeded rows in `afterEach`/`afterAll`.

## Files

- New: `tests/authz/role-gating.test.ts`, `tests/authz/org-scoping-idor.test.ts`.
- Reuse: `e2e/helpers/db.ts` (`createThrowawayProperty`, `cleanup`) — or the raw `pg`/Drizzle client from
  `lib/db/client.ts` for direct row setup against the dev branch.
- Reference (read, don't change): `lib/services/_crud.ts` (RANK = `{viewer:0, member:1, admin:2, owner:3}`),
  `lib/auth/ctx.ts` (`Ctx`).

## Key pattern

```ts
// A synthetic Ctx is all you need — no Clerk, no login.
const viewerCtx = { userId: 'USR-TEST', orgId: 'ORG-A', orgRole: 'viewer' as const }
await expect(scopedDelete(db, properties, propId, viewerCtx)).rejects.toThrow()

const orgBCtx = { userId: 'USR-TEST', orgId: 'ORG-B', orgRole: 'owner' as const }
expect(await getPropertyById(propId /* owned by ORG-A */, orgBCtx)).toBeNull()
```

## Verification

- `npm run test` (Vitest) green.
- Every role boundary and every cross-org leak path asserted.
- Run against the **dev** DB branch; never touches prod, never `seed:reset`.

## Risks / notes

- Services take an explicit `Ctx` (no ambient auth) — confirm the exact signature of each before writing
  (some take `(ctx, ...)`, some `(..., ctx)`). The graph: `graphify explain "scopedDelete"`.
- If a service reads `ctx` from `requireCtx()` internally instead of a param, you may need to stub
  `requireCtx` — prefer services that accept an explicit `Ctx` param for clean testing.

## Effort: ~0.5 day. Unblocks confidence in Role + IDOR without any of the Clerk setup below.
