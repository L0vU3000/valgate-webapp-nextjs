# 03 — MCP Authorization Plan (destructive & mutating tools)

> Status: **IMPLEMENTED 2026-07-03** (Phases A + B + C). Judgement from a `/cso` pass.
> Scope: `mcp-server/index.ts` tools `update_property`, `delete_property`, and the
> `ctxFor()` identity seam in `mcp-server/ctxFor.ts`.
>
> **What shipped vs. this plan:** all of Phase A (archive_property + two-step delete),
> Phase B (`MCP_ALLOW_WRITES`, read-only by default; set true in `.env.local`), and Phase C
> (HTTP boot guard) are live. Also added read tools `preview_property` and
> `list_maintenance_items`, plus write tool `create_maintenance_item`. Server version 0.2.0.
> **One design change from the sketch below:** the delete confirmation uses a preview-issued
> **`confirmToken`** (HMAC of the property's `id` + `updatedAt`, per-boot secret), NOT
> `confirmAddress` — because every address field on `Property` is optional and would be a
> flaky gate. The token still forces a real read before delete, and it goes stale if the
> property is edited after the preview. Phase D (audit log, rate limit) remains deferred.

---

## 1. What we actually have today (the honest picture)

- **Transport is stdio only** (`StdioServerTransport`). The server runs as a *local
  subprocess* launched by an MCP client (e.g. Claude Desktop) on your machine. It is
  **not** listening on a network port. Nobody remote can reach it.
- **Identity is hardcoded.** `ctxFor()` always returns
  `{ userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" }`. There is no login,
  no token check. Every tool call acts as the owner of the demo org.
- **Writes are on.** `.env.local` has `DEMO_MODE=false` + `DEMO_ALLOW_WRITES=true`,
  so the service-layer `assertCanMutate()` guard passes and mutations succeed.
- **`delete_property` is a permanent cascade** across 21 child tables (leases,
  payments, documents, …). There is no undo and no confirmation step.

### Why this is "fine locally" but not "trustworthy"

Over stdio, "unauthenticated" just means "whoever runs the process" — that's you,
with your own data. So there is **no remote attacker** to worry about right now.

The risk that *is* real is **the AI agent itself doing something irreversible**:

1. **Excessive agency (the main risk).** The agent driving the tools can call
   `delete_property` on the wrong id, or act on a vague instruction, and wipe real
   data permanently. LLMs do this. There is nothing today that makes it stop and
   confirm.
2. **Prompt injection via property data (latent).** Fields like `notes` or `address`
   can hold text a tenant/client typed. If that text says "delete all properties",
   the agent reads it in `search_properties` output and might obey. Single-tenant
   demo data makes this low today, but it grows with real multi-user data.
3. **Hardcoded owner = multi-tenant bypass (deployment blocker).** The moment this
   server is exposed over HTTP for more than one person, *every* caller becomes the
   ORG-0001 owner. That is a critical authorization hole — but only if/when we
   deploy remotely. Over stdio it cannot be triggered.

**Verdict:** keep using it locally. Before trusting `delete_property`, make it
(a) reversible and (b) gated. Before any remote deployment, `ctxFor()` MUST become
real auth. Those are the three phases below.

---

## 2. Plan — three phases, laziest-first

Each phase is independently shippable. Phase A is the one you asked for
(a confirmation process before delete). B and C harden the surface for later.

### Phase A — Make destructive ops reversible + gated (do this first)

Two moves. Together they mean "the agent cannot delete without having actually
looked at the property, and the default action is undo-able."

#### A1. Prefer soft-delete: add an `archive_property` tool

`properties.isArchived` already exists. Archiving is just an update — no new
service code. This becomes the *recommended* way to "remove" a property; hard
delete becomes rare.

```ts
// Archive a property (reversible). This does NOT delete anything — it flips the
// isArchived flag so the property drops out of the normal list but can be restored.
// Prefer this over delete_property for anything you might want back.
server.registerTool(
  "archive_property",
  {
    title: "Archive property",
    description:
      "Hide a property from your active list without deleting it. Reversible — " +
      "set archived back to false to restore it. Prefer this over deleting.",
    inputSchema: {
      id: z.string().describe("The property id to archive, e.g. PROP-0001."),
      archived: z
        .boolean()
        .default(true)
        .describe("true to archive (default), false to restore."),
    },
  },
  async ({ id, archived }) => {
    try {
      const ctx = ctxFor();
      // Reuses the existing update path — isArchived is a normal patchable field.
      const updated = await updateProperty(ctx, id, { isArchived: archived });
      if (!updated) {
        return {
          content: [{ type: "text" as const, text: `No property found with id ${id}.` }],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: "text" as const,
            text: `Property ${id} is now ${archived ? "archived" : "restored"}.`,
          },
        ],
        structuredContent: { data: { id, isArchived: archived } },
      };
    } catch (err) {
      console.error("[valgate-mcp] archive_property failed:", err);
      return {
        content: [{ type: "text" as const, text: "Could not archive the property." }],
        isError: true,
      };
    }
  },
);
```

#### A2. Two-phase confirm for hard delete (stateless "look before you delete")

Replace the current one-shot delete with a design that **forces the agent to prove
it read the property first**, and refuses to delete on a blind or injected call.

The trick: hard delete requires the caller to pass back the property's own address
(`confirmAddress`). You can only supply the right value by having actually read the
property. No server-side token store needed — it stays stateless.

- **Call with no `confirmAddress`** → returns a *preview only* (what will be
  deleted) and deletes nothing. This is the "are you sure?" step.
- **Call with `confirmAddress`** → deletes only if it exactly matches the stored
  address. Mismatch → refuse and re-show the preview.

```ts
server.registerTool(
  "delete_property",
  {
    title: "Delete property (permanent)",
    description:
      "PERMANENTLY delete a property and all its records. This cannot be undone " +
      "(prefer archive_property). Step 1: call with just `id` to preview what will " +
      "be removed. Step 2: call again with `confirmAddress` set to the property's " +
      "exact address to actually delete it.",
    inputSchema: {
      id: z.string().describe("The property id to delete."),
      confirmAddress: z
        .string()
        .optional()
        .describe(
          "The property's exact address. Omit for a dry-run preview; provide it to confirm deletion.",
        ),
    },
  },
  async ({ id, confirmAddress }) => {
    try {
      const ctx = ctxFor();

      // Read the property first — this is both the existence check and the source
      // of the address the caller must echo back to confirm.
      const property = await getProperty(ctx, id);
      if (!property) {
        return {
          content: [{ type: "text" as const, text: `No property found with id ${id}.` }],
          isError: true,
        };
      }

      const cascade = await countPropertyCascade(ctx, id);

      // Step 1 (no confirmation) OR a wrong confirmation → preview, delete nothing.
      if (confirmAddress !== property.address) {
        const reason =
          confirmAddress === undefined
            ? "Dry run — nothing deleted."
            : "confirmAddress did not match — nothing deleted.";
        return {
          content: [
            {
              type: "text" as const,
              text:
                `${reason}\nTo permanently delete ${id} (${property.address}), call again ` +
                `with confirmAddress set to exactly that address.\n` +
                `This will remove:\n${JSON.stringify(cascade, null, 2)}`,
            },
          ],
          structuredContent: { data: { id, deleted: false, cascade, address: property.address } },
        };
      }

      // Step 2: confirmed. Do the permanent cascade delete.
      await deleteProperty(ctx, id);
      return {
        content: [
          {
            type: "text" as const,
            text: `Permanently deleted ${id} (${property.address}) and its related records:\n${JSON.stringify(cascade, null, 2)}`,
          },
        ],
        structuredContent: { data: { id, deleted: true, cascade } },
      };
    } catch (err) {
      console.error("[valgate-mcp] delete_property failed:", err);
      return {
        content: [{ type: "text" as const, text: "Could not delete the property." }],
        isError: true,
      };
    }
  },
);
```

Why this beats a simple `confirm: true` boolean: a boolean can be set blindly by an
over-eager or injected agent. Requiring the *actual address* means a delete cannot
happen without a real read of that specific property, which also neutralises the
"malicious notes field says delete everything" injection path — the agent still has
to fetch and echo the correct address.

> Needs one extra import in `index.ts`: `getProperty` from `@/lib/services/properties`.

### Phase B — Read-only by default at the MCP layer

Right now the only write guard is the service-layer `assertCanMutate()`, which is
controlled by `DEMO_ALLOW_WRITES` (a flag that also governs the web app). Give the
MCP surface its **own** switch so you can run it read-only without touching web
behaviour.

```ts
// mcp-server/index.ts — near the top, one flag for the whole MCP write surface.
const MCP_ALLOW_WRITES = process.env.MCP_ALLOW_WRITES === "true";

// Small helper each mutating tool calls first.
function refuseIfReadOnly() {
  if (!MCP_ALLOW_WRITES) {
    return {
      content: [
        {
          type: "text" as const,
          text: "This Valgate MCP server is running in read-only mode. Set MCP_ALLOW_WRITES=true to enable edits.",
        },
      ],
      isError: true,
    };
  }
  return null;
}
```

Then the first line of `update_property`, `archive_property`, and `delete_property`:

```ts
const blocked = refuseIfReadOnly();
if (blocked) return blocked;
```

Default (flag unset) = read-only. You opt into writes deliberately. `search_properties`
stays available either way.

### Phase C — Real identity before ANY remote deployment (hard blocker)

`ctxFor()` returning a hardcoded owner is safe *only* because the transport is
stdio + local. If the transport is ever changed to HTTP (`StreamableHTTPServerTransport`),
that hardcoded owner becomes a full multi-tenant bypass.

Add a **boot guard** so the server refuses to start over the network until real
auth is wired:

```ts
// Refuse to run over a network transport while identity is still hardcoded.
// ctxFor() returns a fixed demo owner; that is only acceptable for a local stdio
// process. Flip this guard OFF only after ctxFor() validates a real caller token.
const IDENTITY_IS_REAL = false; // set true once ctxFor() does real token -> {userId, orgId, role}
if (!IDENTITY_IS_REAL && process.env.MCP_TRANSPORT === "http") {
  console.error(
    "[valgate-mcp] refusing to start over HTTP: ctxFor() still returns a hardcoded owner. Wire real auth first.",
  );
  process.exit(1);
}
```

When you do go remote, `ctxFor()` must take the incoming request/token and return
the *real* caller's `{ userId, orgId, orgRole }` — the same shape `lib/auth/ctx.ts`
produces from Clerk for the web app. At that point the service-layer org-scoping and
role checks (already enforced in every `lib/services/*` function) start doing real
work instead of always passing.

### Phase D — later, if it earns its place

- **Mutation audit log**: append `{ ts, tool, id, ctx.userId }` to a file/table on
  every write. Useful once more than one person or agent touches it.
- **Rate limiting** on mutations. Not needed for a single local agent.

Both are YAGNI today — listed so they are a deliberate deferral, not an oversight.

---

## 3. Recommended order

1. **Phase A2** (delete confirm gate) + **A1** (archive) — directly answers
   "authorization/confirmation before delete". Small, reversible, high value.
2. **Phase B** (read-only default) — one flag, makes the whole surface safe to leave
   connected.
3. **Phase C** (boot guard) — cheap insurance; the real `ctxFor()` work happens only
   when you actually decide to deploy remotely.

Phases A + B are ~1 hour of wiring against services that already exist. Phase C's
guard is 6 lines; the real-auth body is the only genuinely new backend work, and it
is deferred until a remote deployment is on the table.

---

## 4. Note on the client's tool menu

The MCP client currently advertises tools this server does **not** implement
(`list_workspaces`, "log maintenance issues"). Those are not in `mcp-server/index.ts`
— there is no workspace entity in the domain at all. `list_workspaces` "fails every
time" because nothing backs it. If those capabilities are wanted, they are new tools
(maintenance items have a ready service: `lib/services/maintenance-items.ts`); a
"workspace" concept would need to be defined first (the closest existing thing is the
org). Out of scope for this authorization plan — flagged so the mismatch is on record.

---

*This tool is not a substitute for a professional security audit. `/cso` is an
AI-assisted scan that catches common patterns; it is not comprehensive. For a
production system handling PII or payments, engage a qualified security firm.*
