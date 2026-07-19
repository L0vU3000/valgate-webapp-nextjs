import mapboxgl from "mapbox-gl";

/**
 * Creates a Mapbox map only when the browser can provide WebGL.
 *
 * Mapbox normally reports unsupported browsers through `supported()`, but its
 * constructor can still throw when the browser loses or blocks the graphics
 * context. Returning null lets the React component show a usable fallback
 * instead of crashing the whole route.
 */
export function createMapIfSupported(
  options: mapboxgl.MapOptions,
): mapboxgl.Map | null {
  if (!mapboxgl.supported()) {
    return null;
  }

  try {
    return new mapboxgl.Map(options);
  } catch {
    return null;
  }
}
