# Next.js 15 — Codebase Rules

> Quick reference for AI and developers. Full details in `docs/nextjs-architecture.md`.

---

## Stack

| Concern | Library |
|---|---|
| Styling | Tailwind CSS + shadcn/ui |
| Auth | Clerk |
| Database | Neon (serverless Postgres) + Drizzle ORM |
| Validation | Zod |
| Forms | React Hook Form + Zod |
| Email | Resend |
| Payments | decide later |
| Rate Limiting | decide later |
| Env validation | @t3-oss/env-nextjs |

---

## Core Rules

- **Default to Server Components.** Add `"use client"` only at the leaf level when needed.
- **Fetch in Server Components** — never `useEffect` for initial data loads.
- **One action file per domain** — `post.actions.ts`, `user.actions.ts`, etc.
- **Always `await params`** — it's a Promise in Next.js 15.
- **Server Actions → `lib/services/*` (Drizzle) for anything touching the DB.** One service module per entity; actions call services, services own the Drizzle queries.

---

## Data Flow

```
Client Component → Server Action → revalidateTag
                                        ↓
Client Component ← Server Component re-fetches fresh data
```

---

## Security Rules

**Client → Server (treat all input as hostile)**
- Validate every input with Zod before touching the DB
- Authenticate (who are you?) AND authorize (do you own this?) on every mutation
- Never return `err.message` to the client — log internally, return generic strings
- Rate limit login, signup, and all sensitive actions

**Server → Client (be deliberate about what you expose)**
- Never send full DB objects as props — `select` only what the UI renders
- Never pass secrets as props to Client Components — use them server-side, pass the result
- Never prefix secrets with `NEXT_PUBLIC_` — it inlines them into the browser bundle

---

## UI Design Standard

All UI work in this project must be fully wired — no mocks, no stubs, no placeholder values.

- **Real entities**: every component binds to actual typed data from the Neon (Drizzle) services layer (`lib/services/*`)
- **Real fields**: no hardcoded strings or dummy numbers in place of real schema fields
- **Real calculations**: all stats, scores, and derived values use live computation logic (e.g. progress pillars, KPIs)
- **Seed data**: the local-db (`public/data/users/demo-user/`) is the source of truth for dev/demo; expand seed data when a new feature needs meaningful display values
- **No UI-only state**: if a number or label appears in the UI, it must trace back to a schema field or a derivation function — never invented inline

---

## Anti-Patterns

| ❌ Anti-Pattern | ✅ Fix |
|---|---|
| `"use client"` on every file | Default to Server; add only when needed |
| `useEffect` for initial data fetch | Fetch directly in Server Component |
| Secrets in `NEXT_PUBLIC_*` | Server-only env vars for secrets |
| Raw `fetch` with no cache strategy | Use `unstable_cache` or `cache()` |
| Business logic in route handlers | Move to `services/` or `actions/` |
| No `loading.tsx` on data-heavy routes | Add a skeleton per route segment |
| Accessing `params` synchronously | Always `await params` |
| Raw FormData passed to DB | Validate through Zod first |
| Auth check without ownership check | Verify resource belongs to the user (IDOR) |
| Returning `err.message` to client | Log internally, return generic error string |
| Full DB object passed as props | Select only the fields the UI needs |
| Secrets passed as props to Client | Use server-side, pass only the result |
| No rate limiting on auth actions | Rate limit login, signup, sensitive mutations |

## Backend (Neon + Drizzle)

This project uses **Neon (serverless Postgres)** with **Drizzle ORM** as its backend.

- Schema lives in `lib/db/schema/*`; the DB client is `lib/db/client.ts`.
- Data access goes through `lib/services/*` (one module per entity), called from Server Actions in `app/**/*.actions.ts`. Never query the DB directly from a component or route handler.
- Migrations: `npm run db:generate` (create) → `npm run db:migrate` (apply). Check connection with `npm run db:ping`.
- Seeding: `npm run seed:neon`. **Never run `seed:reset`** — it destroys the evolved seed data.
- `DATABASE_URL` points at the Neon branch; it is a secret (server-only, never `NEXT_PUBLIC_`).

> The `archive/convex/` directory is a legacy/parallel layer that the app does **not** call. Do not
> add new backend code there or follow Convex patterns — use Neon + Drizzle services.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

**`graphify-out/` is gitignored** — it is a 20MB local artifact, not a deliverable, so a fresh
clone or workspace will not have it. **Build it once before doing anything else:**

```bash
graphify update .     # AST-only, no API cost, ~1 min. Expect ~12k nodes on this repo.
```

⚠️ Sanity-check the node count in the output. A commit touching only `.md` files can make the
hook rebuild the graph from *those files alone*, leaving a graph of ~100 doc nodes that answers
every code question with documentation headings. If `graphify query "how does a server action
reach the database"` returns no `lib/` or `app/` nodes, the graph is clobbered — re-run
`graphify update .`.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing. (Not generated on this repo today — skip it.)
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- `graph.html` is skipped on this repo — the graph exceeds the 5,000-node viz limit. Not a failure.

## vault/ (Obsidian)

`vault/` is the Obsidian knowledge base — read it before starting work, not after getting stuck.
Start with `vault/vision.md`, `vault/roadmap.md`, `vault/tasks.md`, then `vault/decisions/` for the
*why* behind current architecture (`ruthless-mvp-cut`, `neon-not-convex`, `mcp-reuse-services-ctxfor`,
`drizzle-only-hand-authored-migrations`). `vault/resources/gotchas.md` and `runbook.md` are the
operational memory.

⚠️ The vault is also maintained on the `valgate-dev` branch. Before editing it here, check whether
that copy has moved ahead, or the two will diverge.
