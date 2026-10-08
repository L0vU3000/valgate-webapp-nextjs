import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Contract checks for evidence matching.
//
// The load-bearing properties are: (1) Jev is never asked to SEE an image — only documents that
// already have derived text are considered; (2) the result is ADVISORY — an unconfigured or failing
// Jev returns empty and the wizard behaves exactly as before; (3) ranking and the confident/uncertain
// split follow the named bands, so the UI can pre-tick without re-deriving thresholds.

const decideMock = vi.fn();
const listDocumentsMock = vi.fn();

vi.mock("@/lib/services/jev", () => ({ decide: (...a: unknown[]) => decideMock(...a) }));
vi.mock("@/lib/services/documents", () => ({
  listDocuments: (...a: unknown[]) => listDocumentsMock(...a),
}));
vi.mock("server-only", () => ({}));

import { suggestEvidence } from "@/lib/services/evidence-match";

const ctx = { orgId: "ORG-1", userId: "USR-1" } as never;
const claim = { claim: "123 Riverside Road, Phnom Penh", criterion: "Mentions the address." };

function noul(n: number) {
  return { evidences_claim: { type: "noul", noul: n } };
}

beforeEach(() => {
  decideMock.mockReset();
  listDocumentsMock.mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe("suggestEvidence", () => {
  it("returns empty and asks Jev nothing when no document has derived text", async () => {
    listDocumentsMock.mockResolvedValue([
      { id: "DOC-1", name: "deed.pdf", aiSummary: null },
      { id: "DOC-2", name: "photo.jpg", aiSummary: "   " },
    ]);

    const res = await suggestEvidence(ctx, "PROP-1", claim);

    expect(res.suggestions).toEqual([]);
    // The important half: Jev was never called. No text means nothing can be judged — and we must
    // not fall back to sending an image to a text-only model.
    expect(decideMock).not.toHaveBeenCalled();
  });

  it("ranks by noul and splits confident from uncertain using the named bands", async () => {
    listDocumentsMock.mockResolvedValue([
      { id: "DOC-A", name: "a.pdf", aiSummary: "registered at 123 Riverside Road" },
      { id: "DOC-B", name: "b.pdf", aiSummary: "utility bill, other address" },
      { id: "DOC-C", name: "c.pdf", aiSummary: "unclear scan" },
    ]);
    decideMock
      .mockResolvedValueOnce(noul(0.91)) // DOC-A → confident
      .mockResolvedValueOnce(noul(0.2)) //  DOC-B → below MIN, dropped
      .mockResolvedValueOnce(noul(0.62)); // DOC-C → uncertain

    const res = await suggestEvidence(ctx, "PROP-1", claim);

    expect(res.suggestions.map((s) => [s.documentId, s.noul])).toEqual([
      ["DOC-A", 0.91],
      ["DOC-C", 0.62],
      ["DOC-B", 0.2],
    ]);
    expect(res.confidentDocumentIds).toEqual(["DOC-A"]);
    expect(res.uncertainDocumentIds).toEqual(["DOC-C"]);
  });

  it("degrades to empty when Jev is unconfigured (decide returns null)", async () => {
    listDocumentsMock.mockResolvedValue([{ id: "DOC-A", name: "a.pdf", aiSummary: "text" }]);
    decideMock.mockResolvedValue(null);

    const res = await suggestEvidence(ctx, "PROP-1", claim);

    expect(res.suggestions).toEqual([]);
    expect(res.confidentDocumentIds).toEqual([]);
  });

  it("never throws when the document lookup fails", async () => {
    listDocumentsMock.mockRejectedValue(new Error("db down"));

    await expect(suggestEvidence(ctx, "PROP-1", claim)).resolves.toEqual({
      suggestions: [],
      confidentDocumentIds: [],
      uncertainDocumentIds: [],
    });
  });
});
