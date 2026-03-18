# Data Layer & API

---

## Audit — 2026-03-18

### What's covered and ready to implement

| Area | Status |
|---|---|
| Backend choice (Supabase) | Decided with rationale |
| Folder structure | Defined |
| React Query setup + `QueryClientProvider` | Defined |
| Query key hierarchy + `queryKeys` constant | Defined |
| Hook pattern (`useQuery` / `useMutation`) | Defined |
| Loading/error state conventions | Defined |
| DB type contracts (`PropertyRow`, `LeaseRow`, etc.) | Defined |
| Domain type contracts (`Property`, `Lease`, etc.) | Defined |
| snake_case → camelCase transform pattern | Defined |
| Endpoint catalogue for Properties, Documents, Leases, Valuations | Defined |
| Optimistic update pattern (rename) | Defined |
| Error handling rule (throw, not toast) | Defined |
| Hardcoded → real data migration checklist | Defined |

### What's missing or underdefined

**1. No `expenses` or `maintenance_items` table defined**
The analytics endpoint catalogue references `fetchRevenueExpenses()`, `fetchMaintenanceQueue()`, and `fetchExpenseBreakdown()` — but there are no corresponding `ExpenseRow`, `MaintenanceItemRow` types in `src/types/api.ts`, and no domain types or hooks for them. If these tables don't exist in the schema, the analytics page can't be wired up.

**2. No Supabase schema / migration files**
The spec describes what the DB should look like, but there are no `supabase/migrations/` SQL files checked in. Anyone setting up a fresh Supabase project has no canonical schema to run. The `maintenance_items` and `expenses` tables in particular have no shape defined anywhere.

**3. Auth / user identity is completely absent from the data layer**
Every Supabase table needs Row Level Security (RLS) policies to be safe. Without a `user_id` on `properties` (or a `workspaces` / `portfolios` join table), all users can read all properties. This spec can't be considered complete until at least placeholder RLS policy intentions are noted.

**4. Document storage path conventions not defined**
`uploadDocument()` is listed as an operation, but the Storage bucket name, folder structure, and path naming convention (e.g. `/{property_id}/{folder}/{filename}`) are not defined. Two developers will implement this differently without a spec.

**5. Filtering on `fetchProperties()` not specified**
The endpoint catalogue notes "Supports filter by province, type, status" but doesn't define how — query params, Supabase `.eq()` chains, or a typed filter object passed to the function. The `PortfolioPage` actively uses these filters so this needs to be explicit.

**6. `PropertyRow` is missing coordinate fields**
`MapPage` and `PropertySpatialPage` need lat/lng to place pins on the map. `PropertyRow` has no `latitude` or `longitude` fields. Either these come from a separate `locations` table or they need to be added to `properties`.

**7. No pagination or cursor strategy**
`fetchProperties()` will do a full table scan with no limit. Fine for now but this will silently break UX as the portfolio grows. Even a soft limit (e.g. `.limit(200)`) with a note to revisit is better than nothing.

**8. Health score — computed or stored?**
`health_score` is in `PropertyRow` as a stored integer, but domain.md describes it as a function of document completeness, title status, and safety compliance. If it's derived, it should be a Supabase computed column or RPC — not manually updated. The ownership of this calculation is unresolved.

### Risk rating

| Gap | Risk | Priority |
|---|---|---|
| Missing RLS / auth in data layer | High — data leak if Supabase is misconfigured | P0 |
| No DB migration files | High — no single source of truth for schema | P0 |
| Health score ownership undefined | Medium — will be inconsistent if different parts of app update it | P1 |
| Document storage path unspecified | Medium — divergent implementations | P1 |
| Missing expense/maintenance types | Medium — analytics can't be wired | P1 |
| No lat/lng on PropertyRow | Medium — blocks map feature | P1 |
| Filter spec missing | Low — easy to align when implementing | P2 |
| No pagination | Low — safe to defer, add a limit as a safeguard | P2 |

---

## Backend

**Recommended: Supabase**

Rationale: Supabase gives us Postgres (relational, good for property/lease/document relationships), built-in auth (which ties into `auth.md`), row-level security for multi-user access control, file storage for documents, and a PostgREST auto-generated REST API — all without standing up a custom server. It fits the current team size and the pace of a UI-first project transitioning to real data.

If requirements change (custom business logic, self-hosting), the data layer patterns here still apply — only the client calls change.

---

## Folder Structure

```
src/
  lib/
    supabase.ts         # Supabase client singleton
  api/
    properties.ts       # Query/mutation functions for properties
    documents.ts        # Query/mutation functions for documents
    leases.ts           # Query/mutation functions for leases
    analytics.ts        # Query functions for analytics aggregates
  hooks/
    useProperties.ts    # useQuery / useMutation wrappers for properties
    useDocuments.ts
    useLeases.ts
    useAnalytics.ts
  types/
    api.ts              # Raw API response types (snake_case from DB)
    domain.ts           # App-level types (camelCase, used in components)
```

Keep API functions (`src/api/`) and React Query hooks (`src/hooks/`) separate. The API functions are pure async functions — easy to test and reuse. The hooks are the React integration layer.

---

## React Query Conventions

### Installation

```bash
npm install @tanstack/react-query
```

Wrap the app in `QueryClientProvider` in `App.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
```

### Query Key Structure

Query keys are arrays. Follow this hierarchy:

```ts
['properties']                          // all properties
['properties', id]                      // single property
['properties', id, 'documents']         // documents for a property
['properties', id, 'documents', folderId]
['properties', id, 'leases']
['properties', id, 'valuations']
['analytics', 'revenue']
['analytics', 'occupancy']
['analytics', 'leaseExpirations']
['analytics', 'maintenanceQueue']
```

Define keys as constants to avoid typos:

```ts
// src/api/queryKeys.ts
export const queryKeys = {
  properties: {
    all: () => ['properties'] as const,
    detail: (id: string) => ['properties', id] as const,
    documents: (id: string) => ['properties', id, 'documents'] as const,
    leases: (id: string) => ['properties', id, 'leases'] as const,
    valuations: (id: string) => ['properties', id, 'valuations'] as const,
  },
  analytics: {
    revenue: () => ['analytics', 'revenue'] as const,
    occupancy: () => ['analytics', 'occupancy'] as const,
    leaseExpirations: () => ['analytics', 'leaseExpirations'] as const,
    maintenanceQueue: () => ['analytics', 'maintenanceQueue'] as const,
  },
}
```

### Hook Pattern

```ts
// src/hooks/useProperties.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchProperties, createProperty, updateProperty } from '@/api/properties'
import { queryKeys } from '@/api/queryKeys'

export function useProperties() {
  return useQuery({
    queryKey: queryKeys.properties.all(),
    queryFn: fetchProperties,
  })
}

export function useProperty(id: string) {
  return useQuery({
    queryKey: queryKeys.properties.detail(id),
    queryFn: () => fetchProperty(id),
    enabled: !!id,
  })
}

export function useCreateProperty() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createProperty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.all() })
    },
  })
}
```

### Loading & Error States

Do not handle loading/error differently in every page. Use a consistent pattern:

```tsx
const { data: properties, isLoading, isError } = useProperties()

if (isLoading) return <PageSkeleton />
if (isError) return <PageError />
```

Define `PageSkeleton` and `PageError` as shared layout components. `PageSkeleton` should mirror the shape of the real page to avoid layout shift.

---

## Type Contracts

The database uses snake_case. The app uses camelCase. Transform at the API boundary.

```ts
// src/types/api.ts — raw DB shapes
export type PropertyRow = {
  id: string
  name: string
  code: string
  type: 'Land' | 'House' | 'Building'
  province: string
  status: 'Rented' | 'Vacant'
  size_sqm: number
  buy_price_usd: number
  title_type: 'Hard' | 'Soft' | 'None'
  health_score: number
  created_at: string
  updated_at: string
}

export type LeaseRow = {
  id: string
  property_id: string
  tenant_name: string
  rent_amount_usd: number
  start_date: string
  end_date: string
  status: 'Active' | 'Expired' | 'Pending'
  created_at: string
}

export type DocumentRow = {
  id: string
  property_id: string
  folder: string
  subfolder: string | null
  name: string
  type: 'image' | 'doc' | 'archive' | 'spreadsheet' | 'presentation'
  storage_path: string
  created_at: string
}

export type ValuationRow = {
  id: string
  property_id: string
  estimated_value_usd: number
  valuation_date: string
  notes: string | null
  created_at: string
}
```

```ts
// src/types/domain.ts — app-level shapes (used in components)
export type Property = {
  id: string
  name: string
  code: string
  type: 'Land' | 'House' | 'Building'
  province: string
  status: 'Rented' | 'Vacant'
  sizeSqm: number
  buyPriceUsd: number
  titleType: 'Hard' | 'Soft' | 'None'
  healthScore: number
}

export type Lease = {
  id: string
  propertyId: string
  tenantName: string
  rentAmountUsd: number
  startDate: string
  endDate: string
  status: 'Active' | 'Expired' | 'Pending'
}

export type Document = {
  id: string
  propertyId: string
  folder: string
  subfolder: string | null
  name: string
  type: 'image' | 'doc' | 'archive' | 'spreadsheet' | 'presentation'
  storagePath: string
}

export type Valuation = {
  id: string
  propertyId: string
  estimatedValueUsd: number
  valuationDate: string
  notes: string | null
}
```

Transform in the API function, not in the hook or component:

```ts
// src/api/properties.ts
import { supabase } from '@/lib/supabase'
import type { PropertyRow } from '@/types/api'
import type { Property } from '@/types/domain'

function toProperty(row: PropertyRow): Property {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    type: row.type,
    province: row.province,
    status: row.status,
    sizeSqm: row.size_sqm,
    buyPriceUsd: row.buy_price_usd,
    titleType: row.title_type,
    healthScore: row.health_score,
  }
}

export async function fetchProperties(): Promise<Property[]> {
  const { data, error } = await supabase.from('properties').select('*')
  if (error) throw error
  return data.map(toProperty)
}

export async function fetchProperty(id: string): Promise<Property> {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return toProperty(data)
}
```

---

## Endpoint Catalogue

All operations go through the Supabase client (PostgREST). Listing them here clarifies what the backend must expose and what the app depends on.

### Properties

| Operation | Function | Notes |
|---|---|---|
| List all properties | `fetchProperties()` | Supports filter by province, type, status |
| Get single property | `fetchProperty(id)` | |
| Create property | `createProperty(input)` | Used in `/add-property` flow |
| Update property | `updateProperty(id, patch)` | |
| Delete property | `deleteProperty(id)` | Soft delete preferred |

### Documents

| Operation | Function | Notes |
|---|---|---|
| List documents for property | `fetchDocuments(propertyId, folder?)` | Filtered by folder/subfolder |
| Upload document | `uploadDocument(propertyId, file, meta)` | Stores file in Supabase Storage, inserts DB row |
| Delete document | `deleteDocument(id)` | Removes DB row + storage object |
| Rename document | `renameDocument(id, name)` | |

### Leases

| Operation | Function | Notes |
|---|---|---|
| Get active lease for property | `fetchActiveLease(propertyId)` | Used in `PropertyRentalPage` |
| List all leases for property | `fetchLeases(propertyId)` | Includes expired |
| Create lease | `createLease(input)` | Sets property status to `Rented` |
| Update lease | `updateLease(id, patch)` | |
| Terminate lease | `terminateLease(id)` | Sets property status to `Vacant` |

### Valuations

| Operation | Function | Notes |
|---|---|---|
| List valuations for property | `fetchValuations(propertyId)` | Ordered by date desc |
| Add valuation | `createValuation(input)` | |

### Analytics

These are aggregated queries, not raw entity fetches. May need Supabase RPC (Postgres functions) for efficiency.

| Operation | Function | Notes |
|---|---|---|
| Monthly revenue vs expenses | `fetchRevenueExpenses(months?)` | Aggregated from leases + expense table |
| Portfolio occupancy | `fetchOccupancy()` | `Rented` count vs total per property type |
| Upcoming lease expirations | `fetchLeaseExpirations(withinDays?)` | Default 90 days |
| Maintenance queue | `fetchMaintenanceQueue()` | Requires a `maintenance_items` table |
| Expense breakdown | `fetchExpenseBreakdown()` | Requires an `expenses` table |

---

## Optimistic Updates

Apply optimistic updates only where the perceived lag would noticeably hurt UX. For most mutations (create property, upload document), waiting for confirmation is acceptable — these are not frequent, high-speed interactions.

**Optimistic:**
- Renaming a document or folder (feels instant, easy to roll back)
- Toggling a property's active/inactive state

**Wait for server:**
- Creating a property (multi-step form — user expects a loading state)
- Uploading documents (file upload has inherent latency)
- Lease creation (financial record — confirm before showing)

Pattern for optimistic rename:

```ts
export function useRenameDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      renameDocument(id, name),
    onMutate: async ({ id, name }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['documents'] })
      // Snapshot for rollback
      const previous = queryClient.getQueryData(['documents'])
      // Optimistically update
      queryClient.setQueryData(['documents'], (old: Document[]) =>
        old.map(d => (d.id === id ? { ...d, name } : d))
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['documents'], context?.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}
```

---

## Error Handling

Supabase throws on error — catch at the API function level and rethrow so React Query's `isError` state works correctly.

```ts
export async function fetchProperties(): Promise<Property[]> {
  const { data, error } = await supabase.from('properties').select('*')
  if (error) throw new Error(error.message)
  return data.map(toProperty)
}
```

Do not use `toast` inside API functions or hooks — error display is a UI concern, handle it in the component or a global error boundary. Exception: form mutations where inline feedback is expected (use `onError` in the mutation hook to set form-level error state via `react-hook-form`).

---

## Migrating from Hardcoded Data

When replacing a hardcoded array in a page file:

1. Create the API function in `src/api/<domain>.ts`
2. Create the hook in `src/hooks/use<Domain>.ts`
3. Replace the hardcoded array in the page with the hook call
4. Add a `<PageSkeleton />` for the loading state
5. Remove the now-unused hardcoded array

Do not mix hardcoded and real data in the same page. Either the page is fully static or fully wired — no hybrid.
