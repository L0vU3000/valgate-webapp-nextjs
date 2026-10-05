import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";

// The basemap module reads a public key at call time. It is required by lib/env.ts, but these
// tests only care about the URLs and shapes built from it, so a literal is enough and keeps the
// suite runnable from a clean checkout.
vi.mock("@/lib/env", () => ({
  env: { NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: "test-google-key" },
}));

const { googleSession, basemapStyle, placeholderStyle } = await import("./basemap");

function okSession(session: string) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ session }),
  } as Response);
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("googleSession", () => {
  it("mints with the map type, and caches per theme", async () => {
    const fetchMock = vi.fn((..._args: unknown[]) => {
      void _args;
      return okSession("tok-roadmap");
    });
    vi.stubGlobal("fetch", fetchMock);

    const a = await googleSession("roadmap");
    const b = await googleSession("roadmap");

    expect(a).toBe("tok-roadmap");
    expect(b).toBe("tok-roadmap");
    // The whole point of the memo: a route mounting several maps mints once, not once each.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("createSession?key=test-google-key");
  });

  it("adds the roadmap layer for terrain, which Google rejects without it", async () => {
    const bodies: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init: RequestInit) => {
        bodies.push(String(init.body));
        return okSession("tok-terrain");
      }),
    );

    await googleSession("terrain");

    expect(JSON.parse(bodies[0])).toMatchObject({
      mapType: "terrain",
      layerTypes: ["layerRoadmap"],
    });
  });

  it("does not memoise a failure — the next mount retries", async () => {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        calls++;
        return calls === 1
          ? Promise.resolve({ ok: false, status: 403 } as Response)
          : okSession("tok-later");
      }),
    );

    await expect(googleSession("satellite")).rejects.toThrow("createSession 403");
    await expect(googleSession("satellite")).resolves.toBe("tok-later");
    expect(calls).toBe(2);
  });
});

describe("basemapStyle", () => {
  it("points raster tiles at the 2dtiles endpoint and carries attribution", () => {
    const style = basemapStyle("roadmap", false, "SES");

    const src = style.sources.google as { type: string; tiles: string[]; attribution: string };
    expect(src.type).toBe("raster");
    expect(src.tiles[0]).toContain("/v1/2dtiles/{z}/{x}/{y}");
    expect(src.tiles[0]).toContain("session=SES");
    expect(src.tiles[0]).toContain("key=test-google-key");
    // Attribution is a licence term, not decoration — a missing one is a compliance problem.
    expect(src.attribution).toMatch(/Google/);
  });

  it("darkens roadmap in dark mode, because Google ships no dark theme", () => {
    const dark = basemapStyle("roadmap", true, "SES");
    const light = basemapStyle("roadmap", false, "SES");

    const paintOf = (s: typeof dark) => s.layers[1].paint as Record<string, number> | undefined;
    expect(paintOf(dark)?.["raster-brightness-max"]).toBeDefined();
    expect(paintOf(light)).toBeUndefined();
  });

  it("leaves satellite undimmed even in dark mode", () => {
    const paint = basemapStyle("satellite", true, "SES").layers[1].paint as Record<string, number> | undefined;
    expect(paint).toBeUndefined();
  });
});

describe("placeholderStyle", () => {
  it("is a valid style with no tile request, so the map can mount before the token lands", () => {
    const style = placeholderStyle(false);
    expect(style.version).toBe(8);
    expect(Object.keys(style.sources)).toHaveLength(0);
    expect(style.layers).toHaveLength(1);
  });
});

describe("worker files in public/", () => {
  // The map's worker is served from public/, not bundled, because maplibre v6 cannot resolve its
  // own worker URL after bundling. That copy is the one thing here that can rot silently: upgrade
  // maplibre and the stale worker fails at runtime with "Worker failed to load", which looks
  // exactly like a slow basemap. Byte-comparing against node_modules turns that into a test failure.
  const pairs = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

  it.each(pairs)("%s matches the installed maplibre build", (name) => {
    const pub = readFileSync(new URL(`../../public/${name}`, import.meta.url));
    const dist = readFileSync(new URL(`../../node_modules/maplibre-gl/dist/${name}`, import.meta.url));
    expect(pub.equals(dist)).toBe(true);
  });
});
