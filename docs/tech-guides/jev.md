# Jev (TypeSafe) — Valgate guide

> Role: typed, fast, cheap **decisions** for paths where the options are known up front — variant
> selection, classification, routing, gating. Not a text generator.
> Model pinned: `typesafe/jev-1.13` · Transport: OpenRouter Decisions API (alpha) · Last verified:
> 2026-09-30 against `openrouter.ai/docs/api/api-reference/alphadecisions` + the Jev tutorial.
> Decisions: uses C1 (`server-only`), C5 (generic errors out). Code: `lib/services/jev.ts`.
> Official docs: https://openrouter.ai/docs/guides/community/jev

---

## §0 — Cheat-sheet

```ts
// lib/services/jev.ts — decide() never throws. A null return means "use your default".
import { decide } from "@/lib/services/jev";

const result = await decide(
  { role: "member", overdueCount: 3 },            // state: compact digest, you pay per input token
  {
    variant: { type: "choice", instructions: "Which layout fits?", criteria: VARIANTS },
    clear:   { type: "noul",   instructions: "Is the state clear enough to personalise on?" },
  },
);
if (!result || result.clear.type !== "noul" || result.clear.noul < 0.7) return FALLBACK;
return result.variant.type === "choice" ? (result.variant.choice as Variant) : FALLBACK;
```

Three question types, mixable in one call:

| Type | Input | Output | Use for |
|---|---|---|---|
| `choice` | `criteria`: map of up to 255 `{ id: "description" }` | `choice` (winning id), `probabilities` per id, `confidence` | Pick one of N authored options |
| `score` | `criteria`: array of 2–10 ordered level descriptions | `score` (possibly fractional), per-level `probabilities` | Place input on a scale |
| `noul` | `instructions` (+ optional `true`/`false` worked examples) | `noul`: 0–1 probability of **yes** | Gates and guardrails |

---

## §1 — What it is, and what it is not

Jev is a "System One" model: you send a `state` and typed `questions`; it returns **typed, calibrated
answers**. There is no prose and no parsing step — the answer's shape is fixed by your request, so you
branch in plain code.

**What that buys:** speed (Jev is engineered to decide in the 70–500 ms band), cost (billed per *input*
token only — answers are free), and by construction it cannot return a value outside the schema you
sent.

**What it does not buy:** correctness. "Zero hallucinations by construction" means it cannot invent an
option that isn't in your `criteria` — it can still pick the *wrong* one of the ones you gave it.
Independent coverage put Jev's accuracy roughly level with a frontier LLM on TypeSafe's own benchmark
while being far cheaper. **Budget for disagreement, not for infallibility.** This is why §5 matters.

**Do not use it for:** generating UI, code, or any text; arithmetic, counting, or date maths; anything
that must be canonical. Treat every answer as an advisory signal with a confidence attached, never as
source-of-truth data.

---

## §2 — The OpenRouter transport (and why this one)

Jev is reachable two ways; both use the **same OpenRouter key** and bill the same account:

| Surface | Endpoint | Use when |
|---|---|---|
| **Decisions API** ⭐ | `POST https://openrouter.ai/api/alpha/decisions` | plain HTTP, any language — what `lib/services/jev.ts` uses |
| System One API | `POST https://openrouter.ai/api/v1/systemone` | you're on the TypeSafe SDK and only swap the base URL |

Request and response are identical to TypeSafe's native `POST /api/v1/decide`, so switching hosts is one
env var (`JEV_URL`). Notes:

- **The Decisions path is alpha.** If it is renamed, `DEFAULT_URL` in `lib/services/jev.ts` is the only
  line to change.
- **Do not confuse it with `typesafe/jev-router`** — that is a different product on `/chat/completions`
  that picks *models* and returns prose. It is not this.
- Pin the model. Thresholds are tuned against one model's calibration, so tracking `~typesafe/jev-latest`
  lets a silent upgrade shift them.
- **Costs:** $0.042 / 1M input tokens, $0 output, on the model page at time of writing. A ~450-token
  call is ≈ $0.00002 — call it **$19 per million**. Context: 32k on OpenRouter (64k on TypeSafe's own
  endpoint). You pay per input token, so send a digest, not the whole record.

---

## §3 — Cost and latency discipline

- **Send a digest.** `{ role, overdueCount, flags… }` — never a full DB row, and **never tenant PII**
  to a third party. The decision rarely needs more than the salient fields.
- **One call, many questions.** Questions are evaluated in parallel in a single round trip, so asking
  three things costs one call, not three.
- **Never block a render on it.** At ~0.9 s real-world this belongs behind `React.Suspense` (default
  paints, the pick swaps in) or in a background job — not in an `await` that gates first paint.
- **Cache.** `decide()` already memoises on `(model, state, questions)`. Identical state returns the
  identical answer, so a page does not reshuffle on every reload — which is both a UX and a cost win.

```tsx
// Server component: default first, personalisation after paint.
<Suspense fallback={<OverviewDefault data={data} />}>
  <PersonalizedOverview ctx={ctx} data={data} />
</Suspense>
```

## §4 — Reading confidence

- Treat `probabilities` as **bands, not values**. The same input scores differently across runs
  (`0.79` then `0.69` in OpenRouter's own write-up), so thresholds must be ranges — `>= 0.8` or
  `< 0.6` — and never an equality check.
- Index `probabilities` **by name**. Key order shifts between calls; positional access is a latent bug.
- Use a `noul` gate before trusting a `choice` on thin input. That is the pattern in §0: if the model
  says the state isn't clear enough, take the default rather than personalising off noise.
- Log the decision, not just the outcome, while a threshold is new. You cannot re-tune what you did not
  record.

## §5 — Thresholds are a tuning loop, not a guess

There is no default threshold that is right for your data.

1. **Author the variants yourself.** Jev picks; it never writes the component. Every option in
   `criteria` is a thing you built and can render.
2. **Collect a labelled sample** of real inputs with the decision you'd want.
3. **Set bands** that reproduce it, and write the band values down next to the criteria.
4. **Bump the model deliberately** and re-run the sample — this is exactly what pinning protects.
5. **Keep a fallback for every call site.** `decide()` returns `null` for: no key, non-OK status
   (401/402/403/502), malformed or partial payload, timeout, network failure. Every one of those must
   land on a sane default, so an AI outage costs personalisation and nothing else.

---

## §6 — Pitfalls

- **Registering the key.** `lib/env.ts` captures `process.env` at import time, and `lib/services/jev.ts`
  reads `env.OPENROUTER_API_KEY`. A new `process.env` var read directly bypasses validation invisibly —
  declare it in `lib/env.ts` and in the `runtimeEnv` map, not just one of the two.
- **`test/setup/env.ts` blanks third-party keys** for the default suite (so unit tests never hit the
  network). `OPENROUTER_API_KEY` is on that list; `lib/services/jev.test.ts` sets its own before
  importing, which is why the import there is dynamic.
- **`server-only`** on any module touching the key (C1). The guide's examples are all server-side.
- **Response bodies are single-read.** When stubbing `fetch` in tests, build a fresh `Response` per call.
- Don't hand Jev a decision deterministic code can make. A `switch` on `orgRole` is free, instant, and
  always right — use Jev where the signal is unstructured (text, mixed flags) or the branch count has
  outgrown rules.

## §7 — Where it fits here

Genuine fits: choosing between authored layout variants; classifying a document's type or a message's
intent; routing a record to the right place; gating whether something needs human review; scoring one
shortlist item against a rubric.

Not fits: anything that *renders* UI, computes a figure, or must be exactly reproducible — those get
deterministic code with the decision used only as an input signal.
