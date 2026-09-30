# Land boundary (KMZ) upload — QC findings

Source: 41 KMZ files in `KMZ_Properties/`, joined to the **addy** organization (`ORG-0018`,
109 properties) in the **dev** database. All 41 boundaries are attached in dev — and since
re-run, in **production** (`ORG-0011`, "KLYP estate") as well: the migration and the backfill
were both applied there. Production still needs the feature code **deployed** before the UI
shows them; the data is in place.

Every property's boundary is stored as GeoJSON in `land_parcels.boundary`. The ring's measured
area is `land_parcels.sizeM2`; the officially-declared area stays on `properties.total_area`.
**The two numbers are both shown and never merged** — which one is authoritative is unresolved.

## The finding: two Kep parcels disagree by 90%+

| Code | Property | Declared m² | Measured m² | Difference |
|---|---|---|---|---|
| `KEP00001` | PROP-0505 | 15,514 | **1,452** | **−90.6%** |
| `KEP00007` | PROP-0507 | 4,308 | **124** | **−97.1%** |

These are the only two of 41 outside ±5%. Both are in the `Kep/` folder.

**Independent signal that this folder was never QC'd:** the other 36 files carry a
`Shape_Area` in their own KML metadata that matches the database to ±0.03%. All 5 Kep files
have an **empty `Shape_Area`**. So this is not a parsing fault on Valgate's side — the Kep
exports are incomplete at source.

**Action for the data owner:** re-export `KEP00001` and `KEP00007`, or confirm the declared
figures. Do not treat either number as correct until then.

## Everything else: a uniform +0.7%

The remaining 39 parcels measure **+0.6% to +1.1% larger** than declared. That is not a data
problem — it is the projection difference between the survey's planar area and this
implementation's spherical area (Chamberlain–Duquette). It is consistent to within 0.5
percentage points across every province, which is the signature of a method difference rather
than 39 coincidences.

So a ±5% threshold flags exactly the two real anomalies and nothing else.

## Pins were unreliable — and are now corrected

Measured against the 26 exactly-matched parcels, before this change:

- **24 of 26 pins sat outside their own boundary** (median 1.5 km from the ring's centre).
- Worst case **4,308 m**.
- `PP00013` and `PP00014` both carried Phnom Penh's default map centre
  (`12.5657, 104.991`) — **113 km** from their land.

Attaching a boundary moves the pin to the ring's centre, so `properties.lat/lng` follows the
measured geometry. The old pin values are discarded, not preserved.

**This means: do not use the old pin positions as an input to any matching or distance
calculation.** They were wrong for 24 of 26 parcels.

### Which "centre"

The first version used the *point average* of the ring's vertices. That is biased toward whichever
side has more vertices, so on a narrow plot the pin landed near an edge rather than the middle —
`PV00002` was **65 m off** the true centre on a parcel only ~58 m wide. The centre is now the
area-weighted (shoelace) centroid, and each candidate is checked to actually fall *on the land*
before it is used:

1. shoelace centre, when it is inside the ring (the common, convex case);
2. the widest inside span at the ring's centre latitude (concave parcels, where the shoelace
   centre can fall in a notch);
3. the point average, as a last resort.

Verified against the real parser on all 43 KMZs: **0 of 43 centres fall off their parcel.** Re-running
the backfill moved every pin by **1–65 m** into the middle. Both dev (`ORG-0018`) and production
(`ORG-0011`) were re-run: 41 boundaries each, 0 pins off the land.

## Guard against writing to production

`assertSafeDatabaseUrl` blocks URLs whose text looks non-dev. That check **failed on production**:
the prod Neon branch is hosted at `ep-wild-violet-aot0pvt7`, which contains none of
"prod"/"production"/"staging", so a backfill run against the live branch passed the guard. The rule
now also blocks the known production branch name.

A remote URL must NOT be treated as unsafe in general — the ordinary dev branch is hosted on Neon
too (`ep-tiny-rice-…`). The guard blocks a named production branch, not "anything remote".
`lib/db/assert-safe-database-url.test.ts` covers both directions.

## The join

41 of 41 files resolve to a property. Two tiers, both verified against the database:

- **26 by exact document code** — the KMZ filename *is* the code in the sheet, and that code
  is in the property's name (`"KPS00002 — Land, …"`).
- **15 by last-4 digits + province folder** — the same parcel filed under a different survey
  prefix, e.g. `08130701-1212` is `08060101-1212` in the sheet (`KD00005`). The 5 bare Kep
  filenames (`0828` → `23010307-0828` → `KEP00006`) resolve the same way.

The resolved mapping is checked in at `scripts/data/kmz-join.json` so it can be reviewed
rather than re-derived. **The production upload path does no guessing** — it matches the
filename exactly, or the user picks the property.

## Reproduce

```bash
# dry run — prints the join, area diff and pin shift for every file
npm run boundary:backfill -- --dir "/path/to/KMZ_Properties" --org ORG-0018

# write (dev only; the script refuses a prod/staging-looking DATABASE_URL)
npm run boundary:backfill -- --dir "/path/to/KMZ_Properties" --org ORG-0018 --write
```

Idempotent: re-running reports 41 attached, 0 duplicates, and pins "unchanged".
