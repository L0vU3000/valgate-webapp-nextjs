# Valgate Backend — Tech Guides

Per-technology internal guides for the Valgate backend. One file per stack technology, written for a **backend beginner building *this* codebase** — not a general tutorial.

These satisfy **D15** (`02-plan-updates-2026-06-11.md`).

---

## The one rule that shapes every doc

> **An internal tech doc documents the *intersection* of the technology and our project — never the technology itself.**

The official docs already exist, are better maintained, and will outlive anything we copy. So:

- ❌ "Here is what Drizzle is and every feature it has" → re-documents upstream, rots on the next release, worse than the source.
- ✅ "Here is how *we* define an org-scoped table with a TEXT id and our `nextId()` counter" → exists nowhere else, is what you actually need, changes only when *we* change.

If a sentence would still be true in someone else's project, it probably belongs in a link under **§7 Going deeper**, not inlined.

## How to read these

- **Cross-cutting rules** (server-only boundary, the no-ambient-context invariant, error handling, null→undefined, id scheme) live **once** in [`_conventions.md`](./_conventions.md). Each tech doc *links* to the relevant rule instead of restating it.
- **One running example domain across all docs**, so you build familiarity instead of re-parsing a new toy example every file:
  - `tenants` — plain CRUD (simplest entity).
  - `properties` — org-scoping (the multi-tenant pattern).
  - `pillar_verifications` — transactional / verification writes.
- Every doc opens with a **§0 Cheat-sheet** — the 5–10 things you reach for daily. Start there.

## Index

Each guide is the project-specific layer; the **official docs** column is the source of truth for everything generic.

| Guide | Covers | Official docs (source of truth) |
|-------|--------|----------------------------------|
| **Language & framework** | | |
| [`typescript.md`](./typescript.md) | project conventions | https://www.typescriptlang.org/docs/handbook/intro.html |
| [`nextjs.md`](./nextjs.md) | App Router, Server Actions, Route Handlers | https://nextjs.org/docs |
| **Data layer** | | |
| [`drizzle.md`](./drizzle.md) ⭐ *exemplar* | ORM: schema, queries, transactions | https://orm.drizzle.team/docs/overview · [connect-neon](https://orm.drizzle.team/docs/connect-neon) |
| [`drizzle-kit.md`](./drizzle-kit.md) | migrations | https://orm.drizzle.team/docs/kit-overview |
| [`neon.md`](./neon.md) | serverless Postgres + Pool driver | https://neon.com/docs/serverless/serverless-driver |
| [`zod.md`](./zod.md) | Zod **v4** validation & types | https://zod.dev |
| **Auth & tenancy** | | |
| [`clerk.md`](./clerk.md) | auth core | https://clerk.com/docs |
| [`clerk-organizations.md`](./clerk-organizations.md) | multi-tenant orgs (D14) | https://clerk.com/docs/guides/organizations/overview · [multi-tenant arch](https://clerk.com/docs/guides/how-clerk-works/multi-tenant-architecture) |
| [`neon-rls.md`](./neon-rls.md) | DB-level org isolation, defense-in-depth behind C3 (candidate D17) | https://neon.com/docs/guides/row-level-security · [RLS+Drizzle](https://neon.com/docs/guides/rls-drizzle) |
| **Infrastructure** | | |
| [`storage-s3-r2.md`](./storage-s3-r2.md) | presigned uploads (AWS SDK v3) | [AWS SDK v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/) · [`@aws-sdk/s3-presigned-post`](https://www.npmjs.com/package/@aws-sdk/s3-presigned-post) · [R2](https://developers.cloudflare.com/r2/) |
| [`env-nextjs.md`](./env-nextjs.md) | `@t3-oss/env-nextjs` env validation | https://env.t3.gg/docs/nextjs |
| [`upstash-ratelimit.md`](./upstash-ratelimit.md) | rate limiting (B9) | https://upstash.com/docs/redis/sdks/ratelimit-ts/overview |
| **Testing** | | |
| [`vitest.md`](./vitest.md) | test runner | https://vitest.dev/guide/ |

---

## Per-doc skeleton

Every guide uses **§0–§7 in this order** (predictable — you always know where to look). §4 and §6 are the flex slots that expand per tech; the rest stay thin.

Each doc opens with a metadata block:

```markdown
# <Tech> — Valgate guide

> Role: <one line>.  Version pinned: <x.y>.  Last verified: <YYYY-MM-DD> against <version>.
> Decisions: D1, D8 …   Build phases: B1, B4 …
> Official docs: <canonical link(s)>
```

| § | Section | What lives here | Kept |
|---|---------|-----------------|------|
| **0** | **Cheat-sheet** | The 5–10 commands/snippets/rules used daily | the hook |
| **1** | **Why it's in our stack** | The decision + what we rejected → link to D#. 3–5 sentences, *not* a feature tour | thin |
| **2** | **Setup in our stack** | Exact install commands, exact config files, where they live | exact |
| **3** | **Mental model** | Only the concepts you must hold to use it *here*; link out for depth | minimal |
| **4** | **How we use it in Valgate** ⭐ | File/folder layout, naming, canonical patterns with **real codebase examples** | the core — longest |
| **5** | **Gotchas & version traps** | What bites — especially version-specific (Zod v4≠v3, Neon Pool-not-http, null/undefined) | high-value |
| **6** | **Reusable patterns** | Copy-paste snippets keyed to *tasks* ("add a new entity", "a transactional write") | copy-paste |
| **7** | **Going deeper** | Curated deep links into official docs for what we deliberately didn't inline | links only |

**Length target: ~150–300 lines.** A beginner won't read a 2,000-line wall. If a doc runs long, push reference material to §7 links.

## Staleness policy

Upstream moves (Neon literally changed domains from `neon.tech` → `neon.com` since the plan was written). To keep these trustworthy:

1. Each doc **pins a version** and carries **`Last verified: DATE against VERSION`** in its header.
2. Anything that would need updating on *every* upstream release belongs in **§7 as a link**, not inlined.
3. When you bump a dependency, re-read the matching doc's §2/§5 and update the `Last verified` line.

## Status

All 13 guides + `_conventions.md` complete (2026-06-11), written against the approved skeleton.

| Doc | Status |
|-----|--------|
| `README.md` (this file) | ✅ |
| `_conventions.md` | ✅ |
| `drizzle.md` | ✅ exemplar |
| `typescript.md` · `nextjs.md` | ✅ |
| `drizzle-kit.md` · `neon.md` · `zod.md` | ✅ |
| `clerk.md` · `clerk-organizations.md` · `neon-rls.md` | ✅ |
| `storage-s3-r2.md` · `env-nextjs.md` · `upstash-ratelimit.md` | ✅ |
| `vitest.md` | ✅ |
