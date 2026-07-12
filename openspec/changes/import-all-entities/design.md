# Design — import-all-entities

## Architecture: one call, one apply

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  UPLOAD + PARSE (client-side, instant)                                      │
│  parseWorkbook(file) → SheetMatrix[]                                        │
└──────────┬──────────────────────────────────────────────────────────────────┘
           │
           ▼ sheet previews (name + headers + 3 sample rows)
┌─────────────────────────────────────────────────────────────────────────────┐
│  ONE AI CALL (gpt-4o-mini, ~5s)                                             │
│  extractAll(previews) → UnifiedPlan                                         │
│                                                                             │
│  The model sees ALL sheets at once. For each of 14 Valgate entity types,    │
│  it returns: null (not found) OR { sheet, sources: { field→column }, joins }│
│                                                                             │
│  One prompt. One schema. One response. No detection step. No per-tab calls. │
└──────────┬──────────────────────────────────────────────────────────────────┘
           │
           ▼ UnifiedPlan
┌─────────────────────────────────────────────────────────────────────────────┐
│  APPLY (server-side, deterministic, instant)                                │
│  applyPlan(sheets, plan, ctx)                                               │
│                                                                             │
│  For each entity type with a non-null plan:                                 │
│    1. extractRows(sheet, headerRow) → header-keyed rows                     │
│    2. assembleRows (apply sources + joins) → field-keyed rows               │
│    3. toCandidate(row) → normalized candidate (parse numbers, coerce enums) │
│    4. resolveProperty(candidate, orgProperties) → propertyId linkage        │
│    5. Convert to ReviewRow[]                                                │
│                                                                             │
│  Returns Record<EntityType, ReviewRow[]> — all tabs populated.              │
└──────────┬──────────────────────────────────────────────────────────────────┘
           │
           ▼ all tabs populated
┌─────────────────────────────────────────────────────────────────────────────┐
│  REVIEW (client-side, instant)                                              │
│  Tab bar: [Properties (12)] [Tenants (8)] [Leases (5)] [Payments (40)] …    │
│  Each tab: IngestionReview with entity's column config                      │
│  User reviews, edits, commits per-tab or "Import everything"                │
└─────────────────────────────────────────────────────────────────────────────┘
```

## The unified extraction schema

One Zod schema, one nullable `EntityPlan` per entity type. The model returns null for any entity
type it doesn't find — so a properties-only workbook returns a plan with `properties: {...}` and
everything else `null`.

```ts
const joinSchema = z.object({
  sheet: z.string(),
  joinColumn: z.string(),
  primaryColumn: z.string(),
});

const entityPlanSchema = z.object({
  sheet: z.string().describe("Sheet name that holds this entity's register"),
  sources: z.record(z.string(), z.string())
    .describe("Map of Valgate field name → source column header in the sheet"),
  joins: z.array(joinSchema).optional()
    .describe("Cross-sheet joins, if fields come from other sheets"),
}).nullable();

const unifiedPlanSchema = z.object({
  properties: entityPlanSchema,
  tenants: entityPlanSchema,
  valuations: entityPlanSchema,
  leases: entityPlanSchema,
  payments: entityPlanSchema,
  expenses: entityPlanSchema,
  coOwners: entityPlanSchema,
  maintenance: entityPlanSchema,
  inspections: entityPlanSchema,
  certifications: entityPlanSchema,
  safetyRisks: entityPlanSchema,
  emergencyContacts: entityPlanSchema,
  successors: entityPlanSchema,
  landParcels: entityPlanSchema,
});
```

### Why `z.record` for sources (not a fixed schema per entity)

Each entity has different fields. Using `z.record(field, column)` instead of a fixed per-entity
schema means **one schema covers all 14 types** — no 14 separate Zod objects, no schema
maintenance when fields change. The cost is that hallucinated field names aren't caught at the
Zod level — but `applyPlan` validates each source against the entity's `FieldSpec[]` and drops
unknown fields. This is the same trade-off the existing `planFieldSources` makes with its dynamic
schema.

### Prompt structure

```
You are migrating a client's spreadsheet workbook into Valgate, a property management platform.

Valgate tracks 14 entity types. For each one, look through the workbook's sheets and determine
whether a sheet contains a register of that entity (one row per record). If found, return:
- sheet: the sheet name
- sources: a map of each Valgate field to the source column header that contains its data
- joins: if some fields live in a different sheet, how to link them back

If an entity type is not present in the workbook, return null for it.

Entity types and their fields:
- properties: propertyName, propertyType, status, addressLine, city, province, zip, country,
  yearBuilt, totalArea, bedrooms, bathrooms, parkingSpaces, purchasePrice, purchaseDate,
  currentMarketValue, outstandingMortgage, monthlyPayment, interestRate, annualPropertyTax,
  taxAssessmentValue, annualInsurance, ownershipStatus
- tenants: name, unit, rent, status, email, phone, property
- valuations: property, price, valuationDate
- leases: property, unit, stage, startDate, endDate, monthlyRent, termMonths, renewalStatus, tenant
- payments: property, lease, date, kind, amount, method, status
- expenses: property, date, category, amount, note
- coOwners: property, name, role, sharePercent, email, phone, address, taxEntity, tax1099Status
- maintenance: property, severity, title, status, cost
- inspections: property, type, inspector, status, inspectedAt, issues
- certifications: property, name, status, issuedAt, expiresAt, inspector
- safetyRisks: property, severity, title, description, status
- emergencyContacts: property, name, phone, sub
- successors: name, relation, role, share, email, phone
- landParcels: property, sizeM2, widthM, lengthM, zoningCode, zoningClass, elevationM,
  slopeAngleDeg, terrainType

Rules:
- Only map a field when a column genuinely matches it. If nothing fits, omit it from sources.
- Never invent a sheet or column name.
- "property" means the property's label, name, or ID as it appears in the sheet — not a Valgate id.
- A single-sheet workbook is fine: every field maps to a column in the same sheet, joins is empty.
- If a required field lives in a different sheet, create a join: joinColumn (in that sheet) equals
  primaryColumn (in the primary sheet). Choose join columns by the sample data, not just headers.

Workbook (each sheet: name, headers, up to 3 sample rows): {previews}
```

### Why gpt-4o-mini (not gpt-5.5)

The current field-first engine uses gpt-5.5 because it asks the model to *plan* abstract column
mappings + joins — a reasoning task where smaller models were "inconsistent on the join step."

The unified extraction asks the model to do the **same reasoning**, but sees all sheets at once
(context helps disambiguate) and returns one structured response. gpt-4o-mini handles this fine
because:

1. The schema is simple (`{ sheet, sources: { field: column }, joins }` per entity) — the model
   fills in column names from what it sees, no complex multi-step reasoning.
2. Most workbooks are single-sheet per entity (no joins needed).
3. Hallucinated columns are filtered by `applyPlan` (same as today's `sanitizePlan`).
4. Join columns are verified by `repairJoins` in code (same as today) — the model's join proposal
   is a hint, not trusted.

If accuracy is insufficient in practice, the model is swappable via an env var (same pattern as
`SCAN_MODEL` for the document scanner).

## `applyPlan` — deterministic, instant

```ts
function applyPlan(sheets: SheetMatrix[], plan: UnifiedPlan, ctx: Ctx): PerEntityRows {
  const byName = new Map(sheets.map(s => [s.name, s]));
  const properties = await listProperties(ctx);
  const matches = properties.map(p => ({ id: p.id, name: p.name, code: p.code, title: p.title }));

  const result: PerEntityRows = {};

  for (const [entityType, entityPlan] of Object.entries(plan)) {
    if (!entityPlan) continue;

    const sheet = byName.get(entityPlan.sheet);
    if (!sheet) continue;

    // 1. Extract rows at header position
    const { headers, rows } = extractRows(sheet.matrix, findHeaderRow(sheet.matrix));

    // 2. Apply sources + joins (same as assembleRows)
    const assembled = applySources(rows, headers, entityPlan, sheets);

    // 3. Normalize via entity-specific toCandidate
    // 4. Resolve property linkage
    // 5. Convert to ReviewRow[]
    result[entityType] = assembled.map(row => toReviewRow(row, entityType, matches));
  }

  return result;
}
```

The `applySources` function is the existing `assembleRows` logic, generalized: it reads each
field's value from the source column in the primary sheet (or a joined sheet), then returns
field-keyed rows. The `toReviewRow` function calls the entity's `toCandidate` normalizer, runs
`resolveProperty` for entities with a `property` field, and converts to `ReviewRow[]`.

## Per-entity normalizer design

Each entity's `toCandidate` is a pure function that takes a field-keyed row
(`Record<string, string>`) and returns a typed, normalized candidate. The normalizers reuse
existing parsers where they exist:

| Parser | Used by | Source |
|---|---|---|
| `parseCurrency` | leases (monthlyRent), payments (amount), expenses (amount), maintenance (cost) | `map-to-property.ts` |
| `parseDateMs` | leases (startDate, endDate), payments (date), expenses (date), inspections (inspectedAt), certifications (issuedAt, expiresAt) | `map-to-property.ts` |
| `parseFloatSafe` | co-owners (sharePercent), land parcels (sizeM2, widthM, lengthM, elevationM, slopeAngleDeg), successors (share) | `map-to-property.ts` |
| `parseMonth` | valuations (valuationDate → month) | `valuation-import.ts` |
| `parseRent` | tenants (rent), leases (monthlyRent) | `tenant-import.ts` |
| `normalizeTenantStatus` | tenants (status) | `tenant-import.ts` |
| New regex normalizers | lease stage, payment kind/method/status, expense category, maintenance severity/status, inspection type/status, certification name/status, safety risk severity, co-owner role/taxEntity, terrain type, successor relation/role | per-entity file |

Each new normalizer is ~5 lines (regex → enum), same pattern as `normalizeType` and
`normalizeStatus` in `property-import.ts`.

## Tab bar grouping

```
Portfolio    │ Properties (12)  │ Land Parcels (2)  │ Co-owners (4)
Rental       │ Tenants (8)      │ Leases (5)        │ Payments (40)
Financial    │ Valuations (24)  │ Expenses (18)
Compliance   │ Inspections (3)  │ Certifications (7)│ Safety Risks (1) │ Emergency Contacts (2)
Estate       │ Successors (3)
```

Only groups with at least one detected entity are shown.

## Commit order (Import everything)

Respects dependencies — entities that create IDs other entities link to commit first:

1. Properties → (re-query property list)
2. Land Parcels, Co-owners → (link to properties)
3. Tenants → (re-query tenant list)
4. Leases → (link to properties + tenants, re-query lease list)
5. Payments → (link to leases)
6. Valuations, Expenses, Maintenance, Inspections, Certifications, Safety Risks,
   Emergency Contacts → (all link to properties)
7. Successors → (user-scoped, no dependency)

Between steps 1→2→3→4→5, the relevant entity lists are re-queried so newly created records
appear in the resolution lookups.

## ImportFlow simplified

```tsx
// Before (N+1 calls):
upload → detect → [tab click → map → review] × N

// After (1 call):
upload → extractAll → review (all tabs populated)
```

State:

```ts
type Stage = "upload" | "extracting" | "review" | "done";
```

No `detecting` stage. No per-tab `mapping` status. The "extracting" stage is one spinner
("Reading your workbook…") that lasts ~5 seconds, then all tabs appear populated.

## Considered & rejected

- **AI extracts the actual data values (not a mapping plan)** — rejected. For 100 properties +
  50 tenants, the AI would transcribe hundreds of rows into JSON. That's expensive, slow, and
  error-prone (the AI can garble values during transcription). A mapping plan + deterministic code
  application is cheaper, faster, and more accurate — the code reads the exact cell values.
- **gpt-5.5 for the unified call** — rejected for cost + latency. gpt-5.5 takes 10–30s per call;
  gpt-4o-mini takes 2–5s. The join reasoning that justified gpt-5.5 is handled in code by
  `repairJoins`. If gpt-4o-mini's mapping quality is insufficient in practice, the model is
  swappable via env var without changing the schema or prompt.
- **Separate per-entity schemas (14 Zod objects)** — rejected for maintainability. One
  `z.record(field, column)` schema covers all entities. Unknown fields are dropped by `applyPlan`.
  Adding a new entity type means adding one nullable field to the schema, not a new Zod object.
