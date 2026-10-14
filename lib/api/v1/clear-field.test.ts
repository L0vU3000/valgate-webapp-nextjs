import { describe, it, expect } from "vitest";
import { parsePatchBody, toPropertyPatch } from "./property-write";
import { parseDocumentPatchBody, toDocumentPatch } from "./document-write";

// v1 PATCH clear rule: "" on an optional text field means "set to null"; null or an absent key
// means "no change". Every other field keeps its partial-update semantics.

function propertyPatch(raw: unknown) {
  const parsed = parsePatchBody(raw);
  if (!parsed.ok) throw new Error("expected a valid body");
  return toPropertyPatch(parsed.body);
}

function documentPatch(raw: unknown) {
  const parsed = parseDocumentPatchBody(raw);
  if (!parsed.ok) throw new Error("expected a valid body");
  return toDocumentPatch(parsed.body);
}

describe("v1 PATCH clear-field rule", () => {
  it('"" clears an optional property text field (→ null)', () => {
    expect(propertyPatch({ city: "", yearBuilt: "" })).toEqual({ city: null, yearBuilt: null });
  });

  it("null and absent keys still mean no change", () => {
    expect(propertyPatch({ city: null, province: null })).toEqual({});
    expect(propertyPatch({})).toEqual({});
  });

  it("a real value is still set as-is", () => {
    expect(propertyPatch({ city: "Phnom Penh" })).toEqual({ city: "Phnom Penh" });
  });

  it("non-clearable fields are unchanged: empty name is still rejected, totalArea '' is stored", () => {
    expect(parsePatchBody({ name: "" }).ok).toBe(false);
    expect(propertyPatch({ totalArea: "" })).toEqual({ totalArea: "" });
  });

  it('document description: "" clears, null is no change; expiresAt null is no change', () => {
    expect(documentPatch({ description: "" })).toEqual({ description: null });
    expect(documentPatch({ description: null, expiresAt: null })).toEqual({});
    expect(documentPatch({ expiresAt: 1_800_000_000_000 })).toEqual({ expiresAt: 1_800_000_000_000 });
  });
});
