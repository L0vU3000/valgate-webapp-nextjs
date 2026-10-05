// Contract checks for lib/services/document-classify.ts.
//
// The classifier is advisory: it returns a category or null, and never throws. These tests pin the
// two things that make that safe — the criteria cover the DB enum exactly (so Jev can never be
// asked for an option the column rejects), and anything that is not a known category becomes null
// rather than an invalid write.
//
// Run with: npx vitest run lib/services/document-classify.test.ts

import { describe, it, expect, vi, afterEach } from "vitest";

process.env.OPENROUTER_API_KEY = "test-jev-key";
process.env.JEV_URL = "https://jev.test/api/alpha/decisions";
const { classifyDocument, DOCUMENT_CATEGORIES } = await import("./document-classify");
const { documentCategoryEnum } = await import("@/lib/db/schema");

const respond = (choice: string, status = 200) =>
  new Response(
    JSON.stringify({
      model: "typesafe/jev-1.13",
      answers: {
        category: {
          type: "choice",
          choice,
          confidence: 0.88,
          probabilities: { [choice]: 0.88 },
        },
      },
      usage: { cost_usd: 0.00002 },
    }),
    { status },
  );

afterEach(() => vi.unstubAllGlobals());

describe("the criteria match the database enum", () => {
  it("asks for exactly the options the column accepts", () => {
    // If someone adds a category to the schema, it becomes selectable automatically; if they
    // remove one, Jev can no longer return it. Either way this list IS the enum — no drift.
    expect([...DOCUMENT_CATEGORIES]).toEqual([...documentCategoryEnum.enumValues]);
  });
});

describe("classifyDocument", () => {
  it("returns the category Jev picked", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respond("Title")));
    expect(await classifyDocument("Transfer of ownership document.", "deed.pdf")).toBe("Title");
  });

  it("returns null when Jev picks something outside the enum", async () => {
    // Typed output guarantees the choice came from our criteria, but the response is untrusted
    // wire data from an alpha endpoint — an unknown value must not reach the column.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respond("Vibes")));
    expect(await classifyDocument("...", "x.pdf")).toBeNull();
  });

  it("returns null on a non-OK status (402 insufficient credits)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respond("Title", 402)));
    expect(await classifyDocument("...", "x.pdf")).toBeNull();
  });

  it("returns null rather than throwing when the call fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("aborted")));
    expect(await classifyDocument("...", "x.pdf")).toBeNull();
  });

  it("returns null when no key is configured", async () => {
    vi.resetModules();
    const saved = process.env.OPENROUTER_API_KEY;
    process.env.OPENROUTER_API_KEY = "";
    try {
      const fresh = await import("./document-classify");
      expect(await fresh.classifyDocument("...", "x.pdf")).toBeNull();
    } finally {
      process.env.OPENROUTER_API_KEY = saved;
      vi.resetModules();
    }
  });
});
