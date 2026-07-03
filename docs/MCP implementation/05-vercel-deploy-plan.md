# 05 — Deploy the Valgate MCP to Vercel (Phase 5: HTTP + Clerk OAuth)

> Status: **BUILT 2026-07-03 (code + local test; NOT deployed).** Option B (real Clerk OAuth).
> Sources: Vercel MCP docs + Clerk MCP guide (via context7 `/clerk/clerk-docs`). Builds on `03`.
>
> **What shipped vs. this plan:**
> - Packages: `mcp-handler` + `@clerk/mcp-tools` installed. **No `@clerk/nextjs` bump needed** —
>   `@clerk/backend` already supports `oauth_token` and mcp-tools peers `@clerk/nextjs ^7.2.3` (have 7.5.3).
>   **`@modelcontextprotocol/sdk` pinned 1.29→1.26.0** to satisfy `mcp-handler`'s exact peer.
> - Route path: **`app/api/mcp/route.ts` (static)**, NOT root `app/[transport]/route.ts` — the root
>   dynamic segment would shadow this app's route-group pages. Endpoint = `/api/mcp`.
> - Metadata: `app/.well-known/oauth-protected-resource/api/mcp/route.ts` (dot-folder works in Next 15).
> - Tools extracted to `mcp-server/tools.ts` (`registerValgateTools`), shared by stdio + HTTP.
> - Org resolution: `lib/auth/mcp-ctx.ts` `ctxForClerkUser()` (primary active membership).
> - **Middleware:** `/api/mcp` + `/.well-known/oauth-protected-resource` exempted from BOTH the site
>   gate and `auth.protect()` so the route does its own bearer-token auth.
> - Verified locally: `tsc` clean; stdio still lists 7 tools; `POST /api/mcp` no-token → **401**;
>   metadata GET → **200** advertising the Clerk authorization server.
> - **Still needs a live deploy + Clerk Dashboard OAuth/DCR enabled** to test the full login flow.

---

## 1. The idea in one paragraph

Today the MCP runs as a local `stdio` subprocess (`mcp-server/index.ts`) that fakes its identity
because it lives *outside* Next.js. We move it *inside* Next.js as an API route on the existing
Vercel app. Two official packages do the heavy lifting: **`mcp-handler`** (Vercel's adapter that turns
our `McpServer` into a route) and **`@clerk/mcp-tools`** (Clerk's OAuth glue). The user logs in with
their **normal Valgate/Clerk account**; Clerk issues an OAuth token; the route verifies it and the MCP
acts as **that real user**. Same deployment, same Clerk, same Neon database.

## 2. Who does what (the auth model, plainly)

- **Clerk = the Authorization Server.** It shows the login/consent screen and issues the access token.
  This is the "proper login" — same accounts as the web app, no new password, no shared key.
- **Our MCP route = the Resource Server.** It does not log anyone in. It receives a `Bearer` token on
  each request, asks Clerk "is this valid, and who is it?", and gets back the Clerk `userId`.
- **The MCP client** (Claude.ai / Cursor / Claude Desktop / Inspector) runs the OAuth dance for the user
  and attaches the token to every call. Clients discover how to log in via a small metadata endpoint we
  publish (`/.well-known/oauth-protected-resource/...`).

## 3. The wrinkle we must handle: token has a user, not an org

`requireCtx()` in the web app gets `orgId` from the Clerk **session** (`auth()`), because the browser has
an active organization. An **OAuth token has no active org** — it identifies a user only. But Valgate's
`Ctx` needs `{ userId, orgId, orgRole }`, and the app enforces "no null-org path (D14)".

So the MCP route resolves the org **itself**: take the Clerk `userId` from the token, look up that user's
membership rows (the same `organizations` / memberships mirror tables `requireCtx()` already maintains),
and build a `Ctx`. **Decision needed (§8.1):** what if a user belongs to more than one org? Options:
their primary/default org, or expose the org as a tool argument. Recommend **default org for v1** (single
org per user is the common case), add a selector later.

This lives in a new `ctxForClerkUser(userId)` helper next to `lib/auth/ctx.ts`, reusing its
`ourUserId` / `ourOrgId` / role resolvers so the identity is identical to the web app's.

## 4. Files we add / change

| File | Change |
|---|---|
| `package.json` | add `mcp-handler` and `@clerk/mcp-tools`; **likely bump `@clerk/nextjs`** (7.5.3 → latest 7.x — see §8.3) |
| `mcp-server/tools.ts` | **new** — extract the 7 tool registrations into `registerValgateTools(server, { ctxFor, allowWrites, confirmSecret })` so local stdio AND the Vercel route share ONE definition |
| `mcp-server/index.ts` | refactor to call `registerValgateTools(...)`; keeps the local stdio path working |
| `lib/auth/mcp-ctx.ts` | **new** — `ctxForClerkUser(clerkUserId): Promise<Ctx>` (org resolution, §3) |
| `app/[transport]/route.ts` | **new** — the MCP handler: `createMcpHandler` + `withMcpAuth` + `verifyClerkToken`, Node runtime |
| `app/.well-known/oauth-protected-resource/mcp/route.ts` | **new** — OAuth metadata so clients can discover Clerk |
| `.env.example` | document `MCP_CONFIRM_SECRET`, `MCP_ALLOW_WRITES` (Clerk keys already exist) |

Extracting the tools matters: we never want two drifting copies of `delete_property`.

## 5. The route handler (shape, from Clerk's documented pattern)

```ts
// app/[transport]/route.ts
import { verifyClerkToken } from "@clerk/mcp-tools/next";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { auth } from "@clerk/nextjs/server";
import { registerValgateTools } from "@/mcp-server/tools";
import { ctxForClerkUser } from "@/lib/auth/mcp-ctx";

// Neon + Clerk + node:crypto need the Node runtime, not Edge (same as
// app/api/documents/[id]/summarize/route.ts).
export const runtime = "nodejs";
export const maxDuration = 60;

const handler = createMcpHandler((server) => {
  registerValgateTools(server, {
    // Each tool call resolves the real Ctx from the authenticated Clerk user on the request.
    // authInfo.extra.userId is set by verifyClerkToken below.
    ctxFor: (authInfo) => ctxForClerkUser(authInfo.extra.userId as string),
    allowWrites: process.env.MCP_ALLOW_WRITES === "true",
    confirmSecret: process.env.MCP_CONFIRM_SECRET ?? "",
  });
});

// Verify the incoming bearer token against Clerk. verifyClerkToken returns the AuthInfo
// (with extra.userId) or undefined to reject with 401.
const authHandler = withMcpAuth(
  handler,
  async (_req, token) => {
    const clerkAuth = await auth({ acceptsToken: "oauth_token" });
    return verifyClerkToken(clerkAuth, token);
  },
  {
    required: true,
    resourceMetadataPath: "/.well-known/oauth-protected-resource/mcp",
  },
);

export { authHandler as GET, authHandler as POST };
```

```ts
// app/.well-known/oauth-protected-resource/mcp/route.ts
// Tells MCP clients that Clerk is the authorization server and which scopes we need.
// Exact export names to confirm against @clerk/mcp-tools/next at build time.
import { protectedResourceHandlerClerk, metadataCorsOptionsRequestHandler } from "@clerk/mcp-tools/next";

const handler = protectedResourceHandlerClerk({ scopes_supported: ["email", "profile"] });
const corsHandler = metadataCorsOptionsRequestHandler();

export { handler as GET, corsHandler as OPTIONS };
```

> Change from the current tools: `registerValgateTools` passes the request's `authInfo` INTO `ctxFor`,
> because identity is now per-caller (not a module constant). Small signature change:
> `ctxFor: (authInfo) => Promise<Ctx>`. The tool bodies already `await ctx = ctxFor(...)`.

## 6. The serverless gotcha (unchanged from Option A): delete confirm token

`03-authorization-plan.md` signs the delete `confirmToken` with a secret generated at boot. On Vercel
there are many short-lived instances, so the preview call (issues token) and confirm call (checks token)
can hit different instances with different random secrets → valid token rejected. Fix: sign with a
**stable env secret `MCP_CONFIRM_SECRET`**. `registerValgateTools` takes `confirmSecret`; local dev falls
back to a random value.

## 7. Environment / dashboard setup

**Vercel env (Production):**

| Var | Secret? | Meaning |
|---|---|---|
| `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | 🔒 already set | Clerk verifies tokens with these — same keys the web app uses. |
| `MCP_CONFIRM_SECRET` | 🔒 yes | Stable HMAC secret for delete tokens (§6). `openssl rand -hex 32`, set once. |
| `MCP_ALLOW_WRITES` | no | `true` enables update/archive/delete/log. **Leave UNSET (read-only) for now** per your decision. |
| `DATABASE_URL` | 🔒 already set | Prod Neon — the MCP reads/writes the SAME prod data (rotate first, §8.4). |

No `MCP_API_KEY` / `MCP_CTX_*` anymore — identity comes from the logged-in Clerk user, not env.

**Clerk Dashboard (the "proper authorization" setup):**
- Enable **OAuth applications** and **Dynamic Client Registration (DCR)** so MCP clients can register and
  run the login flow. Confirm this is available on the current Clerk plan (§8.3).
- Decide the **scopes** the MCP requests (`email`, `profile`, plus any custom). Keep minimal.

## 8. Decisions to lock before building

1. **Multi-org rule (§3).** Recommend: v1 acts in the user's **default/primary org**; add an org-selector
   tool arg later. Confirm, or tell me the picking rule you want.
2. **Writes off at launch.** ✅ locked — `MCP_ALLOW_WRITES` stays unset; read-only first, prove reads on
   prod, enable writes later.
3. **Clerk version + plan.** Installed `@clerk/nextjs` is 7.5.3; `acceptsToken:'oauth_token'`, OAuth apps,
   and DCR are newer. Prereq step: bump `@clerk/nextjs` to latest 7.x, install `@clerk/mcp-tools`, and
   confirm the Clerk plan exposes OAuth/DCR. I'll verify versions before writing final code.
4. **Rotate the prod Neon password first.** ✅ locked (recommended). The MCP route uses `DATABASE_URL`;
   do the go-live rotation as part of this.

## 9. Step-by-step

1. Verify prereqs (§8.3): bump `@clerk/nextjs`, `npm i mcp-handler @clerk/mcp-tools`, confirm Clerk
   OAuth/DCR is enabled in the dashboard.
2. Extract tools → `mcp-server/tools.ts` (`registerValgateTools`); refactor `mcp-server/index.ts`. Change
   `ctxFor` to take `authInfo` and `confirmTokenFor` to take the secret as an argument.
3. Add `lib/auth/mcp-ctx.ts` → `ctxForClerkUser(userId)` (reuses `ourUserId`/`ourOrgId`/role resolvers).
4. Add `app/[transport]/route.ts` and `app/.well-known/oauth-protected-resource/mcp/route.ts` (§5).
5. Add `MCP_CONFIRM_SECRET` + `MCP_ALLOW_WRITES` to `.env.example`; set real values in Vercel.
6. **Local test** — `npm run dev`, then MCP Inspector: Streamable HTTP, URL `http://localhost:3000/mcp`.
   The Inspector should trigger the Clerk login flow, then list tools and run `search_properties` as you.
7. Rotate prod Neon password; deploy to Vercel; enable **Fluid compute**. Keep `MCP_ALLOW_WRITES` unset.
8. **Prod smoke (read-only)** — connect a client to `https://<app>.vercel.app/mcp`. Confirm it forces
   Clerk login, returns YOUR real prod properties, and rejects unauthenticated calls (401).
9. Later: flip `MCP_ALLOW_WRITES=true`; test archive, then two-step delete on a throwaway record.

## 10. What we are NOT doing (deliberate)

- **No Redis / SSE resumability.** Stateless Streamable HTTP + env-signed delete token covers us.
- **No shared-secret key.** Superseded by real Clerk OAuth (this rewrite).
- **No Deployment Protection in front of the MCP route.** It would block the OAuth flow / machine clients
  unless we add an automation bypass. Clerk OAuth is the gate; Vercel Firewall / rate limits are optional
  later hardening.

---

*Security note from `/cso`: writes stay OFF until the read path is proven on prod. When enabled, a
confirmed `delete_property` deletes real data — guarded by real per-user Clerk auth (who), org resolution
(what they can touch), archive-preferred, and the two-step delete.*
