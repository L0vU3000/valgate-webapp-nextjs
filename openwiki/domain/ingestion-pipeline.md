# Ingestion Pipeline

Valgate's ingestion pipeline lets users import property data from two sources — **AI document scanning** and **bulk spreadsheet import** — through a unified flow that extracts, reviews, and persists 14 entity types in a single pass.

## Pipeline Architecture

```
Upload (file or spreadsheet)
    ↓
┌─────────────────────────────────────┐
│  Extraction Layer                    │
│  • Document scan: AI vision model     │
│  • Spreadsheet: AI column mapping     │
│  Output: IngestionCandidate<T>[]     │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  Review Layer (client)               │
│  • IngestionReview component         │
│  • Editable table with validation    │
│  • Issues + confidence display       │
│  • Property picker for cross-entity  │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  Persistence Layer                   │
│  • persistCandidates<T>() generic    │
│  • Per-row create, partial success   │
│  • IDOR check + org scoping          │
└─────────────────────────────────────┘
```

## Shared Types

**Source:** `/lib/services/ingestion/types.ts`

The pipeline is generic over entity type `T`. Every data source produces `IngestionCandidate<T>[]`:

```typescript
type IngestionCandidate<T> = {
  id: string;
  entity: T;
  source: IngestionSource;    // { type: "spreadsheet" | "scan", sheet?, row?, fileName? }
  issues: IngestionIssue[];   // { field, severity: "error"|"warning", message }
  confidence: "high" | "low";
};
```

**14 entity types** (defined as `EntityType` union):
`properties`, `tenants`, `valuations`, `leases`, `payments`, `expenses`, `coOwners`, `maintenance`, `inspections`, `certifications`, `safetyRisks`, `emergencyContacts`, `successors`, `landParcels`.

## Document Scanning (AI Vision)

**Source:** `/lib/services/document-scan.ts`

Uses AI vision models to extract property data from scanned documents (title deeds, leases, sale agreements, etc.).

- **Schema**: `ExtractedPropertySchema` — all fields nullable (model returns null for anything not clearly stated, never guesses)
- **Prompt**: Instructs the model to extract property details, translate non-English text (Khmer), return digits only for numerics
- **Swappable model**: `SCAN_MODEL` env var selects the model. `"claude"` prefix → Anthropic; everything else → OpenAI. Default: `gpt-5.6-terra`
- **Self-consistency**: Multiple extractions are run and reconciled via `reconcileExtractions()` (`/lib/services/reconcile-extractions.ts`) — majority voting across extractions for higher confidence

**API entry point:** `/app/api/add-property/scan/route.ts` — accepts file upload, calls scan service, returns extracted data.

## Spreadsheet Import (AI Column Mapping)

**Source:** `/lib/services/unified-extract.ts`

The core of the unified ingestion pipeline. Uses `generateObject` from the Vercel AI SDK with OpenAI to map spreadsheet columns to Valgate fields across all 14 entity types.

### How It Works

1. **Parse spreadsheet**: `/app/_shared/add-property/_lib/parse-spreadsheet.ts` reads the workbook into a `SheetMatrix` (multi-sheet aware)
2. **Find header rows**: `/app/_shared/add-property/_lib/extract-rows.ts` locates header rows and extracts data rows
3. **AI column mapping**: `unified-extract.ts` sends sheet structure to the AI model with `unifiedPlanSchema` — a Zod schema defining field-to-column mappings for all 14 entity types
4. **Assemble rows**: `entity-import.ts` uses the AI plan to assemble `IngestionCandidate<T>[]` per entity type
5. **Property linking**: `import-property-link.ts` matches imported entities to existing properties via `resolveProperty()`

### Key Design Decisions

- **`sources` is an array, not a record**: OpenAI's strict structured-output mode rejects `additionalProperties`/`propertyNames`. An array of `{field, sheet, column}` is strict-safe.
- **Hallucination guards**: The model maps columns by name; if no match is found, it returns null/empty — never invents data.
- **Recent fixes** (commits `194d1da2`, `e299e466`): Fixed silent spreadsheet extraction failures on multi-sheet workbooks; mapped property names to descriptive values instead of ID codes.

## Adapters

**Source:** `/lib/services/ingestion/adapters/`

Four adapters specialize extraction per data source:

| Adapter | Source |
|---|---|
| `property-scan-adapter.ts` | Document scan → property candidates |
| `property-spreadsheet-adapter.ts` | Spreadsheet → property candidates |
| `tenant-spreadsheet-adapter.ts` | Spreadsheet → tenant candidates |
| `valuation-spreadsheet-adapter.ts` | Spreadsheet → valuation candidates |

## Entity-Specific Import Services

Each entity type has a dedicated import service that handles parsing, validation, and bulk creation:

| Service | Entity | Key Functions |
|---|---|---|
| `property-import.ts` | Properties | `normalizeType`, `normalizeStatus`, `bulkCreateProperties` |
| `tenant-import.ts` | Tenants | `parseRent`, `normalizeTenantStatus`, `bulkCreateTenants` |
| `valuation-import.ts` | Valuations | `parseMonth`, `parsePrice`, `parseTimestamp`, `bulkCreateValuations` |
| `lease-import.ts` | Leases | Bulk create |
| `payment-import.ts` | Payments | Bulk create |
| `expense-import.ts` | Expenses | Bulk create |
| `co-owner-import.ts` | Co-owners | Bulk create |
| `maintenance-import.ts` | Maintenance items | Bulk create |
| `inspection-import.ts` | Inspections | Bulk create |
| `certification-import.ts` | Certifications | Bulk create |
| `safety-risk-import.ts` | Safety risks | Bulk create |
| `emergency-contact-import.ts` | Emergency contacts | Bulk create |
| `successor-import.ts` | Successors | Bulk create |
| `land-parcel-import.ts` | Land parcels | Bulk create |

## Persistence Layer

**Source:** `/lib/services/ingestion/persist.ts`

Generic `persistCandidates<T>()` function:

- Iterates candidates, calls the entity-specific `createFn` per row
- **Partial success**: one bad row never rolls back others — failures are collected as `{ row, name, reason }`
- **Max rows cap**: `MAX_IMPORT_ROWS` limits batch size
- **IDOR check**: Optional `idorCheck` function guards before create (ensures property belongs to caller's org)
- Each `createFn` internally validates through its Zod schema and enforces org scoping

## Review UI

**Source:** `/app/_shared/ingestion/IngestionReview.tsx`

Client component that renders an editable review table with:
- Column configs per entity type (`/app/_shared/ingestion/column-configs.ts`)
- Inline editing (text, select, number controls)
- Issue display (error/warning per field)
- Confidence indicators
- Property picker for cross-entity linking when AI's match fails

## Server Actions

**Source:** `/app/actions/unified-extract.ts`

The `unifiedExtractAction` server action:
1. Accepts parsed spreadsheet data
2. Calls `unifiedExtract()` in the service layer
3. Returns `PerEntityRows` — a `Record<EntityType, ReviewRow[]>` for the review UI

Separate import actions (`property-import.ts`, `tenant-import.ts`, `valuation-import.ts` in `/app/actions/`) handle the persist step after user review.

## OpenSpec Change History

The ingestion pipeline was built through several OpenSpec-tracked changes in `/openspec/changes/`:

- `bulk-import-properties` — Initial spreadsheet import for properties
- `scan-document-to-property` — AI document scanning
- `unified-document-scan` — Unified scan for all entity types
- `unified-spreadsheet-import` — Unified spreadsheet import
- `unify-ingestion-pipeline` — Final unification of scan + spreadsheet into one pipeline
- `import-all-entities` — Added remaining entity types (14 total)
