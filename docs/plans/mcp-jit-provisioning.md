# MCP User JIT-Provisioning

- **Plan ID:** `plan-be3fd434c3d145c7`
- **Hosted:** https://plan.agent-native.com/plans/plan-be3fd434c3d145c7
- **Status:** review — one open decision (org strategy) before execution
- **Type:** backend, document-first (no UI)

## Objective

When a brand-new Clerk user connects an AI client (Claude/ChatGPT) to `/mcp`, Valgate
should **provision them on the spot** — create their `users` row and org membership — so
the very first tool call returns data instead of a generic auth error. Closes the
Phase-3 go-live gap found live on 2026-07-02, and lets us delete the manual `USR-0001`
DB bridge.

## The problem

`ctxFromMcpAuth` (`mcp-server/ctxFor.ts`) only **looks up** `users.clerkUserId` and throws
`unauthenticated` on a miss. A new Clerk user authenticated over OAuth has no Valgate row
(the provisioning webhook doesn't fire on the tunnel / for MCP-first users), so every new
user hits a wall.

## Reuse first — the webapp already does this

The browser path (`lib/auth/ctx.ts` → `resolveCtx`, lines 28–47) JIT-provisions on
cache-miss via `identity-sync`. We **mirror** it — no new provisioning path. Reused
verbatim: `upsertUser`, `upsertOrg`, `upsertMembership`, `ourUserId`, `ourOrgId`,
`normaliseRole` (`lib/services/identity-sync.ts`).

## The design fork (why this is plan-worthy)

`resolveCtx` gets the Clerk **org** from the active session (`auth()`). An MCP OAuth token
identifies a **user only** — no active org. So MCP JIT must decide which org(s) a fresh
user gets. Also: `currentUser()` needs a session and won't work under a machine token —
use `clerkClient.users.getUser(userId)` + `getOrganizationMembershipList`.

## The change — one file, no schema

Replace the auth-miss `throw` with a JIT branch that provisions, then re-reads. The Clerk
webhook (`app/api/webhooks/clerk`) stays the authoritative steady-state writer; JIT is the
bootstrap/fallback.

```ts
// mcp-server/ctxFor.ts — auth-miss branch
if (!userRow) {
  // JIT provisioning (bootstrap/fallback; webhook stays authoritative).
  userRow = await provisionMcpUser(clerkUserId); // throws "unauthenticated" only if unresolvable
}
```

```ts
// new helper — sketch, org strategy = Option A
async function provisionMcpUser(clerkUserId: string): Promise<{ id: string }> {
  const clerkUser = await clerkClient.users.getUser(clerkUserId);
  await upsertUser({
    id: clerkUserId,
    primaryEmail: clerkUser.emailAddresses[0]?.emailAddress ?? `${clerkUserId}@pending.clerk`,
    displayName: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null,
    avatarUrl: clerkUser.imageUrl ?? null,
    isManager: clerkUser.unsafeMetadata?.accountType === "manager",
  });
  const { data: memberships } =
    await clerkClient.users.getOrganizationMembershipList({ userId: clerkUserId });
  for (const m of memberships) {
    await upsertOrg({ id: m.organization.id, name: m.organization.name, slug: m.organization.slug });
    await upsertMembership({ clerkOrgId: m.organization.id, clerkUserId, role: m.role });
  }
  const [row] = await db.select({ id: users.id }).from(users)
    .where(eq(users.clerkUserId, clerkUserId)).limit(1);
  if (!row) throw new Error("unauthenticated"); // no Clerk org → can't scope
  return row;
}
```

## Files touched

| File | Change |
|---|---|
| `mcp-server/ctxFor.ts` | **The only real change** — add `provisionMcpUser()` + call from the auth-miss branch. |
| `lib/services/identity-sync.ts` | Reused unchanged (the exact upserts `resolveCtx` uses). |
| `lib/auth/ctx.ts` | Reference only — `resolveCtx` is the template. |
| (db schema) | **No migration.** Writes existing users/organizations/organization_memberships rows. |

## Verification (headless — no fresh OAuth needed)

1. Call `ctxFromMcpAuth` with a synthetic Clerk id (mock `clerkClient`) against dev Neon →
   assert user + membership rows created, Ctx resolves. Clean up after.
2. Idempotency: a second call creates no duplicates (upserts).
3. Already-provisioned users: unchanged fast path (no extra Clerk API calls).
4. Remove the manual bridge: `UPDATE users SET clerk_user_id='demo-user' WHERE id='USR-0001';`
5. (Optional) live re-confirm through Claude with the real account.

## Explicitly deferred (NOT this plan)

Wiring the Clerk **webhook** to the deployed URL — that's deploy-time. The webhook is the
authoritative steady-state writer; JIT is the safety net that also makes dev/tunnel work.
Both coexist in production.

## Open decision — org strategy (lock before execution)

- **A (recommended)** — mirror the user's Clerk org memberships via Backend API. Most
  faithful to Valgate tenancy; fails closed if the user has zero Clerk orgs.
- **B** — JIT-create a personal org. Guarantees a workspace but invents an org with no
  `clerkOrgId` (diverges from the webhook model).
- **C** — reject with "finish onboarding in the web app first." Smallest, but an
  AI-client-only user can never get in.

Zero-Clerk-org fallback under A: recommended = a clear "no workspace yet" tool error.

## Handoff prompt (Sonnet execution — connector form)

> Fetch plan `plan-be3fd434c3d145c7` via the Plan MCP (`get-visual-plan`). Implement the
> JIT-provisioning change in `mcp-server/ctxFor.ts` using **org strategy Option A**
> (unless the plan's open question was locked otherwise). Reuse `identity-sync` upserts;
> no schema changes. Verify per the plan's checklist against the dev Neon branch, then
> remove the `USR-0001` bridge. Run `tsc` + `eslint`. Do not wire the webhook (deploy-time).
