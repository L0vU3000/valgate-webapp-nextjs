# Valgate — Presentation Summary

> A breakdown of the Valgate webapp: what it is, who it serves, how users move through it, where it's going, and what makes it technically distinctive.

---

## 1. The Elevator Pitch

**Valgate is a property portfolio platform built on a verification layer.**

> *"Property records you and your lender can trust."*

The problem: property data lives scattered across PDFs, emails, spreadsheets, and memory. When it matters most — refinancing, succession, due diligence, co-owner disputes — that data is unverified, incomplete, and unusable.

Valgate fixes this with a two-layer model:

- **Layer 1 — Capture (frictionless):** add a property in minutes with whatever you know. No proof required, no blockers.
- **Layer 2 — Verify (deliberate):** each pillar of the property record can be independently verified, unlocking features and credibility. The end state is a **Valgate Verified** property — a trust standard meaningful to lenders, lawyers, co-owners, and beneficiaries.

---

## 2. The Problem Valgate Solves

| Pain point | Today | With Valgate |
|---|---|---|
| Records scattered | Emails, PDFs, drawers | One portfolio dashboard |
| Numbers can't be trusted | Owner's word | Verified pillars + Valgate Verified badge |
| Co-owners disagree | No shared source of truth | Normalized ownership splits + transaction history |
| Succession is brittle | Will + hope | Estate planning module with readiness rubric |
| Lenders re-collect data | Forms, calls, delays | Shareable, verified portfolio snapshot |
| Pros juggle clients | Spreadsheets per client | Workspace tabs across client portfolios |

---

## 3. The Eight Pillars

Every property in Valgate is structured around eight verifiable pillars. The **Property Progress** stat weights them by importance:

| Pillar | Weight | What it captures |
|---|---|---|
| **Financials** | 20% | Purchase price, current value, mortgage, equity, cash flow |
| **Rental** | 20% | Leases, tenants, payments, occupancy |
| **Location & Identity** | 15% | Address, map pin, parcel boundary, land size |
| **Ownership** | 15% | Co-owners, equity splits, acquisition history |
| **Valuation** | 10% | History, appreciation, market comparables |
| **Safety** | 10% | Risk assessments, inspection records |
| **Estate Planning** | 5% | Beneficiaries, succession docs, readiness |
| **Documents** | 5% | Tax, legal, insurance, generic uploads |

Progress is computed at query time from real schema fields — never invented inline.

---

## 4. Who Valgate Serves

Two distinct user surfaces, one codebase, one schema.

### **Valgate Consumer** — `app/(shell)/`
The individual property owner. One person, one portfolio.
- **Persona:** landlords, real-estate investors, multi-property owners
- **Context:** desktop-first, business hours, manages personally
- **Mental model:** "My properties, my records, my decisions"
- **Routes:** `/portfolio`, `/property/[id]/*`, `/add-property`, `/analytics`, `/rental`, `/estate-planning`, `/directory`, `/settings`

### **Valgate Professional** — `app/(pro)/pro/`
The asset manager or property manager handling **multiple client portfolios**.
- **Persona:** wealth advisors, property management firms, family offices
- **Context:** desktop-first, parallel context switching between clients
- **Mental model:** browser-like **workspace tabs** — one per managed client org
- **Routes:** `/pro/dashboard` (cross-client view), `/pro/clients/[clientId]/*` (drills into a single client's consumer-like experience)
- **RBAC:** Manager orgs ↔ Client orgs via Clerk org membership; many-to-many

**Same Clerk auth, same schema, different UI shells.** No code duplication — Professional aggregates over the same Consumer entities.

---

## 5. The User Journey

### Onboarding → First property → Verified portfolio

```
Sign up (Clerk)
    ↓
Empty portfolio dashboard
    ↓
"Add property" — 7-step wizard
    ├─ Method picker (manual / import)
    ├─ Basic info (address, type, photos)
    ├─ Financial (purchase price, mortgage)
    ├─ Photos & docs (uploads)
    ├─ Review
    └─ Success (with map pin)
    ↓
Property card appears in portfolio (Layer 1 — Capture complete)
    ↓
Open property detail → tabs across 8 pillars
    ↓
Feature unlock wizard per pillar (Layer 2 — Verify)
    ↓
Pillar verified → features unlock (sharing, lender export, etc.)
    ↓
All 8 pillars verified → Valgate Verified badge
```

### Day-to-day surfaces

| Route | What the user does there |
|---|---|
| `/portfolio` | Sees all properties, KPIs (total value, monthly income, occupancy), filters & sorts |
| `/property/[id]/overview` | Single property dashboard — KPIs, active leases, alerts |
| `/property/[id]/rental` | Manages leases, tenants, payments, occupancy |
| `/property/[id]/documents` | Folder tree, uploads, categorized files |
| `/property/[id]/ownership` | Co-owner splits, equity per owner, transaction history |
| `/property/[id]/valuation` | Value history, appreciation, internal comparables |
| `/property/[id]/location` | Map, boundaries, parcel info, development potential |
| `/analytics` | Portfolio-wide trends — revenue, expenses, NOI, lease pipeline |
| `/rental` | Operations hub — occupancy heatmap, arrears aging, renewals |
| `/estate-planning` | Beneficiary assignment, succession readiness |
| `/directory` | Marketplace of property professionals |
| `/settings` | Profile, preferences, notifications, org membership |

---

## 6. Core Features

### Portfolio Management
- Dashboard with property list (card + table views), filters (status, type, location), sorts (value, income, occupancy)
- Aggregate KPIs: total purchase price, monthly income, occupancy %, rent collection %, maintenance exposure
- Attention alerts: leases expiring, open maintenance, overdue rent

### Property Records (the 8-pillar detail page)
Each property has tabs for every pillar. Real schema-backed data — no mocks, no placeholders.

### Financial Tracking
- **Per property:** purchase price, current market value, appreciation %, equity (value − mortgage), NOI, monthly cash flow, YTD net income
- **Per portfolio:** total equity, aggregate NOI, cash flow trend, capital growth ranking
- **Valuation history:** quarterly changes, total appreciation since purchase, market comparables (computed from internal portfolio data, not external APIs)

### Rental & Tenant Management
- Lease lifecycle (start/end, rent, deposit, auto-pay)
- Tenant profiles (contact, move-in date, payment history)
- Payment records (status: paid / partial / due / overdue)
- Occupancy: occupied, vacant, reserved, maintenance, off-market
- Arrears aging buckets (current, 30–60 days, 60+ days, eviction risk)

### Document Management
- Folder tree organized by category (tax, legal, financial, insurance, estate)
- Upload pipeline: uploaded → OCR → committed
- Generic document entity — not property-specific; links to any domain
- Envelope encryption with KMS-wrapped DEKs (AES-256-GCM)

### Verification & Feature Unlock
- Multi-step wizard per pillar — collect proof, verify, unlock
- Features gate on **verification**, not data entry
- Per-pillar progress indicator → composite Property Progress score
- Valgate Verified badge = all pillars cleared

### Ownership & Equity
- Normalized model: `owner` entity + `property_owner_membership` (% per owner) + `property_ownership_transaction` (purchase / refinance history)
- Per-owner equity = ownership % × (value − mortgage)
- Per-owner rent share = ownership % × monthly rent

### Analytics
- Revenue / expense trend (6-month area chart)
- Expense breakdown (donut by category)
- Lease pipeline by stage (expiring, in negotiation, signed)
- Capital growth ranking (top properties by appreciation)
- Maintenance spend trend

### Estate Planning
- Beneficiary assignment per property
- Succession contact verification (email/phone)
- Estate document organization (will, trust, designations)
- Readiness rubric: beneficiaries named, contact verified, documents uploaded, plan documented

### Professional Directory
- Searchable marketplace of property professionals (inspectors, appraisers, agents, attorneys)
- Filter by category, location, verification status
- Detail pages with bio, credentials, contact
- Potential referral / lead-gen revenue model

### AI Copilot (foundations laid)
- Per-org conversation threads, encrypted messages
- RAG indexing of documents (vector index per property)
- Tool calls for on-platform actions
- Token / usage tracking
- Schema complete; UI integration pending Phase 9

---

## 7. Tech Stack

A fully modern, cutting-edge stack.

| Layer | Tools | Notes |
|---|---|---|
| **Framework** | Next.js 15.5 + React 19 | App Router, Server Components by default |
| **Styling** | Tailwind CSS 4 + shadcn/ui (Radix UI) | 30+ Radix primitives, custom theme |
| **Auth** | Clerk 7.2 | Users + organizations, RBAC ready |
| **Backend** | Neon (serverless Postgres) + Drizzle ORM (+ FS demo layer) | Typed SQL via `lib/services/*` from Server Actions; local FS for dev/demo |
| **Validation** | Zod 4.3 + React Hook Form 7.55 | Single source of truth for types + validation |
| **AI** | AI-SDK (Anthropic + OpenAI) | Streaming, tool use, prompt caching |
| **Charts** | Recharts 2.15 | Responsive analytics |
| **Maps** | Mapbox GL 3.21 + Supercluster | 3D maps, clustering, geocoding |
| **Storage** | AWS S3 + KMS | Envelope-encrypted document storage |
| **Animation** | Motion 12.23 (Framer fork) + Vaul | Purposeful transitions, drawers |
| **PDF** | React PDF 10.4 | In-app document preview |
| **Build** | Turbopack | Fast dev server on port 3001 |

---

## 8. Data Model Highlights

25+ normalized entities across these domains:

- **Identity:** `orgs`, `users`, `org_members` (Clerk-backed, roles: owner / admin / member / viewer)
- **Properties:** `property`, `property_location` (+ point / boundary / feature / polygon), `property_finance`, `property_image`, type-specific tables (`property_type_building` / `house` / `unit` / `land`), `property_registry`
- **Ownership:** `owner`, `property_owner_membership`, `property_ownership_transaction`
- **Rental:** `party`, `lease`, `lease_party`, `lease_payment`, `lease_document`
- **Documents:** `document`, `document_files`, `document_folders`, `document_folder_links`
- **AI Copilot:** `copilot_thread`, `copilot_message`, `copilot_index`, `copilot_usage`
- **Admin / Audit:** `activities`, `accessLogs`, `aiTasks`, `uploads`, `bulk_imports`, `analyticsEvents`, `translationGlossary`, `localeSettings`, `schemaMeta`

**Architectural choices worth highlighting:**

- **Normalized over denormalized.** Ownership is its own entity — supports multi-owner, revisable splits, transaction history.
- **Generic documents.** One `document` system serves every domain — tax, legal, lease, estate — instead of per-domain doc tables.
- **Envelope encryption.** Sensitive fields (copilot messages, owner PII) use KMS-wrapped DEKs with AES-256-GCM.
- **Derivation-first KPIs.** Monthly income, NOI, equity, on-time % are computed at query time from base entities — no stored aggregates to drift.
- **Zod-first typing.** Every entity has a Zod schema. Types and validation share one source of truth.

---

## 9. Design System

**Philosophy (from `.impeccable.md`):**

- **Light mode first.** Users work daylight hours on desktop; dark mode is future.
- **Clarity and calm.** Complex data should feel simple.
- **Generous, asymmetric spacing.** Not card-heavy.
- **Restrained blue** (#004ac6 brand, #2563EB interactive — rare and purposeful).
- **Neutrals tinted toward brand blue** (no pure grays).
- **Typography does the heavy lifting.** Icons play supporting roles.
- **Animations only when purposeful.** No decoration.
- **Borders over shadows.** 1px borders for separation; elevation only for overlays.

**Layout shells:**
- Consumer: top nav + left sidebar + main content
- Professional: workspace tabs (client switcher) + client-scoped sidebar + main content
- Property detail: pillar tabs + contextual side panels

---

## 10. Build Progress & Roadmap

### Completed phases ✅

| Phase | Scope |
|---|---|
| 1–5 | Audit infrastructure + entity backlog synthesis |
| Zod B1–B4 | Type migration across 25+ entities |
| 6.0 | PropertyValuation (7 surfaces) |
| 6.1 | Lease + Tenant (17 surfaces) |
| 6.2 | Payment + Expense (13 surfaces) |
| 6.3 | Document (10 surfaces) |
| 6.4 | LandParcel (11 surfaces) |
| 6.5 | CoOwner (10 surfaces) |
| 6.6 | OwnershipRecord (6 surfaces) |
| 6.7 | Folder (4 surfaces) |
| 6.8 | Notification + MaintenanceItem (4 surfaces) |
| 6.9 | PropertyComparable / MarketSnapshot derivation |
| 8.1 | Analytics route wired |
| 8.2 | Rental dashboard wired |
| 8.3 | Settings wired |
| 8.4 | Professional Directory wired |
| 8.5 | Estate Planning wired |

### In-flight 🔜

| Phase | Scope | Estimate |
|---|---|---|
| 8.6 | `/auth/*` audit (login, signup, forgot-password) | 1 week |
| 8.7 | `/` (home / landing) audit | 1 week |
| 8.8 | `/add-property` full 7-step wizard wiring | 1–2 weeks |
| 6.x cleanup | Remove `Property.health`, add Monthly Income status badge | ~2 hours |
| **9** | **Backend migration: FS → Neon + Drizzle, Clerk RBAC, MFA, encryption key mgmt** | **Largest effort** |

---

## 11. Business Model (inferred from code)

No paywall in the codebase yet, but the architecture telegraphs the model:

- **Free tier:** capture + basic portfolio view
- **Pro tier:** verification workflows, advanced analytics, AI copilot, directory access
- **Enterprise (Professional product):** multi-client management, RBAC, white-label potential
- **Marketplace revenue:** referral fees or paid listings in the Professional Directory

The **feature unlock wizard** is the monetization primitive — verification gates open features.

---

## 12. What Makes Valgate Distinctive

1. **Verification is the product, not the data.** Anyone can store property records. Valgate makes them trustworthy.
2. **Two-layer UX.** Frictionless capture + deliberate verification — never blocks the user, but always raises the ceiling.
3. **One platform, two products.** Consumer and Professional share schema, design system, and auth — no parallel codebases.
4. **Real data, always.** Project rule: every UI value traces to a schema field or derivation. No mock numbers, no placeholders.
5. **Encryption built in.** Envelope encryption with KMS-wrapped DEKs for sensitive fields — not bolted on later.
6. **AI-ready foundation.** Copilot schema, RAG index, encrypted message store already in place.

---

## What Else We Could Extract for the Presentation

The summary above covers the core narrative. Other angles worth pulling from the codebase if your audience wants a deeper cut:

### Technical depth angles
- **Security architecture deep-dive** — envelope encryption flow, IDOR prevention rules, auth-scoped Drizzle queries in `lib/services/*`, Clerk org boundary enforcement, document access logs
- **Local-DB pattern** — why `public/data/users/demo-user/` exists, how it shadows the DB, what the migration to real Neon + Drizzle queries looks like
- **Derivation engine** — the at-query-time KPI computation strategy and its trade-offs vs. stored aggregates
- **OCR & document pipeline** — the uploaded → ocr_done → committed lifecycle, S3 + KMS integration
- **AI copilot architecture** — RAG indexing, tool call surface, per-org thread isolation, encrypted message storage

### Product / UX angles
- **The 7-step add-property wizard** as a microcosm of the capture philosophy — show the screens, the affordances, the "skip for now" exits
- **Verification wizards per pillar** — each pillar has its own multi-step proof flow worth demoing
- **The Professional workspace-tab paradigm** — browser-like context switching is novel for asset management UX
- **Empty states & onboarding gaps** — what users see before their first property; where the system is forgiving vs. strict
- **Design system tour** — color tokens, typography choices, the "no pure grays" rule, the .impeccable.md design philosophy as evidence of craft

### Business / strategy angles
- **Trust as a moat** — Valgate Verified as a third-party-meaningful credential (lenders, lawyers, beneficiaries)
- **Marketplace flywheel** — Directory + property owners + verification creates network effects
- **Estate planning as a wedge** — most platforms ignore succession; Valgate makes it a first-class pillar
- **Professional product as enterprise pull-through** — asset managers become both users and channel partners
- **Multilingual readiness** — translation glossary table + Khmer (km) seed data suggest Southeast Asia / Cambodia market focus

### Storytelling angles
- **The journey of a single property** — narrative walkthrough from "added in 2 minutes" to "Valgate Verified in 30 days"
- **Co-owner conflict scenario** — how normalized ownership prevents the spreadsheet-of-truth problem
- **Refinancing scenario** — shareable verified portfolio cuts lender re-collection cycles
- **Succession scenario** — beneficiary readiness rubric in action when an owner passes
- **Asset manager day-in-the-life** — workspace tabs across 12 clients, cross-portfolio anomaly detection

### Roadmap angles
- **Phase 9 backend migration** — the single biggest engineering effort; worth its own slide
- **AI copilot rollout** — the foundation is built; the UX surface is the next reveal
- **MFA + encryption key management** — security hardening on the path to enterprise sales
- **Mobile / iOS responsive pass** (current branch: `L0vU3000/iphone-14-responsive-pass`) — multi-device strategy
- **Bulk import** — `bulk_imports` table already exists; CSV / spreadsheet onboarding for power users

### Talk track suggestions
- **Opening hook:** "Most property platforms store records. Valgate verifies them."
- **Demo flow:** portfolio → add property in 2 minutes → open property → verify a pillar → show Valgate Verified
- **Closing:** the trust standard that makes property data shareable
