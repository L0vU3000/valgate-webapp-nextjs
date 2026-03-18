# Roadmap

High-level path from mockup to production app.

## Phase 1 — Foundation
- [ ] Audit `src/imports/` — identify which pages render static Figma exports vs. real interactive components
- [ ] Replace static screens with real interactive implementations
- [ ] Set up a real map (Mapbox, Google Maps, or Leaflet) to replace the fake pin overlay
- [ ] Add auth (Supabase, Clerk, or custom JWT) with protected routes

## Phase 2 — Data Layer
- [ ] Choose and integrate a data fetching library (React Query recommended)
- [ ] Define API contracts or choose a backend (Supabase, custom REST, tRPC)
- [ ] Replace all hardcoded static arrays with API-driven state
- [ ] Set up a database schema based on the domain model (`docs/specs/domain.md`)

## Phase 3 — Core Features
- [ ] Property CRUD (create, edit, delete)
- [ ] Document storage and management
- [ ] Rental management (tenants, lease dates, payments)
- [ ] Valuation tracking over time
- [ ] Safety compliance tracking

## Phase 4 — Advanced Features
- [ ] Succession planning module
- [ ] Analytics with real data (charts already scaffolded with Recharts)
- [ ] Valgate Intelligence (AI-powered insights)
- [ ] Notifications system (Bell icon already in sidebar)
- [ ] Multi-user / team support (Sidebar shows "3 Members")

## Phase 5 — Production Readiness
- [ ] Error boundaries and loading states throughout
- [ ] Mobile responsiveness audit
- [ ] Performance optimization
- [ ] Testing (unit + integration)
- [ ] Deployment pipeline
