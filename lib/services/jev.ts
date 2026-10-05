import "server-only";
import { createHash } from "node:crypto";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

// Jev (TypeSafe) via OpenRouter's Decisions API.
//
// Jev is a "System One" decision model: it does NOT generate text. You send a `state` plus typed
// questions and it returns typed, calibrated answers — a choice from a set you defined, a position
// on an ordered scale, or a 0..1 yes/no. That is the whole point: the answer's shape is fixed by the
// request, so callers branch on it in plain code and never parse prose.
//
// OpenRouter exposes Jev on two surfaces; this uses the Decisions API because it is plain HTTP from
// any language (the System One endpoint exists for the TypeSafe SDKs). Both bill the same key.
// Verified 2026-09-30 against openrouter.ai/docs/api/api-reference/alphadecisions and the Jev
// tutorial. This path is ALPHA — if it moves, only DEFAULT_URL changes.

const DEFAULT_URL = "https://openrouter.ai/api/alpha/decisions";

// Pin the version. Thresholds are tuned against one model's calibration, so tracking
// `~typesafe/jev-latest` would let a silent upgrade shift them under us. Bump deliberately, re-run
// the test, re-tune the bands.
const DEFAULT_MODEL = "typesafe/jev-1.13";

// A decision is advisory: the caller has a default it is happy to render. So we would rather lose
// the personalisation than hold a page render.
//
// 1500ms, not 800. Measured 2026-10-05 against typesafe/jev-1.13 with a real key: 389ms / 640ms /
// 909ms for three short-text calls. The original 800ms budget sat INSIDE that spread, so a valid
// answer was thrown away roughly one time in three — the advisory path then rendered the default
// and nothing ever looked wrong. The first call of a cold connection is the slow one; the decision
// runs alongside other panel data, so an extra 700ms is invisible and a silently dropped decision
// is not. Raise with evidence, never guess.
const TIMEOUT_MS = 1500;

export type JevChoiceQuestion = {
  type: "choice";
  instructions: string;
  criteria: Record<string, string>; // up to 255 labelled options
};
export type JevScoreQuestion = {
  type: "score";
  instructions: string;
  criteria: string[]; // 2..10 ordered level descriptions, low to high
};
export type JevNoulQuestion = {
  type: "noul";
  instructions: string;
  criteria?: Record<string, string>; // optional worked examples for true/false
};
export type JevQuestion = JevChoiceQuestion | JevScoreQuestion | JevNoulQuestion;

export type JevChoiceAnswer = {
  type: "choice";
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
};
export type JevScoreAnswer = {
  type: "score";
  score: number;
  confidence: number;
  probabilities: Record<string, number>;
};
export type JevNoulAnswer = { type: "noul"; noul: number };
export type JevAnswer = JevChoiceAnswer | JevScoreAnswer | JevNoulAnswer;

type Answers<Q> = { [K in keyof Q]: JevAnswer };

// Jev's own docs note the probability key ORDER shifts between calls, so index by name, never by
// position. Nothing here relies on order.

// ponytail: unbounded Map, one entry per distinct (state, questions) — process-lifetime, no TTL.
// Bounded LRU when a deployment sees enough distinct states to matter. The win is that identical
// state returns the identical answer, so a page does not reshuffle its variant on every reload.
const cache = new Map<string, Record<string, JevAnswer>>();

// Structural guard on an untrusted response. The shape is documented but arrives over the wire from
// an alpha endpoint: a malformed answer must degrade to "no decision", never to a crash or to a
// wrong branch off a garbage `choice`.
function isAnswer(a: unknown): a is JevAnswer {
  if (typeof a !== "object" || a === null) return false;
  const t = (a as { type?: unknown }).type;
  return t === "choice" || t === "score" || t === "noul";
}

/**
 * Send `state` and typed `questions` to Jev; get one typed answer per question.
 *
 * Every question is evaluated in parallel in a single round trip, so asking three things costs one
 * call. Returns null — never throws — when the key is unset, the call fails, or the payload is
 * malformed; the caller must therefore always have a default to fall back to.
 */
export async function decide<Q extends Record<string, JevQuestion>>(
  state: unknown,
  questions: Q,
): Promise<Answers<Q> | null> {
  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) return null; // unconfigured is a normal state, not an error

  const url = process.env.JEV_URL?.trim() || DEFAULT_URL;
  const model = process.env.JEV_MODEL?.trim() || DEFAULT_MODEL;

  const cacheKey = createHash("sha256")
    .update(JSON.stringify([model, state, questions]))
    .digest("hex");
  const hit = cache.get(cacheKey);
  if (hit) return hit as Answers<Q>;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, state, questions }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      // 402 insufficient credits, 401 bad key, 502 upstream — all "no decision" to the caller.
      logger.warn("jev decide failed", { status: res.status });
      return null;
    }

    const body = (await res.json()) as {
      answers?: Record<string, unknown>;
      usage?: { cost_usd?: number };
    };
    const raw = body.answers;
    if (!raw || typeof raw !== "object") return null;

    // Every question must come back as a well-formed answer; a partial payload is not usable.
    const answered = Object.entries(raw);
    if (answered.length !== Object.keys(questions).length || !answered.every(([, a]) => isAnswer(a))) {
      logger.warn("jev decide: malformed answers", { got: answered.length });
      return null;
    }

    logger.debug("jev decide", { model, costUsd: body.usage?.cost_usd });
    cache.set(cacheKey, raw as Record<string, JevAnswer>);
    return raw as Answers<Q>;
  } catch (err) {
    // Timeout, DNS, abort, non-JSON body. Advisory path: log, fall back.
    logger.warn("jev decide threw", { error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}
