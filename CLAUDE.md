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

## Agent-loop system

For any request involving agent automation, pipeline design, workflow review,
orchestration, scheduled work, or the agent-loop itself, start with these files in order:

1. `agent-loop/agent-loop.md` — system entry point and operating principles.
2. `agent-loop/categories.md` — pipeline categories and routing policy.
3. `agent-loop/pipelines/README.md` — shared pipeline anatomy.
4. `agent-loop/orchestrator/orchestrator.md` — inbox and dispatch contract.
5. `agent-loop/memory/decisions.md` and `agent-loop/memory/errors.md` — decisions and lessons.

Preserve the architecture unless the owner explicitly approves a redesign: many peer
pipelines, organized by category, each owning `explore → plan → execute → eval` with a
separate verifier. Testing required to ship a product change belongs in that building
pipeline's `eval`; standalone testing pipelines handle dedicated test-health, QA,
regression, and release work. The Obsidian category decision is
`vault/decisions/agent-loop-pipeline-categories.md`.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

<!-- OPENWIKI:START -->

## OpenWiki

This repository uses OpenWiki for recurring code documentation. Start with `openwiki/quickstart.md`, then follow its links to architecture, workflows, domain concepts, operations, integrations, testing guidance, and source maps.

The scheduled OpenWiki GitHub Actions workflow refreshes the repository wiki. Do not hand-edit generated OpenWiki pages unless explicitly asked; prefer updating source code/docs and letting OpenWiki regenerate.

<!-- OPENWIKI:END -->

## Knowledge layers — graphify + OpenWiki + Obsidian vault

This repo has three complementary documentation layers. They are NOT redundant —
each answers a different question. Use them in order.

| Layer | Answers | Derived from | Freshness |
|---|---|---|---|
| **graphify** (`graphify-out/`) | "What connects to what?" — structure | source code (AST) | `graphify update .` (free) |
| **OpenWiki** (`openwiki/`) | "How does this subsystem work?" — narrative | source code (LLM) | `openwiki code --update` (tokens) |
| **Obsidian vault** (`vault/`) | "Why did we decide X? what did we learn?" — judgment | humans + AI | hand-written, never regenerated |

Workflow for a codebase question:
1. `graphify query "<question>"` — orient with a scoped subgraph.
2. Read the matching `openwiki/*` page for prose on the region graphify pointed at.
3. Check `vault/` for the *why* (decisions, domain context) that code can't tell you.
4. `GRAPH_REPORT.md` only for broad architecture review.

Rules:
- graphify and OpenWiki are GENERATED from code — do not hand-edit them; regenerate.
- The vault is the only layer holding non-derivable knowledge (decisions, research,
  domain context). Write durable decisions and saved resources there, not in code comments.

Keeping the layers current:
- **graphify** — kept fresh automatically by a `Stop` hook that runs `graphify update .`
  after each turn (free, AST-only). You normally don't run it by hand.
- **OpenWiki** — refreshed by CI: `.github/workflows/openwiki-update.yml` runs
  daily (08:00 UTC) + on-demand (`workflow_dispatch`), using `OPENROUTER_API_KEY`
  from GitHub secrets, and opens a PR on the `openwiki/update` branch. To run it
  locally instead, `export OPENROUTER_API_KEY=<valid key>` first, then
  `openwiki code --update` (fails with a 401 without the key). Do not hand-edit
  generated `openwiki/*` pages — regenerate.
- **Obsidian vault** — updated by judgment as you work (see triggers below).

## Obsidian vault

The repo root opens as an Obsidian vault (config in `.obsidian/`; heavy dirs excluded
via `.obsidian/app.json`). `vault/obsidian.md` is the home note — it holds the vault
framework, conventions, and a Map of Content linking into `docs/` and `.context/`.

- New research/resources go in `vault/resources/` (one note per resource, with frontmatter).
- Curated decisions and domain knowledge live in `vault/`; link notes with `[[wikilinks]]`.
- Do NOT move `docs/` into the vault — it is referenced by tooling and cross-linked;
  the vault indexes it via the Map of Content instead.

Update triggers (write to the vault as you work, then append one line to `vault/log.md`):
- Made a load-bearing decision → ADR in `vault/decisions/`.
- Fixed a non-trivial bug → `vault/error-log.md` (symptom → cause → fix → prevention).
- Shipped something notable → `vault/changelog.md`.
- Learned a landmine → `vault/resources/gotchas.md`.
- New research/resource → a `vault/resources/` note (use the template in `vault/obsidian.md`).
- Unresolved question surfaced → `vault/open-questions.md`; task state changed → `vault/tasks.md`.
- Product concept/direction shifted → `vault/vision.md`.

## Writing & naming

Avoid the words and patterns in `vault/resources/words-to-avoid.md`. Categories
(cite by ID):

**Copy — user-facing text:**
- **C1 AI-slop** (delve, leverage, seamless, robust, "it's important to note",
  em-dash-every-sentence, "not just X but Y") — everywhere, including commit
  messages, PRs, comments, docstrings.
- **C2 Dev-framing leak** (MVP, v1, beta, placeholder, mock, "just", "simply") —
  never in user-facing copy; fine in code and internal notes.
- **C3 Hype** (game-changer, world-class, effortless, 10x) — never in copy.

**Codebase — how code is named/commented:**
- **K1 meaningless names** (data, temp, foo, stuff), **K2 vague suffixes**
  (Manager, Helper, Util, Data, Info), **K3 type-encoding/Hungarian** (strName,
  get-prefix), **K4 confusing booleans** (isNotValid), **K5 comment smells**
  (commented-out code, obvious comments), **K6 commit smells** (fix, wip, update).

**Cross-cutting — code AND copy AND docs:**
- **X1 inclusive language:** blacklist/whitelist → denylist/allowlist ·
  master/slave → primary/replica · sanity check → confidence check ·
  dummy → placeholder · abort → cancel.

Write like a person; a name should say what it holds and why. Full lists +
alternatives in the note.
