# Valgate for Asset Managers — Pain Points & Use Cases

> **Purpose of this doc.** This is the single source of truth for *who Valgate Pro is for,
> what problems it solves for them, and — because of that — what we should build next.*
> It leads with the pain, then maps each pain to a feature and that feature's current status.
> Read it before planning any new Pro work: it tells you whether a feature idea actually
> attacks a known pain, or just adds surface area.
>
> **Grounding.** Everything here traces back to research already captured on disk —
> `/.planning/2026-06-11-valgate-pro-interface/findings.md` §D (the domain research),
> `docs/pro-interface-build-report.md` (what shipped), and `docs/feature-requirements.md`
> (the verification model). Nothing is invented. Sources are listed at the bottom.

---

## 1. Who this is for — asset manager, *not* property manager

This distinction is the whole foundation. If we blur it, we build the wrong product.

| | **Property manager** | **Asset manager** ← *our user* |
|---|---|---|
| Posture | Operational, tenant-facing | Financial / strategic |
| Touches tenants? | Yes — rent chasing, maintenance calls, leasing, comms | **No** — never tenant-facing |
| Time horizon | Day-to-day | Quarter-to-quarter, buy/hold/sell |
| Goal | Keep the building running | **Maximise portfolio value** and **report to the owners they manage on behalf of** |
| Lives by | Tickets closed, units filled | NOI, cap rate, equity, IRR |

**Valgate's DNA is asset management.** The consumer side is already a wealth / ownership
view — valuation, equity, ownership structure, estate, risk — *not* a tenant-ops CRM. So
Valgate Pro is positioned as an **asset-manager cockpit**: it *surfaces* operational items
(an overdue rent, an expiring certificate, an open work order) so the manager can **triage**
them, but it is not trying to be the tool that does the operational work. It keeps Valgate's
value/wealth DNA.

**Design consequence:** we surface operations for visibility and hand-off; we do not build a
full tenant-operations CRM (tenant chat, work-order scheduling calendars, tenant self-service
portals). Those belong to a property-management product, which Valgate is not.

---

## 2. The structural insight that makes it all real

> The consumer side is **one owner managing their own properties.**
> Pro is **one manager overseeing many owners' properties.**

Pro is a **multi-owner overlay on the exact same schema.** Every Pro number is just an
existing per-property derivation, **grouped by client (owner) and rolled up.** A thin `Client`
entity plus a `clientId` tag on each property is the only new foundation needed — after that,
every portfolio KPI is a real aggregation, never an invented formula.

This matters for *use cases* because it means: any value the consumer app can show for one
property, Pro can show across a whole book of business. The pains below are all "I have this
problem, but ×40 properties across ×6 owners, and I have to report on it."

---

## 3. The metrics asset managers live by

Any number we put in front of this user should map to how they actually judge a portfolio.
These are the metrics the role is measured on:

| Metric | What it answers | Status in Valgate |
|---|---|---|
| **NOI** (Net Operating Income) | Is this asset making money after operating costs? | ✅ Derived (accrual basis) |
| **Occupancy rate** (target > 94%) | Are units earning or sitting empty? | ✅ Derived from leases |
| **Collection rate** | Is the rent that's owed actually arriving? | ✅ Derived (expected vs collected) |
| **Cap rate** (NOI ÷ value) | What's the yield on this asset's value? | ⚠️ Inputs exist; not surfaced yet |
| **DSCR** (lenders want 1.25–1.35) | Can rent cover the debt? | ❌ Not yet (needs debt-service calc) |
| **Equity / LTV** | How much of the asset is owned vs owed? | ✅ Consumer-side derivation exists |
| **Appreciation / capital growth** | Is the asset gaining value? | ✅ From valuation history |
| **Portfolio ROI / IRR** | What's the return across the whole book? | ❌ Not yet (IRR needs cash-flow timeline) |

---

## 4. The pain points — ranked — and the feature that solves each

This is the heart of the doc. The pains are ranked by how much manager time they consume
(from the domain research). Each row: the pain → what they need → the Valgate feature →
current status.

Status legend: ✅ **shipped & wired to real data** · ⚠️ **partial** · ❌ **not built / gap**.

### Pain #1 — Owner reporting (the single biggest time-drain)

> Managers work late assembling a monthly packet *per owner.* It's the most-cited drain in
> the research: pulling rent collected, income/expenses, NOI, occupancy, open work orders,
> upcoming lease expirations, and the relevant documents into one report — every month, for
> every owner — and getting it out within ~10 days of month-end.

**What the owner expects in that packet:** rent collected · income & expenses · management
fees · NOI · occupancy & rent roll · open/completed work orders · reserve balance · upcoming
lease expirations · lease/inspection documents.

**Valgate feature:** **Owner Report / Owner Statement** on `/pro/clients/[clientId]` — a
branded, document-style statement for the previous calendar month: income, management fee,
accruals, NOI, occupancy, work-order counts, 90-day lease expirations, with isolated
print/PDF output.

**Status:** ✅ **Shipped.** This is the flagship feature. It turns the #1 monthly drain into
one click. *Real-time owner portal* (owners log in and see their own report live) is the
natural next escalation — increasingly expected in the market, not yet built.

---

### Pain #2 — Maintenance coordination (ranked #1 challenge in every industry survey)

> Tracking what's broken, across many properties and owners, deciding what's urgent, and
> getting the right vendor assigned — then knowing it's actually resolved.

**What they need:** a single queue of open issues by priority and client, the ability to
assign a known vendor, and visibility into status.

**Valgate feature:** **Work Orders** page (`/pro/work-orders`) — full dispatch loop:
create → assign vendor (from the real `Professional` directory) → start → resolve. Counts by
priority and client. Built on the `MaintenanceItem` entity.

**Status:** ✅ **Shipped** (create + assign-vendor modals, full loop verified).
**Gaps that inform future work:** a board/kanban view with status-change animation; attaching
a document to a work order (no schema field for it yet — a product decision); scheduled
(recurring) work orders.

---

### Pain #3 — Rent collection & follow-up

> Chasing overdue payments across the whole book: knowing who hasn't paid, by how much, and
> how late — without scrolling through every property one by one.

**What they need:** rent roll across the book, expected-vs-collected at a glance, an overdue
triage list, and leases expiring soon (so a vacancy doesn't sneak up).

**Valgate feature:** **Rent & Collections** page (`/pro/rent`) — rent roll, collection KPIs,
overdue triage (Mark paid / Log payment), and lease renewals. Built on Lease + Payment +
Tenant.

**Status:** ✅ **Shipped** (log-payment + renew-lease modals, overdue triage verified).
**Gaps:** a record-tenant flow (no real flow yet); automated reminder/dunning sequences (would
edge toward tenant-facing ops — evaluate against the cockpit positioning before building).

---

### Pain #4 — Compliance tracking

> Certificates and inspections (gas safety, electrical, EPC, etc.) expiring across many
> properties. Miss one and there's legal/safety exposure. Hard to see "what's expiring across
> my whole book in the next 90 days" when it's buried per-property.

**What they need:** a forward-looking timeline of expiring certs/inspections, an open
safety-risk register, and a recent-inspection log — across the whole portfolio.

**Valgate feature:** **Compliance** page (`/pro/compliance`) — cert-expiry timeline + open
safety-risk register + recent-inspection log. Built on Certification + Inspection + SafetyRisk.
The first new-schema vertical slice (resolve-safety-risk) shipped here.

**Status:** ✅ **Shipped.** **Gaps:** a calendar view; proactive expiry alerts pushed to the
dashboard (some alerting exists); document upload tied to renewing a cert.

---

### Pain #5 — Admin / data-gathering (≈ 40% of a manager's week; 62% work 50+ hrs/wk)

> The diffuse, constant cost: re-keying data, hunting for the current value of something,
> assembling numbers that should already exist. Not one feature — it's the tax that every
> other pain adds up to.

**What they need:** every number derived live from one source of truth, so nothing is
re-gathered or re-typed.

**Valgate feature:** **the whole cockpit.** Every Pro stat is a live derivation from the
shared schema — nothing is a hardcoded figure a human had to assemble. The **Dashboard**
(`/pro/dashboard`) is the daily "what needs me today" triage view that replaces manually
scanning everything.

**Status:** ✅ **Shipped** (mock data fully deleted; every number traces to a schema field or
derivation). This pain is addressed structurally rather than by a single screen — which is
why "wire everything to real data, never invent a number" is a hard project rule.

---

## 5. The inputs a manager gives Valgate (the write surface)

Pain points tell us what to *show*; this tells us what the manager has to be able to *do*.
Each input maps 1:1 to a CRUD operation in the data layer — this is the complete set of
"manager actions," and it's a good checklist when judging whether a new feature needs a new
input or reuses an existing one:

| Manager input | Backed by | Status |
|---|---|---|
| Onboard a client + assign properties | `Client` entity + `clientId` | ✅ Onboard modal |
| Log a payment received | `Payment` | ✅ Log-payment modal |
| Create & assign a work order to a vendor | `MaintenanceItem` + `Professional` | ✅ Create + assign modals |
| Record an inspection / upload a certificate | `Inspection` / `Certification` | ⚠️ Surfaced read-only; upload flow not built |
| Update a valuation | `PropertyValuation` | ⚠️ Consumer-side exists; not in Pro |
| Add / renew a lease | `Lease` | ✅ Renew modal (add-lease partial) |
| Resolve a risk | `SafetyRisk` (`status`/`resolvedAt`) | ✅ Resolve action |
| Reassign properties between clients | `clientId` | ❌ Standalone modal pending |
| Record a tenant | `Tenant` | ❌ No flow yet |

---

## 6. What to build next — derived from the gaps above

Read top to bottom; this is ranked by *pain attacked × effort*. Items marked **(product
decision)** need a call before building because they touch positioning or need new schema.

1. **Real-time owner portal** — let owners view their report live, not just receive a monthly
   PDF. Directly extends Pain #1 (the biggest drain) and the market increasingly expects it.
   **(product decision: how far toward owner-facing do we go?)**
2. **Standalone reassign-properties modal** — closes the last gap in the manager write surface
   (Pain #5 admin). Low effort, no new schema.
3. **Cap rate + DSCR surfacing** — the two portfolio metrics we have inputs for but don't show
   (§3). Pure derivation work; makes the cockpit speak the manager's full metric language.
4. **Cert/inspection upload flow** — turn Compliance (Pain #4) from read-only into a place the
   manager actually files documents. Needs an upload + verification path.
5. **Work-order board view + scheduled work orders** — depth on Pain #2.
   **(product decision: scheduled WOs + work-order document attachments need new schema fields.)**
6. **Portfolio ROI / IRR** — the strategic return metric. Needs a cash-flow timeline; larger
   build, highest-altitude payoff for the "maximise value" mandate.

> **Positioning guardrail for every item above:** if a feature idea pulls us toward
> *tenant-facing operations* (tenant chat, scheduling, self-service), stop and check it against
> §1. The cockpit surfaces ops for triage; it does not run them.

---

## 7. Sources

- **Domain research:** `/.planning/2026-06-11-valgate-pro-interface/findings.md` §D — the
  asset-manager-vs-property-manager distinction, the ranked pain points, the metrics, and the
  owner-report contents. Underlying external sources cited there: Indeed (asset-mgr duties),
  YU blog (asset vs property mgmt), Gallagher Mohan & 37Parallel (metrics/DSCR), AllBetter &
  AppFolio (pain points), Iconic PM (owner reporting).
- **What's shipped:** `docs/pro-interface-build-report.md` (routes, derivations, decisions).
- **Verification / feature model:** `docs/feature-requirements.md`.
- **Product boundaries:** `docs/products.md` (Consumer vs Professional).
- **Positioning decisions:** `/.planning/2026-06-11-valgate-pro-interface/task_plan.md`
  (Locked Decisions).
