// LIVE test — hits the real Jev API using the real key from .env.local. No mocks.
//
// Run explicitly, never in the normal suite (it costs money and needs a key):
//   npx vitest run --config vitest.config.live.ts
//
// What it proves: the shipped service ranks a true title deed above a deed for a different address,
// and above a document that merely mentions the address. Discrimination is the property that
// matters — a classifier that returns 0.9 for everything is worthless here, so the assertion is
// about ORDER, not about any single absolute value.

import { describe, it, expect } from "vitest";
import { suggestEvidence } from "@/lib/services/evidence-match";

const claim = {
  claim: "123 Riverside Road",
  criterion: "A title deed or sale contract naming that address is evidence.",
};

const candidates = [
  { id: "d1", name: "title-deed.pdf", aiSummary: "Title deed for the property at 123 Riverside Road. Registered owner: A. Area 200 sqm." },
  { id: "d2", name: "other-deed.pdf", aiSummary: "Title deed for the property at 999 Market Street. Registered owner: B. Area 150 sqm." },
  { id: "d3", name: "email.txt", aiSummary: "Email: I hope to buy 123 Riverside Road someday. I do not hold a title document for it." },
  { id: "d4", name: "not-summarised.pdf", aiSummary: "" },
];

describe("suggestEvidence (LIVE)", () => {
  it("ranks the true deed first and never pre-ticks a wrong-address deed", async () => {
    const result = await suggestEvidence({ orgId: "live-test" } as never, "p1", claim, { candidates });

    // eslint-disable-next-line no-console
    console.log(
      "[live] ranked:",
      result.suggestions.map((s) => `${s.documentName}=${s.noul}`).join("  ") || "(empty — no key?)",
    );

    expect(result.suggestions.length).toBeGreaterThan(0); // guards a silently-null Jev

    const order = result.suggestions.map((s) => s.documentId);
    expect(order[0]).toBe("d1"); // true deed first

    // A deed for a different property must never be pre-ticked.
    expect(result.confidentDocumentIds).toContain("d1");
    expect(result.confidentDocumentIds).not.toContain("d2");

    // A document with no summary is unreadable, not evidence-absent: excluded, not judged.
    expect(order).not.toContain("d4");
  }, 30_000);
});
