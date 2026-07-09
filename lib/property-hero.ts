// Shared cover → map → placeholder decision for a property "hero" image, used by both the
// overview hero and the home map drawer so they behave identically. Returns null when there
// is neither a cover nor a map, letting each caller render its own placeholder.
export type HeroImage = { src: string; kind: "cover" | "map" } | null;

export function pickHeroImage(
  coverUrl: string | null | undefined,
  mapUrl: string | null | undefined,
): HeroImage {
  if (coverUrl) return { src: coverUrl, kind: "cover" };
  if (mapUrl) return { src: mapUrl, kind: "map" };
  return null;
}
