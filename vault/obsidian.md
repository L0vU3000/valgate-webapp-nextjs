# Obsidian — Valgate Vault Framework

> How Obsidian is used inside this codebase. This vault is a folder of plain
> Markdown files. Any coding agent (Claude Code, Codex) can read, search, and
> write to it directly, and Git versions it like the rest of the repo.
>
> Pattern: *"Obsidian is the IDE; the LLM is the programmer; the wiki is the
> codebase."* — Karpathy. The vault is the **human/AI knowledge layer** that
> sits alongside the auto-generated `graphify-out/` and `openwiki/` docs.

## How to open it

**The Obsidian vault root is the repo root**, not this `vault/` folder. In
Obsidian: *Open folder as vault* → select the repository root
(`.../pyongyang`). Config lives in `.obsidian/` at the root; heavy dirs
(`node_modules/`, `.next/`, `graphify-out/`, …) are excluded via
`.obsidian/app.json → userIgnoreFilters`.

Why the root and not `vault/`? Because your notes already live in `docs/`,
`.context/`, and elsewhere. Opening the root means **nothing has to move** —
Obsidian sees every Markdown file, the graph spans the whole repo, and this
file (`vault/obsidian.md`) is your **home note**. New research goes in
`vault/resources/`; existing docs stay where tooling and `CLAUDE.md` expect
them.

---

## What lives here (and what does NOT)

| Belongs in the vault | Belongs elsewhere |
|---|---|
| Research, references, articles, saved links → `resources/` | Auto-generated architecture graph → `graphify-out/` |
| Design decisions, tradeoffs, "why we chose X" | Recurring code docs → `openwiki/` |
| Session notes, plans, hand-offs | Long-lived AI facts about the project → `~/.claude/.../memory/` |
| Domain knowledge (Cambodia property law, valuation logic) | Code + schema → `lib/`, `app/`, `db/` |

Rule of thumb: **if a human wrote it or an AI should keep evolving it, it goes
in the vault. If a tool generates it from source, it does not.**

---

## Folder layout

The vault is the whole repo. The parts that matter for notes:

```
.  (repo root = Obsidian vault)
├── .obsidian/         ← Obsidian config (excludes node_modules, .next, …)
├── vault/
│   ├── obsidian.md      ← this file: home note, framework, Map of Content
│   ├── log.md           ← append-only ledger (what entered/changed, greppable dates)
│   ├── vision.md        ← what Valgate is + how it's evolving (north star)
│   ├── tasks.md         ← work board (active / planned / deferred / done)
│   ├── changelog.md     ← curated notable changes
│   ├── error-log.md     ← incidents + fixes (symptom → cause → fix → prevention)
│   ├── roadmap.md       ← shipped / dormant / next
│   ├── open-questions.md← unresolved decisions & risks
│   ├── decisions/       ← ADRs (one note per load-bearing decision)
│   └── resources/       ← curated research + reference notes, one per topic
├── docs/              ← existing project docs (specs, plans, guides) — indexed below
├── .context/          ← working scratch (handoffs, scope, todos)
├── openwiki/          ← generated code docs (do not hand-edit)
└── graphify-out/      ← generated knowledge graph (excluded from Obsidian)
```

Add folders under `vault/` only when a category earns its own space (e.g.
`decisions/`, `domain/`). Do not scaffold empty folders "for later."

---

## Conventions

- **One note = one idea.** Small, atomic, linkable.
- **Link with `[[wikilinks]]`.** A link to a note that doesn't exist yet is
  fine — it marks a note worth writing later.
- **Frontmatter on every resource** (see template below) so notes are
  filterable by `type`, `tags`, and `source`.
- **Plain Markdown only.** No proprietary blocks. Stays readable in Git diffs
  and in any editor.
- **File names in kebab-case:** `neon-connection-pooling.md`, not
  `Neon Connection Pooling.md`.

---

## Resource note template

Paste this at the top of any file in `resources/`:

```markdown
---
title: <short title>
type: article | video | repo | doc | thread | snippet
source: <url or where it came from>
tags: [nextjs, neon, obsidian]
added: 2026-07-14
---

## Summary
<2–4 sentences: what this is and why it matters to Valgate>

## Key points
- ...
- ...

## How it applies here
<concrete: which file / feature / decision this touches>

## Links
- [[related-note]]
```

---

## Workflow

1. **Capture** — drop a link, PDF, or snippet as a new note in `resources/`
   using the template. Fill in Summary + How it applies here.
2. **Link** — connect it to existing notes with `[[wikilinks]]`.
3. **Version** — commit the vault with your normal Git flow (optionally the
   Obsidian Git plugin auto-commits).
4. **Recall** — when working, grep/search the vault or ask an agent to read
   `vault/` before designing a feature.

## AI maintenance: Ingest / Query / Lint

The vocabulary for how an agent maintains this vault, adapted from Karpathy's
LLM Wiki pattern (see [[karpathy-llm-wiki-pattern]]). The tedious part of a
knowledge base is the bookkeeping — cross-refs, consistency, touching many
files — which is exactly what an LLM does cheaply. Humans curate sources and
ask good questions; the agent does the rest.

- **Ingest** — "add this to the vault": read the source → write a note in
  `resources/` (template above) → update any related notes + this MoC →
  append one line to `log.md`.
- **Query** — "what do we know about X?": search the vault + MoC → read the
  relevant notes → answer with links. A good answer can be filed back as a
  new note.
- **Lint** — "health-check the vault": find contradictions, stale claims,
  orphan notes, and missing `[[links]]`; fix or flag them.

Every change appends a line to `log.md`:
`## [YYYY-MM-DD] <ingest|decision|lint> | <title>`

---

## Map of Content

The front door to everything already written in the repo. Links are relative,
so they open in Obsidian **and** render in plain Git viewers.

### Architecture & standards
- [Next.js architecture](../docs/nextjs-architecture.md)
- [Design language](../docs/design-language.md) · [Brand guide](../docs/valgate-brand-guide.md)
- [Tooling](../docs/tooling.md) · [Products](../docs/products.md)
- [Mock → backend pattern](../docs/mock-to-backend-pattern.md)

### Specs
- [AI agent interface spec](../docs/ai-agent-interface-spec.md)
- [Add-property flow spec](../docs/add-property-flow-spec.md)
- [Feature requirements](../docs/feature-requirements.md)
- [Asset manager use-cases](../docs/asset-manager-use-cases.md)
- [Property progress stat](../docs/property-progress-stat.md)

### Plans (43 notes)
- [Plans index](../docs/plans/README.md) — every phase plan lives here

### Guides & subsystems
- [MCP implementation](../docs/MCP%20implementation/) · [Migration](../docs/migration/) · [Tech guides](../docs/tech-guides/)
- [Feature unlock](../docs/feature-unlock/) · [AI overlay](../docs/ai-overlay/) · [Client presentation](../docs/client-presentation/)
- [Mapbox backend guide](../docs/mapbox-backend-guide.md)

### Ops
- [Production handoff](../docs/PRODUCTION-HANDOFF.md)
- [Pro interface build report](../docs/pro-interface-build-report.md)

### Working notes (`.context/`)
- [Session handoff 2026-07-13](../.context/session-handoff-2026-07-13.md)
- [Valgate core scope](../.context/valgate-core-scope.md)
- [Todos](../.context/todos.md)

### Vault knowledge (authored here)
- [[vision]] — what Valgate is and where it's going (north star, evolving)
- [[tasks]] — work board (active / planned / deferred / done)
- [[user-journeys]] — current interactive surface map (every feature/flow)
- [[glossary]] — project vocabulary
- [[words-to-avoid]] — banned words (AI-slop, MVP/v1 leak, hype)
- [[gotchas]] — landmines to avoid
- [[runbook]] — the commands you forget
- [[roadmap]] — shipped / dormant / next
- [[open-questions]] — unresolved decisions & risks
- [[error-log]] — incidents + fixes
- [[changelog]] — curated notable changes

### Decisions (ADRs)
- [[neon-not-convex]] — Neon + Drizzle is the backend; Convex is dead code
- [[client-permission-leader]] — client becomes admin on invite; manager proposes
- [[ruthless-mvp-cut]] — the MVP cut branch + restore point
- [[drizzle-only-hand-authored-migrations]] — dual-write retired; hand-author SQL
- [[mcp-reuse-services-ctxfor]] — MCP wraps lib/services via a ctxFor seam
- [[manager-led-onboarding]] — build portfolio first, invite the client after
- [[khmer-scan-self-consistency]] — swappable scan model + N=3 voting + confidence UI
- [[qa-pipeline-reuses-e2e-fixture]] — QA and e2e share one explicit browser contract
- [[agent-loop-pipeline-categories]] — peer pipelines grouped for routing and policy
- [[entity-scaffold-needs-approved-contract]] — entity automation requires an owner-approved field contract
- [[task-specific-eval-scoring]] — Plan defines a locked 100-point rubric for each task
- [[delivery-pipelines-wrap-installed-capabilities]] — delivery wrappers separate merge, deploy, rollback, and sign-off approvals

### Resources (references)
- [[karpathy-llm-wiki-pattern]] — the LLM-maintained wiki pattern this vault is built on
- [[agent-loop-system]] — the `agent-loop/` orchestrator + pipelines (agentic engineering)

---

## Relation to the rest of the repo

- **`graphify-out/`** — AST-derived knowledge graph. Query with
  `graphify query "<question>"`. Machine-generated, do not hand-edit.
- **`openwiki/`** — recurring code documentation. Start at
  `openwiki/quickstart.md`. Regenerated with `openwiki code --update`.
- **`vault/`** (this) — human + AI knowledge: research, decisions, domain
  context. Hand-written and AI-evolved, not derived from source.
