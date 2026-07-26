---
title: Karpathy — LLM Wiki Pattern
type: thread
source: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
tags: [obsidian, knowledge-management, llm, workflow]
added: 2026-07-15
---

## Summary
Karpathy's pattern for using an LLM to **incrementally build and maintain a
persistent wiki** — a structured Markdown repo that sits between raw sources and
you. Instead of re-deriving answers from documents on every query, the LLM reads
new sources once, integrates them into existing pages, updates cross-links, and
flags contradictions. Knowledge **compounds** instead of being re-read. This is
the pattern our vault is built on.

## Key points
- **Three layers**: raw `sources/` (immutable, LLM reads but never edits) → the
  `wiki/` (LLM-owned Markdown, cross-linked with `[[wikilinks]]`) → a **schema
  file** (`CLAUDE.md`/`AGENTS.md`) that teaches the LLM to be a disciplined
  maintainer, not a generic chatbot.
- **`index.md`** — catalog of every page with one-line summaries, by category.
- **`log.md`** — append-only, greppable timestamps: `## [2026-07-15] ingest | Title`.
- **Three workflows**:
  - **Ingest** — read a source → write a summary page → update related pages →
    update the index → append to the log. One source often touches 10–15 pages.
  - **Query** — search index → read relevant pages → synthesize with citations.
    A good answer can be filed back as a new page.
  - **Lint** — periodic health check: contradictions, stale claims, orphan pages,
    missing cross-refs, data gaps.
- **Core insight**: the tedious part of a knowledge base isn't the reading or
  thinking — it's the **bookkeeping** (cross-refs, consistency, touching 15
  files). LLMs do that at near-zero cost; humans curate sources and ask good
  questions.

## How it applies here
- Our **vault** = the `wiki/` layer. Our **`CLAUDE.md`** = the schema file
  (see the "Knowledge layers" + "Obsidian vault" sections).
- We adopt **Ingest / Query / Lint** as the vault's AI-maintenance vocabulary
  (documented in [[obsidian]]).
- We adopt **`vault/log.md`** as the append-only ledger.
- We do NOT split into separate `sources/` + `wiki/` folders — for a
  project-scoped vault that's over-engineering. `resources/` holds both the
  saved source and its synthesis in one note (this file is an example).

## Links
- [[obsidian]] — the vault framework this feeds into
