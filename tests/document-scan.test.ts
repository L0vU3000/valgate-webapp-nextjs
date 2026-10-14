import { describe, it, expect, vi, beforeEach } from "vitest";

// One of the N self-consistency runs can come back unreadable — seen in production as
// "AI_APICallError: Invalid JSON response" while the other runs returned fine. These cases pin the
// behaviour: a partial ballot still yields a scan, and only an empty ballot fails.
//
// generateObject is the only boundary that needs stubbing; the voting logic is real.
const { generateObjectMock } = vi.hoisted(() => ({ generateObjectMock: vi.fn() }));

vi.mock("ai", () => ({ generateObject: generateObjectMock }));

vi.mock("./ai-model", () => ({
  documentModel: () => ({ modelId: "stub-model" }),
  scanModelSlug: () => "google/gemini-2.5-flash",
}));

import { scanDocument } from "@/lib/services/document-scan";

/** A complete ExtractedProperty, since reconcileExtractions reads the field list off run 0. */
function extraction(overrides: Record<string, unknown> = {}) {
  return {
    propertyName: null, propertyType: null, status: null,
    addressLine: null, addressLine2: null, city: null, province: null, zip: null, country: null,
    yearBuilt: null, totalArea: null, bedrooms: null, bathrooms: null, parkingSpaces: null,
    purchasePrice: null, currentMarketValue: null, purchaseDate: null, ownershipStatus: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SCAN_SAMPLES = "3";
});

describe("scanDocument", () => {
  it("still returns a scan when one of the three runs is unreadable", async () => {
    generateObjectMock
      .mockResolvedValueOnce({ object: extraction({ propertyName: "Villa Soriya", totalArea: "240" }) })
      .mockRejectedValueOnce(new Error("AI_APICallError: Invalid JSON response"))
      .mockResolvedValueOnce({ object: extraction({ propertyName: "Villa Soriya", totalArea: "240" }) });

    const result = await scanDocument(new Uint8Array([1]), "application/pdf");

    expect(result.extracted.propertyName).toBe("Villa Soriya");
    expect(result.extracted.totalArea).toBe("240");
    // The two agreeing runs are unanimous, so nothing is flagged.
    expect(result.lowConfidence).toEqual([]);
  });

  it("hands the survivors to the vote, so a 1-1 split is flagged rather than silently kept", async () => {
    generateObjectMock
      .mockResolvedValueOnce({ object: extraction({ totalArea: "240" }) })
      .mockRejectedValueOnce(new Error("AI_APICallError: Invalid JSON response"))
      .mockResolvedValueOnce({ object: extraction({ totalArea: "200" }) });

    const result = await scanDocument(new Uint8Array([1]), "application/pdf");

    expect(result.extracted.totalArea).toBe("240"); // first-seen breaks the tie
    expect(result.lowConfidence).toEqual(["totalArea"]);
  });

  it("flags every field when only one run survives, because one run cannot be voted on", async () => {
    generateObjectMock
      .mockResolvedValueOnce({ object: extraction({ propertyName: "Villa Soriya" }) })
      .mockRejectedValue(new Error("AI_APICallError: Invalid JSON response"));

    const result = await scanDocument(new Uint8Array([1]), "application/pdf");

    expect(result.extracted.propertyName).toBe("Villa Soriya");
    expect(result.lowConfidence).toContain("propertyName");
    expect(result.lowConfidence).toContain("yearBuilt");
    expect(result.lowConfidence).toHaveLength(Object.keys(result.extracted).length);
  });

  it("rethrows the provider error when every run fails", async () => {
    generateObjectMock.mockRejectedValue(new Error("AI_APICallError: Invalid JSON response"));

    await expect(scanDocument(new Uint8Array([1]), "application/pdf")).rejects.toThrow(
      "Invalid JSON response",
    );
  });
});
