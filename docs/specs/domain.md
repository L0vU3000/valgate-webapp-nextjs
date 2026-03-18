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

## Geography

The app is scoped to Cambodia. Province data includes all 25 provinces. Key provinces in the mockup data: Phnom Penh, Siem Reap, Kampong Chhnang, Prey Veng, Kampot.
