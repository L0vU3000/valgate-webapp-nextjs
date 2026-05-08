# Plan: `/audit-datapoint` workflow

## Context

You want a repeatable way to audit any data point shown on a Valgate page (e.g. the "6" inside the Properties KpiCard on `/portfolio`). The goal is to verify the **scheme behind the number** is sound: that the entity is logically organised, that the formula does what the label claims, and that the render path doesn't hide silent failures or security gaps.

The codebase already has clean three-layer architecture for data:

```
lib/data/types/<entity>.ts      ← entity shape (the schema)
lib/data/db/<entity>.ts         ← FS read/write (the storage)
lib/data/derivations/<page>.ts  ← formulas (the logic)
lib/data/queries.ts             ← page data composition
app/(shell)/<route>/page.tsx    ← server fetch
app/(shell)/<route>/_components ← render (the output)
```

Critically, you've already done deep audit groundwork in `.context/data-audit/`:
- `00-entity-catalog.md` — every entity, every field, with provenance and proposed Convex schema (22 entities)
- `03-data-flow-and-derivations.md` — every derivation has an assigned home (server / materialized / client)
- `05-open-questions.md` — 58 ambiguities tracked (Q1–Q9), e.g. Q3.B for the `monthlyIncome` semantic ambiguity

**The audit skill must integrate with this corpus, not duplicate it.** Reports cross-link by anchor to existing entity sections and open questions; new ambiguities are filed back into `05-open-questions.md`.

The deliverable is a **skill** (`/audit-datapoint`) plus saved markdown reports under `.context/audits/`. Same command handles both fresh audits and re-audits.

---

## Report template

Every report is structured the same way. Sections fill top-to-bottom; the only actionable section is `Findings` at the bottom.

### Front matter (with revision log)

```yaml
---
data_point: "Properties → 6"
slug: portfolio--properties-count
route: /portfolio
selector: |
  <PortfolioPage> <KpiCard>
  bg-white rounded-lg border border-slate-200 p-5
  selected text: "6"
revisions:
  - n: 1
    date: 2026-04-30
    sources_hash: a3f9c2…
    verdict: "⚠️ 2 findings (1 P1, 1 P2)"
sources:
  - lib/data/types/property.ts        @ a3f9c2
  - lib/data/db/properties.ts         @ 7c2199
  - lib/data/derivations/portfolio.ts @ 8e1144
---
```

### Metric Definition (SSOT)

The durable artifact — outlives the report. One canonical definition per metric.

```yaml
metric: properties_count
business_meaning: "Number of properties owned by the current user, including vacant. Excludes archived/sold (Q4.D — not yet supported)."
formula: properties.length
canonical_home: server  # per 03-data-flow-and-derivations.md §B1
unit: count
edge_cases:
  - empty portfolio → display "0" (not "—")
  - archived (when Q4.D resolves) → must be excluded
related_metrics:
  - rentedCount + vacantCount = totalProperties (cross-card consistency)
```

### Section A — Entity (the schema)

| Field | Value |
|---|---|
| Entity | `Property` |
| Type file | `lib/data/types/property.ts` |
| DB file | `lib/data/db/properties.ts` |
| Storage | `core.json + location.json + finance.json + media.json` per record |
| ID prefix | `PROP` |
| Catalog reference | `.context/data-audit/00-entity-catalog.md §1` |

- Full field list with TS types (compact table).
- **Organisation review**: name consistency, redundant fields (link to Q5.A), required vs optional, foreign-key references typed.
- **Schema verdict**: ✅ / ⚠️ / ❌ + one-sentence reason.

### Section B — Logic (the formula)

| Field | Value |
|---|---|
| Source file | `lib/data/derivations/portfolio.ts` |
| Function | `computeStats(properties)` |
| Output field | `stats.totalProperties` |

**Formula** (≤ 5 lines, inlined verbatim):
```ts
return { totalProperties: properties.length, ... }
```

**Golden-value reconciliation:**

| Source | Value |
|---|---|
| Displayed on /portfolio | 6 |
| Computed from raw seed | 6 |
| Match? | ✅ |

**Manual computation steps** (for re-verification):
1. `ls public/data/users/demo-user/properties/ \| wc -l`
2. Result should equal the displayed value.

- **Correctness**: does the formula match what the UI label claims?
- **Robustness**: divide-by-zero, null/undefined reads, empty-array edges, date math without tz, currency rounding.
- **Alternatives considered**: simpler/equivalent formulas, indexed-field lookups, memoisation.
- **Logic verdict**: ✅ / ⚠️ / ❌.

### Section C — Render (the output)

| Field | Value |
|---|---|
| Page file | `app/(shell)/portfolio/page.tsx` |
| Query | `getPortfolioPageData()` in `lib/data/queries.ts` |
| Component | `<PortfolioPage>` → `<KpiCard>` |
| Prop chain | `data.stats.totalProperties` → `{stats.totalProperties}` |

- Server vs Client Component?
- Loading / error / empty states (`loading.tsx`, `notFound()`, fallback strings).
- Formatting placement (derivation vs. component) — flag inconsistency.
- A11y: is the value labelled?

**PII / IDOR check:**
- **PII leakage**: does the prop chain carry fields the UI doesn't render? (CLAUDE.md "select only what the UI needs.")
- **Authorisation**: today the read goes through `getCurrentUserId()` shim → hardcoded `"demo-user"`. Pre-flag for the day real auth lands: every read in this prop chain must verify `record.userId === currentUser.id`.

- **Render verdict**: ✅ / ⚠️ / ❌.

### Section D — Cross-card consistency

Identities the data point *should* satisfy across the app, with the audit's verification:

| Identity | Holds? |
|---|---|
| `rentedCount + vacantCount === totalProperties` (per row of seed) | ✅ |
| `Property.status` lowercase equals `Property.statusVariant` (per row) | ⚠️ — Q5.A |
| Same metric appears identically wherever it's rendered (e.g. occupancy on `/analytics` and `/portfolio`) | ✅ / ⚠️ |

When two visible elements share a metric or have a mathematical relationship, the audit reads the seed and proves or disproves the identity. This is where redundant-field drift gets caught.

### Section E — Negative-space audit

Robustness gaps that *should* exist for a SaaS in this domain but don't yet. Auto-linked to existing open questions where possible.

| Gap | Status | Link |
|---|---|---|
| Audit log of mutations | ❌ missing | Q4.P |
| Soft-delete on documents/properties | ❌ missing | Q5.E, Q4.D |
| Currency normalization | ⚠️ partial (`buyNumeric` exists, `currency` field doesn't) | Q5.H |
| Schema validation at DB boundary (Zod) | ❌ missing | (file new question) |
| Multi-tenant isolation enforcement | ⚠️ shim only | Q4.M |

The skill walks a fixed checklist relevant to the current data point, marks each, and links to the question that already tracks it. Anything new gets filed into `05-open-questions.md`.

### Section F — Semantic correctness (user's POV)

Reads the UI label with fresh eyes and asks: *would a real user infer this exact formula from this label?*

```
Label rendered: "Monthly Income"
Formula chosen: sum(payments where kind=Rent AND status=Paid AND date in current month)
User's likely inference: money in the bank this month → matches formula ✅

(Counterexample: if formula were sum of active-lease monthly rent expectations → would NOT match label
because user reads "Income" as received, not expected. This is exactly Q3.B.)
```

When the answer is "ambiguous" the finding is filed as a semantic concern, not a code bug, and added to `05-open-questions.md`.

### Section G — Findings

The only actionable section. Numbered, each tagged with severity + confidence.

```
F1 [logic] [P1] [confidence: high]
    avgHealth divides by zero when properties is empty.
    Fix: guard with `n === 0 ? null : sum / n`, render as "—".

F2 [schema] [P2] [confidence: medium]
    statusVariant duplicates status. Tracked as Q5.A; consider deriving on client.

F3 [render] [P3] [confidence: low]
    KpiCard label "Properties" doesn't disambiguate active vs all. Borderline naming nit.
```

**Severity:** P0 (correctness ship-blocker) / P1 (robustness gap) / P2 (schema smell) / P3 (nit).
**Confidence:** high (verified) / medium (inferred) / low (subjective judgment).
**Tag:** `[schema]` / `[logic]` / `[render]` / `[consistency]` / `[negative-space]` / `[semantic]`.

---

## Re-audit detection

Same `/audit-datapoint` invocation handles both fresh and re-audit. The skill computes a deterministic slug from the data point — `<route-slug>--<datapoint-slug>` — so the same input always resolves to the same file path.

Logic:

1. Resolve input → slug → expected path `.context/audits/<slug>.md`.
2. **If file does not exist** → fresh audit. Write a new report with `revisions: [{n: 1, ...}]`.
3. **If file exists** → re-audit:
   a. Read the prior report's `sources` block (file paths + recorded SHAs).
   b. Re-hash each current file.
   c. **No hashes changed** → print "No source changes since revision N (date). Nothing to re-audit." Do not write.
   d. **Hashes changed** → append a new revision section to the *same file*, recording: which files changed, refilled sections, finding deltas (resolved / new / unchanged). Old revisions stay readable below.
4. Update front-matter `revisions` log so the latest verdict is scannable.

The user never has to remember whether they audited this before.

---

## How the skill resolves input

The skill prompt branches on input shape:

1. **Agentation feedback block** (recognised by `Source:`, `React:`, `Classes:` lines).
   - Use the React component name + selected text to find the JSX.
   - Trace the prop back to the query and identify the data point.
2. **`route → label` form** (e.g. `/portfolio → Properties → 6`).
   - Open the route's components, grep for the label, identify the prop binding.
3. **Plain English** (e.g. "the new-this-month number on portfolio").
   - Best-effort grep on the route's components; if ambiguous, ask via `AskUserQuestion`.

In all three cases the skill must end up with: route, component, prop path, derivation function, entity. Only then does it start filling the report.

---

## Files to create

| Path | Purpose |
|---|---|
| `.claude/skills/audit-datapoint/SKILL.md` | The skill — input handlers + report template + re-audit logic |
| `.context/audits/.gitkeep` | Ensure folder exists (`.context/` is gitignored per workspace convention) |
| `.context/audits/INDEX.md` | One-line-per-report index, auto-appended on first audit and updated on re-audit |
| `.context/audits/portfolio--properties-count.md` | First example audit, run against the "6" KpiCard as a smoke test and reference |

No production code is modified by this plan — only tooling.

---

## Critical files the skill references (read-only)

- `lib/data/types/` — every entity (21 collections).
- `lib/data/db/_fs.ts` — common storage primitives (`assertSafeId`, `listMergedRecords`, `nextId`).
- `lib/data/db/<entity>.ts` — per-entity CRUD.
- `lib/data/derivations/{portfolio,analytics,rental,property}.ts` — all derivation logic today.
- `lib/data/queries.ts` and per-route `_components/*.tsx` — page-data composition + render.
- `app/(shell)/<route>/page.tsx` — server fetch.
- **`.context/data-audit/00-entity-catalog.md`** — entity reference (cross-link).
- **`.context/data-audit/03-data-flow-and-derivations.md`** — canonical-home assignments (cross-link).
- **`.context/data-audit/05-open-questions.md`** — known issues (cross-link + append).

Reuse, don't reinvent: when a finding mentions a missing utility (e.g. "no Zod validation"), the skill must check `lib/data/` first to confirm it really doesn't exist, and check `05-open-questions.md` to see if it's already tracked, before recommending or filing.

---

## Verification

1. **Skill registers**: after creating `SKILL.md`, run `/audit-datapoint` with no args and confirm the slash command surfaces.
2. **Smoke test — agentation block**: paste the original `<PortfolioPage> <KpiCard>` "6" feedback; confirm `.context/audits/portfolio--properties-count.md` is written with all sections (front-matter, Metric Definition, A–G), source hashes recorded, and at least one finding from the known issues (`avgHealth` divide-by-zero, status/statusVariant redundancy, no Zod validation) lands in §G.
3. **Smoke test — `route → label`**: invoke as `/audit-datapoint /analytics → Total Revenue`; confirm a second report is written with the analytics-derivation specifics.
4. **Smoke test — plain English**: invoke as `/audit-datapoint the new-this-month number on portfolio`; confirm the skill resolves it (or asks a disambiguating question) and produces a third report.
5. **Cross-link sanity**: open any report and confirm the Entity section anchors to `.context/data-audit/00-entity-catalog.md §<n>` and the Negative-space section links to existing Q4/Q5 entries.
6. **Re-audit detection — no change**: re-invoke `/audit-datapoint` on the same data point with no source-file edits. Skill must report "No source changes" and not modify the file.
7. **Re-audit detection — change**: edit `lib/data/derivations/portfolio.ts` (e.g. add a guard for empty array), re-invoke. Skill must append a new revision section, mark the relevant prior finding as resolved, and update the front-matter `revisions` log.
8. **New question filed**: when the skill encounters a semantic ambiguity not yet in `05-open-questions.md`, confirm it appends a new entry there with a link back to the audit report.
9. **Cross-card consistency live test**: verify the "rentedCount + vacantCount === totalProperties" identity check actually reads seed JSON files and reports true/false rather than asserting it without computing.
