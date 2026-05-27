# Mapbox Backend Integration Guide

## Overview

The map UI reads properties through `lib/data/properties.ts` → `lib/mock-data.ts` today. This guide documents how to swap in **Neon-backed** data and add server-side geocoding.

**Do not** wire maps to Convex — `convex/` is legacy. Persist coordinates on property/location tables in Postgres (see [`docs/database/prototype/schema.sql`](./database/prototype/schema.sql)).

---

## Swapping mock data for Neon

The data layer is abstracted through `lib/data/properties.ts`. The swap happens in one place:

```ts
// lib/data/properties.ts — current (mock)
import { properties, type Property } from "@/lib/mock-data";

export type { Property } from "@/lib/mock-data";

export async function getProperties(orgId: string): Promise<Property[]> {
  return structuredClone(properties);
}

// lib/data/properties.ts — future (Neon)
import { db } from "@/lib/db";
import type { Property } from "@/lib/data/property-types";

export async function getProperties(orgId: string): Promise<Property[]> {
  return db.query(/* SELECT lat, lng, … FROM properties WHERE org_id = $1 */, [orgId]);
}
```

Store coordinates in Postgres (prototype: `lat` / `lng` on `properties`, or a normalized `property_locations` table when the schema is split). Use **PostGIS** for boundaries/parcels when you move beyond point markers.

---

## Server-side geocoding

Use a **secret token** server-side only. Never expose it to the client.

```bash
# .env.local
MAPBOX_SECRET_TOKEN=sk.xxx              # server only
NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx         # client — read-only scopes
DATABASE_URL=postgresql://...         # Neon
```

Place geocoding in a **Server Action**:

```ts
// actions/property.actions.ts
"use server";

import { z } from "zod";
import { auth } from "@clerk/nextjs/server";

const geocodeSchema = z.object({ address: z.string().min(1) });

export async function geocodeAddress(input: unknown) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) throw new Error("Unauthorized");

  const { address } = geocodeSchema.parse(input);
  const token = process.env.MAPBOX_SECRET_TOKEN;
  if (!token) throw new Error("Server misconfigured");

  const res = await fetch(
    `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(address)}&access_token=${token}`,
    { next: { revalidate: 86400 } },
  );

  if (!res.ok) throw new Error("Geocoding failed");
  const data = await res.json();
  const [lng, lat] = data.features[0]?.geometry.coordinates ?? [];
  if (lat == null || lng == null) throw new Error("No results");

  // TODO(neon): UPDATE property_locations SET lat, lng WHERE …
  return { lat, lng };
}
```

---

## How `queries.ts` abstracts the data source

`app/(shell)/queries.ts` imports from `lib/data/properties.ts`. When you switch to Neon, only **`lib/data/properties.ts`** and **`lib/db`** need to change — `MapView`, `HomePage`, and map components stay the same.

```
lib/mock-data.ts              ← remove when Neon seeded
lib/data/properties.ts        ← single change point (SQL)
app/(shell)/queries.ts        ← getHomePageData() → getProperties(orgId)
components/map/MapView.tsx      ← pure UI, receives Property[]
docs/database/prototype/schema.sql  ← canonical columns
```

---

## Token security checklist

| Concern | Action |
|---|---|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Read-only scopes: `styles:read`, `fonts:read`, `tiles:read` |
| URL restrictions | Restrict to your app domain(s) in Mapbox Dashboard |
| `MAPBOX_SECRET_TOKEN` | Server Actions only — never `NEXT_PUBLIC_` |
| Per-environment tokens | Dev, staging, and prod each use separate tokens |
| Token rotation | Rotate if accidentally committed or exposed |

---

## Related docs

- [`docs/mock-to-backend-pattern.md`](./mock-to-backend-pattern.md)
- [`AGENTS.md`](../AGENTS.md) · [`.cursor/rules/neon-database.mdc`](../.cursor/rules/neon-database.mdc)
