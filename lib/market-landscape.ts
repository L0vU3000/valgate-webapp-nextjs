// Market landscape around a property pin — the pure half (types, area matching, distance, mapping).
//
// Client-safe on purpose: the drawer panel needs the DTO type, and none of this touches the
// network. The fetching half is lib/services/market-landscape.ts (server-only).
//
// Source: realestate.com.kh's portal JSON (`/api/portal/pages/results/`). Measured live 2026-11-02:
//   - `search_type=sale|rent` selects the tab (`tab=` is ignored — it silently returns sale).
//   - `address_locality=<District>` filters a district, `address_line_2=<Commune>` a commune,
//     `address_subdivision=<Province>` a province; `order_by=date-desc` sorts newest first.
//   - At most 12 results per page whatever `limit` says, and no lat/lng/radius filter exists. So
//     "near the pin" is: newest 12 in the pin's commune (or district), sorted by real distance.
//   - `market.districts` lists at most 8 districts, so district medians are the portal's top 8.
//   - Most listings carry a PLACEHOLDER location, not the property's: 6–11 of every 12 sat on the
//     same point per district (11.55,104.91667 for Meanchey, 13.33333,103.83333 for Siem Reap).
//     Those keep their row but get no coordinates and no distance — never a made-up one.

/** One tab's area statistics, straight from the portal's `market` block (USD). */
export type TabStats = {
  total: number;
  median: number;
  p20: number;
  p80: number;
  sqmMedian: number | null;
  currency: string;
};

export type LandscapeListing = {
  id: number;
  tab: "sale" | "rent";
  headline: string;
  address: string;
  /** null when the portal only has an approximate location (see isApproximateCoordinate). */
  lat: number | null;
  lng: number | null;
  distanceM: number | null;
  priceLabel: string | null;
  pricePerSqmLabel: string | null;
  imageUrl: string | null;
  /** Absolute realestate.com.kh link. */
  url: string;
};

/**
 * Market landscape data, also served by GET /api/v1/properties/{id}/market-landscape.
 *
 * `coverage` other than "ok" means every data field is empty: "disabled" (feature switched off),
 * "unsupported" (pin outside Cambodia), "unmatched" (no pin or known district).
 * "unavailable" (coordinate lookup failed) is internal-only and mapped to 502 at the v1 boundary.
 */
export type MarketLandscapeDTO = {
  coverage: "ok" | "unmatched" | "unsupported" | "disabled" | "unavailable";
  area: {
    district: string;
    commune: string | null;
    province: string;
    /** Name of the area the listings came from — the commune, or the district as a fallback. */
    listingsArea: string;
  } | null;
  stats: { sale: TabStats | null; rent: TabStats | null };
  /** The province's top districts by listing count (sale), as the portal reports them. */
  districtMedians: { name: string; count: number; median: number }[];
  listings: LandscapeListing[];
  source: { name: "realestate.com.kh"; url: string; fetchedAt: string };
};

export const PORTAL_ORIGIN = "https://www.realestate.com.kh";
export const LISTINGS_CAP = 12;

export function emptyLandscape(coverage: MarketLandscapeDTO["coverage"]): MarketLandscapeDTO {
  return {
    coverage,
    area: null,
    stats: { sale: null, rent: null },
    districtMedians: [],
    listings: [],
    source: { name: "realestate.com.kh", url: PORTAL_ORIGIN, fetchedAt: new Date().toISOString() },
  };
}

/**
 * ponytail: a coarse bounding box, like lib/geo/france.ts. A border-adjacent Thai/Lao point costs
 * one district lookup: a successful lookup with no known district is "unmatched"; a lookup
 * failure is "unavailable" — far less code than the border.
 */
export function isInCambodia(lng: number, lat: number): boolean {
  return lng >= 102.3 && lng <= 107.7 && lat >= 9.9 && lat <= 14.7;
}

/** Great-circle distance in metres. */
export function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * True for the portal's placeholder locations: a value with two decimals or fewer (11.55, 104.89),
 * or a point on whole arc-minutes in BOTH axes (104.91667 = 104°55'). A real GPS fix has ~14
 * decimals; hitting whole minutes on both axes by chance is a ~2 m target, so false positives only
 * hide a distance, never invent one.
 */
export function isApproximateCoordinate(lat: number, lng: number): boolean {
  const fewDecimals = (v: number) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6;
  const wholeMinute = (v: number) => Math.abs(v * 60 - Math.round(v * 60)) < 1e-3;
  return fewDecimals(lat) || fewDecimals(lng) || (wholeMinute(lat) && wholeMinute(lng));
}

// ── Area matching ────────────────────────────────────────────────────────────────────────────

/** Lower-case, drop admin prefixes and everything that isn't a letter or digit. */
export function normalizeArea(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b(khan|srok|sangkat|khum|district|commune|city)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// Portal district values verified on 2026-11-02 with scoped results queries.
// Preah Netr Preah is in the portal's Banteay Meanchey sitemap but currently has zero listings.
const DISTRICTS: Record<string, string[]> = {
  "Phnom Penh": [
    "Chamkarmon", "Daun Penh", "7 Makara", "Toul Kork", "Dangkao", "Meanchey", "Russey Keo",
    "Sen Sok", "Por Sen Chey", "Chroy Changvar", "Prek Pnov", "Chbar Ampov", "Boeng Keng Kang",
    "Kamboul",
  ],
  "Siem Reap": ["Siem Reap", "Prasat Bakong", "Sout Nikom", "Banteay Srei", "Puok", "Chi Kraeng", "Angkor Thum"],
  Kandal: ["Ta Khmau", "Angk Snuol", "Khsach Kandal", "Lvea Aem", "S'ang", "Kien Svay", "Kandal Stueng", "Mukh Kampul"],
  "Banteay Meanchey": ["Preah Netr Preah"],
  Pursat: ["Bakan", "Phnum Kravanh"],
  "Kampong Thom": ["Stoung"],
  "Kampong Speu": ["Samraong Tong", "Odongk", "Aoral", "Chbar Mon", "Thpong", "Phnum Sruoch"],
  "Kampong Cham": ["Batheay"],
  "Kampong Chhnang": ["Sameakki Mean Chey"],
  "Preah Vihear": ["Kuleaen"],
  Mondulkiri: ["Saen Monourom"],
  "Prey Veng": ["Kanhchriech"],
  "Koh Kong": ["Srae Ambel"],
  Kep: ["Damnak Chang'aeur"],
  Kampot: ["Kampot", "Tuek Chhou", "Chhuk", "Kampong Trach", "Angkor Chey", "Dang Tong"],
};

// Other romanisations of the same district (geocoders, deeds and the seed data all differ from
// the portal). Keys are normalizeArea() output; values are the portal's spelling.
export const DISTRICT_ALIASES: Record<string, string> = {
  preahnetpreah: "Preah Netr Preah",
  lveaem: "Lvea Aem",
  chamkamorn: "Chamkarmon",
  roesseykeo: "Russey Keo",
  roesseikeo: "Russey Keo",
  saang: "S'ang",
  dongkor: "Dangkao",
  stong: "Stoung",
  samraongtorng: "Samraong Tong",
  samkymeanchey: "Sameakki Mean Chey",
  uddong: "Odongk",
  senmonorom: "Saen Monourom",
  phnomsruoch: "Phnum Sruoch",
  sreambel: "Srae Ambel",
  phnomkravanh: "Phnum Kravanh",
  dounpenh: "Daun Penh",
  prampirmakara: "7 Makara",
  tuolkouk: "Toul Kork",
  tuolkork: "Toul Kork",
  toulkouk: "Toul Kork",
  dangkor: "Dangkao",
  russeikeo: "Russey Keo",
  russeykeo: "Russey Keo",
  ruesseikaev: "Russey Keo",
  saensokh: "Sen Sok",
  pousenchey: "Por Sen Chey",
  pursenchey: "Por Sen Chey",
  chrouychangvar: "Chroy Changvar",
  chroychangva: "Chroy Changvar",
  prekphnov: "Prek Pnov",
  praekpnov: "Prek Pnov",
  chbarampeou: "Chbar Ampov",
  boeungkengkang: "Boeng Keng Kang",
  beoungkengkang: "Boeng Keng Kang",
  kambol: "Kamboul",
  takhmao: "Ta Khmau",
};

// Communes whose common spelling differs from the portal's. Unlisted communes are sent as written;
// a commune the portal doesn't know returns 0 listings and the service falls back to the district.
export const COMMUNE_ALIASES: Record<string, string> = {
  chakangreleu: "Chak Angrae Leu",
  chakangrekrom: "Chak Angrae Krom",
  boeungkengkang1: "BKK 1",
  boengkengkang1: "BKK 1",
  boeungkengkang2: "BKK 2",
  boengkengkang2: "BKK 2",
  boeungkengkang3: "BKK 3",
  boengkengkang3: "BKK 3",
  tuoltumpoung1: "Toul Tum Poung 1",
  tuoltumpoung2: "Toul Tum Poung 2",
};

const PROVINCE_KEYS = new Set(Object.keys(DISTRICTS).map(normalizeArea));

const DISTRICT_INDEX = new Map<string, { district: string; province: string }>();
for (const [province, names] of Object.entries(DISTRICTS)) {
  for (const district of names) DISTRICT_INDEX.set(normalizeArea(district), { district, province });
}

/** The portal district (and its province) a free-text area name refers to, or null. */
export function matchDistrict(name: string): { district: string; province: string } | null {
  const key = normalizeArea(name);
  if (!key) return null;
  const direct = DISTRICT_INDEX.get(key);
  if (direct) return direct;
  const alias = DISTRICT_ALIASES[key];
  return alias ? (DISTRICT_INDEX.get(normalizeArea(alias)) ?? null) : null;
}

export function portalCommune(name: string): string {
  return COMMUNE_ALIASES[normalizeArea(name)] ?? name.trim();
}

export type ResolvedArea = { district: string; province: string; commune: string | null };

// A street/house part ("No. 12", "Street 106", "Peng Huot Road") is never a commune.
const STREETISH = /^(no\.?\s|#)|\b(street|st\.?|road|rd\.?|blvd|boulevard|building|floor)\b/i;

/**
 * Resolve the district (and commune) from a property's stored address text.
 *
 * Cambodian addresses run small → large ("No. 12, Street 106, Phsar Kandal 2, Daun Penh"), so the
 * district is the part that matches the vocabulary and the commune is the part just before it.
 *
 * "Siem Reap" and "Kampot" name both a province and its capital district, so such a part is read
 * as the PROVINCE when a smaller part to its left is a district of that province ("Banteay Srei,
 * Siem Reap" → district Banteay Srei), and as the district only when nothing smaller matches.
 */
export function resolveAreaFromText(fields: (string | null | undefined)[]): ResolvedArea | null {
  for (const field of fields) {
    if (!field) continue;
    const parts = field
      .replace(/\([^)]*\)/g, "")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    type Match = { i: number; hit: { district: string; province: string } };
    let provinceNamed: Match | null = null;
    let chosen: Match | null = null;
    for (let i = parts.length - 1; i >= 0 && !chosen; i--) {
      const hit = matchDistrict(parts[i]);
      if (!hit) continue;
      if (!provinceNamed && PROVINCE_KEYS.has(normalizeArea(parts[i]))) {
        provinceNamed = { i, hit };
      } else if (!provinceNamed || hit.province === provinceNamed.hit.province) {
        chosen = { i, hit };
      }
    }
    chosen ??= provinceNamed;
    if (!chosen) continue;
    const before = parts[chosen.i - 1];
    const commune = before && !STREETISH.test(before) ? portalCommune(before) : null;
    return { ...chosen.hit, commune };
  }
  return null;
}

/** Same resolution from a reverse-geocoder result (district / locality / subDistrict fields). */
export function resolveAreaFromGeocode(g: {
  district: string | null;
  locality: string | null;
  subDistrict: string | null;
}): ResolvedArea | null {
  const hit = (g.district && matchDistrict(g.district)) || (g.locality && matchDistrict(g.locality));
  if (!hit) return null;
  return { ...hit, commune: g.subDistrict ? portalCommune(g.subDistrict) : null };
}

// ── Portal response mapping ──────────────────────────────────────────────────────────────────

type Raw = Record<string, unknown>;
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

/**
 * True for a real results payload: a `results` array (empty is a legitimate empty area) and a
 * `market` block with a numeric `total`. Anything else — `{"detail":"busy"}`, an HTML error page
 * parsed by luck, a changed schema — must be an error, never shown as "no listings here".
 */
export function isPortalPayload(body: unknown): body is Raw {
  if (!body || typeof body !== "object") return false;
  const b = body as Raw;
  const market = b.market as Raw | undefined;
  return Array.isArray(b.results) && !!market && typeof market === "object" && num(market.total) !== null;
}

/** The portal's `market` block as TabStats, or null when the area has no listings. */
export function toTabStats(body: Raw): TabStats | null {
  const m = (body.market ?? {}) as Raw;
  const total = num(m.total) ?? 0;
  const median = num(m.median);
  if (total === 0 || !median) return null;
  const currency = str((m.currency as Raw | undefined)?.code)?.toUpperCase() ?? "USD";
  return {
    total,
    median,
    p20: num(m.p20) ?? median,
    p80: num(m.p80) ?? median,
    sqmMedian: num(m.sqm_median) || null,
    currency,
  };
}

export function toDistrictMedians(body: Raw): MarketLandscapeDTO["districtMedians"] {
  const rows = ((body.market as Raw | undefined)?.districts ?? []) as Raw[];
  return rows.flatMap((d) => {
    const name = str(d.name) ?? str(d.value);
    const count = num(d.count);
    const median = num(d.median);
    return name && count && median ? [{ name, count, median }] : [];
  });
}

export function toListings(body: Raw, tab: "sale" | "rent", pin: { lat: number; lng: number } | null): LandscapeListing[] {
  const results = (Array.isArray(body.results) ? body.results : []) as Raw[];
  return results.flatMap((r) => {
    const id = num(r.id);
    const lat = num(r.address_latitude);
    const lng = num(r.address_longitude);
    const path = str(r.url);
    // No coordinates means no honest distance; no url means nothing to link the user to.
    if (id === null || !path) return [];
    const precise = lat !== null && lng !== null && !isApproximateCoordinate(lat, lng) ? { lat, lng } : null;
    const images = Array.isArray(r.images) ? (r.images as Raw[]) : [];
    return [{
      id,
      tab,
      headline: str(r.headline) ?? "Listing",
      address: str(r.address) ?? "",
      lat: precise?.lat ?? null,
      lng: precise?.lng ?? null,
      distanceM: precise && pin ? Math.round(haversineM(pin, precise)) : null,
      priceLabel: tab === "sale" ? str(r.display_price) : str(r.display_rent),
      pricePerSqmLabel:
        tab === "sale" ? str(r.display_price_per_sqm_with_unit) : str(r.display_rent_per_sqm_with_unit),
      imageUrl: str(images[0]?.url),
      url: path.startsWith("http") ? path : `${PORTAL_ORIGIN}${path}`,
    }];
  });
}

/**
 * Merge sale + rent, drop duplicates (a listing can be both), nearest first, capped. Listings with
 * only an approximate location follow, in the portal's newest-first order.
 */
export function nearestListings(lists: LandscapeListing[][]): LandscapeListing[] {
  const seen = new Set<string>();
  return lists
    .flat()
    .filter((l) => {
      const key = `${l.tab}:${l.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity))
    .slice(0, LISTINGS_CAP);
}
