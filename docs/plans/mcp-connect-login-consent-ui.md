# MCP Connect — Login & Consent UI

- **Plan ID:** `plan-f25c07c2625443d1`
- **Hosted:** https://plan.agent-native.com/plans/plan-f25c07c2625443d1
- **Status:** review — 4 design decisions locked; 3 UI open questions remain
- **Type:** UI-first (canvas: Consent, Success, Denied, No-workspace)

## Objective

The Valgate-branded screens Clerk shows during the MCP OAuth handshake. **Login is reused
as-is** (existing `/login`); the net-new work is a `/oauth-consent` route plus
success/deny/no-workspace result states. Built on Clerk's `useOAuthConsent` hook +
`clerk.oauthApplication.buildConsentActionUrl` — not a hand-rolled OAuth screen.

## Locked design decisions

- **D1 — Surface:** centered card on a calm backdrop (not a full page).
- **D2 — Permissions:** grouped **View / Modify / Delete**, destructive flagged.
- **D3 — Hero:** app-forward headline ("Claude wants to connect to your Valgate
  workspace") inside quiet Valgate chrome.
- **D4 — Login:** reuse the existing `/login` as-is.

## Design language (`.impeccable.md`)

Light mode, confident/modern/sharp, Airbnb-referenced. **Blue is precious** (#2563EB
interactive) — accent only on the **Allow** action. Borders over shadows (1px card
border, elevation reserved for the card itself). Typography-led; icons supporting. Motion
earns its place (success confirmation, not spinner theatre).

## The flow

```
Claude connector → 401 + well-known metadata → Clerk AS
   ├─ signed out → /login (REUSED) → /oauth-consent (NEW)
   └─ signed in  → /oauth-consent (NEW)
        ├─ Allow  → Success  → return to claude.ai
        ├─ Deny   → Denied   → nothing granted
        └─ no org → No workspace (depends on Plan 1 JIT)
```

## States & copy

| State | Trigger | Primary action | Key copy |
|---|---|---|---|
| Consent (default) | Signed-in user hits `/oauth-consent` | Allow access | "Claude wants to connect to your Valgate workspace" |
| Success | Allow submitted | Return to claude.ai | "Claude is now connected" |
| Denied | Deny submitted | Return to claude.ai | "Access not granted — nothing changed" |
| No workspace | Authenticated, zero orgs | Open Valgate | "Finish setting up Valgate first" |
| Loading | `useOAuthConsent` fetching | — | skeleton card, no spinner |

## Implementation — the consent route

```tsx
// app/oauth-consent/page.tsx (new — sketch)
'use client'
import { useClerk, useOAuthConsent } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'

export function ConfirmMcpConnection() {
  const clerk = useClerk()
  const p = useSearchParams()
  const clientId = p.get('client_id') ?? ''
  const redirectUri = p.get('redirect_uri') ?? ''
  const { data, isLoading } = useOAuthConsent({
    oauthClientId: clientId, redirectUri, scope: p.get('scope') ?? undefined,
  })
  // group data.scopes into View / Modify / Delete for the card (D2)
  return (
    <form method="POST" action={clerk.oauthApplication.buildConsentActionUrl({ clientId })}>
      {/* app-forward headline (D3), workspace selector if multi-org, grouped perms, Allow/Deny */}
      {Array.from(p.entries()).filter(([k]) => k !== 'consented')
        .map(([k, v], i) => <input key={i} type="hidden" name={k} value={v} />)}
      <button name="consented" value="false">Deny</button>
      <button name="consented" value="true">Allow access</button>
    </form>
  )
}
```

`useOAuthConsent` returns `oauthApplicationName`, logo, and `scopes[]` — that's what makes
the headline app-forward and the permission list real, not hardcoded. `buildConsentActionUrl`
is the POST target; forward every original OAuth param as hidden inputs except `consented`.

## Files touched

| File | Change |
|---|---|
| `app/oauth-consent/page.tsx` | **NEW** — consent card (D1–D3); success/deny/no-workspace as sibling states or routes. |
| `app/login/*` | **Reused, no change (D4).** |
| Clerk dashboard / config | Point the instance's custom OAuth consent URL at `/oauth-consent`. With DCR on, Clerk enforces consent (good). |
| `components/*` | Reuse Valgate Button/Select/card tokens; blue only on Allow. |

## References (Mobbin)

- **Notion — "Connect with Notion MCP"** — closest analog (grant chatgpt.com access,
  workspace selector, checkmarked permissions, trust-the-redirect notice).
- **X / Etsy OAuth consent** — app-forward headline + Authorize/Cancel + permission bullets.
- **Amie — "not allowed yet"** — tone reference for the no-workspace/fail state.

## Open questions (UI)

1. **Multi-org: gate Allow until a workspace is chosen?** Recommended: pre-select primary,
   Allow always enabled (lowest friction).
2. **Success: auto-redirect or manual return?** Recommended: manual "Return to claude.ai"
   (calmer, gives a beat of confirmation).
3. **Permission copy granularity?** Recommended: grouped plain-language only; the
   destructive group is the one that must stand out.

## Dependency

The **No-workspace** state depends on **Plan 1 (JIT provisioning)** — until then it's the
honest failure surface for an un-provisioned user.

## Handoff prompt (Sonnet execution — connector form)

> Fetch plan `plan-f25c07c2625443d1` via the Plan MCP (`get-visual-plan`). Build
> `app/oauth-consent/page.tsx` with `useOAuthConsent` per the locked decisions (D1 card,
> D2 grouped View/Modify/Delete with Delete flagged, D3 app-forward, D4 reuse `/login`).
> Add Success/Denied/No-workspace states. Style per `.impeccable.md` (blue only on Allow,
> borders over shadows). Resolve the 3 UI open questions using the recommended options
> unless told otherwise. Point Clerk's consent URL at `/oauth-consent`. Run `tsc` + `eslint`.
