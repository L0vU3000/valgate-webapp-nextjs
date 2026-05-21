# Valgate Feature Requirements

> **Core philosophy:**
> Adding a property is frictionless — users enter whatever they know, no accuracy required.
> Features unlock through a separate **verification process** per section.
> The end goal is **Valgate Verified** status: a trust standard that makes the property record meaningful for lenders, lawyers, co-owners, and successors.

---

## Two-Layer Model

| Stage | What it means | What the user gets |
|---|---|---|
| **Added** | Wizard complete, any data accepted | Property exists, basic card, progress tracker visible |
| **In Progress** | Some verifications done | Partial features unlock per verified pillar |
| **Valgate Verified** | All required verifications passed | Full feature suite, Verified badge, shareable record |

Features unlock from **verification**, not data entry. Filling in a field is not enough — the feature activates when the data behind it has been confirmed.

---

## Verification Complexity Scale

Verifications range from lightweight to heavyweight. Each section notes which type applies.

| Level | Type | Example |
|---|---|---|
| **Simple** | Document upload | Upload a photo of your title deed |
| **Simple** | Self-declaration | Confirm you are the legal owner |
| **Moderate** | Official document | Upload a land registry certificate or mortgage statement |
| **Moderate** | Professional document | Upload a signed inspection report or gas safety certificate |
| **Complex** | Identity verification | KYC / photo ID + proof of address |
| **Complex** | Third-party check | Automated land registry lookup, tenancy registration check |

---

## Sections

---

### 1. Location & Identity

**Feature promise:** Map pin, property identity card, and address record — the foundation every other section references.

**Wizard entry (no friction):**
- Property name, address, city, postcode
- Property type (apartment, house, land, etc.)
- Title type (freehold, leasehold, strata, etc.)

**Verification process:**
- **Simple** — Upload any official document that shows the property address (mortgage statement, council tax bill, utility bill in the owner's name)
- **Moderate** — Confirm coordinates match the address (map pin placed or auto-resolved)

**Features unlocked by verification:**
- Confirmed address used across all documents and reports
- Map pin appears on portfolio and property pages
- Property identity card marked as address-verified

---

### 2. Financials

**Feature promise:** Equity dashboard — purchase cost vs. current value, outstanding debt, net equity, and holding costs. Answers "what is this property worth to me right now?"

**Wizard entry (no friction):**
- Purchase price and purchase date
- Estimated current market value
- Outstanding mortgage balance (optional at entry)
- Annual property tax and insurance (optional at entry)

**Verification process:**
- **Moderate** — Upload a mortgage statement (confirms outstanding balance and lender)
- **Moderate** — Upload a purchase completion statement or solicitor letter (confirms purchase price and date)
- **Simple** — Upload a current insurance schedule or policy document (confirms annual insurance cost)

**Features unlocked by verification:**
- **Equity position:** `verified market value − verified mortgage balance`
- **ROI since purchase:** `(current value − purchase price) / purchase price`
- **Annual holding cost:** verified tax + insurance + costs
- **Net worth contribution:** equity feeds into verified portfolio total
- Financials data shareable with lender or accountant

---

### 3. Rental

**Feature promise:** Rental income management — track lease terms, tenants, and rent payments. Answers "is this property earning, and is rent being paid?"

> **Note:** This pillar only applies to properties with `propertyUse = "investment"`. Personal residences skip this pillar entirely.

**Wizard entry (no friction):**
- Tenant name and contact details
- Lease start/end date and monthly rent amount
- Payment records (manual entry accepted)

**Verification process:**
- **Moderate** — Upload a signed lease agreement (confirms tenant, rent amount, and lease term)
- **Simple** — Upload or link at least one rent payment record (bank statement line, receipt, or payment platform export)
- **Complex** *(optional, higher trust)* — Tenancy registration check or letting agent confirmation

**Features unlocked by verification:**
- **Gross yield:** `(verified annual rent / market value) × 100`
- **Arrears detection:** flag when a scheduled payment is overdue
- **Lease renewal reminder:** alert before verified lease expiry date
- **Tenant card:** verified contact details and lease summary
- Rental record shareable with accountant or mortgage broker

---

### 4. Ownership

**Feature promise:** Legal clarity — who owns this property, in what structure, and what documents prove it. Answers "can I prove I own this, and who else has a stake?"

**Wizard entry (no friction):**
- Ownership structure (sole, joint, company, trust)
- Co-owner names and percentage split (if applicable)

**Verification process:**
- **Complex** — Upload title deed or land registry document (confirms legal ownership and structure)
- **Moderate** — Identity verification (KYC) for the primary owner
- **Moderate** *(joint/company only)* — Co-owner details confirmed via uploaded deed or registry document

**Features unlocked by verification:**
- **Verified ownership card:** structure, owner names, percentage splits — legally confirmed
- **Proof of ownership:** deed linked and downloadable for solicitors, lenders, or insurers
- Ownership record shareable with co-owners or legal advisors
- Valgate Verified badge is blocked until Ownership is verified (core pillar)

> **Note on co-owner check:** "Co-owner on file" is only a requirement when ownership structure is joint or company. Sole owners skip this check entirely.

---

### 5. Valuation History

**Feature promise:** Capital growth chart — how the property's value has changed over time. Answers "is this asset appreciating?"

**Wizard entry (no friction):**
- User-entered estimated value (any number accepted at entry)

**Verification process:**
- **Simple** — Upload any professional valuation report (estate agent, surveyor, bank valuation)
- **Moderate** *(for richer history)* — Add 3+ verified valuations over time to build a trend line
- **Complex** *(optional, highest trust)* — RICS surveyor report or lender-commissioned valuation

**Features unlocked by verification:**
- **Capital growth %:** `(latest verified valuation − purchase price) / purchase price`
- **Equity growth chart:** verified value minus mortgage balance over time
- **Trend line:** visible with 3+ verified data points
- **Projected value:** extrapolation shown with 6+ data points
- Valuation history shareable with lender or accountant

> **Note:** "6+ months of history" is a quality signal shown as a progress indicator — not a binary pass/fail check. New properties are not penalised.

---

### 6. Safety

**Feature promise:** Compliance dashboard — inspections, certifications, risks, and emergency contacts. Answers "is this property safe and legally compliant?"

**Wizard entry (no friction):**
- Any known risks or hazards logged
- Emergency contact name and number

**Verification process:**
- **Moderate** — Upload a signed inspection report (building inspector, letting agent, or council)
- **Moderate** — Upload active certificates (gas safety, electrical installation condition report, EPC) with expiry dates
- **Simple** — Confirm emergency contact is reachable and linked to the property

**Features unlocked by verification:**
- **Safety score:** derived from verified risk severity + certificate status
- **Certification expiry alerts:** auto-reminder before verified expiry dates
- **Emergency contact card:** shareable with tenants, accessible in an emergency
- **Inspection history:** chronological log with verified pass/fail outcomes
- Compliance record shareable with tenants, letting agents, or council

---

### 7. Estate Planning

**Feature promise:** Succession readiness — assign who inherits each property and store the legal documents. Answers "if something happens to me, is this sorted?"

**Wizard entry (no friction):**
- Beneficiary name(s) assigned to the property

**Verification process:**
- **Moderate** — Upload a will, trust deed, or letter of wishes that names the beneficiary
- **Simple** — Confirm beneficiary contact details are on file
- **Complex** *(optional, highest trust)* — Solicitor confirmation or grant of probate document

**Features unlocked by verification:**
- **Portfolio succession overview:** which properties are assigned vs. unassigned
- **Estate readiness score:** percentage of portfolio with verified succession records
- **Shareable estate summary:** exportable document for solicitor or executor
- Succession record accessible to named beneficiary (with permission)

---

### 8. Documents

**Feature promise:** Document vault — centralised, categorised storage for all property-related files. Answers "where are all my important files?"

**Wizard entry (no friction):**
- Any documents uploaded, any category

**Verification process:**
- **Simple** — Documents are categorised (deed, insurance, lease, certificate, correspondence, etc.)
- **Simple** — Expiry dates set on time-sensitive documents

**Features unlocked by verification:**
- **Share with advisor:** send a verified document package to a lender, accountant, or lawyer
- **Expiring documents alert:** surface documents nearing their expiry date
- **Document completeness check:** flag missing expected categories per property type

---

### 9. Analytics *(portfolio-wide)*

**Feature promise:** Cross-property performance view — yield, equity, and cash flow compared across all properties. Answers "which properties are performing?"

**To unlock (minimum):**
- 2+ properties with verified Financials

**Full feature requires:**
- Verified Rental data on all investment properties (yield comparison)
- Verified Valuation history on all properties (growth comparison)
- Verified tax and insurance data (net return)

**Features unlocked:**
- Yield comparison ranked across all rental properties
- Capital growth comparison ranked across all properties
- Portfolio cash flow: total rental income minus total holding costs
- Tax year summary: verified income and costs per property

---

### 10. Portfolio *(top-level dashboard)*

**Feature promise:** Total net worth snapshot — aggregate value, equity, income, and verified progress across the whole portfolio.

**To unlock (minimum):**
- 1 property with verified Financials (purchase price + market value)

**Full feature requires:**
- All properties have verified market value + mortgage balance
- Verified rental data on investment properties

**Features unlocked:**
- **Portfolio net worth:** sum of verified equity across all properties
- **Total property value:** sum of verified market values
- **Total rental income:** sum of verified active lease rent amounts
- **Valgate Verified count:** how many properties in the portfolio hold Verified status

---

## Valgate Verified Status

A property earns **Valgate Verified** when the following core pillars are verified:

| Pillar | Required for Verified? | Notes |
|---|---|---|
| Location & Identity | **Yes** | Address confirmed by official document |
| Financials | **Yes** | Purchase + mortgage confirmed |
| Ownership | **Yes** | Title deed or land registry uploaded; KYC passed |
| Safety | **Yes** (rental properties) | Inspection + certificates uploaded |
| Rental | **Yes** (investment properties only) | Signed lease uploaded |
| Valuation History | No — quality signal | At least 1 verified valuation recommended |
| Estate Planning | No — user's choice | Encouraged, not required for Verified |
| Documents | No — ongoing | Completeness check, not a gate |

Once Verified:
- Property card shows the **Valgate Verified** badge
- Full feature suite is active
- Record is shareable with third parties (lenders, lawyers, advisors)
- Portfolio net worth and analytics include this property's verified data
