# Wiring Playbook

> Read before any Phase 6.x execution. Self-review checklist that runs **between Step A (wiring) and Step B (visual dev-server check)**.
>
> Three rules captured from Phase 6.0 (PropertyValuation) post-mortem. All three are end-of-Step-A misses, not authoring misses — meaning a 5-minute self-review pass catches them. Without the pass, each becomes an audit finding the audit could have been spent on something else.

---

## Pre-flight (before Step A)

1. **Read the entity's `plan.md` Entity Backlog row.** Confirms which surfaces are in scope and which are blocked by other entities.
2. **Check `pages/SUMMARY.md`** for the entity's status and PR scope.
3. **Scan `ref/05-open-questions.md`** for any Q-numbers blocking this entity. Resolve or accept defaults explicitly before Step A — don't discover them mid-wiring.
4. **Verify the Zod schema is current** (every entity should have one post-Batch-4 sweep). The wiring is allowed to trust validated reads — no defensive null/type checks beyond what the schema enforces.

---

## Self-review before Step B (the three-rule pass, ~5 min)

### Rule 1 — Adjacent-hardcode sweep
Look at every rendered value within ~10 lines of what you wired.

For each adjacent value: **does it CLAIM something about the wired value?**
- "1.4% below comps" sitting next to "$X estimate" — claims a relationship that depends on $X
- "Latest valuation: $1.31M" / "+12% YoY" — second value depends on first
- Status badge text + status badge color — color claims a categorisation of text

**If yes:** the adjacent value is now stale. Remove it, guard it, or wire it too.
**If no:** leave it.

**Tax:** ~30 sec per surface.
**Misses become:** **P1 audit findings** (stale claims actively misleading users).

### Rule 2 — Empty-state convention match
Grep the file you just edited for `"—"`, `"$0"`, `"0%"`, `"None"`, `"N/A"`, `"-"`.

The most-used convention in **this file** is the right one. If you introduced a different empty-state for a wired value, change it to match.

**Tax:** ~1 min per file.
**Misses become:** **P3 audit findings** that pile up — three different "$0" placeholders introduced when the file already used "—" became three separate findings in Phase 6.0.

### Rule 3 — Multi-record mental example
For any aggregation loop (`for (const x of arr) { ... }`) that **conditionally adds to a sum**, walk through with **2 records that have different states**:
- One matching the condition
- One not matching

**Verify both sums (numerator + denominator, or both sides of a comparison) use the same condition.**

Common bug: `latestTotal` accumulates every record while `baselineTotal` only accumulates records-with-history → ratio is wrong because the denominator doesn't match the numerator.

**Tax:** ~2 min per aggregation loop.
**Misses become:** **correctness bugs invisible in single-record seeds** — the most expensive class of finding because the audit may not catch it without explicit multi-record verification, AND the bug is silent in the demo data.

---

## After Step B (existing flow)

- Visual dev-server check on every affected page (your call, ~5 min)
- Hand back to Step C if visuals are correct, or back to Step A with notes if not

## Step C optimizations (the three-win pass)

> Captured from Phase 6.0/6.1/6.2 retro: Step C consistently runs ~50-60% of total phase time. Audit-per-surface × per-audit length compounds. Three wins, in order of impact. Apply during plan drafting, not during execution.

### Win 1 — Bundle direct-read clusters into one multi-surface report

For lite-template surfaces that are near-identical (same source files, same systemic finding, same empty-state), write **one** shared audit file with a table covering all fields. Example: 7 tenant-profile + lease-summary direct-reads → 1 file `property-id-rental--tenant-profile-direct-reads.md` with a 7-row table, not 7 separate files.

**Qualifies when ALL hold:**
- Direct field reads (no derivation)
- Same component + entity source files
- Same systemic finding (e.g. F1 = userId leak via PF1)
- Page audit recommends `lite` for all of them

**Filename pattern:** `<route-slug>--<group>-direct-reads.md` or `<route-slug>--<entity>-fields.md`.

**Tax:** ~10 min for the bundle (vs ~70 min for 7 individual files).
**Saves:** ~60 min per cluster.
**Misses become:** boilerplate-multiplied-by-N — N near-identical reports adding nothing.

### Win 2 — Don't restate systemic findings, one-liner cite

If a §8 finding maps 1-to-1 to a `PFn` already filed at the page level, replace the full Where/Problem/Why/Fix block with a stub:

```
### F1 — userId leak via full Property prop
Systemic — see PF1 in pages/<route-slug>/audit.md.
```

This extends the §6 dedupe rule (cite PFn in Link column) to §8 finding bodies. Without this extension, the prose still gets duplicated across audits.

**Tax:** ~30 sec per finding.
**Saves:** ~3 min per audit when ≥2 findings are systemic.

### Win 3 — Use the compressed lite template

The lite template is **3 elements**, not 4 sections + full scaffolding:

1. Slim front-matter (6 keys, same as full)
2. TL;DR (3 bullets, same as full)
3. Findings (one §8 block, or table-row per surface for bundled reports)

**Drop on lite reports:**
- Contents table (no nav needed in a ~20-line report)
- Glossary (rarely used jargon to define)
- Manual verification commands `<details>` (overkill for direct reads)
- Revision history `<details>` (replace with single inline `_Last revised: <date>_` line)

**Keep:** source files & hashes `<details>` (still needed for re-audit detection); findings.

**Tax:** ~1 min trim per audit.
**Saves:** ~3 min per audit (~30 lines of scaffolding gone).

---

## Plan-author guidance for Step C

When drafting a Step C section in a phase plan:

1. **Group surfaces by template type.** Count `full` audits and `lite` audits separately.
2. **For lite surfaces, identify clusters.** If 4+ lite surfaces share entity + source-files + systemic-finding, plan ONE bundled report, not N.
3. **Time estimate:** ~10 min per full audit · ~3 min per lite audit (compressed) · ~10 min per bundled cluster regardless of cluster size.
4. **Verification section:** count actual report files created, not surface count. `5 new audit files covering 11 surfaces` is a valid line.

(See the entity's specific phase plan in `~/.claude/plans/` for the exact list per phase.)

---

## How this playbook evolves

When a Phase 6.x retro surfaces a new class of repeatable miss, append a Rule N here. Each rule must:

- Have a **clear self-check** (what to grep / what to walk through)
- Have a **tax estimate** (so the reviewer knows the cost is bounded)
- Cite a **finding severity it prevents** (so the payoff is concrete)
- Be **actionable in <5 min** (otherwise it belongs in the entity's phase plan, not here)

Rules that are only "be careful" or "write good code" do NOT belong here — they don't survive a real review.

---

## Source

- **Rules 1–3:** Phase 6.0 PropertyValuation wiring retro (Step A 10m41s, Step B 22m36s; three classes of avoidable findings observed across the 7 batched audit reports). User-supplied summary preserved in conversation memory.
