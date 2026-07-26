# Autoresearch (Andrej Karpathy)

> Research notes. Compiled 2026-07-14. Source links at the bottom.

## What it is

**Autoresearch** is an open-source project by Andrej Karpathy (released March 2026,
`karpathy/autoresearch`) that lets an AI coding agent run real machine-learning
experiments **autonomously and overnight** on a single GPU. The agent proposes a code
change, trains a small LLM for a fixed 5 minutes, checks whether a metric improved,
keeps the change if it did (else reverts), and repeats — roughly **12 experiments/hour**.

The human's job is not to tweak code. It's to write a markdown file describing *what
good research looks like*, then walk away. The human is a **research advisor**, not the
one running the experiments.

## The loop (the actual mechanism)

1. Agent reads instructions (`program.md`) and decides what to change.
2. Agent edits **one file** (`train.py`) — architecture, hyperparameters, optimizer,
   batch size, etc.
3. Training runs for **exactly 5 minutes** (fixed wall-clock budget).
4. Result is scored on **`val_bpb`** (validation bits per byte — lower is better; it's
   vocabulary-size-independent so runs are comparable).
5. **Binary keep/discard**: improvement is committed, regression is reverted via git.
6. Loop forever. Results accumulate in `results.tsv`.

Karpathy's framing: *"hill climbing with an LLM as the mutation function."* The agent
isn't flipping bits randomly — it reads the code, forms a hypothesis about what improves
the metric, and tests it under a fixed constraint.

## Architecture — 3 files with strict ownership

| File | Owner | Role |
|---|---|---|
| `prepare.py` | **never modified** | Constants, one-time data prep (downloads dataset, trains tokenizer), runtime utils. The immutable eval harness. |
| `train.py` | **the agent** | The whole GPT model + optimizer (Muon + AdamW) + training loop. The agent's only sandbox. |
| `program.md` | **the human** | Markdown instructions defining agent behavior and research goals. "A super lightweight skill." This is where you *program the programmer*. |

Design choices that make it work:
- **Single editable file** → reviewable diffs, manageable scope.
- **Fixed time budget** → every change competes under the same constraint; comparable
  and self-calibrating across hardware.
- **Self-contained** → no distributed-training complexity, no heavy dependencies.

## Setup (for reference)

- Requirements: one NVIDIA GPU (tested on H100), Python 3.10+, `uv` package manager, a
  coding agent.
- Steps: install `uv` → `uv sync` → `uv run prepare.py` (~2 min data prep).
- Manual run: `uv run train.py` (5 min). Autonomous: point a coding agent at
  `program.md` and let it go.

## Known limits (honest read)

- **Creativity ceiling.** It does conservative, local optimization — genuine incremental
  gains, not architectural breakthroughs. It won't take a backward step to reach a
  bigger win.
- Karpathy describes the agent as *"cagy and scared"* on open-ended problems — a property
  of the underlying model, not the harness.
- **Best for**: well-understood problems needing methodical iterative refinement. Human
  judgment still sets the direction.

## The reusable pattern (why this matters for agent-loop)

This is the part relevant to our own agent-loop system. The autoresearch loop is
domain-agnostic. Five ingredients define it:

1. **One modifiable file** — keeps changes reviewable, scope bounded.
2. **One optimization metric** — no ambiguity about success.
3. **Fixed evaluation budget** — comparable experiments regardless of what changed.
4. **Binary keep/discard** — trivial acceptance criteria (git revert on regression).
5. **Continuous iteration** — loop indefinitely.

Any measurable objective with a bounded eval time fits. Cross-domain examples already
floating around:
- Refining **agent skill/instruction files** against eval scores.
- Optimizing a **prompt** (e.g. sentiment) against historical outcomes.
- Tweaking **CSS** against Lighthouse metrics.
- Improving a **recommendation** algorithm against a relevance index.

For our agent-loop: the pattern maps cleanly onto a `propose → run under fixed budget →
score → keep/revert → repeat` skill, where `program.md` becomes the human-authored goal
spec and the "one file" is whatever artifact we're optimizing.

## Resources

**Primary**
- Repo — https://github.com/karpathy/autoresearch
- Karpathy — https://karpathy.ai/

**Walkthroughs / tutorials**
- DataCamp guide — https://www.datacamp.com/tutorial/guide-to-autoresearch
- autoresearch.lol (project explainer) — https://www.autoresearch.lol/
- Thu Vu, "Training an LLM Using Karpathy's Autoresearch" (Medium) —
  https://medium.com/@vuthihienthu.ueb/training-an-llm-using-karpathys-autoresearch-2c2853e061af

**The pattern (most relevant to agent-loop)**
- mager.co, "autoresearch: Karpathy's Blueprint for Agents That Improve Themselves" —
  https://www.mager.co/blog/2026-03-14-autoresearch-pattern

**Related / community extensions**
- skyllwt/AutoSci (wiki-centric AI research platform on the same idea) —
  https://github.com/skyllwt/AutoSci
- autoresearch-automl issue (LLM + classical HPO benchmarking) —
  https://github.com/karpathy/autoresearch/issues/383
