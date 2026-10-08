import { describe, it, expect } from "vitest";
import { searchAddress, reverseGeocode } from "@/lib/services/address";

// ---------------------------------------------------------------------------
// LIVE GrabMaps check — real AWS call, no mocks. Runs in the *.db.test.ts lane because that config
// loads .env.local (the unit lane blanks STORAGE_* to prevent network calls, so a "live" test there
// would silently exercise nothing).
//
// Proves the two things the wizard's pin/name features depend on:
//   1. A BUILDING NAME query returns the name in `title` (not just the street) — the whole point of
//      "search by property name". If GrabMaps stops populating Title, the pick list silently
//      degrades to street-only again.
//   2. A coordinate resolves back to an address, which is what makes the draggable pin useful.
//
// Needs: STORAGE_ACCESS_KEY_ID / STORAGE_SECRET_ACCESS_KEY in .env.local with
// geo-places:SearchText + geo-places:ReverseGeocode on arn:aws:geo-places:ap-southeast-1::provider/default
//
// Skips when credentials are absent: CI's db job has DATABASE_URL but no AWS keys, and a hard failure
// there would be an environment problem masquerading as a code regression.
// ---------------------------------------------------------------------------
const hasGeoCreds = !!process.env.STORAGE_ACCESS_KEY_ID && !!process.env.STORAGE_SECRET_ACCESS_KEY;

describe.skipIf(!hasGeoCreds)("GrabMaps address service (live)", () => {
  it("returns the building name in `title` for a name query", async () => {
    const hits = await searchAddress("J Tower 2");
    expect(hits.length).toBeGreaterThan(0);
    const named = hits.filter((h) => /j tower/i.test(h.title ?? ""));
    // If this fails, `title` stopped carrying the POI name and the pick list is street-only.
    expect(named.length).toBeGreaterThan(0);
    // Positions must come back in the same hop — the wizard cannot pin without them.
    for (const h of hits) expect(h.position).toHaveLength(2);
  });

  it("resolves a coordinate back to an address", async () => {
    // J Tower 2 / BKK1 area. Street-level precision is the documented ceiling.
    const hit = await reverseGeocode([104.9239, 11.5454]);
    expect(hit).not.toBeNull();
    expect(hit!.street ?? hit!.title).toBeTruthy();
    expect(hit!.position).toHaveLength(2);
  });
});
