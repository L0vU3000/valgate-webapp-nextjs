// Where the French cadastre has data.
//
// Client-safe on purpose: the map decides whether to add the parcel layer before any request goes
// out, and that code runs in the browser. `lib/services/cadastre.ts` is server-only, so it imports
// this rather than the other way round.

/**
 * True when a point is inside the area the French cadastre covers (mainland + Corsica, and the
 * DOM-TOMs, whose tiles exist too).
 *
 * ponytail: a coarse bounding box, so Geneva / Barcelona / Brussels fall inside it and cost one
 * wasted APICarto call that returns an empty feature set. Sub-second, free, and handled as a
 * normal "no parcel" — so being loosely wrong costs nothing, and tracing France's real border
 * would be far more code for no user-visible difference.
 */
export function isInFrance(lng: number, lat: number): boolean {
  const inMainland = lng >= -5.5 && lng <= 9.7 && lat >= 41.2 && lat <= 51.3;
  const inDomTom =
    (lng >= -61.9 && lng <= -60.7 && lat >= 14.3 && lat <= 18.3) || // Guadeloupe / Martinique
    (lng >= -54.7 && lng <= -51.5 && lat >= 2.0 && lat <= 6.0) || // Guyane
    (lng >= 55.1 && lng <= 55.9 && lat >= -21.5 && lat <= -20.7) || // Réunion
    (lng >= 44.9 && lng <= 45.4 && lat >= -13.1 && lat <= -12.6); // Mayotte
  return inMainland || inDomTom;
}
