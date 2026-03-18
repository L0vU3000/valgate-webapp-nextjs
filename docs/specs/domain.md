# Domain Model

Valgate is a property portfolio management tool targeted at the Cambodian real estate market.

## Core Entities

### Property
The central entity. Each property has:
- `id` — unique identifier
- `name` — human-readable name
- `code` — internal reference code (e.g. `PP00016 PH`, `SR00015 Land`)
- `type` — `Land`, `House`, or `Building`
- `province` — one of Cambodia's 25 provinces (e.g. Phnom Penh, Siem Reap, Kampong Chhnang)
- `status` — `Rented` or `Vacant`
- `size` — area in square meters
- `buy` — purchase price in USD
- `title` — land title type (see below)
- `health` — a 0–100 score representing document/compliance completeness

### Title Types
Cambodia has a tiered land title system:
- **Hard Title** (Strey Chir Chet / Full Ownership Title) — strongest legal ownership, registered with Ministry of Land
- **Soft Title** (Strey Sangkat) — ownership recognized at commune level, less legally secure
- **No title (—)** — undocumented or pending

This distinction is critical to the app's risk and valuation logic.

## Feature Areas

| Feature | Description |
|---|---|
| Portfolio | Full list of owned properties with filtering by province, type, status |
| Property Detail | Per-property tabs: Ownership, Valuation, Documents, Rental, Safety, Spatial |
| Analytics | Portfolio-wide charts and performance metrics |
| Map | Spatial view of properties across Cambodia with pins and clustering |
| Succession | Estate/inheritance planning for property portfolio (planned feature) |
| Valgate Intelligence | AI-powered portfolio insights (planned feature) |

## Property Health Score

A 0–100 metric visible on each property. Likely represents completeness of:
- Legal documents
- Title status
- Safety compliance
- Rental agreements

Color coding: green (80–100), yellow (40–79), red (0–39).

## Document Entity Structure

Used in `PropertyDocumentsPage`. Three layers:

**Folder** — top-level category sidebar items:
```ts
{ name: string; icon: LucideIcon; color: string; active?: boolean }
// e.g. "All Documents", "Title", "Sales", "Tax Receipt"
```

**SubFolder** — secondary groupings shown inside a folder:
```ts
{ name: string; color: string }
// e.g. "Contract", "Receipts", "Tax", "Rental", "Images", "Videos"
```

**File** — individual document:
```ts
{ name: string; type: "image" | "doc" | "archive" | "spreadsheet" | "presentation"; icon: LucideIcon; color: string; thumb: string | null }
```

View modes: `"list"` | `"grid"` | `"pages"` — toggled via `useState<ViewMode>` in the page.

## Analytics Data Shapes

Used in `AnalyticsPage`. All currently hardcoded:

```ts
// Monthly revenue vs expenses
{ month: string; revenue: number; expenses: number }

// Property occupancy
{ name: string; value: number; target: number; color: string }

// Upcoming lease expirations
{ tenant: string; unit: string; expires: string; status: "Renewing" | "Pending" | "Vacating"; statusColor: string }

// Maintenance queue
{ category: string; open: number; avgDays: string; priority: "HIGH" | "MED" | "LOW"; prColor: string }

// Expense breakdown (pie)
{ name: string; pct: number; color: string }
```

## Page Implementation Status

| Page | Route | Status |
|---|---|---|
| `HomePage` | `/` | Implemented — map + property list overview |
| `PortfolioPage` | `/portfolio` | Implemented — filterable property list |
| `AnalyticsPage` | `/analytics` | Implemented — charts, stats, maintenance queue |
| `MapPage` | `/map` | Implemented — static map image with pin overlays |
| `SettingsPage` | `/settings` | Implemented — profile, workspace, security, notifications |
| `SuccessionPage` | `/succession` | Coming Soon — placeholder with email signup |
| `AddPropertyPage` | `/add-property` | Partially implemented — multi-step form |
| `PropertyDocumentsPage` | `/property/:id/documents` | Implemented — folder/file browser, 3 view modes |
| `PropertyOwnershipPage` | `/property/:id/ownership` | Implemented |
| `PropertyRentalPage` | `/property/:id/rental` | Implemented |
| `PropertySafetyPage` | `/property/:id/safety` | Implemented |
| `PropertyValuationPage` | `/property/:id/valuation` | Implemented |
| `PropertySpatialPage` | `/property/:id/spatial` | Partially implemented |

## Geography

The app is scoped to Cambodia. Province data includes all 25 provinces. Key provinces in the mockup data: Phnom Penh, Siem Reap, Kampong Chhnang, Prey Veng, Kampot.
