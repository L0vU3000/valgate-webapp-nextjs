# Design — unify-ingestion-pipeline

## Architecture: the shared pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│  EXTRACTION (source-specific, unchanged)                                │
│                                                                         │
│  Document scan        Spreadsheet (property)    Spreadsheet (tenant)     │
│  scanDocument()       mapColumns+applyMapping   planFieldSources+       │
│  → ExtractedProperty  → ImportCandidate[]       assembleRows            │
│                                          → AssembledRow[]              │
└──────────┬──────────────────┬──────────────────────┬────────────────────┘
           │                  │                      │
     ┌─────▼──────┐  ┌───────▼───────┐  ┌───────────▼──────────┐
     │ scan adapter│  │ sheet adapter  │  │ sheet adapter (tenant│
     │ (~40 lines) │  │ (~30 lines)   │  │  /valuation ~30 ln)  │
     └─────┬──────┘  └───────┬───────┘  └───────────┬──────────┘
           │                 │                      │
           ▼                 ▼                      ▼
     ╔═══════════════════════════════════════════════════════════╗
     ║  IngestionCandidate<NewProperty | NewTenant |              ║
     ║                        NewPropertyValuation>[]             ║
     ║  (unified type — entity + source + issues + confidence)    ║
     ╚═════════════════┬═══════════════════┬═════════════════════╝
                      │                   │
           ┌──────────▼──────┐  ┌─────────▼──────────┐
           │  IngestionReview │  │ persistCandidates  │
           │  (generic table) │  │ (generic bulk      │
           │  config-driven   │  │  create loop)      │
           └──────────┬──────┘  └─────────┬──────────┘
                      │                   │
                      │ user edits        │ per-row:
                      ▼                   │ validate + createFn
              edited candidates ──────────▶
                                          │
                                          ▼
                              BulkResult { created, failures[] }
```

## Type design

### `IngestionCandidate<T>`

```ts
type EntityType = "property" | "tenant" | "valuation";

type IngestionSource = {
  type: "spreadsheet" | "scan";
  sheet?: string;
  row?: number;        // 1-indexed, for error reporting
  fileName?: string;   // the original uploaded file name
};

type IngestionIssue = {
  field: string;
  severity: "error" | "warning";
  message: string;
};

type IngestionCandidate<T> = {
  id: string;            // client-side uuid for React keys + edit tracking
  entity: T;             // the typed entity (NewProperty | NewTenant | NewPropertyValuation)
  source: IngestionSource;
  issues: IngestionIssue[];
  confidence: "high" | "low";  // scan: from reconcileExtractions; spreadsheet: "high" (AI mapped)
};

type BulkResult = {
  created: number;
  failures: { row: number; name: string; reason: string }[];
};
```

### Why `entity: T` holds the *final* typed entity (not raw strings)

The existing pipelines hold raw strings through the review step and only parse to typed values at
persist time. This design changes that: **the adapter does the normalization** (parse rent to number,
coerce status to enum, parse date to epoch ms) so the review table works with typed values and the
persist layer is purely "validate + insert."

This is safe because:
- The existing normalizers (`parseRent`, `parsePrice`, `parseMonth`, `normalizeType`,
  `normalizeStatus`, `scanToForm`'s placeholder stripping) are **pure functions** already — they just
  live in different files. Moving them into the adapter doesn't change their behavior.
- The review table **re-serializes for display** (e.g. `rent.toString()` for an input field) and
  **re-parses on edit** (e.g. `Number(input.value)` on change). This is the same thing the current
  review components do — just centralized.
- Zod validation still runs at persist time inside `createFn` — defense in depth is preserved.

### `ColumnConfig<T>` — declarative review table config

```ts
type ColumnConfig<T> = {
  field: keyof T & string;       // the entity field this column edits
  label: string;
  editable: boolean;
  control: "text" | "select" | "number";
  options?: { value: string; label: string }[];
  required?: boolean;
  validate?: (value: string) => string | null;
  width?: string;
  format?: (entity: T) => string;   // display formatter (e.g. rent → "$1,200")
  parse?: (input: string) => unknown;  // parse edited string back to typed value
};
```

### Pre-built configs

```ts
// propertyColumns: ColumnConfig<NewProperty>[]
[
  { field: "name", label: "Name", editable: true, control: "text", required: true, width: "200px" },
  { field: "type", label: "Type", editable: true, control: "select", required: true,
    options: TYPE_OPTIONS },
  { field: "status", label: "Status", editable: true, control: "select",
    options: STATUS_OPTIONS },
  { field: "city", label: "City", editable: true, control: "text", width: "120px" },
  { field: "currentMarketValue", label: "Market Value", editable: true, control: "number",
    format: (e) => e.currentMarketValue?.toLocaleString() ?? "",
    parse: (s) => Number(s) || undefined },
  // ... ~10 columns, matching what MappingReview shows today
]

// tenantColumns: ColumnConfig<NewTenant>[]
[
  { field: "name", label: "Name", editable: true, control: "text", required: true },
  { field: "propertyId", label: "Property", editable: true, control: "select", required: true,
    options: /* dynamic — injected at render time from org properties */ },
  { field: "unit", label: "Unit", editable: true, control: "text" },
  { field: "rent", label: "Rent", editable: true, control: "number",
    format: (e) => `$${e.rent.toLocaleString()}`, parse: (s) => Math.max(0, Number(s) || 0) },
  { field: "status", label: "Status", editable: true, control: "select",
    options: TENANT_STATUS_OPTIONS },
  { field: "email", label: "Email", editable: true, control: "text" },
  { field: "phone", label: "Phone", editable: true, control: "text" },
]

// valuationColumns: ColumnConfig<NewPropertyValuation>[]
[
  { field: "propertyId", label: "Property", editable: true, control: "select", required: true,
    options: /* dynamic */ },
  { field: "month", label: "Month", editable: true, control: "text", required: true,
    validate: (s) => MONTH_REGEX.test(s) ? null : "Use MMM YYYY (e.g. Jan 2026)" },
  { field: "price", label: "Price", editable: true, control: "number", required: true,
    validate: (s) => Number(s) > 0 ? null : "Price must be positive",
    format: (e) => `$${e.price.toLocaleString()}`, parse: (s) => Number(s) || 0 },
]
```

### Dynamic options (property picker for tenants/valuations)

Tenant and valuation review need a **property dropdown** populated from the org's properties. The
`options` for `propertyId` are injected at render time — `IngestionReview` accepts an optional
`dynamicOptions: Record<string, { value: string; label: string }[]>` prop that overrides the static
`options` in the column config:

```tsx
<IngestionReview
  candidates={candidates}
  columns={tenantColumns}
  dynamicOptions={{ propertyId: properties.map(p => ({ value: p.id, label: p.name })) }}
  onCommit={handleCommit}
  onCancel={onCancel}
/>
```

## `IngestionReview` component design

### State management

```tsx
function IngestionReview<T>({ candidates, columns, dynamicOptions, onCommit, onCancel }) {
  const [rows, setRows] = useState(candidates);
  // Edit tracking: { [candidateId]: { [field]: editedValue } }
  const [edits, setEdits] = useState<Record<string, Record<string, string>>>({});
  // Issues re-derived from edits + required-field checks
  const [rowIssues, setRowIssues] = useState<Record<string, IngestionIssue[]>>({});
}
```

### Rendered table

- **Header row**: column labels + a "Status" column (issues summary: "✓" / "⚠ 2 issues" / "✕ Missing name")
- **Data rows**: one per candidate. Editable cells render `<input>` / `<select>`. Non-editable cells
  render formatted text. Row click expands issues inline (or shows them in a right-side panel — TBD,
  inline is simpler for v1).
- **Footer**: "Import N entities" button (disabled count of valid rows), "Cancel" button.
- **Row filtering**: rows with `severity: "error"` issues are excluded from the commit payload (same
  as current behavior — the existing review components do this).

### What it does NOT do (that the old components did)

- `MappingReview` shows a column-match summary ("We matched 12 of your 15 columns"). This is
  spreadsheet-specific and stays in the upload stage, not the review stage. The import flow can show
  it as a banner above `<IngestionReview>` — or drop it (it's nice-to-have, not essential).
- `MappingReview` has inline location status (geocoded / needs pin). This stays as an issue in
  `candidate.issues` with `severity: "warning"` — the table shows it but doesn't need a special
  column.

## `persistCandidates<T>` design

```ts
async function persistCandidates<T>(
  ctx: Ctx,
  candidates: IngestionCandidate<T>[],
  createFn: (ctx: Ctx, entity: T) => Promise<T>,
  options?: {
    maxRows?: number;                              // default 100
    idorCheck?: (entity: T, ctx: Ctx) => boolean;  // return false → skip + record failure
    entityName?: (entity: T) => string;            // for failure messages
  },
): Promise<BulkResult> {
  const max = options?.maxRows ?? MAX_IMPORT_ROWS;
  if (candidates.length > max) {
    return { created: 0, failures: [{ row: 0, name: "", reason: `Too many rows (max ${max})` }] };
  }

  let created = 0;
  const failures: BulkResult["failures"] = [];

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    try {
      if (options?.idorCheck && !options.idorCheck(c.entity, ctx)) {
        failures.push({ row: i + 1, name: options?.entityName?.(c.entity) ?? `Row ${i + 1}`,
                        reason: "Property not found in your organization" });
        continue;
      }
      await createFn(ctx, c.entity);
      created++;
    } catch (err) {
      failures.push({
        row: i + 1,
        name: options?.entityName?.(c.entity) ?? `Row ${i + 1}`,
        reason: err instanceof Error ? err.message : "Could not create",
      });
    }
  }

  return { created, failures };
}
```

### Why `createFn` is passed in (not switch-on-type)

Each entity type already has its own `createProperty` / `createTenant` / `createPropertyValuation`
with different signatures, different ID prefixes, and different post-create side effects (cache tags).
Passing the function in keeps `persistCandidates` generic and avoids importing all three service
modules. The caller controls which create function is used.

### IDOR check

Only valuations need an explicit IDOR check today (verifying `propertyId` belongs to the org before
insert). Properties and tenants are inherently org-scoped via `ctx.orgId` inside their `createFn`.
The `idorCheck` callback is optional — valuations pass it, properties/tenants don't.

## Adapter design

### Property scan adapter

```ts
// lib/services/ingestion/adapters/property-scan-adapter.ts
import { scanToForm } from "@/app/_shared/add-property/_lib/scan-to-form";
import { mapWizardToProperty } from "@/app/_shared/add-property/_lib/map-to-property";
import type { ExtractedProperty } from "@/lib/services/document-scan";
import type { IngestionCandidate } from "../types";
import type { NewProperty } from "@/lib/data/types/property";

export function fromScan(
  extracted: ExtractedProperty,
  lowConfidence: string[],
  fileName: string,
): IngestionCandidate<NewProperty> {
  const formPatch = scanToForm(extracted);
  // Build a minimal WizardForm from the patch (defaultForm + patch)
  const form = { ...defaultForm, ...formPatch, method: "scan" as const };
  const entity = mapWizardToProperty(form);
  const issues = lowConfidence.map((field) => ({
    field,
    severity: "warning" as const,
    message: "AI models disagreed on this value — please verify",
  }));
  return {
    id: crypto.randomUUID(),
    entity,
    source: { type: "scan", fileName },
    issues,
    confidence: lowConfidence.length > 0 ? "low" : "high",
  };
}
```

### Property spreadsheet adapter

```ts
export function fromSpreadsheet(
  candidates: ImportCandidate[],
  sheetName: string,
  fileName: string,
): IngestionCandidate<NewProperty>[] {
  return candidates.map((c, i) => ({
    id: crypto.randomUUID(),
    entity: mapWizardToProperty(c.form),
    source: { type: "spreadsheet", sheet: sheetName, row: i + 1, fileName },
    issues: c.issues.map(msg => ({ field: "", severity: "warning", message: msg }))
              .concat(c.needsLocation
                ? [{ field: "lat", severity: "warning", message: "Needs location pin" }]
                : []),
    confidence: "high",
  }));
}
```

### Tenant / valuation adapters

Same pattern — call `toTenantCandidate` / `toValuationCandidate` and wrap the output in
`IngestionCandidate<T>`.

## Migration strategy

The migration is **incremental** — each pipeline can switch independently:

1. **Build the shared types + persist layer** (no UI change, no behavior change).
2. **Refactor each bulk-create function** to delegate to `persistCandidates` (thin wrapper, same
   behavior, run existing tests to confirm).
3. **Build `IngestionReview`** and the column configs.
4. **Swap each review component** one at a time (property first, then tenant, then valuation).
   Each swap is independently testable — the import flow for that entity type either works or
   doesn't, with no cross-entity coupling.
5. **Delete the old review components** after all three are swapped.

At no point is there a "big bang" where all four pipelines change simultaneously. If step 4 for
tenants reveals a problem, properties and valuations are unaffected.

## Considered & rejected

- **One upload page for everything** — merging `/import`, `/import-tenants`, `/import-valuations` into
  one route with an entity-type selector. Correct end state, but depends on the unified pipeline being
  in place first. **Non-goal for this change.**
- **Unified extraction engine** — making the scan and spreadsheet use the same AI call. They can't:
  the scan is vision (reads a PDF/image), the spreadsheet is text (reads headers/rows). The engines
  are fundamentally different. Only the post-extraction pipeline is shareable.
- **Holding raw strings through review** (like today) instead of typed entities. Rejected because it
  duplicates parsing logic across the review component and the persist layer, and the review
  component can't do field-level validation without knowing the target type. Typed entities are
  cleaner.
- **A single `createEntity` switch** instead of passing `createFn`. Rejected because it couples
  `persist.ts` to all three service modules and their different create signatures. The function
  parameter is more flexible and testable.
