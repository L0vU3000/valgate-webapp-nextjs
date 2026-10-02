// Contract checks for lib/services/jev.ts.
//
// decide() is an advisory path: it must return typed answers when things work, and null — never a
// throw — when they don't. These tests pin that, plus the two things that are easy to get wrong:
// the cache collapsing identical requests, and reading probabilities by NAME (Jev's docs note the
// key order shifts between calls, so positional access is a latent bug).
//
// Run with: npx vitest run lib/services/jev.test.ts

import { describe, it, expect, vi, afterEach } from "vitest";

// lib/env.ts (t3-env) captures process.env into its runtimeEnv map at IMPORT time, so these must be
// set before ./jev pulls it in — hence the assignments followed by a dynamic import. test/setup/env.ts
// deliberately blanks OPENROUTER_API_KEY before this file runs, so the order here is load-bearing.
process.env.OPENROUTER_API_KEY = "test-jev-key";
process.env.JEV_URL = "https://jev.test/api/alpha/decisions";
const { decide } = await import("./jev");

const QUESTIONS = {
  variant: {
    type: "choice" as const,
    instructions: "Which layout best serves this user's next task?",
    criteria: { yield_first: "numbers", photo_first: "photos" },
  },
  clear: { type: "noul" as const, instructions: "Is the state clear enough to personalise on?" },
};

const ANSWERS = {
  variant: {
    type: "choice",
    choice: "yield_first",
    confidence: 0.9,
    probabilities: { yield_first: 0.9, photo_first: 0.1 },
  },
  clear: { type: "noul", noul: 0.95 },
};

// A Response body can only be read once, so every stub builds a fresh one.
const respond = (answers: unknown, status = 200) =>
  new Response(JSON.stringify({ model: "typesafe/jev-1.13", answers, usage: { cost_usd: 0.00002 } }), {
    status,
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("decide — happy path", () => {
  it("returns one typed answer per question, in one call", async () => {
    const fetchMock = vi.fn().mockResolvedValue(respond(ANSWERS));
    vi.stubGlobal("fetch", fetchMock);

    const result = await decide({ seed: 1 }, QUESTIONS);

    expect(result).not.toBeNull();
    expect(result!.variant.type).toBe("choice");
    expect(result!.variant.type === "choice" && result!.variant.choice).toBe("yield_first");
    expect(result!.clear.type === "noul" && result!.clear.noul).toBeCloseTo(0.95);
    expect(fetchMock).toHaveBeenCalledTimes(1); // both questions ride one round trip
  });

  it("reads probabilities by name, not by position", async () => {
    // Jev's docs warn the key order inside `probabilities` shifts between calls; a reordered payload
    // must not change the answer we read.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        respond({
          variant: {
            type: "choice",
            choice: "yield_first",
            confidence: 0.9,
            probabilities: { photo_first: 0.1, yield_first: 0.9 }, // reversed
          },
          clear: { type: "noul", noul: 0.95 },
        }),
      ),
    );

    const result = await decide({ seed: 2 }, QUESTIONS);
    expect(result!.variant.type === "choice" && result!.variant.probabilities.yield_first).toBe(0.9);
  });

  it("collapses an identical request onto one fetch (the cache)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(respond(ANSWERS));
    vi.stubGlobal("fetch", fetchMock);

    await decide({ seed: 3 }, QUESTIONS);
    await decide({ seed: 3 }, QUESTIONS);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("decide — degrades to null, never throws", () => {
  it("returns null on a non-OK status (e.g. 402 insufficient credits)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respond({ error: "insufficient_credits" }, 402)));
    expect(await decide({ seed: 4 }, QUESTIONS)).toBeNull();
  });

  it("returns null when a question is missing from the response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respond({ variant: ANSWERS.variant })));
    expect(await decide({ seed: 5 }, QUESTIONS)).toBeNull();
  });

  it("returns null when an answer is not one of the three primitives", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(respond({ variant: { type: "prose", text: "sure thing!" }, clear: ANSWERS.clear })),
    );
    expect(await decide({ seed: 6 }, QUESTIONS)).toBeNull();
  });

  it("returns null rather than throwing when fetch rejects (network / timeout)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("The operation was aborted")));
    expect(await decide({ seed: 7 }, QUESTIONS)).toBeNull();
  });

  it("returns null when the body is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>502</html>", { status: 200 })));
    expect(await decide({ seed: 8 }, QUESTIONS)).toBeNull();
  });

  it("returns null when no key is configured (the CI condition)", async () => {
    // env captures the key at import time, so this needs a fresh module registry.
    vi.resetModules();
    const saved = process.env.OPENROUTER_API_KEY;
    process.env.OPENROUTER_API_KEY = "";
    try {
      const fresh = await import("./jev");
      expect(await fresh.decide({ seed: 9 }, QUESTIONS)).toBeNull();
    } finally {
      process.env.OPENROUTER_API_KEY = saved;
      vi.resetModules();
    }
  });
});
