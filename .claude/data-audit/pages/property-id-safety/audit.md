---
slug: property-id-safety
route: /property/[id]/safety
revision: 1
date: 2026-05-05
verdict: "⚠️ 16 WIRED · 3 PARTIAL · 9 HARDCODED · 5 PFn — KPI row ignores received prop arrays; status fields need typed unions"
---

# Page Audit — /property/[id]/safety — audit.md
_Last revised: 2026-05-05 · Revision 1_

_See [plan.md](./plan.md) for the action items derived from this audit._

## TL;DR
- ✅ 16 of 41 surfaces are WIRED to real data — the safety entities (Inspection, Certification, SafetyRisk, EmergencyContact) are all built and fetched; the detail sections are fully wired
- ⚠️ 9 are HARDCODED: all 9 live in the KPI card row, and the underlying data arrays are already received as props — this is a derivation gap, not a missing entity problem
- 🔧 5 page-wide findings filed (PF1–PF5); per-datapoint audits should cite instead of restating

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Surface Inventory | What's on the page and what powers each thing? | 41 rows |
| 2 | Page-wide findings | What systemic problems span the whole page? | 5 PFn |

## Glossary
- **WIRED / HARDCODED / PARTIAL / CHROME / DECORATIVE** — see `.claude/skills/audit-page-datapoints/SKILL.md` § "Surface classification".
- **PFn** — Page-wide finding number (PF1, PF2, …). Filed once at the page level; per-datapoint audits cite instead of restating.
- **Derivation gap** — data is available in props but the component renders a hardcoded literal instead of computing from the data. Different from a missing-entity gap (where data doesn't exist yet).
- **List-then-filter** — fetching all records for a user and filtering in application code, instead of querying by index.
- **Lite template** — 4-section per-datapoint report for trivial direct-reads. Full template stays at 9 sections for derivations.
- **SSOT** — Single Source of Truth.

---

## 1. Surface Inventory

> This page has 41 classifiable surfaces across the layout header, 4 KPI cards, and 4 content sections (certifications, inspections, risk assessment, emergency contacts). 16 are fully wired to real DB data, 9 are hardcoded literals in the KPI row (despite the data being available in props), and 3 are partial (text wired, badge color uses untyped string comparisons).

| # | Element | Class | Source / Constant | File:line |
|---|---|---|---|---|
| 1 | Header property code + type (`"PP00016 PH"`) | WIRED | `property.code` + `property.type` | `PropertyLayout.tsx:49-51` |
| 2 | Header health-score badge (`"92% health score"`) | WIRED | `property.health` | `PropertyLayout.tsx:59` |
| 3 | Tab nav (7 tabs: Overview/Documents/Safety/Ownership/Rental/Valuation/Location) | CHROME | `tabs[]` constant | `PropertyLayout.tsx:8-16` |
| 4 | Breadcrumb `property.code` / "Safety" | WIRED | `property.code` | `PropertySafetyPage.tsx:51` |
| 5 | "Safety" h1 heading | CHROME | literal | `PropertySafetyPage.tsx:59` |
| 6 | Header subtitle "78.6% compliant · Next inspection Apr 29, 2026" | HARDCODED | inline literal | `PropertySafetyPage.tsx:62` |
| 7 | "Add Certificate" button | CHROME | static copy | `PropertySafetyPage.tsx:65-73` |
| 8 | KPI Card — Certifications donut: 78.6% arc + inner percentage text | HARDCODED | `78.6 * 2.51` constant | `PropertySafetyPage.tsx:98-101` |
| 9 | KPI Card — Certifications "5 of 6 current" | HARDCODED | inline literal | `PropertySafetyPage.tsx:105` |
| 10 | KPI Card — Compliance "Compliant" | HARDCODED | inline literal | `PropertySafetyPage.tsx:119` |
| 11 | KPI Card — Compliance "All obligations met" | HARDCODED | inline literal | `PropertySafetyPage.tsx:120` |
| 12 | KPI Card — Next Inspection "18 days" | HARDCODED | inline literal | `PropertySafetyPage.tsx:134` |
| 13 | KPI Card — Next Inspection "Fire safety · Apr 29, 2026" | HARDCODED | inline literal | `PropertySafetyPage.tsx:135` |
| 14 | KPI Card — Open Issues "2" | HARDCODED | inline literal | `PropertySafetyPage.tsx:149` |
| 15 | KPI Card — Open Issues "1 medium · 1 low" | HARDCODED | inline literal | `PropertySafetyPage.tsx:150` |
| 16 | Section heading "Safety Certifications" | CHROME | literal | `PropertySafetyPage.tsx:159` |
| 17 | Certification name `c.name` | WIRED | `certifications[i].name` | `PropertySafetyPage.tsx:172` |
| 18 | Certification inspector `c.inspector` | WIRED | `certifications[i].inspector` | `PropertySafetyPage.tsx:173` |
| 19 | Certification issued date `c.issued` | WIRED | `certifications[i].issued` | `PropertySafetyPage.tsx:178` |
| 20 | Certification expires date `c.expires` | WIRED | `certifications[i].expires` | `PropertySafetyPage.tsx:181` |
| 21 | Certification status badge text + color | PARTIAL | text: `certifications[i].status`; color: hardcoded two-state (`"Valid"` → emerald, else → amber) | `PropertySafetyPage.tsx:184-189` |
| 22 | Section heading "Inspection History" | CHROME | literal | `PropertySafetyPage.tsx:201` |
| 23 | Inspection table column headers (Date/Type/Inspector/Status/Issues Found/Report) | CHROME | literals | `PropertySafetyPage.tsx:217-222` |
| 24 | "Schedule Inspection" button | CHROME | static copy | `PropertySafetyPage.tsx:202-204` |
| 25 | Inspection date `insp.date` | WIRED | `inspections[i].date` | `PropertySafetyPage.tsx:243` |
| 26 | Inspection type `insp.type` | WIRED | `inspections[i].type` | `PropertySafetyPage.tsx:244` |
| 27 | Inspection inspector name `insp.inspector` | WIRED | `inspections[i].inspector` | `PropertySafetyPage.tsx:245` |
| 28 | Inspection status text + color | PARTIAL | text: `inspections[i].status`; color: hardcoded three-state string match (`"Passed"`/`"Clear"` → emerald, `"Satisfactory"` → amber, else → rose) | `PropertySafetyPage.tsx:227-229,246` |
| 29 | Inspection issues count `insp.issues` | WIRED | `inspections[i].issues` | `PropertySafetyPage.tsx:247` |
| 30 | "View report" link button per inspection row | CHROME | static copy | `PropertySafetyPage.tsx:249-251` |
| 31 | Section heading "Risk Assessment" | CHROME | literal | `PropertySafetyPage.tsx:270` |
| 32 | Risk severity badge text + color | PARTIAL | text: `risks[i].severityLabel`; color: hardcoded three-state string match (`"High"` → rose, `"Low"` → emerald, else → amber) | `PropertySafetyPage.tsx:278-282,288-289` |
| 33 | Risk title `r.title` | WIRED | `risks[i].title` | `PropertySafetyPage.tsx:292` |
| 34 | Risk description `r.desc` | WIRED | `risks[i].desc` | `PropertySafetyPage.tsx:293` |
| 35 | Section heading "Emergency Contacts" | CHROME | literal | `PropertySafetyPage.tsx:305` |
| 36 | "Edit Contacts" button | CHROME | static copy | `PropertySafetyPage.tsx:307-310` |
| 37 | Emergency contact name `ec.name` | WIRED | `emergencyContacts[i].name` | `PropertySafetyPage.tsx:327` |
| 38 | Emergency contact phone `ec.phone` | WIRED | `emergencyContacts[i].phone` | `PropertySafetyPage.tsx:328` |
| 39 | Emergency contact sub-text `ec.sub` (optional) | WIRED | `emergencyContacts[i].sub` | `PropertySafetyPage.tsx:329` |
| 40 | Lucide icons (Check, AlertTriangle, Shield, Phone, ClipboardCheck, FileCheck, AlertOctagon) | DECORATIVE | — | `PropertySafetyPage.tsx:10` |
| 41 | Entrance fade animations (`fade()` function, CSS transitions) | DECORATIVE | — | `PropertySafetyPage.tsx:34-39` |

**Tally:** WIRED 16 · PARTIAL 3 · HARDCODED 9 · CHROME 11 · DECORATIVE 2

---

## 2. Page-wide findings (5 PFn)

> Five systemic issues span this page. The most notable is PF4: the data arrays needed to compute the KPI cards are already fetched and passed as props — the hardcoded values aren't a missing-entity problem, they are an unused-data problem. PF5 covers three PARTIAL rows where status values are compared against untyped string literals instead of typed unions.

**Severity:** 🔴 PF P0 ship-blocker · 🔴 PF P1 robustness · 🟡 PF P2 schema smell · 🔵 PF P3 nit
**Confidence:** high (verified) · medium (inferred) · low (subjective)
**Tags:** `[schema]` · `[logic]` · `[render]` · `[consistency]` · `[negative-space]` · `[semantic]` · `[styling]`

---

### 🔴 PF1 — Full Property entity sent to Client Component
**PF P1 robustness · confidence: high · `[render]`**

**Where:** `page.tsx:17` → `PropertySafetyPage.tsx:14-19` (and applies to all inventory rows using `property.*` — rows 1, 2, 4)

**Problem:** `page.tsx` passes the full `Property` record to `PropertySafetyPage`, a `"use client"` component. The safety page uses only three fields: `property.code`, `property.type`, and `property.health`. The remaining ~30+ fields (financial data, coordinates, storage IDs, etc.) are serialized over the RSC boundary unnecessarily.

**Why it matters:** Finance fields (`buyNumeric`, `currentMarketValue`, `outstandingMortgage`) and coordinates (`lat`, `lng`) cross the network on every page load. CLAUDE.md rule: "Never send full DB objects as props — `select` only what the UI renders."

**Fix:** Add a `queries.ts` narrowing type (or reuse the existing `PropertyListItem` pattern from `lib/data/derivations/portfolio.ts`) and pass only `{ code, type, health }` to `PropertySafetyPage`. The safety-specific data arrives separately via `safetyData` already.

---

### 🔴 PF2 — List-then-filter instead of indexed per-property queries
**PF P1 robustness · confidence: high · `[schema]`**

**Where:** `queries.ts:7-11` (all four DB calls)

**Problem:** `getSafetyPageData` calls `db.inspections.list(userId)`, `db.certifications.list(userId)`, `db.safetyRisks.list(userId)`, and `db.emergencyContacts.list(userId)` — each returning ALL records for the user — then filters by `x.propertyId === propertyId`. As a user's portfolio grows, this is O(N) across the user's entire safety history per page load, not O(inspections for this property).

**Why it matters:** A user with 50 properties and 10 inspections each returns 500 records to filter down to ~10. CLAUDE.md architectural principle: queries should be scoped to what's displayed.

**Fix:** Each DB module should expose a `getByProperty(userId, propertyId)` method that uses a `by_property` (or `by_user_and_property`) index. Swap the four `list(userId).filter(...)` calls for four indexed lookups. The entity catalog §17/§19/§20 already lists `by_property` indexes for all four tables.

---

### 🔴 PF3 — Auth shim + no ownership verification (IDOR risk)
**PF P1 robustness · confidence: high · `[render]`**

**Where:** `queries.ts:2` (`getCurrentUserId()`)

**Problem:** `getCurrentUserId()` is a fixed-user stub — it does not verify the requesting user's identity. Critically, there is no check that the `propertyId` in the URL belongs to the requesting user. Any valid session could pass an arbitrary `propertyId` to `getSafetyPageData` and receive that property's inspection history, certifications, and emergency contacts.

**Why it matters:** IDOR (Insecure Direct Object Reference) — cross-tenant data leak. CLAUDE.md security rule: "Authenticate (who are you?) AND authorize (do you own this?) on every mutation" — and on every query.

**Fix:** After Clerk wiring, resolve the real user ID from the session, then verify `property.userId === clerkUserId` before calling any of the four DB reads. Return `notFound()` (already used in `page.tsx:16`) if ownership fails.

---

### 🟡 PF4 — KPI cards ignore received prop arrays (derivation gap)
**PF P2 schema smell · confidence: high · `[logic]`**

**Where:** `PropertySafetyPage.tsx:82-152` (KPI card grid, rows 8–15 in inventory)

**Problem:** `PropertySafetyPage` receives `certifications`, `inspections`, and `risks` as live props from the server, but the KPI row renders only hardcoded literals. The certification compliance percentage (`78.6%`), "5 of 6 current", "Compliant", next-inspection countdown ("18 days"), and open-issues count ("2") are all inline constants. The data needed to compute each of these is already in the props.

**Derivable from existing props (no new entity or DB query needed):**
- `certifications valid ratio` → `certifications.filter(c => c.status === "Valid").length / certifications.length`
- `"5 of 6 current"` → `certifications.filter(c => c.status === "Valid").length` + `certifications.length`
- `"Compliant"` → all certifications `status === "Valid"` → needs design decision (see Q3.J)
- `"18 days"` → nearest future `inspections` entry by date (requires `Inspection.date` as a number — see PF5)
- `"Open Issues: 2"` → `risks.length` (once `SafetyRisk.resolved` is added per catalog §19 — see plan §3)

**Why it matters:** The page has a complete data pipeline but the KPI row is effectively dead code. Hardcoded KPIs on a page where the data already arrives are a regression risk — they will always show the same numbers regardless of actual property state. Additionally, different properties will all show "78.6%" and "18 days" — a correctness bug visible today. (See Q3.J filed below.)

**Fix:** Replace inline literals with computed expressions. Add a small helper at the top of `PropertySafetyPage` or in `queries.ts` that produces `{ complianceRatio, nextInspection, openIssuesCount }` from the prop arrays.

---

### 🟡 PF5 — Status/severity fields are untyped strings with hardcoded string-literal comparisons
**PF P2 schema smell · confidence: high · `[schema]` `[styling]`**

**Where:** `PropertySafetyPage.tsx:184-189` (certification badge), `PropertySafetyPage.tsx:227-229` (inspection color), `PropertySafetyPage.tsx:278-282` (risk severity badge); applies to inventory rows 21, 28, 32

**Problem:** Three PARTIAL rows use hardcoded string-literal comparisons against fields typed as `string` (not a union):
- `Certification.status: string` — badge checks `c.status === "Valid"` only; Expired certificates show amber instead of rose/red.
- `Inspection.status: string` — color checks `"Passed" | "Clear"` (emerald), `"Satisfactory"` (amber), else (rose). No compiler enforcement.
- `SafetyRisk.severityLabel: string` — badge checks `"High"` (rose), `"Low"` (emerald), else (amber). A typo like `"MEDIUM"` falls to amber silently.

Additionally, the catalog §17 defines `Inspection.status` as `Pass/Fail/Pending`, but the seed data and component use `"Passed"`, `"Clear"`, `"Satisfactory"` — diverging from the catalog. The catalog §18 defines `Certification.status` as `Active/Expiring/Expired`, but the seed and UI use `"Valid"` — a mismatch.

**Why it matters:** Three separate untyped comparisons mean a status value rename or typo produces silent wrong colors. The catalog divergence means the UI contract and DB schema are drifting apart.

**Fix (in order):**
1. Reconcile status values: decide canonical enum values (`Pass/Fail/Pending` vs `"Passed"/"Failed"/"Pending"`) and update seed + code together.
2. Narrow type fields to string unions in `lib/data/types/inspection.ts`, `certification.ts`, and `safety-risk.ts`.
3. Replace if/else chains with exhaustive switch or a `record<Status, className>` lookup object.

---

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
walked:
  - app/(shell)/property/[id]/safety/page.tsx
  - app/(shell)/property/[id]/safety/queries.ts
  - app/(shell)/property/[id]/_components/PropertySafetyPage.tsx
  - components/property/PropertyLayout.tsx
  - lib/data/types/inspection.ts
  - lib/data/types/certification.ts
  - lib/data/types/safety-risk.ts
  - lib/data/types/emergency-contact.ts
sources:
  - path: app/(shell)/property/[id]/safety/page.tsx
    sha: f515812cb530e04cf225034220737f153ff7101e
  - path: app/(shell)/property/[id]/safety/queries.ts
    sha: 69c880561cfc2b32aa9ae3e4d6619ee190ad9b13
  - path: app/(shell)/property/[id]/_components/PropertySafetyPage.tsx
    sha: e792ec93fdc5c7c07d49c7eb44ea16b180026b4e
  - path: components/property/PropertyLayout.tsx
    sha: 543f6dc98c411c84cfe562855b487a2146fa48e0
  - path: lib/data/types/inspection.ts
    sha: cfe6b3bbeb3328bb5d0637cd3de926943e9a0e92
  - path: lib/data/types/certification.ts
    sha: a3a646e5dec1315568f6e7d0c5baf2e414ead96e
  - path: lib/data/types/safety-risk.ts
    sha: 59dda91dcdd998b224e3d5c02be3bbb09fac9884
  - path: lib/data/types/emergency-contact.ts
    sha: 185f7ae7b9aa896e8ca61c32a1cacf7b876b11a0
```

</details>

<details>
<summary>📋 Manual verification commands</summary>

```bash
# Confirm route files exist
ls "app/(shell)/property/[id]/safety/page.tsx" "app/(shell)/property/[id]/safety/queries.ts"

# Check seed inspections for a property
cat public/data/users/demo-user/inspections/INSP-0001/core.json | python3 -m json.tool

# Check seed certifications for PROP-0001
ls public/data/users/demo-user/certifications/ && \
  cat public/data/users/demo-user/certifications/CERT-0001/core.json

# Check seed safety risks
ls public/data/users/demo-user/safety-risks/

# Check emergency contacts
ls public/data/users/demo-user/emergency-contacts/

# Verify KPI arrays are non-empty in dev (open any property with safety data)
# Expected: certifications, inspections, risks arrays arrive in props but KPI shows 78.6% regardless
```

</details>

<details>
<summary>🔧 Metric Definition SSOT YAML</summary>

```yaml
# Paste per-metric SSOT blocks here as they are audited
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-05
- Initial audit (fresh write). Verdict: ⚠️ 16 WIRED · 3 PARTIAL · 9 HARDCODED · 5 PFn.
- Key finding: safety domain is far more wired than plan-v13 predicted. All 4 entity types exist, are fetched, and are rendered in the detail sections. HARDCODED rows are limited to the KPI card row — a derivation gap, not a missing-entity gap.
- MaintenanceItem does NOT appear on this page — plan-v13 prediction was incorrect; cross-page count unchanged.
- 5 PFn filed: PF1 (full Property to client), PF2 (list-then-filter), PF3 (auth IDOR), PF4 (KPI derivation gap), PF5 (untyped status strings).
- 2 new open questions filed: Q3.J, Q5.Q.
- No existing per-datapoint audits found for this route — no back-links to insert.
- Source SHAs recorded for all 8 walked files.

</details>
