"use client";

import type {
  AnyMap,
  AnyGeoJSONFeature,
  AnyMapLayerMouseEvent,
  MapEventTarget,
} from "@/components/map/types";
import { isInFrance } from "@/lib/geo/france";

// The French cadastre's parcel layer, drawn for HOVER and SELECTION.
//
// This module deliberately cannot write anything. It adds a tile source and two layers, and reports
// which parcel the cursor is over. Committing a parcel is a separate server call made when the user
// asks for it, so a stray mouse movement can never rewrite stored land data.

export const CADASTRE_SOURCE_ID = "fr-cadastre";
export const CADASTRE_FILL_ID = "fr-cadastre-fill";
export const CADASTRE_LINE_ID = "fr-cadastre-line";
const SOURCE_LAYER = "parcelles";

const TILE_URL =
  "https://openmaptiles.data.gouv.fr/data/cadastre/{z}/{x}/{y}.pbf";

// The TileJSON advertises minzoom 11, but `parcelles` only appears in the data at z13, and a z13
// tile over central Paris is ~313 KB, which is unreadable clutter behind a pin. The useful band
// starts higher: at z14 the parcels are the size of the pin.
//
// ponytail: 14 is a taste call on one city, not a measurement across France. If a rural user
// reports blank parcels at a usable zoom, drop to 13 — the data is there, it is only density.
export const CADASTRE_MIN_ZOOM = 14;
const MAX_ZOOM = 16;

// Three states, two feature-state keys. Selected must beat hover: the pointer can sit on a
// different parcel after the choice is made, and the chosen one must stay visibly chosen.
const HOVER_FILL = 0.14;
// The CHOSEN parcel. A light green wash, deliberately lighter than the hover blue it replaces:
// green means "picked, waiting for you to confirm", and keeping it pale keeps the land readable
// underneath while the 2.6px green border does the pointing. Using --status-success (#059669).
const CHOSEN_FILL = 0.2;
const BASE_LINE_WIDTH = 0.8;
const HOVER_LINE_WIDTH = 1.7;
const SELECTED_LINE_WIDTH = 2.6;

/** The parcel fields the tile layer carries, as read from the vector tile's metadata. */
export type HoveredParcel = {
  idu: string | null;
  section: string | null;
  numero: string | null;
  commune: string | null;
  /** OFFICIAL area in m² as recorded by the cadastre (the tile's `contenance`). */
  contenanceM2: number | null;
  /**
   * The tile FEATURE id, which is what feature-state is keyed on. Not the `idu` — the tile's
   * `id` property is the cadastral reference, while Mapbox's own feature id is a generated number,
   * and they are different things. Needed to keep a chosen parcel highlighted after the pointer
   * moves away.
   */
  featureId: number | null;
  /**
   * [lng, lat] of the pointer that found this parcel — therefore a point INSIDE it. This is where
   * the pin moves when the user commits, so the pin visibly lands on the parcel that was picked.
   */
  cursor: [number, number];
  /**
   * Raw VIEWPORT coordinates (clientX/clientY) of that same pointer, for positioning the read-out
   * that follows the cursor.
   *
   * Taken from the map's own mousemove, not from a handler on the card. The card is a SIBLING of the
   * map, so a pointermove over the canvas never reaches it — a listener there received nothing and
   * the read-out stayed hidden forever. The map is the only element that actually sees this event.
   */
  client: { x: number; y: number };
};

/**
 * `getSource` is generic on each library and the union's two signatures do not merge, so the call is
 * uncallable even though both renderers expose it. One local view keeps the cast in a single place
 * instead of at every probe. Same reasoning as {@link MapEventTarget} in components/map/types.ts.
 */
function mapAsSources(map: AnyMap) {
  return map as unknown as { getSource: (id: string) => unknown };
}

/**
 * Add the parcel layer pair. Idempotent and safe to call on `load` AND on every `style.load`,
 * which is what a style swap (theme / satellite) requires because it destroys every layer.
 * Same contract as `addBoundaryLayer`, for the same reason.
 */
export function addCadastreLayer(map: AnyMap) {
  if (mapAsSources(map).getSource(CADASTRE_SOURCE_ID)) return;

  map.addSource(CADASTRE_SOURCE_ID, {
    type: "vector",
    tiles: [TILE_URL],
    minzoom: CADASTRE_MIN_ZOOM,
    maxzoom: MAX_ZOOM,
    // Required by the licence (Etalab / Licence Ouverte). Set on the source so it renders with
    // whatever attribution control the map already has.
    attribution:
      '© DINUM · <a href="https://cadastre.data.gouv.fr/" target="_blank" rel="noreferrer">cadastre.data.gouv.fr</a>',
  });

  // Parcels render BELOW whatever the caller draws next: the pin must stay on top, so this is
  // added before the caller's own layers rather than after.
  map.addLayer({
    id: CADASTRE_FILL_ID,
    type: "fill",
    source: CADASTRE_SOURCE_ID,
    "source-layer": SOURCE_LAYER,
    minzoom: CADASTRE_MIN_ZOOM,
    // Highlighted by feature-state, not by swapping source data — Mapbox's own mechanism for
    // "which thing is hot", so there is no GeoJSON round trip per frame.
    paint: {
      // Three states, and the COLOUR says which one you are in:
      //   idle   — nothing, just the thin pale outline
      //   hover  — light blue (this one is under my cursor)
      //   chosen — GREEN: picked, waiting for the user to confirm
      // Green is deliberately not a Valgate brand colour, so "your move" cannot be confused with
      // the brand blue that means "set". There is no fourth "saved" state: once confirmed the pin
      // is placed and the wizard moves on, so a "confirmed" colour would have no time on screen.
      "fill-color": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        "#059669",
        "#2563eb",
      ],
      "fill-opacity": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        CHOSEN_FILL,
        ["boolean", ["feature-state", "hover"], false],
        HOVER_FILL,
        0,
      ],
    },
  });

  map.addLayer({
    id: CADASTRE_LINE_ID,
    type: "line",
    source: CADASTRE_SOURCE_ID,
    "source-layer": SOURCE_LAYER,
    minzoom: CADASTRE_MIN_ZOOM,
    // `line-join: round` is load-bearing, not cosmetic — the same reason boundary-layer.ts gives.
    // Survey rings carry near-collinear vertices, and Mapbox's default miter join projects those
    // outward into spikes that are not in the data.
    layout: { "line-join": "round", "line-cap": "round" },
    paint: {
      "line-color": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        "#059669",
        ["boolean", ["feature-state", "hover"], false],
        "#2563eb",
        "#2563eb",
      ],
      "line-width": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        SELECTED_LINE_WIDTH,
        ["boolean", ["feature-state", "hover"], false],
        HOVER_LINE_WIDTH,
        BASE_LINE_WIDTH,
      ],
      "line-opacity": [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        1,
        ["boolean", ["feature-state", "hover"], false],
        0.95,
        0.55,
      ],
    },
  });
}

/**
 * Set or clear the highlight flags on one tile feature.
 *
 * `sourceLayer` is REQUIRED for a vector source — omitting it is a runtime error, not a warning, and
 * it silently kills the whole highlight (the call throws before any state is written). Keep it.
 */
function setParcelState(
  map: AnyMap,
  featureId: number | null,
  state: { hover?: boolean; selected?: boolean },
) {
  if (featureId === null) return;
  // The source may not exist YET — `addCadastreLayer` runs later in the same setup, and a vector
  // source's feature ids only exist once its tiles have loaded. Writing state before either is a
  // silent no-op, which is how a chosen parcel ended up with no highlight at all. Bail quietly and let
  // `reassertSelection` apply it once the tiles are actually there.
  if (!mapAsSources(map).getSource(CADASTRE_SOURCE_ID)) return;
  if (!map.getLayer(CADASTRE_FILL_ID)) return;
  if (!map.isSourceLoaded(CADASTRE_SOURCE_ID)) return;
  map.setFeatureState(
    { source: CADASTRE_SOURCE_ID, sourceLayer: SOURCE_LAYER, id: featureId },
    state,
  );
}

/**
 * Report the parcel under the cursor. Read-only: sets feature-state and calls back.
 *
 * Deliberately does NOT touch `canvas.style.cursor`. The surfaces that host this layer already own
 * their cursor — quick-add arms a custom crosshair ring, and writing `"pointer"` here both replaced
 * that with the default finger and stomped a cursor the host restores by value comparison. Leaving
 * the host's cursor alone is what lets the custom one show through.
 *
 * Returns an unsubscribe function so the caller can detach — React re-renders would otherwise stack
 * handlers on the same map.
 */
/**
 * Map one hovered/clicked tile feature onto the parcel shape the UI consumes.
 *
 * Shared by the hover handler and the click handler so "the parcel under the pointer" means exactly the
 * same thing whether the user is just looking at it or committing to it.
 */
function parcelFromFeature(
  f: AnyGeoJSONFeature,
  lngLat: { lng: number; lat: number },
  client: { x: number; y: number },
): HoveredParcel {
  const p = (f.properties ?? {}) as Record<string, unknown>;
  const str = (v: unknown) =>
    typeof v === "string" && v.trim() ? v.trim() : null;
  const num = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) ? v : null;
  return {
    idu: str(p.id),
    section: str(p.section),
    numero: str(p.numero),
    commune: str(p.commune),
    contenanceM2: num(p.contenance),
    featureId: typeof f.id === "number" ? f.id : null,
    // WHERE the pointer is, in lng/lat. Both handlers only fire while the pointer is over this parcel's
    // fill, so this is guaranteed to be a point INSIDE it — which is what the pin moves to on commit.
    // Deriving an interior point from geometry instead would mean reimplementing (or importing, from a
    // server-only module) the ring maths for no extra accuracy.
    cursor: [lngLat.lng, lngLat.lat],
    // The same pointer in viewport coordinates, for the read-out that follows it.
    client,
  };
}

/**
 * Reset the hover reporter's "already reported" memory.
 *
 * Called when a parcel is CHOSEN. Without it, the parcel still under the cursor keeps reporting as
 * unchanged, so `cadastreParcel` goes stale — and if anything nulls it (leaving France, a teardown) the
 * card would lose the parcel the user just picked. Module-level because only one cadastre layer exists
 * per map, and a teardown clears it.
 */
let hoverReset: (() => void) | null = null;
export function resetCadastreHover() {
  hoverReset?.();
}

export function wireCadastreHover(
  map: AnyMap,
  onParcel: (parcel: HoveredParcel | null) => void,
  /** Fired when a parcel is CLICKED. A click selects it; without this a click only moved the pin. */
  onSelect?: (parcel: HoveredParcel) => void,
): () => void {
  let hovered: number | null = null;
  // The last parcel we reported UP, so identical repeats can be skipped. mousemove fires ~60x/second
  // while the cursor crosses one parcel; without this every one of those calls back into React and
  // re-renders this subtree with identical values. The camera is driven by the same frame loop, so
  // that work lands directly on the pan and zoom. Only a real change is worth a render.
  let reported: string | null = null;

  const clearHover = () => {
    if (hovered !== null) {
      setParcelState(map, hovered, { hover: false });
      hovered = null;
    }
  };

  const onMove = (e: AnyMapLayerMouseEvent) => {
    const f = e.features?.[0];
    if (!f) return;
    const id = typeof f.id === "number" ? f.id : null;
    if (hovered !== id) {
      clearHover();
      hovered = id;
      setParcelState(map, hovered, { hover: true });
    }
    const p = (f.properties ?? {}) as Record<string, unknown>;
    const str = (v: unknown) =>
      typeof v === "string" && v.trim() ? v.trim() : null;
    const num = (v: unknown) =>
      typeof v === "number" && Number.isFinite(v) ? v : null;

    const idu = str(p.id);
    const contenanceM2 = num(p.contenance);
    // Everything except the raw cursor position. The position still has to be reported (the pin
    // moves there on commit), but it must NOT be part of the change check — otherwise every pixel of
    // pointer travel counts as a change and React re-renders at pointer rate anyway.
    const signature = `${id}|${idu}|${contenanceM2}`;
    if (signature === reported) return;
    reported = signature;

    const moveEvent = e.originalEvent ?? { clientX: 0, clientY: 0 };
    onParcel(
      parcelFromFeature(f, e.lngLat, {
        x: moveEvent.clientX,
        y: moveEvent.clientY,
      }),
    );
  };

  /**
   * A CLICK on a parcel IS the choice. Reported through `onSelect` with the parcel read from the click
   * event itself, not from the hover state: hover callbacks are async, so at click time `cadastreParcel`
   * may still be null (and often is, on the first click after arming), which is what made a clicked
   * parcel refuse to select.
   */
  const onClick = (e: AnyMapLayerMouseEvent) => {
    const f = e.features?.[0];
    if (!f || !onSelect) return;
    const ev = e.originalEvent ?? { clientX: 0, clientY: 0 };
    onSelect(
      parcelFromFeature(f, e.lngLat, {
        x: ev.clientX,
        y: ev.clientY,
      }),
    );
  };
  // See MapEventTarget: `on`/`off` are overloaded per renderer and the overloads do not merge across
  // the union, so the layer-targeted subscriptions go through the same local cast as the map ones.
  const layerEvents = map as unknown as MapEventTarget;
  if (onSelect) layerEvents.on("click", CADASTRE_FILL_ID, onClick);

  const onLeave = () => {
    clearHover();
    // Reset with the hover, so moving off a parcel and straight back onto the SAME one reports again.
    reported = null;
    onParcel(null);
  };

  layerEvents.on("mousemove", CADASTRE_FILL_ID, onMove);
  layerEvents.on("mouseleave", CADASTRE_FILL_ID, onLeave);
  hoverReset = () => {
    reported = null;
  };

  return () => {
    layerEvents.off("mousemove", CADASTRE_FILL_ID, onMove);
    layerEvents.off("mouseleave", CADASTRE_FILL_ID, onLeave);
    layerEvents.off("click", CADASTRE_FILL_ID, onClick);
    hoverReset = null;
    clearHover();
  };
}

/**
 * Keep the parcel layer in sync with where the map is looking, report the parcel under the cursor,
 * and keep the chosen parcel highlighted. ONE helper, because there are two surfaces that need
 * exactly this (the add-property picker and the map's quick-add card) and a second copy would drift.
 *
 * Re-checks on `moveend` rather than once at mount: both surfaces open on the user's existing pin,
 * which for today's data is in Cambodia, so a mount-time check would never show parcels for a
 * French address the user panned to — the feature would look broken while being correct.
 *
 * `selectedFeatureId` is applied as a change, not as a starting value, so choosing a parcel
 * highlights it immediately and clearing the choice un-highlights it.
 *
 * `onParcel(null)` fires when the map leaves France, so a stale parcel name cannot sit over a map
 * that has no cadastre on it. Returns a teardown.
 */
export function syncCadastreLayer(
  map: AnyMap,
  onParcel: (parcel: HoveredParcel | null) => void,
  selectedFeatureId: number | null = null,
  /** Fired when a parcel is clicked, so the click itself can be the choice. */
  onSelect?: (parcel: HoveredParcel) => void,
): () => void {
  let unwire: (() => void) | null = null;
  let inFrance = false;
  let markedSelection: number | null = null;

  // The wanted selection, mutable, because the tile feature ids a choice is keyed on do not survive a
  // style swap and may not exist yet when the choice is first made. `reassertSelection` retries from
  // the points where that can change.
  const selectedRef = { current: selectedFeatureId };

  // Apply the chosen highlight. Idempotent, and safe to call before the tiles exist — setParcelState
  // ignores it then — so it can be called from every point where the state could have been lost.
  const reassertSelection = () => {
    const want = selectedRef.current;
    if (want === markedSelection) return;
    setParcelState(map, markedSelection, { selected: false });
    setParcelState(map, want, { selected: true });
    // Only remember it once it actually stuck. If the tiles were not ready yet this stays stale, so the
    // NEXT call (sourcedata / style.load) tries again instead of believing it is done.
    if (want === null || map.isSourceLoaded(CADASTRE_SOURCE_ID))
      markedSelection = want;
  };

  const sync = () => {
    const c = map.getCenter();
    const now = isInFrance(c.lng, c.lat);
    if (now) addCadastreLayer(map);
    // Re-assert on EVERY sync, not just on a France change. An early return here was why a chosen
    // parcel could stay unlit: the selection is applied before this runs, so the one call that would
    // have drawn it was skipped.
    reassertSelection();
    // Only re-announce on an actual France<->elsewhere change, so a pan inside France does not
    // clear a parcel the cursor is still over.
    if (now === inFrance) return;
    inFrance = now;
    if (now && !unwire) {
      unwire = wireCadastreHover(map, onParcel, onSelect);
    } else if (!now) {
      unwire?.();
      unwire = null;
      onParcel(null);
    }
  };

  // Feature state is keyed on feature ids, which only exist once the vector tiles have loaded, and a
  // style swap (theme / satellite) wipes every flag. Both events therefore need a re-assert; without
  // the first, choosing a parcel while the tiles were still arriving left it green-less.
  const onSourceData = (e: { sourceId?: string; isSourceLoaded?: boolean }) => {
    if (e.sourceId === CADASTRE_SOURCE_ID) reassertSelection();
  };

  reassertSelection();
  sync();
  // ponytail: cast on the event methods only. `on`/`off` are overloaded per library, and overloads do
  // not merge across a union (see components/map/types.ts) — the runtime signature is identical, so a
  // local cast is the documented posture here rather than widening the whole module to `any`.
  const events = map as unknown as MapEventTarget;
  events.on("sourcedata", onSourceData);
  events.on("moveend", sync);
  // A style swap destroys every layer, so the source must come back.
  events.on("style.load", sync);

  return () => {
    events.off("sourcedata", onSourceData);
    events.off("moveend", sync);
    events.off("style.load", sync);
    // Clear the selection this instance applied, so choosing a SECOND parcel un-lights the first.
    // Exactly one parcel is ever highlighted, which is what makes "confirm" unambiguous.
    //
    // This is only safe because `setParcelState` now ignores a call made before the source/layer/tiles
    // exist and `reassertSelection` retries from `sourcedata`. Without those two, clearing here destroyed
    // the highlight the user had just asked for and the successor instance could not restore it.
    setParcelState(map, markedSelection, { selected: false, hover: false });
    unwire?.();
  };
}
