// Focused regression test for computePhotoMergePatch — pure logic, no DB/env/mocks needed.
// Run with: npx vitest run lib/services/property-photo-merge.test.ts

import { describe, it, expect } from "vitest";
import { computePhotoMergePatch } from "./property-photo-merge";

describe("computePhotoMergePatch", () => {
  it("returns null when there are no new photos", () => {
    expect(computePhotoMergePatch(["a"], "a", [])).toBeNull();
  });

  it("dedupes new photo ids against the existing list", () => {
    const patch = computePhotoMergePatch(["a", "b"], "a", ["b", "c"]);
    expect(patch?.photoStorageIds).toEqual(["a", "b", "c"]);
  });

  it("sets the first new photo as cover when the property has no cover yet", () => {
    const patch = computePhotoMergePatch([], undefined, ["new-1", "new-2"]);
    expect(patch?.coverStorageId).toBe("new-1");
    expect(patch?.photoStorageIds).toEqual(["new-1", "new-2"]);
  });

  it("does not override an existing cover photo", () => {
    const patch = computePhotoMergePatch(["existing"], "existing", ["new-1"]);
    expect(patch?.coverStorageId).toBeUndefined();
    expect(patch?.photoStorageIds).toEqual(["existing", "new-1"]);
  });
});
