# `DELETE /api/v1/me` — account deletion (contract proposal)

**Status:** proposal. Blocks the iOS App Store submission (Apple guideline 5.1.1(v)).
**Branch:** `feat/v1-account-deletion` (base `origin/staging` @ bb360d4).
**Author:** Hermes, 2026-10-14, from a read of the shipped code — not from a plan doc.

## Why this exists

Apple 5.1.1(v): *"If your app supports account creation, you must also offer account
deletion within the app."* Account deletion is the single largest rejection category in
Apple's own transparency data. The iOS client creates accounts through Clerk and has no
deletion path, so the submission fails until this endpoint exists.

## Current state (verified in this tree)

- **No user-facing deletion exists anywhere.** `grep -rniE "deleteUser|deleteAccount"` over
  `app/` and `lib/` returns nothing. The gap is product-wide, not iOS-only.
- **Clerk is the source of truth.** `lib/db/schema/identity.ts` header: *"Clerk is source of
  truth; these tables mirror it into Postgres."* So deletion is upstream-first: delete the
  Clerk user, let the mirror reconcile. Deleting only the mirror would leave the account
  able to sign back in.
- **The reconciliation already exists.** `app/api/webhooks/clerk/route.ts:200` handles
  `user.deleted` → `deactivateUser()` (`lib/services/identity-sync.ts:155`), which sets that
  user's memberships to `status: "removed"` with `removedAt`. The `users` row and all tenant
  data are deliberately left alone:
  `// M2: org/user deleted in Clerk → deactivate memberships, never hard-delete tenant data.`
- **A naive delete would fail anyway.** `organizationMemberships.userId → users.id`
  (`identity.ts:44`) declares no `onDelete`, so the default `RESTRICT` rejects
  `DELETE FROM users` while any membership row exists. Same for `orgId → organizations.id`.

Conclusion: **this endpoint should not invent a cascade.** It should delete the Clerk user
and let the existing, deliberate M2 path do the rest. That is a ~40-line route, not a
transaction over twelve tables.

## Contract

```yaml
/me:
  delete:
    operationId: deleteMe
    summary: Delete the caller's own account
    description: |
      Deletes the caller's Clerk account, which is the source of truth for identity.
      Memberships are deactivated by the existing `user.deleted` webhook; tenant
      business records are retained per the M2 policy. Idempotent from the caller's
      point of view: once the account is gone, the call is unauthenticated (401).
    responses:
      "204": { description: Account deleted }
      "401": { $ref: "#/components/responses/Unauthorized" }
      "500": { $ref: "#/components/responses/InternalError" }
```

Same shape as `getMe`: `resolveApiV1Ctx()` → service → `apiError()` envelope,
`export const dynamic = "force-dynamic"`, fail-closed generic 500.

Implementation: resolve ctx (needs the Clerk user id — either on ctx or via the mirror row),
`clerkClient.users.deleteUser(clerkUserId)`, return 204. Order matters: Clerk first, because
it is the source of truth; a mirror-first delete leaves a live sign-in.

## Three decisions this endpoint does not settle

**D1 — personal data survives on the mirror row.** `deactivateUser` marks memberships removed
but leaves `users.primary_email`, `display_name` and `avatar_url` in place forever. An
account deletion that retains the email address is the one thing a privacy-policy claim
cannot survive. *Recommend:* extend `deactivateUser` to anonymise the mirror row (null the
email/name/avatar, keep the `USR-*` id so FKs and the audit trail stay intact). Small, and it
is the difference between deactivation and deletion.

**D2 — object storage.** Document rows cascade from `properties`, but the S3 objects do not.
Under M2 the records are retained on purpose, so *recommend no purge* — but the privacy
policy must then state the retention explicitly, and for how long.

**D3 — the sole owner.** Deleting a user who is the only `owner` of an org removes the last
person with access to it; the properties and documents remain. *Recommend:* allow it for v1
(it is consistent with M2), and disclose it in the privacy policy and in Notes for Review.
If legal review prefers, the alternative is a `409 owner_of_org` requiring ownership transfer
first — that is the only reason a 409 would appear in this contract.

## Tests (required before this ships)

1. `401` unauthenticated.
2. `204` happy path, and the Clerk delete was actually called with the caller's id — never a
   body-supplied id.
3. Second call → `401`, not `500` (idempotent from the caller's side).
4. Memberships for that user are `status: "removed"` after the webhook runs.
5. With D1: the mirror row no longer holds the email.
6. A caller cannot delete another user — no id in the request body at all.

## Downstream

- Mirror into `valgate-ios/docs/API-CONTRACT.md` (the iOS repo mirrors, it does not propose).
- iOS side: Settings → Delete account → confirmation → call → sign out. Ticket 1 in
  `docs/APP-STORE-READINESS-SOP.md` on the iOS branch `ios/appstore-readiness`.
