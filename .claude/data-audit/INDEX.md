# Audit Index

> Two tables: per-datapoint audits (written by `/audit-datapoint`) and page-level audits (written by `/audit-page-datapoints`). Both sorted by slug, updated automatically.

## Per-datapoint audits

| Slug | Route | Data point | Latest verdict | Revisions |
|---|---|---|---|---|
| [portfolio--attention-count](portfolio--attention-count.md) | /portfolio | Attention (count) | ✅ Card removed · revisit when health/alert system defined | 2 |
| [portfolio--buy-price](portfolio--buy-price.md) | /portfolio | Buy price (table column) | ⚠️ F1+F3 resolved · F2 deferred (Q5.P) | 2 |
| [portfolio--filtered-count](portfolio--filtered-count.md) | /portfolio | Filtered / total count ("Showing X of Y") | ✅ F1+F2+F4 resolved · F3 partial (Sold shown; Archived via filter) | 3 |
| [portfolio--monthly-income](portfolio--monthly-income.md) | /portfolio | Monthly Income ($7.3K) | ✅ F1 + F3 resolved · 1 P2 deferred | 3 |
| [portfolio--occupancy](portfolio--occupancy.md) | /portfolio | Occupancy (44%) | ⚠️ F1+F4 resolved · F2+F3 deferred | 2 |
| [portfolio--properties-count](portfolio--properties-count.md) | /portfolio | Properties (count) | ✅ 3 resolved · 1 deferred (F3) | 2 |
| [portfolio--property-id](portfolio--property-id.md) | /portfolio | Property Code (table sub-label, e.g. "PP00016 PH") | ✅ All resolved · code=id format · not shown in table | 3 |
| [portfolio--property-name](portfolio--property-name.md) | /portfolio | Property Name (table column) | ✅ All 4 findings resolved | 4 |
| [portfolio--province](portfolio--province.md) | /portfolio | Province (table column) | ⚠️ F1+F2+F3 resolved · F4 deferred | 2 |
| [portfolio--property-type](portfolio--property-type.md) | /portfolio | Property Type badge (e.g. "Residential") | ✅ F1+F2+F3 resolved · F4 deferred | 2 |
| [portfolio--rental-status](portfolio--rental-status.md) | /portfolio | Rental Status (table column) | ✅ All 3 findings resolved | 2 |
| [portfolio--size](portfolio--size.md) | /portfolio | Size (m²) column | ✅ F1+F2+F3 resolved · F4 deferred (sorting not yet built) | 2 |
| [portfolio--title-deed-status](portfolio--title-deed-status.md) | /portfolio | Title/deed status badge (e.g. "Hard title") | ✅ All 4 findings resolved | 2 |
| [portfolio--total-value](portfolio--total-value.md) | /portfolio | Total Purchase Price ($10.79M) | ✅ 3 resolved · 1 deferred (F4) | 2 |
| [property-id-overview--rental-status](property-id-overview--rental-status.md) | /property/[id]/overview | Rental status badge ("Rented") | ⚠️ 2 findings (1 P1, 1 P2) | 1 |

## Page-level audits

| Slug | Route | WIRED | HARDCODED | PFn | Latest verdict | Revisions |
|---|---|---|---|---|---|---|
| [portfolio](pages/portfolio/audit.md) | /portfolio | 15 | 1 | 2 | ⚠️ mostly wired — YoY growth needs PropertyValuation | 1 |
| [property-id-documents](pages/property-id-documents/audit.md) | /property/[id]/documents | 3 | 13 | 5 | ⚠️ 13 hardcoded — top entities: Document (9 surfaces) + Folder (4) | 1 |
| [property-id-location](pages/property-id-location/audit.md) | /property/[id]/location | 4 | 19 | 6 | ⚠️ 19 hardcoded — top entities: LandParcel (11 surfaces) + PropertyComparable (7); lat/lng never consumed | 1 |
| [property-id-overview](pages/property-id-overview/audit.md) | /property/[id]/overview | 5 | 10 | 4 | ⚠️ 10 hardcoded — top entity to land: Lease | 1 |
| [property-id-ownership](pages/property-id-ownership/audit.md) | /property/[id]/ownership | 6 | 25 | 6 | ⚠️ 25 hardcoded — top entity: CoOwner (10 surfaces) | 1 |
| [property-id-rental](pages/property-id-rental/audit.md) | /property/[id]/rental | 3 | 29 | 4 | ⚠️ 29 hardcoded — Lease+Payment cover 23 of 29 rows | 1 |
| [property-id-safety](pages/property-id-safety/audit.md) | /property/[id]/safety | 16 | 9 | 5 | ⚠️ KPI row ignores received arrays — derivation gap, not missing entities | 1 |
| [property-id-valuation](pages/property-id-valuation/audit.md) | /property/[id]/valuation | 4 | 18 | 4 | ⚠️ 18 hardcoded — PropertyValuation exists but not wired; market/comp data needs external integration | 1 |
