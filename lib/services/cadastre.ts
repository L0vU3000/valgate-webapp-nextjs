import "server-only"; // C1

// French cadastral parcels (the official land registry) for the point the user points at.
//
// Two public sources, two jobs, no key and no account for either:
//   - vector tiles  https://openmaptiles.data.gouv.fr/data/cadastre/{z}/{x}/{y}.pbf
//     drawn by the client for HOVER. Free, CORS-open, hit-tested in the browser.
//   - APICarto      https://apicarto.ign.fr/api/cadastre/parcelle?geom=Point
//     called HERE, once, when the user commits — it returns the exact parcel polygon.
//
// Why not tiles for both: tile geometry is clipped to the tile edge, so a parcel straddling a
// boundary arrives as a partial ring. Fine for a highlight, wrong for the stored boundary.
//
// Licensing: Etalab / Licence Ouverte 2.0 (DINUM + IGN). Attribution is required and is set on the
// tile source so it renders automatically.
// Measured live 2026-09-30: tile 200 @ z13/z15; APICarto 200 with a 335-point MultiPolygon for
// 2.3376,48.8606; empty feature set for Phnom Penh (a normal "no parcel", not an error).
//
// ponytail: the tile layer's `id` field and APICarto's `idu` were verified identical in format
// ('75101000AJ0002'), so the parcel you hover and the parcel you store are the same key. Nothing
// in this file depends on that being true — the server never trusts the client's id — so if a
// future dataset diverges, only the hover label is affected.

/** A cadastral parcel: the official identity plus its exact geometry. */
export type CadastralParcel = {
  /** National parcel id, e.g. '75101000AJ0002'. */
  idu: string;
  section: string | null;
  numero: string | null;
  /** Commune name, e.g. 'Paris'. */
  commune: string | null;
  codeInsee: string | null;
  /** The parcel's OFFICIAL area in m², as recorded by the cadastre. */
  contenanceM2: number | null;
  /** GeoJSON Polygon | MultiPolygon, [lng, lat] positions. */
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: unknown[] };
};

const APICARTO = "https://apicarto.ign.fr/api/cadastre/parcelle";
const SOURCE = "https://openmaptiles.data.gouv.fr/data/cadastre/{z}/{x}/{y}.pbf";

/** Tile template for the client's hover layer. Kept beside the API call they pair with. */
export const CADASTRE_TILE_URL = SOURCE;

// France coverage (and the reason a coarse bbox is fine) lives in lib/geo/france.ts: the map needs
// the same test in the browser to decide whether to add the layer at all.

/**
 * The parcel containing a point, or null when there is none.
 *
 * `null` is a normal answer (ocean, farmland, outside France) and the caller renders it as "no
 * parcel here" — not an error. An upstream failure throws, because that IS an error and must not
 * be silently shown to the user as "this land is unregistered".
 */
export async function parcelAtPoint(
  lng: number,
  lat: number,
): Promise<CadastralParcel | null> {
  const geom = JSON.stringify({ type: "Point", coordinates: [lng, lat] });
  const url = `${APICARTO}?geom=${encodeURIComponent(geom)}&_limit=1`;

  const res = await fetch(url, {
    // Measured: this endpoint answered in 1.0–2.5 s across three live calls, so a 4 s leash failed
    // real clicks under load (observed 500s while the same query succeeded on retry). The user is
    // waiting on ONE deliberate click, not a per-frame call, so patience is cheap here.
    //
    // ponytail: 9 s, above every measurement but inside a serverless default. Lower it only with
    // latency data; the failure it prevents is a user-visible "could not reach" on a good network.
    signal: AbortSignal.timeout(9000),
    headers: {
      Accept: "application/json",
      // Identifying ourselves is data.gouv.fr etiquette. Being a good citizen on a free API is
      // what keeps it free.
      "User-Agent": "Valgate/1.0 (+https://www.valgate.co)",
    },
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`APICarto responded ${res.status}`);

  const body = (await res.json()) as {
    features?: Array<{
      geometry?: unknown;
      properties?: Record<string, unknown>;
    }>;
  };

  const f = body.features?.[0];
  if (!f?.geometry) return null;

  const geometry = f.geometry as CadastralParcel["geometry"];
  if (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon") return null;

  const p = f.properties ?? {};
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

  // `idu` is the stable key; without it the parcel cannot be cited back to the user or stored as
  // provenance, so treat its absence as "no usable parcel" rather than inventing one.
  const idu = str(p.idu);
  if (!idu) return null;

  return {
    idu,
    section: str(p.section),
    numero: str(p.numero),
    commune: str(p.nom_com),
    codeInsee: str(p.code_insee),
    contenanceM2: num(p.contenance),
    geometry,
  };
}
