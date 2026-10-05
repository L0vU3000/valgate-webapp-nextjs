# Google Map Tiles — the interactive basemap

Every interactive map in the web app draws **Google Map Tiles (2D)** through **MapLibre GL**.
Mapbox is still a dependency, but only for static map images.

## Why MapLibre and not Mapbox GL

`mapbox-gl`'s licence permits use "only with the relevant Mapbox product(s)". Pointing it at
Google tiles is a licence violation, not a config change. MapLibre GL is the BSD-3-Clause fork of
the same renderer, and Google's own Map Tiles policy anticipates third-party renderers
("Display the Google Maps logo with third-party renderers").

## The key

`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — public by necessity, because the browser mints its own session
token and then fetches tiles directly. Protection is the **HTTP-referrer restriction** in Google
Cloud Console, not secrecy. Same posture as `NEXT_PUBLIC_MAPBOX_TOKEN`.

Restrictions must cover every surface, since one key serves all of them:

```
http://localhost:3001/*
http://localhost:3077/*
https://*.vercel.app/*
https://valgate.co/*
https://www.valgate.co/*
```

The key is **required** (`z.string().min(1)`), so a deploy with it missing fails the build rather
than shipping a mapless app. That is deliberate — set the key in Vercel *before* merging.

### Quota is per project, not per key

Google's cap is *"15,000 2D Tile queries per project per day"*, counted across all keys in that
project. One key shared by dev + staging + prod is therefore one shared budget: a day of local
testing can starve production. If that becomes a real problem, the fix is separate GCP
**projects**, not separate keys. Quotas can be raised by contacting Google support.

## The worker (this is the part that breaks on upgrade)

MapLibre v6 resolves its worker against `import.meta.url`. After bundling that points at the app
chunk, so the URL comes out **empty** and the worker fails with `Worker failed to load`. The map
then never fires `load`: the canvas exists and every tile returns 200, so it presents as a slow
basemap rather than a failure.

Every bundler must call, once:

```ts
setWorkerUrl("/maplibre-gl-worker.mjs");
```

Exposed as `configureWorker()` in `components/map/basemap.ts` and called at each map construction
site. The worker and its shared chunk are copied into `public/` — the same approach this repo
already uses for `pdf.worker.min.mjs`. The worker's own `./maplibre-gl-shared.mjs` import resolves
beside it.

**After any `maplibre-gl` upgrade, re-copy both files:**

```bash
cp node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs public/
cp node_modules/maplibre-gl/dist/maplibre-gl-shared.mjs public/
```

`components/map/basemap.test.ts` byte-compares both against the installed build, so a stale copy
fails the suite instead of failing silently in production.

## What Google 2D tiles cannot do

| Capability | Status |
|---|---|
| Dark basemap | Google ships no dark theme. `roadmap` is darkened with native raster paint properties; `satellite` is left undimmed on purpose. |
| 3D buildings | Impossible — tiles are **raster**, so there is no `building` source layer. `add3DBuildings` was deleted. Restoring it needs a second, vector basemap. |
| Street labels / restyling | None. Raster imagery only. |
| Clustering | Unaffected — `supercluster` is independent of the renderer. |
| Attribution | Required. Positioned bottom-left via `ATTRIBUTION_POSITION`; must not be overlapped by another logo. |

## Themes in use

- Portfolio map (`MapView`): **satellite** by default, with the existing sat/roadmap toggle.
- Property detail + location picker: **roadmap**, so light/dark mode keeps working.
- `terrain` is implemented in `basemap.ts` and needs `layerTypes: ["layerRoadmap"]`, which Google
  rejects the request without.

## Verifying it by hand

```bash
NODE_ENV= DEMO_MODE=true DEMO_ALLOW_WRITES=true \
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY= CLERK_SECRET_KEY=demo-no-clerk \
  npx next dev --turbopack -p 3078
node scripts/shot-location.mjs PROP-0002 3078 /tmp/location-shots
```

`CLERK_SECRET_KEY=demo-no-clerk` is the sentinel that makes middleware skip Clerk
(`lib/auth/clerk-check.ts`). Without it, Clerk rewrites the route to a **404** for a signed-out
request — `x-clerk-auth-reason: protect-rewrite` — which looks like a broken page but is not.

## Known gaps

- `lib/services/property-import.ts` still geocodes server-side against `api.mapbox.com`. Address
  lookup in the UI goes through `/api/v1/address/suggest` (GrabMaps); this import path does not.
- Static map images (5 call sites) remain on `api.mapbox.com/.../static`.
