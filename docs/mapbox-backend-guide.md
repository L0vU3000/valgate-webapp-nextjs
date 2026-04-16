# Mapbox Backend Integration Guide

## Overview

The current implementation uses `lib/mock-data.ts` as the data source. This guide documents how to swap in real Convex-backed data and add server-side geocoding.

---

## Swapping mock data for Convex

The data layer is abstracted through `lib/data/properties.ts` (re-exports the `Property` type and the query abstraction). The swap happens in one place:

```ts
// lib/data/properties.ts — current (mock)
export { properties, type Property } from "@/lib/mock-data";

// lib/data/properties.ts — future (Convex)
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export type { Property } from "@/convex/_generated/dataModel";

export async function getProperties() {
  return fetchQuery(api.properties.list);
}
```

The `Property` interface in `lib/mock-data.ts` uses `lat`/`lng` fields. Your Convex schema should match:

```ts
// convex/schema.ts
properties: defineTable({
  name: v.string(),
  lat: v.number(),
  lng: v.number(),
  // ...other fields
})
```

---

## Server-side geocoding

For geocoding addresses to lat/lng, use a **separate secret token** server-side only. Never expose it to the client.

```bash
# .env.local
MAPBOX_SECRET_TOKEN=sk.xxx   # server-side only — never NEXT_PUBLIC_
NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx  # client-side — read-only scopes only
```

Place geocoding logic in a Server Action:

```ts
// lib/actions/property.actions.ts
"use server";

import { z } from "zod";
import { auth } from "@clerk/nextjs/server";

const geocodeSchema = z.object({ address: z.string().min(1) });

export async function geocodeAddress(input: unknown) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const { address } = geocodeSchema.parse(input);
  const token = process.env.MAPBOX_SECRET_TOKEN;

  const res = await fetch(
    `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(address)}&access_token=${token}`,
    { next: { revalidate: 86400 } } // cache 24h
  );

  if (!res.ok) throw new Error("Geocoding failed");
  const data = await res.json();
  const [lng, lat] = data.features[0]?.geometry.coordinates ?? [];
  return { lat, lng };
}
```

---

## How queries.ts abstracts the data source

`app/(shell)/queries.ts` is the only file that imports from `lib/data/properties.ts`. When you switch to Convex, only `queries.ts` and `lib/data/properties.ts` need to change — `MapView`, `HomePage`, and all UI components remain untouched.

```
lib/mock-data.ts          ← swap out
lib/data/properties.ts    ← re-export shim (single change point)
app/(shell)/queries.ts    ← calls getProperties(), formats PortfolioStats
components/map/MapView.tsx ← pure UI, receives Property[]
```

---

## Token security checklist

| Concern | Action |
|---|---|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Read-only scopes: `styles:read`, `fonts:read`, `tiles:read` |
| URL restrictions | Restrict to your app domain(s) in Mapbox Dashboard |
| `MAPBOX_SECRET_TOKEN` | Server Actions only. Never in any `NEXT_PUBLIC_` var. |
| Per-environment tokens | Dev, staging, and prod each use separate tokens |
| Token rotation | Rotate if accidentally committed or exposed |
