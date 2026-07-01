# Phase 3 — Generalize change-requests: all entities + create/update/delete (mirror of plan-75c88ebd725948db)

**Hosted:** https://plan.agent-native.com/plans/plan-75c88ebd725948db
**Branch:** `L0vU3000/pro-ui-ux` · **Status:** review (2 open Qs, defaults recommended) · Phase 3 of 3.
**Umbrella:** [client-permission-leader.md](./client-permission-leader.md) · **Prev:** [phase2-change-request-loop.md](./phase2-change-request-loop.md).
**Depends on:** Phase 2 (plan-5d5ce2f2a25b4fdd) merged — extends its change-requests service, dispatcher, propose action, and inbox.

## Objective
Phase 2 wired the change-request loop for **one entity (properties), update-only**. Phase 3 generalizes it so the read-only manager can propose **create / update / delete** across the other portfolio entities (leases, tenants, payments, documents, valuations, ownership, safety, estate, …). The loop, notifications, and inbox are **unchanged**; what grows is one schema field, the dispatcher registry, and **one propose surface per entity**.

**Done:** for each entity in scope, a manager proposes an add/edit/delete in the View-as-client preview; the client approves/rejects from the same Pending Changes inbox; approval applies via the entity's existing service fn. Shipped in tiers.

## Locked bets
1. **Schema** — add `operation` enum (`create | update | delete`) to `change_requests` and make `entity_id` **nullable** (null for creates). `proposed_patch` = `New<Entity>` for create, `<Entity>Patch` for update, `{}` for delete. Migration ~`0021`.
2. **Dispatcher registry** per entity becomes `{ createSchema, updateSchema, create, update, delete }`; `applyChangeRequest` switches on `operation`. All ops apply under the owner-admin ctx (create/update pass `requireMember`, delete passes `requireAdmin`; the client is `org:admin` from Phase 1).
3. **Approval requires admin** (`requireAdmin`) so a non-admin client member can't approve a destructive delete.

## Schema (data-model)
`change_requests`: **add** `operation` (`request_operation` pgEnum, default `update`); **modify** `entity_id` → nullable (was NOT NULL). Unchanged: `entity_type`, `proposed_patch` (jsonb), `status` (pending|approved|denied).

## Dispatcher (extend Phase 2)
```ts
const REGISTRY = {
  property: { createSchema: NewPropertySchema, updateSchema: PropertyPatchSchema,
    create: createProperty, update: updateProperty, delete: deleteProperty },
  lease:    { createSchema: NewLeaseSchema, updateSchema: LeasePatchSchema,
    create: createLease, update: updateLease, delete: deleteLease },
  // Phase 3 grows this map; nothing else changes.
} as const;

export async function applyChangeRequest(ctx, cr) {
  const e = REGISTRY[cr.entityType]; if (!e) throw new Error("unsupported");
  if (cr.operation === "create")      await e.create(ctx, e.createSchema.parse(cr.proposedPatch));
  else if (cr.operation === "update") await e.update(ctx, cr.entityId!, e.updateSchema.parse(cr.proposedPatch));
  else                                 await e.delete(ctx, cr.entityId!);
}
```
Each entry reuses the entity's **existing** `New*`/`*Patch` Zod schemas + `create/update/delete(ctx,…)` service fns — no new domain logic.

## Entity coverage (tiered)
| Tier | Entities | Ops |
|---|---|---|
| Done (P2) | property | update |
| Tier 1 | lease, tenant, payment | create/update/delete |
| Tier 2 | document, property-valuation | create/update/delete |
| Tier 3 | ownership-record, co-owner, safety-risk, inspection, certification, maintenance, estate-assignment, emergency-contact | create/update/delete |

## Manager propose surfaces (the real cost)
The backend generalization is small; the work is **one propose surface per entity** in the View-as-client preview. Each reuses the entity's **existing owner edit form/dialog** but submits to a generalized `proposeChangeAction({ clientId, entityType, entityId?, operation, patch })` (generalize Phase 2's `proposePropertyChangeAction`), validated against the registry schema. Delete reuses the existing delete control + confirm.

## Inbox handles all ops
The Phase 2 `/portfolio/pending-changes` inbox gains an **operation badge** (Add / Edit / Remove) + entity label, groups by entity, and renders the right preview (proposed fields for create/update; "Remove — <name>" confirm row for delete). Approve/reject unchanged; approval now requires **admin**.

## Risks
1. Deletes are destructive (cascades + S3 cleanup) — admin approval + confirm, applied under owner ctx.
2. Creates need full `New<Entity>` validation (more fields than a patch) — re-validate at apply.
3. Cost is the per-entity propose UI, not the backend — ship per tier; **log which entities are not yet proposable** so the manager isn't surprised.
4. Stale delete (row already removed by owner) should no-op gracefully (not found), not error.

## Verification (per tier)
1. Migration adds `operation` + nullable `entity_id`; tsc 0 errors + eslint clean.
2. Per entity: propose ADD → pending create CR (entity_id null) → approve → row created via `create<Entity>`.
3. Propose EDIT → approve → row updated (re-validated).
4. Propose DELETE → approve as admin → row deleted via `delete<Entity>`; reject leaves it.
5. Non-admin member cannot approve (`requireAdmin`); manager direct writes still 403.
6. Stale delete no-ops; inbox op badge + entity label correct.

## Open questions (recommended defaults; lock before executing)
1. **Coverage** → recommended: ship **Tier 1 (lease/tenant/payment)** now, Tier 2/3 as follow-ups (vs all tiers at once, vs a custom subset).
2. **Operations** → recommended: **create + update + delete** (deletes gated behind admin-approval + confirm) (vs create+update only, deletes later).
