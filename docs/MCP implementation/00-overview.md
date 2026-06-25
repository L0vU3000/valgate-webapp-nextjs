# Valgate MCP — Overview (start here)

> Audience note: this is written for a frontend-expert / backend-beginner. Backend
> concepts are explained from scratch. Every recommendation says *why*.

---

## 1. What is an MCP, in plain words

**MCP = Model Context Protocol.** It is a small, standard "language" that lets an
AI assistant (like Claude) talk to *your* app's data and actions in a safe,
structured way.

Think of it like a **USB-C port for AI**. Today, if you want Claude to know about a
user's properties, you'd copy-paste data into the chat. With an MCP server, Claude
can instead *plug into Valgate directly* and ask for exactly what it needs:

- "List the properties for this user."
- "What documents are missing on PROP-0007?"
- "Create a maintenance item for the boiler."

An **MCP server** is a small program that sits next to your app and exposes two kinds
of things to an AI client:

| MCP concept | Plain meaning | Valgate example |
|---|---|---|
| **Tool** | An action the AI can *do* | `create_maintenance_item`, `list_properties` |
| **Resource** | A piece of data the AI can *read* | "the full record for property PROP-0007" |
| **Prompt** | A reusable instruction template | "Summarise this property's estate-planning gaps" |

The AI client (Claude Desktop, Claude in an IDE, or our own app) connects to the
server, sees the list of tools/resources, and calls them when useful. The server
runs the real code and returns real data.

---

## 2. Why would Valgate want one?

Valgate already has a rich, well-structured backend (Neon Postgres + Drizzle, 35
entity services). An MCP server turns that backend into something an AI can operate
**without us building a custom chatbot integration for every feature**. Concretely:

1. **In-app AI assistant** — Valgate already has `ai-sessions` and `ai-messages`
   tables and a `lib/data/derivations/ai-context.ts` file. An MCP server is the clean
   way to feed the assistant live, permission-checked data instead of hand-rolled
   queries. *(See `01-infrastructure-readiness.md` for the evidence.)*
2. **Claude Desktop / external agents** — power users (or our own team) could connect
   Claude directly to a Valgate workspace to ask questions and draft records.
3. **One integration, many clients** — write the tools once; any MCP-aware AI client
   can use them. No bespoke API glue per AI product.

> ⚠️ This document set is **planning only**. We are not building the server yet. The
> goal is to decide *whether the foundation is ready* and *what the ideal shape is*.

---

## 3. The one fact that makes this easy

Valgate's service layer (`lib/services/*.ts`) was built to a rule the codebase calls
**C2: services are transport-pure**. Every service function looks like this:

```ts
// lib/services/tenants.ts (shape)
export async function createTenant(ctx: Ctx, input: NewTenant): Promise<Tenant> { ... }
```

The first argument, `ctx`, carries *who is asking* (`userId`, `orgId`, `orgRole`).
The service **never** reaches out to Clerk or the web request itself to find that
out — it is handed to them. (`lib/services/_mapping.ts:9` defines `Ctx`;
`lib/auth/ctx.ts:14` is the *only* place that builds one from Clerk.)

**Why this matters for MCP:** an MCP server is a different "front door" than the
website. Because the services don't care which front door called them, the MCP server
can build its own `Ctx` and call the **same** `createTenant`, `listProperties`, etc.
We reuse the entire backend instead of rewriting it. This is the single most
important reason Valgate is a good MCP candidate.

---

## 4. End-state vision (what "done" looks like, eventually)

A small `mcp-server/` process that:

- Authenticates an incoming AI client and turns that into a Valgate `Ctx`
  (the *one* new piece we must build — see readiness doc).
- Exposes a **deliberately small** set of **tools** (thin wrappers over existing service
  functions) — fewer, outcome-oriented tools beat a long list the AI mis-picks from.
- Pushes most *reading* into read-only **resources** (a property's full record with its
  children nested, a portfolio snapshot) built from existing derivations — this keeps the
  tool list short *and* the AI's context small.
- Enforces the same org-scoping, role checks, and demo-mode read-only guard the
  website already enforces — for free, because it calls the same services.
- Runs locally over **stdio** for a single developer, and/or over **HTTP** for
  multi-user/remote access later.

---

## 5. How to read this doc set

| File | What it answers |
|---|---|
| `00-overview.md` | *(this file)* What/why, in plain terms |
| `01-infrastructure-readiness.md` | Is our data layer MCP-ready? What are the gaps? |
| `02-ideal-mcp-design.md` | What tools/resources/transport/auth should it have? |
| `03-resources-and-skills.md` | What SDK, libraries, Claude skills, and docs we need |
| `04-execution-plan.md` | The phased plan from here to a shipped MCP |

Read them in order. `04` depends on the decisions raised in `01` and `02`.
