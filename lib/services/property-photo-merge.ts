import type { PropertyPatch } from "@/lib/data/types/property";

// Pure helper: computes the PropertyPatch for attaching newly-converted draft photos to a
// property. Dedupes against the property's existing photoStorageIds, and only assigns a
// cover photo when the property doesn't already have one (first new photo wins).
// Returns null when there are no new photos to attach (nothing to patch).
export function computePhotoMergePatch(
  existingPhotoStorageIds: string[],
  existingCoverStorageId: string | null | undefined,
  newPhotoStorageIds: string[],
): Pick<PropertyPatch, "photoStorageIds" | "coverStorageId"> | null {
  if (newPhotoStorageIds.length === 0) return null;

  const photoStorageIds = Array.from(new Set([...existingPhotoStorageIds, ...newPhotoStorageIds]));
  const patch: Pick<PropertyPatch, "photoStorageIds" | "coverStorageId"> = { photoStorageIds };
  if (!existingCoverStorageId) {
    patch.coverStorageId = newPhotoStorageIds[0];
  }
  return patch;
}
