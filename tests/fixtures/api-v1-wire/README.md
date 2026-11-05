# API v1 wire fixtures

Generated offline from typed service-domain inputs through the real exports in
`lib/api/v1/dto.ts`. Do not hand-edit the JSON. No DB, environment file, secrets,
or network is needed.

```sh
npm run wire:export
npm test -- tests/api-v1-wire-fixtures.test.ts
npm run wire:sync
```

Review JSON diffs before accepting a mapper change. The test compares both parsed
JSON and exact bytes, and rejects missing or extra JSON files. Object keys are
sorted recursively; array order is retained. Dates in DTO fields use fixed epoch
values, and document expiry is mapped with the clock pinned to 1700000000000 ms.
There is no export-time timestamp. Importing the exporter does not write files.

Cross-checked against iOS `Sources/ValgateiOS/Models/` and
`Tests/ValgateiOSTests/PropertyDtoDecodingTests.swift`:

| Fixtures | iOS decoder |
| --- | --- |
| `property-list*.json` | `PropertyListItemDto` |
| `property-detail*.json` | `PropertyDetailDto` |
| `properties-page*.json` | `PropertiesPageDto` |
| `me*.json` | `MeDto` |
| `document-list*.json` | `DocumentListItemDto` |
| `documents-page*.json` | `DocumentsPageDto` |
| `property-valuation.json` | `PropertyValuationDto` |
| `valuations-page*.json` | `ValuationsPageDto` |
| `rental-summary*.json` | `PortfolioRentalSummaryDto` |

The `-null` variants retain the real mapper behavior: uncollected prices, currency,
cover photos, and display names are explicit nulls; undefined optional property
and document fields are omitted. Coordinates and required detail fields remain
present. No spec-permitted nulls are invented for non-nullable mapper inputs.

There is no page mapper. Page fixtures use the routes' literal `{ items,
nextCursor }` envelope, real item mappers, and `lib/pagination/cursor.ts`'s encoder.
Both non-null cursors and terminal pages are included. Envelope changes in route
handlers remain the responsibility of their existing route tests. DTOs mapped
outside `dto.ts` (ownership, property rental, payments, address, storage tickets)
are outside this fixture set.

Sync defaults to `../../../valgate-ios` relative to the web repo root. It creates
`Fixtures/api-v1/` only under an existing `Tests/ValgateiOSTests/`. For worktrees:

```sh
npm run wire:sync -- /path/to/valgate-ios-worktree
```

`FIXTURES.rev` is always written locally and copied with the JSON when the iOS test
directory exists. Its first line is `web-sha=<short HEAD>`; remaining lines are
`<sha256> <filename>` in filename order. The SHA identifies HEAD, so uncommitted
fixture changes are identified by the individual hashes. Run sync again after
re-exporting. An absent iOS checkout is a successful local-only sync.
