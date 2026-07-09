# Design — bulk-import-properties

## Flow shape

A dedicated page `/add-property/import`, client-orchestrated, three stages held in one component's
state (no server round-trip between upload and mapping other than the two actions):

```
Upload (.csv/.xlsx)
   → parse in browser → { headers: string[], rows: Record<string,string>[] }   (cap 100 rows)
Map (server action, AI, ONCE)
   → mapSpreadsheetColumnsAction(headers, sampleRows[0..5])
   → { fieldMap: Record<ValgateField, sourceColumn|null>, notes }
   → apply fieldMap to ALL rows in code → candidate[]                          (deterministic)
   → geocodeAddressesAction(candidate addresses) → fill lat/lng / flag         (server, Mapbox)
Review (editable table)
   → user edits/fixes flagged rows
   → bulkCreatePropertiesAction(candidates) → { created, failures[] }          (per-row)
```

## Why map-once (AI maps the schema, code maps the rows)

The AI sees **headers + ~5 sample rows only** and returns a column→field mapping. Code applies that
mapping to every row. Consequences:

- **One AI call** regardless of 5 or 100 rows → cheap + fast + predictable cost.
- **Deterministic + inspectable** — the same sheet maps the same way twice, and the mapping is shown
  to the user ("we matched your *Purchase $* column to *Purchase price*") so they can correct it.
- Value normalization is **deterministic code**, reusing the parsers the manual wizard already uses
  (`parseCurrency`, `parseFloatSafe`, date parsing in `app/(shell)/add-property/actions.ts`). A value
  that will not parse is left blank and the row is flagged — the AI is not asked to transform 100
  rows of values (slow, non-reproducible, and it hallucinates numbers).

The AI's job is the fuzzy part (which column is which); code owns the exact part (turning `"$1.2M"`
into `1200000`).

## AI implementation

`lib/services/property-import.ts`, `server-only`, using the already-installed Vercel AI SDK:

```ts
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";           // gpt-4o-mini — the project's existing cheap model
```

- Structured output via `generateObject` with a Zod schema: for each Valgate field
  (`name`, `type`, `status`, address parts, `purchasePrice`, `currentMarketValue`, `bedrooms`, …) the
  AI returns the matching source column name or `null`.
- Prompt includes the allowed enum values for `type` and `status` so the AI can also suggest a
  value-level normalization for those (e.g. source `"House"` → `type: "residential"`).
- Reuses `env.OPENAI_API_KEY` (already used by `app/api/documents/[id]/summarize/route.ts`). If the
  key is missing, the action returns a graceful "AI mapping unavailable — map columns manually"
  result and the review table still works with an empty mapping.

## Mapping target: reuse the wizard transform

Candidates are shaped into the existing wizard `FormData`, then run through the **existing**
`mapWizardToProperty` + `fullPropertySchema` (`app/(shell)/add-property/`). This reuses the one
canonical FormData→`NewProperty` transform and its validation instead of writing a parallel one —
the review table edits the same `FormData` fields the manual wizard already knows how to validate.

## Geocoding

The existing geocoder is a **client hook** (`useGeocode`). Import needs it server-side and batched,
so add a small server helper that calls the same Mapbox endpoint
(`api.mapbox.com/geocoding/v5/mapbox.places`) with `NEXT_PUBLIC_MAPBOX_TOKEN`. One request per unique
address, sequential with a tiny concurrency cap. Failure → `lat/lng` left unset, row flagged
"needs location"; the user pins it in review or accepts the Cambodia-centroid fallback the manual
flow already uses.

## Commit semantics — per-row, partial success

`bulkCreatePropertiesAction` loops candidates: validate each through `fullPropertySchema`, then
`createProperty(ctx, input)` (already org-scoped/IDOR-safe). It does **not** wrap all rows in one
transaction — one malformed row must not roll back 99 good ones. Returns
`{ created: number, failures: { row: number, reason: string }[] }`; the review screen shows the
summary and lets the user retry only the failed rows.

## Open dependency decision — `.xlsx`

CSV is handled by `papaparse` (installed). `.xlsx` is a binary format that needs a parser — this is
**the one new dependency** and it is more than "a few lines," so it is called out rather than added
silently:

- **Recommended**: add a maintained `.xlsx` reader and parse the first sheet to rows in the browser.
- **Zero-new-dep fallback**: ship **CSV-only** for v1 and show a one-line hint — *"Exporting from
  Google Sheets or Excel? Use File → Download/Save As → CSV."* Both export CSV in one click.

Tasks below assume CSV + `.xlsx`. If you prefer zero new deps, we drop to CSV-only and the rest is
unchanged.

## Security checkpoints (CLAUDE.md)

- **Authorize**: `createProperty` authenticates + scopes to `ctx.orgId` — imported properties can
  only land in the caller's org. No cross-org path.
- **Validate**: every row passes `fullPropertySchema` before insert; raw spreadsheet strings never
  reach the DB unparsed.
- **Least exposure to AI**: only headers + a handful of sample rows are sent; no secrets, no full
  dataset.
- **Client errors**: generic strings only; real errors logged server-side.
- **Limits**: file size cap (reuse the wizard's `MAX_FILE_BYTES`), 100-row cap, surfaced in the UI.
