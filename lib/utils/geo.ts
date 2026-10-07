export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Mean Earth radius, metres — the sphere the area formula below integrates over. */
const EARTH_R = 6_378_137;

/**
 * Area of a closed ring in m², given `[lng, lat]` positions.
 *
 * Spherical excess, not a planar shoelace: over a parcel-sized ring the two agree to a fraction of a
 * percent, but the ring arrives as degrees, and treating degrees as a plane makes the answer depend on
 * latitude.
 *
 * Lives here rather than in `kmz.ts` because it is called from the CLIENT while drawing, and `kmz.ts`
 * pulls in `node:zlib` to inflate a KMZ. One formula, two callers.
 */
export function ringAreaM2(ring: number[][]): number {
  const DEG = Math.PI / 180;
  let total = 0;
  for (let i = 0; i < ring.length; i++) {
    const [lo1, la1] = ring[i];
    const [lo2, la2] = ring[(i + 1) % ring.length];
    total += (lo2 - lo1) * DEG * (2 + Math.sin(la1 * DEG) + Math.sin(la2 * DEG));
  }
  return Math.abs((total * EARTH_R * EARTH_R) / 2);
}
