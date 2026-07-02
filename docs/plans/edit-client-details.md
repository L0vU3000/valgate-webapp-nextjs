# Edit Client / Portfolio Details — Pro cockpit CRUD

> Local mirror of hosted plan [`plan-c7d2f442eed74dff`](https://plan.agent-native.com/plans/plan-c7d2f442eed74dff).
> Authored in Opus with **Mobbin** references + **/impeccable** (`.impeccable.md` → Valgate Professional).
> Status: **review** (open questions not yet locked). Execute in a separate Sonnet chat once decisions are locked.

## Objective

Managers can **create**, **read**, **archive/reactivate**, and manage **members** of a client — but
there is no way to edit a client's core details. Renaming a client, fixing a contact email, or
switching **Individual ↔ Corporate** is impossible from the UI. This plan adds that edit path.

**Done means:** from a client's detail page (and from the clients-table row menu), a manager can
open an *Edit details* drawer, change **name / email / client type**, save, and see it reflected
across the header, table, and rollups — with the client's own account left untouched.

**In scope:** `EditClientDrawer`, one `updateClient` action, the header *Edit* button, the `?edit=1`
deep-link, and the table row menu that leads to it.
**Deferred:** editing the client's real Clerk login identity; a dedicated impersonated "client
settings" route; any change to members/archive flows (already have controls, only *linked* from the drawer).

## Design language

- Source: `.impeccable.md` → **Valgate Professional** (light mode, confident PM-SaaS, calm/dense/organized,
  borders over shadows, **blue `#2563EB` precious/rare**, no side-stripe borders, Geist body).
- Drawer mirrors the existing `ManageMembersDrawer` shell (backdrop + fixed right panel + header/scroll/footer).
- Settings-style labeled sections (`DETAILS`, `LINKED ACCOUNT`) echo the account settings page rhythm.
- **Mobbin refs:** Acctual *Update contact* right-drawer (name + email + archive-in-footer) — near-exact match;
  HubSpot inline contact panel; Jobber *Edit Client* full form.
- *Edit* is a **secondary** button (not blue); blue is reserved for **Save changes** inside the drawer.

## Key decision — reflect + link, never overwrite

A client has **two identities**:
1. The manager's **`clients` row** — a private label (name/email/type) the manager owns. Safe to edit freely.
   **This is all the drawer edits.**
2. The client's **real account** — Clerk identity + profile in their own org. Theirs. On acceptance the client
   becomes org admin and the manager drops to a read-only viewer ([[client-permission-leader]]).

So the drawer **reflects + links, never overwrites**: it edits the `clients` row, shows the client's
authoritative account email/status **read-only**, and links out to **Manage members** / **View as client**.
It never writes through to the client's login email or profile. That is what "connect to the client's
account & settings" means here — a visible, linked relationship, not silent mutation.

## Entry points — A, and B leads to A

- **A (primary):** an **Edit** button in `ClientPageHeader` opens the drawer in place on `/pro/clients/[clientId]`.
- **B → A:** the `/pro/clients` table row gains a `···` overflow menu with **Edit details** →
  `/pro/clients/[clientId]?edit=1`. `ClientPageHeader` reads that param on mount, auto-opens the drawer,
  and cleans the URL — the same pattern `ClientsIndexPage.tsx:52-60` already uses for `?add=` / `?onboard=1`.
  One drawer, two doors; no separate table modal.

## Backend — `updateClient` (near-clone of `setClientStatus`)

New export in `app/(pro)/pro/actions.ts`, following the exact shape of `setClientStatus` (`actions.ts:342`):
**validate → auth → IDOR (Neon-first, FS-fallback) → Neon-canonical update → best-effort FS mirror → audit log.**

```ts
const updateClientSchema = z.object({
  clientId: z.string().min(1).max(64),
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email().max(200).or(z.literal("")).optional(), // "" → null
  clientType: z.enum(["Individual", "Corporate"]),                        // matches DB enum, no mapping
});

export async function updateClient(input: {
  clientId: string; name: string; email?: string; clientType: "Individual" | "Corporate";
}): Promise<ProActionResult> {
  const parsed = updateClientSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const userId = getCurrentUserId();
  const ctx = await requireCtx();

  // IDOR: client must belong to THIS manager. Neon first, FS fallback for legacy clients.
  const [neonClient] = await db.select({ id: clients.id }).from(clients)
    .where(and(eq(clients.id, parsed.data.clientId), eq(clients.managerUserId, ctx.userId))).limit(1);
  const fsClient = neonClient ? null : await clientsDb.get(userId, parsed.data.clientId);
  if (!neonClient && !fsClient) return { ok: false, error: "Client not found." };

  const name = parsed.data.name;
  const email = parsed.data.email?.trim() ? parsed.data.email.trim() : null;
  const initials = nameToInitials(name);   // derive visuals from the new name
  const avatarBg = nameToAvatarBg(name);

  if (neonClient) {
    await db.update(clients)
      .set({ name, email, clientType: parsed.data.clientType, initials, avatarBg, updatedAt: new Date() })
      .where(eq(clients.id, parsed.data.clientId));
  }
  try {
    const updated = await clientsDb.update(userId, parsed.data.clientId, {
      name, email: email ?? undefined, clientType: parsed.data.clientType, initials, avatarBg,
    });
    if (!updated && !neonClient) return { ok: false, error: "Could not update client." };
  } catch (err) {
    if (!neonClient) return { ok: false, error: "Could not update client." };
    logger.error("updateClient: FS mirror failed (non-fatal)", { error: String(err) });
  }
  try {
    await logActivity(ctx, { entity: "client", action: "updated", entityId: parsed.data.clientId,
      summary: `Client ${name} details updated` });
  } catch (err) { console.error("updateClient: audit log failed", err); }

  return { ok: true }; // drawer calls router.refresh() on ok (same as ManageMembersDrawer)
}
```

> **Gotcha:** `nameToInitials` / `nameToAvatarBg` live **un-exported** in `client-onboarding.ts:149/168`
> (and are duplicated in `scripts/backfill-clients.ts`). **Export them from `client-onboarding.ts`** and
> import into `actions.ts` — do not add a third copy.

No schema change: `updateClient` writes only existing `clients` columns (name, email, clientType, initials,
avatarBg, updatedAt).

## Files touched

| File | Change | What |
|---|---|---|
| `app/(pro)/pro/clients/[clientId]/_components/EditClientDrawer.tsx` | new | The drawer — Details + Linked account + footer. Mirrors `ManageMembersDrawer` shell. |
| `app/(pro)/pro/actions.ts` | edit | Add `updateClient` + `updateClientSchema` (clone of `setClientStatus` at `:342`). |
| `app/(pro)/pro/clients/[clientId]/_components/ClientPageHeader.tsx` | edit | *Edit* button + drawer state + `?edit=1` auto-open. (Already has an unstaged working-tree change.) |
| `app/(pro)/pro/dashboard/_components/ClientsTable.tsx` | edit | Row `···` menu with *Edit details* → `/pro/clients/[id]?edit=1` (index instance only). |
| `lib/services/client-onboarding.ts` | edit | Export `nameToInitials` / `nameToAvatarBg` for reuse. |
| `app/(pro)/pro/queries.ts` | edit (small) | Surface `linkedAccount` (email/status/memberCount/orgId) for the detail page from rollup data. |

## Build & verify

1. Export `nameToInitials`/`nameToAvatarBg`; add `updateClient` + schema to `actions.ts`.
2. Build `EditClientDrawer` (Details first, then Linked account, then footer) reusing `proInputClass` +
   `ConfirmAction` + `sonner`.
3. Wire the *Edit* button + `?edit=1` auto-open into `ClientPageHeader`; add the row `···` menu to
   `ClientsTable` (index instance only, gated like `onArchive`, never for `OWN_PORTFOLIO_ID`).
4. `tsc` + `eslint` clean.
5. **E2E smoke** (manager session): open a client → Edit → rename + flip type + change email → Save →
   header, table, and avatar initials update after refresh.
6. **Deep-link smoke:** `/pro/clients` row `···` → Edit details → lands on detail page with drawer open,
   URL cleaned to `/pro/clients/[id]`.
7. **IDOR smoke:** `updateClient` with another manager's `clientId` → "Client not found.", writes nothing.
8. **Identity smoke:** the client's real login email is unchanged after a drawer email edit.

## Open questions (unlocked — decide before executing)

1. **Client type control** — segmented Individual/Corporate toggle *(recommended)* vs native `<select>`.
2. **Allow editing email** — yes, it's the manager's contact label *(recommended)* vs read-only.
3. **Reach the client's settings** — via *View as client* only for v1 *(recommended)* vs a direct
   "Open client settings" deep-link (needs as-client `/settings` org-scoping — a follow-up).
4. **`···` row menu scope** — clients index only *(recommended)* vs index + dashboard widget.

## Paste-ready Sonnet execution prompt (after locking)

> Connector form (use when `claude mcp list` shows `plan … ✓ Connected`):
>
> ```
> Execute the approved plan plan-c7d2f442eed74dff. Fetch it with the Plan MCP
> (get-visual-plan, planId "plan-c7d2f442eed74dff") and follow it exactly.
> It adds an Edit Client Details drawer on /pro/clients/[clientId] plus a
> updateClient server action modeled on setClientStatus. Honor the locked
> decisions in this repo's docs/plans/edit-client-details.md. Run tsc + eslint
> before finishing. Do NOT overwrite the client's real login identity — the
> drawer edits the clients row only.
> ```
