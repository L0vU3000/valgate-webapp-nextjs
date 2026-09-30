/**
 * Where Valgate can read parcel boundaries from, per country.
 *
 * `served` — whether we can load this source TODAY. Every `served: true` below
 * was exercised against the provider on 30 Sep 2026 and returned real parcel
 * data as a source Mapbox GL can consume. Those are the only countries the
 * landing globe marks and labels; everything else stays unmarked context.
 *
 * Verified working (12): France, Netherlands, Spain, Austria, Switzerland,
 *   Germany (Berlin), Singapore, and Australia's NSW/VIC/QLD/TAS, plus Canada BC.
 * Verified NOT working yet: Czechia (host did not answer), Italy (its WMS serves
 *   only EPSG:6706, not Web Mercator, so it needs bulk files), and the ACT,
 *   Brazil and Japan bulk feeds, which nobody has exercised.
 * Free-with-an-account countries all need keys we do not hold at all, so none of
 *   them are served.
 *
 * `tier`    — how open the register is. Drives the order of the coverage list.
 * `pattern` — how the boundaries reach the map, i.e. what adding a property
 *             there costs us:
 *               tiles    — third-party vector tiles, add as a Mapbox source
 *               raster   — WMS / ArcGIS export overlay, picture only
 *               pipeline — bulk download we tile ourselves (Mapbox Tiling Service)
 *               manual   — no source we may use; the pin and drawn outline
 *                          carry the location
 * `short`   — the globe label, when the country needs an abbreviation or is a
 *             subdivision. Defaults to the upper-cased id.
 */

export const coverageTiers = {
  open: {
    label: "Open data",
    summary: "Free open licence, no account. The boundary fills itself in.",
    color: [5, 150, 105], // status/success
  },
  account: {
    label: "Free with an account",
    summary: "Free, but a key, sign-up or review comes first.",
    color: [245, 158, 11], // status/warning
  },
  paid: {
    label: "Licence required",
    summary: "Paid, or approved case by case.",
    color: [139, 92, 246], // chart-5
  },
  none: {
    label: "No parcel data",
    summary: "Nothing we may use. Add by pin, then draw the outline.",
    color: [172, 180, 188], // text/disabled
  },
} as const;

export type CoverageTier = keyof typeof coverageTiers;

export const patternLabels = {
  tiles: "Vector tiles",
  raster: "Map overlay",
  pipeline: "Our own tiles",
  manual: "Pin or drawn",
} as const;

export type CoveragePattern = keyof typeof patternLabels;

export interface ParcelCoverage {
  id: string;
  name: string;
  lat: number;
  lng: number;
  tier: CoverageTier;
  pattern: CoveragePattern;
  /** We can load this source today. Verified against the provider. */
  served: boolean;
  note: string;
  /** Globe label. Falls back to the upper-cased id. */
  short?: string;
}

export const parcelCoverage: ParcelCoverage[] = [
  // ── Open data ──────────────────────────────────────────────────────────────
  { id: "fr", name: "France", lat: 46.6, lng: 2.2, tier: "open", pattern: "tiles", served: true, short: "France", note: "Parcels, buildings and sections from zoom 11. Refreshed quarterly." },
  { id: "nl", name: "Netherlands", lat: 52.13, lng: 5.29, tier: "open", pattern: "tiles", served: true, short: "Netherlands", note: "Vector tiles serve zoom 17 only. Refreshed daily." },
  { id: "es", name: "Spain", lat: 40, lng: -3.7, tier: "open", pattern: "raster", served: true, short: "Spain", note: "INSPIRE WMS, Web Mercator. Kept current." },
  { id: "at", name: "Austria", lat: 47.6, lng: 14.1, tier: "open", pattern: "raster", served: true, short: "Austria", note: "Parcels and land use. Twice-yearly snapshot." },
  { id: "cz", name: "Czechia", lat: 49.8, lng: 15.5, tier: "open", pattern: "raster", served: false, short: "Czechia", note: "Parcel boundaries and numbers. Host did not answer our check." },
  { id: "ch", name: "Switzerland", lat: 46.8, lng: 8.2, tier: "open", pattern: "raster", served: true, short: "Switzerland", note: "Cantonal cadastral map, Web Mercator. Serves a city, not a whole canton." },
  { id: "it", name: "Italy", lat: 42.8, lng: 12.5, tier: "open", pattern: "pipeline", served: false, short: "Italy", note: "Bulk files twice a year. Its live service is not Web Mercator." },
  { id: "de", name: "Germany", lat: 51.2, lng: 10.4, tier: "open", pattern: "raster", served: true, short: "Germany", note: "One service per state. Berlin confirmed, 14 states unchecked." },
  { id: "ca-bc", name: "Canada · British Columbia", lat: 53.7, lng: -127.6, tier: "open", pattern: "raster", served: true, short: "BC", note: "Parcels refreshed weekly, Web Mercator confirmed." },
  { id: "sg", name: "Singapore", lat: 1.35, lng: 103.82, tier: "open", pattern: "pipeline", served: true, short: "Singapore", note: "The whole cadastral map as one 138 MB file, weekly." },
  { id: "au-nsw", name: "Australia · New South Wales", lat: -33.9, lng: 151.2, tier: "open", pattern: "raster", served: true, short: "NSW", note: "ArcGIS parcels, lots and plan extents. Kept current." },
  { id: "au-vic", name: "Australia · Victoria", lat: -37.8, lng: 145, tier: "open", pattern: "raster", served: true, short: "VIC", note: "WMS and WFS parcel polygons. Updated continuously." },
  { id: "au-qld", name: "Australia · Queensland", lat: -22.6, lng: 144.3, tier: "open", pattern: "raster", served: true, short: "QLD", note: "ArcGIS parcels with lot, plan and area. Weekly." },
  { id: "au-tas", name: "Australia · Tasmania", lat: -42, lng: 147, tier: "open", pattern: "raster", served: true, short: "TAS", note: "ArcGIS parcels, volume and folio. Bulk twice yearly." },
  { id: "au-act", name: "Australia · ACT", lat: -35.5, lng: 149.1, tier: "open", pattern: "pipeline", served: false, short: "ACT", note: "Block boundaries. Licence wording to confirm." },
  { id: "br", name: "Brazil", lat: -14.2, lng: -51.9, tier: "open", pattern: "pipeline", served: false, short: "Brazil", note: "Certified rural properties by state. Source server often down." },
  { id: "jp", name: "Japan", lat: 36.2, lng: 138.2, tier: "open", pattern: "pipeline", served: false, short: "Japan", note: "Registry office maps, yearly edition." },

  // ── Free with an account ───────────────────────────────────────────────────
  { id: "nz", name: "New Zealand", lat: -41.3, lng: 174.8, tier: "account", pattern: "raster", served: false, short: "New Zealand", note: "Raster tiles on a free LINZ key. Weekly." },
  { id: "dk", name: "Denmark", lat: 56, lng: 10, tier: "account", pattern: "raster", served: false, short: "Denmark", note: "Free token rides on every request; keep it server-side." },
  { id: "se", name: "Sweden", lat: 62, lng: 15, tier: "account", pattern: "pipeline", served: false, short: "Sweden", note: "Boundaries fee-free since Feb 2025. Map services still paid." },
  { id: "no", name: "Norway", lat: 61, lng: 8.5, tier: "account", pattern: "raster", served: false, short: "Norway", note: "Licence differs per dataset." },
  { id: "pl", name: "Poland", lat: 52.1, lng: 19.4, tier: "account", pattern: "raster", served: false, short: "Poland", note: "National WMS and parcel lookup. Bulk held by county offices." },
  { id: "gb", name: "United Kingdom · England & Wales", lat: 52.5, lng: -2, tier: "account", pattern: "pipeline", served: false, short: "UK", note: "Account to download index polygons. Commercial reuse is limited." },
  { id: "kr", name: "South Korea", lat: 36.5, lng: 127.8, tier: "account", pattern: "raster", served: false, short: "South Korea", note: "Free API key, bound to our domain." },
  { id: "us", name: "United States", lat: 39.8, lng: -98.6, tier: "account", pattern: "pipeline", served: false, short: "United States", note: "3,000+ county portals, terms vary. National tiles are paid." },
  { id: "be", name: "Belgium", lat: 50.5, lng: 4.5, tier: "account", pattern: "raster", served: false, short: "Belgium", note: "Cadastral map, yearly edition. Service listing to confirm." },
  { id: "fi", name: "Finland", lat: 64, lng: 26, tier: "account", pattern: "raster", served: false, short: "Finland", note: "INSPIRE parcel service. Endpoint to confirm." },
  { id: "ee", name: "Estonia", lat: 58.6, lng: 25, tier: "account", pattern: "raster", served: false, short: "Estonia", note: "INSPIRE parcel service. Endpoint to confirm." },
  { id: "si", name: "Slovenia", lat: 46.1, lng: 14.8, tier: "account", pattern: "raster", served: false, short: "Slovenia", note: "INSPIRE parcel service. Endpoint to confirm." },
  { id: "sk", name: "Slovakia", lat: 48.7, lng: 19.7, tier: "account", pattern: "raster", served: false, short: "Slovakia", note: "INSPIRE parcel service. Endpoint to confirm." },
  { id: "co", name: "Colombia", lat: 4.6, lng: -74.1, tier: "account", pattern: "raster", served: false, short: "Colombia", note: "Cadastral parcel service. Endpoint to confirm." },

  // ── Licence required ───────────────────────────────────────────────────────
  { id: "au-sa", name: "Australia · South Australia", lat: -30, lng: 135.9, tier: "paid", pattern: "raster", served: false, short: "SA", note: "Quoted per purpose, from A$250." },
  { id: "au-wa", name: "Australia · Western Australia", lat: -25, lng: 122, tier: "paid", pattern: "raster", served: false, short: "WA", note: "Landgate subscription licence, paid. Daily." },
  { id: "au-nt", name: "Australia · Northern Territory", lat: -19.5, lng: 133, tier: "paid", pattern: "pipeline", served: false, short: "NT", note: "Closed. Access by agreement and fee." },
  { id: "my", name: "Malaysia", lat: 4.2, lng: 102, tier: "paid", pattern: "pipeline", served: false, short: "Malaysia", note: "Digital cadastral lots sold per purchase." },

  // ── No parcel data ─────────────────────────────────────────────────────────
  { id: "kh", name: "Cambodia", lat: 11.55, lng: 104.92, tier: "none", pattern: "manual", served: false, short: "Cambodia", note: "No open register. The pin and the drawn boundary carry the location." },
  { id: "th", name: "Thailand", lat: 15.87, lng: 100.99, tier: "none", pattern: "manual", served: false, short: "Thailand", note: "Public viewer only. No reuse licence." },
  { id: "id", name: "Indonesia", lat: -2.5, lng: 118, tier: "none", pattern: "manual", served: false, short: "Indonesia", note: "Public viewer only. No download or API." },
  { id: "vn", name: "Vietnam", lat: 14.06, lng: 108.28, tier: "none", pattern: "manual", served: false, short: "Vietnam", note: "Province-by-province lookups. No national map." },
];

/** The tier-coloured swatches in the coverage list. */
export const coverageByTier = (Object.keys(coverageTiers) as CoverageTier[]).map((tier) => ({
  tier,
  countries: parcelCoverage.filter((entry) => entry.tier === tier),
}));

/** Marker colours as CSS colours. Channel values are 0–255, ready for `rgb()`. */
export const tierColor = (tier: CoverageTier) => `rgb(${coverageTiers[tier].color.join(" ")})`;
