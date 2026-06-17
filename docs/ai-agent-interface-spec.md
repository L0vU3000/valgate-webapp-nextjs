# Valgate Agent — AI Agent Interface Design Specification (v1)

> **What this is.** A production-ready *design* specification for the AI Agent interface
> inside Valgate's property/asset-management app. It is a written document, not code. It
> designs the **interface and trust layer** on top of the AI overlay that *already exists*
> in the codebase — it does not throw that foundation away.
>
> **Who it's for.** An expert frontend designer who is a beginner at backend. UI/layout/state
> decisions are precise and opinionated. Every backend/agent concept is explained in plain
> language with a one-line **Why this matters** before moving on.
>
> **Grounding.** Every entity, field, function, route, and component named here was verified
> against the real code (`lib/data/types`, `lib/data/db`, `lib/data/derivations`,
> `lib/actions/ai-overlay.actions.ts`, `convex/copilot/agent.ts`, `app/(pro)/pro/**`,
> `components/layout/AIOverlay.tsx` and children, `components/ui/**`). Where an expected name
> was **absent**, that is flagged inline as a gap rather than invented.

---

## 0. The single most important grounding fact

The agent UI **already exists**, but only on the **consumer side**:

- `components/layout/AIOverlay.tsx` is a **full-screen, 3-pane glass dialog** (`fixed inset-0 z-50`,
  `role="dialog"`, `aria-label="Valgate Agent assistant"`) — panes are **Sessions** (`AISessionSidebar.tsx`),
  **Chat** (`AIChatPane.tsx`), **Workspace Assets** (`AIWorkspaceAssets.tsx`).
- It is mounted **once** in `components/layout/ShellLayout.tsx`, which is used by
  `app/(shell)/layout.tsx` — so it appears on consumer routes (`/portfolio`, `/property/[id]`, …)
  **but not anywhere under `/pro`.**
- The page-aware context builder `buildAiOverlayContext(pathname)` in
  `lib/data/derivations/ai-context.ts` only specializes for `pathname.startsWith("/portfolio")`,
  `pathname === "/"`, and `/property/<id>` (via `parsePropertyIdFromPath`). **It has no `/pro/*`
  branch and no `clientId` awareness.**
- The reply engine is **request/response, not streaming** (`lib/actions/ai-overlay.actions.ts`
  uses `generateText`, not `streamText`), two-tier: real model `openai("gpt-5-mini")` behind
  `OPENAI_API_KEY`, falling back to the deterministic keyword rule engine
  `generateDeterministicReply` in `lib/data/derivations/ai-replies.ts`. **There are no slash
  commands** (input is a free `<textarea>`; Attach/Voice buttons are stubbed "coming soon").
- `convex/copilot/agent.ts` defines the *future* streaming + tool vocabulary
  (`CopilotEvent` = `token | final | intent | tool_start | tool_result | citations`, plus stub
  tools `ragSearch`, `vaultNavigator`, `mapboxTool`, `neonSqlRO`) but is **inert scaffolding** —
  not wired to the live overlay.

> **Design consequence (drives the whole spec).** v1 is mostly **extend, mount, and gate**, not
> "build from scratch":
> 1. **Extend** `buildAiOverlayContext` with a `/pro/*` + `clientId` branch.
> 2. **Mount** the existing overlay inside the Pro shell (`ManagerProShell`).
> 3. **Add** the three genuinely new layers the consumer overlay lacks: **streaming**,
>    **observability** (reasoning + tool-call trace in property terms), and **human-in-the-loop
>    approval gates** before consequential actions.

---

## 1. Overview & Principles

**What the agent is for.** The **Valgate Agent** is a generalist front door for owners and
professional asset managers to *ask questions and take actions across a real-estate portfolio*
in natural language. On the Pro side it is the conversational twin of the cockpit: the cockpit
*shows* the book of business; the agent lets the manager *interrogate and act on* it
("who's overdue across Client Sok?", "assign a plumber to the leaking-roof work order",
"generate this owner's monthly statement") without hand-navigating seven screens.

It is **not** a generic chatbot. Every answer is grounded in real entities and real derivations,
and every *action* it can take maps 1:1 to an existing server action in `app/(pro)/pro/actions.ts`.

### The four Valgate principles (referenced throughout as P1–P4)

- **P1 — Proactive over reactive.** The agent should surface what needs attention before being
  asked (overdue rent, certs expiring in 90 days, open Critical safety risks), using the same
  derivations the dashboard uses. *Applied:* per-route opening prompts and a dashboard
  "what needs me today" digest.
- **P2 — Confirmation before consequence.** Reads are free; anything that **alters owner-facing
  records, schedules paid work, modifies a valuation, or sends a notice** stops at an explicit
  **approval gate** before it touches the database. *Applied:* §6 Trust & Safety.
- **P3 — Transparency builds trust.** The agent always shows **what it touched** (which
  properties/clients/records), **what it ran** (which derivations), and **what it computed**
  (the values). *Applied:* §5.2 Observability, in property terms — never raw token logs.
- **P4 — Design for evolution.** The UI starts as **full oversight** (every step visible, every
  action gated) and **simplifies toward a lightweight confirmation layer** as the user builds
  trust — a per-capability "trust ramp," not an all-or-nothing toggle. *Applied:* §6.4.

---

## 2. Agent Architecture

### 2.1 Generalist front door → domain specialists

The user always talks to **one** entity ("Valgate Agent"). Behind it, the agent **routes** the
request to a **domain specialist** chosen from the cockpit's real domains. The user never picks a
specialist; routing is invisible *except* in the observability trace, where the active specialist
is named ("Rent & Leases specialist read 12 leases for Client Sok").

> **Why this matters (plain language).** "Routing to a specialist" is just the agent deciding
> *which set of data functions and actions are relevant* to your question, then using only those.
> It keeps answers grounded (a rent question only ever touches Lease/Payment data) and makes the
> trace readable. Today this routing is the keyword waterfall in `ai-replies.ts`
> (`"occupancy"`, `"rent collection"`, `"document"`, …); v1 formalizes the same idea as named
> specialists with explicit tool sets.

```
                    ┌─────────────────────────────┐
   user message ──► │     Valgate Agent (front)   │  routes by intent
                    └──────────────┬──────────────┘
        ┌────────────┬─────────────┼─────────────┬───────────────┐
        ▼            ▼             ▼             ▼               ▼
  Portfolio &   Maintenance /   Rent &      Compliance &   Documents /
  Valuation     Work Orders     Leases      Safety         Owner Statements
```

### 2.2 Specialist table (entities · derivations · actions)

Read-only actions are free. **Consequential** actions stop at an approval gate (P2) — flagged 🔒.

| Specialist | Entities it reads | Derivations / queries it calls | Actions (read-only vs 🔒 consequential) |
|---|---|---|---|
| **Portfolio & Valuation** | `Property` (incl. `clientId`), `PropertyValuation`, `Lease`, `Payment`, `Expense` | `portfolio.computeStats`, `portfolio.computeKpis`, `property-financials.buildPropertyFinancials` (`equityAmount`, `equityPct`, `ltv`, `appreciationPct`), `property-financials.computeInvestmentPerformance` (`capRate`, `cashOnCash`, `totalRoiPct`), `property.computeEquity`, `property-comparables.computeMarketSnapshot`, `progress.computeProgress`; queries `getProDashboardData`, `getProPropertiesData`, `getClientPortfolioData` | **Read:** portfolio/property KPIs, comps, progress score. **🔒 `assignProperties`** (reassign `clientId`). **🔒 update a valuation** — *no Pro action exists yet*; would call `propertyValuationsDb.create/update` (flagged §8, §11). |
| **Maintenance / Work Orders** | `MaintenanceItem` (incl. `vendorId`), `Professional` (trade categories: Maintenance, Electrician, Plumber, Inspector) | `rental.computeMaintenanceSummary`, `rental.computeMaintenanceTotal`; query `getWorkOrdersPageData` | **Read:** open queue by severity/client, vendor pool, total open cost. **🔒 `createWorkOrder`** (new MaintenanceItem). **🔒 `updateWorkOrder`** (assign vendor / set `cost` / advance status). |
| **Rent & Leases** | `Lease`, `Tenant`, `Payment` (`Payment.leaseId → Lease`) | `rental.computeCollectionRate` (true $ rate), `rental.computeArrears`, `rental.computeOccupancyRate`, `rental.computeEvictionRisk`, `rental.computeVacancyCost`, `rental.computeUpcomingEvents`; query `getRentPageData` | **Read:** rent roll, overdue triage, expiring leases, occupancy. **🔒 `logRentPayment`**, **🔒 `markRentPaid`**, **🔒 `renewLease`**. |
| **Compliance & Safety** | `Certification`, `Inspection`, `SafetyRisk` | `property-safety.buildPropertySafetySummary` (`complianceLevel`, `nextDueDays`, `openIssueCount`, `issueBreakdown`); query `getCompliancePageData` | **Read:** cert-expiry timeline, open-risk register, inspection log. **🔒 `resolveSafetyRisk`**. Cert/inspection **upload** not built (gap, §11). |
| **Documents / Owner Statements** | `Document` (`category`, `verifies`), the owner-statement payload | `getClientPortfolioData(clientId).ownerStatement` (built by `buildOwnerStatement` over the previous calendar month); `AIWorkspaceAssets` document list | **Read:** find/open documents, **generate** an owner statement (compute + render — read-only preview). **🔒 send/finalize a statement to an owner** — *no send action exists yet* (flagged §8, §11). Produced statements attach to a message via `AiMessage.artifactDocIds`. |

> **Note on `clientId`.** No derivation in `lib/data/derivations/` is grouped by `clientId` —
> portfolio aggregation there is whole-user. The **client partition lives in
> `app/(pro)/pro/queries.ts`** (`getClientPortfolioData(clientId)` and the in-memory grouping in
> `getProDashboardData`). The Portfolio specialist must call the **Pro query layer** for
> client-scoped rollups, not the raw derivations.

---

## 3. Information Architecture

### 3.1 Where the agent lives — overlay, full surface, or both?

**Recommendation: keep it as the existing full-screen overlay, mounted in the Pro shell — not a
separate page.** *Why:* the 3-pane glass overlay (`AIOverlay.tsx`) already gives us Sessions + Chat
+ a right-hand workspace pane; the manager needs the agent *available from every cockpit route
without losing their place*, which an overlay does and a full route does not. A dedicated `/pro/agent`
route would duplicate session/asset chrome and pull the manager out of context.

**What changes vs the consumer overlay:**
1. **Mount it in `ManagerProShell`** (`app/(pro)/pro/_components/ManagerProShell.tsx`) the same way
   `ShellLayout` mounts it today — local `aiOpen` state, `pathname` from `usePathname()`.
2. **Repurpose the right pane** (`AIWorkspaceAssets`) from "documents + portfolio bars" to the
   **Agent Activity** pane (reasoning trace + tool-call log + produced artifacts) — see §5.2.
3. **Add a 4th surface state to the chat stream:** the **inline approval gate** (§5.4, §6.1).

> **Why this matters.** "Mounting" just means rendering the component inside the Pro layout so it's
> present on Pro pages. Right now it literally is not rendered there, so the agent is invisible to
> managers. This is the single highest-leverage wiring step.

### 3.2 Entry points per cockpit route (P1 — proactive)

The agent opens from two existing affordances in `ProAppHeader.tsx` (the ⌘K command-palette button
and the brand area) plus a per-route **opening prompt** the agent shows on first open, derived from
that route's data:

| Route | Trigger | Proactive opening prompt (computed, not hardcoded) |
|---|---|---|
| `/pro/dashboard` | ⌘K → "Ask the agent" | "You have *N* alerts today" from `getProDashboardData().alerts` — offer to triage |
| `/pro/clients` | Header | "Draft this month's owner reports?" (count from client rollups) |
| `/pro/clients/[clientId]` | Header (session pinned to `contextPropertyId`/client) | "Generate *{client.name}*'s statement for *{previous month}*?" |
| `/pro/properties` | Header | "Ask about any property's value, equity, or progress" |
| `/pro/rent` | Header | "*N* tenants overdue totalling *{arrears}*" from `getRentPageData().overdue` |
| `/pro/work-orders` | Header + "Create" menu | "*N* urgent work orders unassigned" from `getWorkOrdersPageData().counts.urgentOpen` |
| `/pro/compliance` | Header | "*N* certs expiring in 90 days" from `getCompliancePageData().summary` |

> The opening prompt reuses the **same query each route already runs server-side**, so it adds no
> new data path — it just phrases the route's own numbers as an invitation.

### 3.3 Session/context model (real entities)

A conversation is an `AiSession` (`lib/data/types/ai-session.ts`: `id`, `title`, `contextRoute`,
`contextPropertyId?`, `status` ∈ `active|archived`). Messages are `AiMessage`
(`sessionId`, `role` ∈ `user|assistant`, `content`, `artifactDocIds?`). On Pro routes:

- `contextRoute` = the `/pro/...` path (so the session remembers it was opened on, e.g., `/pro/rent`).
- `contextPropertyId` is reused as the **client/property pin**: on `/pro/clients/[clientId]` the
  session pins to that client's scope. *(Gap: the schema has `contextPropertyId` but no
  `contextClientId`. v1 recommendation: pin via `contextRoute` carrying the `clientId` segment, and
  defer a dedicated field to v1.x — §11.)*

---

## 4. Screen & Surface Specs

The agent has **one surface** (the overlay) with **three panes** and a defined set of **states**.
Below: layout wireframes, panes, and every state (empty, loading, streaming, awaiting-approval,
error/degraded, success).

### 4.1 Overlay layout (desktop, ≥1024px)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Valgate Agent                                              [⌘K]   [ ✕ close ]  │  ← header (glass)
├───────────────┬──────────────────────────────────────────┬─────────────────────┤
│  SESSIONS     │  CHAT                                       │  AGENT ACTIVITY     │
│ (AISession-   │ (AIChatPane)                                │ (repurposed         │
│  Sidebar)     │                                             │  AIWorkspaceAssets) │
│               │  ┌───────────────────────────────────────┐ │                     │
│ + New chat    │  │ Pinned context: /pro/rent · Book-wide  │ │  ▸ Reasoning trace  │
│               │  └───────────────────────────────────────┘ │     (collapsible)   │
│ ● Rent triage │                                             │                     │
│   Owner stmts │   [user]  who's overdue this month?         │  ▸ Tool-call log    │
│   Client Sok  │                                             │   • read 12 leases  │
│   …           │   [agent] 3 tenants are overdue, totalling  │   • recomputed      │
│               │           $4,200 …                          │     occupancy → 92% │
│ (archive ⌃)   │                                             │                     │
│               │   ┌── APPROVAL GATE (when pending) ───────┐ │  ▸ Artifacts        │
│               │   │ Mark RENT paid for Unit 4B ($1,400)?  │ │   • Owner stmt.pdf  │
│               │   │ [Review details]  [Approve] [Reject]  │ │     (artifactDocId) │
│               │   └───────────────────────────────────────┘ │                     │
│               │                                             │                     │
│               │  ┌─────────────────────────────────────┐    │                     │
│               │  │ Ask or command…           [/] [↑send]│    │  ← input footer      │
│               │  └─────────────────────────────────────┘    │                     │
└───────────────┴──────────────────────────────────────────┴─────────────────────┘
```

- **Sessions pane** — `AISessionSidebar.tsx`, unchanged in structure: list of `AiSession`s with new
  chat + archive (`archiveSession`), online status dot.
- **Chat pane** — `AIChatPane.tsx`: pinned-context chip (new), message log (`AIMessageBubble`,
  `AIThinkingIndicator`, `AIMarkdown`), **inline approval-gate card** (new), input footer.
- **Agent Activity pane** — repurposed `AIWorkspaceAssets.tsx`: three collapsible sections —
  **Reasoning trace**, **Tool-call log**, **Artifacts** (documents the agent produced, via
  `artifactDocIds`, reusing the existing `AIDocumentModal`).

### 4.2 Mobile layout (<1024px)

Reuse the existing `AIOverlay` panel switcher (`"sessions" | "chat" | "assets"`). Add the
**Agent Activity** content under the existing `"assets"` segment. Approval gates render **full-width
in the chat stream** (never in a separate pane) so the consequence and the buttons are always
co-located. Trigger on phone is the existing `MobileAIFab.tsx`.

### 4.3 The input — command bar (Feature 1)

- Free-text `<textarea>` (already present) **plus** a **slash menu** opened by `/` or the `[/]` button.
- Slash menu is the existing `cmdk` component (`components/ui/command.tsx`) rendered as a popover
  anchored to the input.
- Slash commands map to specialists/actions (verbatim, v1 set):
  `/overdue`, `/rent-roll`, `/owner-statement`, `/work-orders`, `/assign-vendor`, `/compliance`,
  `/expiring`, `/value`, `/equity`, `/reassign`. Selecting one inserts a templated prompt the user
  completes (e.g. `/owner-statement` → "Generate owner statement for **[client]** for **[month]**").

### 4.4 States (every surface state, with what the user sees)

| State | Trigger | Chat pane | Activity pane | Motion |
|---|---|---|---|---|
| **Empty** | New session, no messages | Welcome from `buildWelcomeMessage` + **per-route suggested-prompt chips** (§3.2, shipped Phase 1) that pre-fill the composer | "No activity yet" | staggered chip enter (reduced-motion aware) |
| **Loading** | Bootstrap (`getOverlayBootstrap`) | Skeleton bubbles (reuse `ui/spinner.tsx` / shimmer) | Skeleton rows | subtle shimmer |
| **Streaming** | Agent replying | `AIThinkingIndicator` → tokens reveal in `AIMessageBubble` (typing-reveal already exists) | Tool-call rows append **live** as each tool runs (`tool_start`→`tool_result`) | per-row `EnterLi` stagger |
| **Awaiting-approval** | Agent proposes a 🔒 action | Inline **Approval Gate card** (amber accent), input shows "Agent paused — resolve above to continue" | Trace shows the *proposed* call as **pending** (dashed) | card spring-in; pulse on the amber dot |
| **Error / degraded** | Action/server fails, or model unavailable | Red inline notice: generic message + **Retry**; if model down, a "running in basic mode" banner (deterministic fallback) | Failed tool row marked red with the entity it failed on | shake-once on the failed row |
| **Success** | Action approved & committed | Green confirmation bubble naming what changed + a toast (`sonner`) | Tool row flips pending→**done** with a check; artifact appears if any | `ProModalSuccess` spring check |

> **Degraded mode is real, not hypothetical.** If `OPENAI_API_KEY` is unset or the model errors,
> `ai-overlay.actions.ts` already falls back to `generateDeterministicReply`. The UI must *say so*
> ("basic mode") so the manager calibrates trust — a P3 requirement.

---

## 5. Feature Deep-Dives (the four v1 features)

### 5.1 Conversational Command Bar

**Flow.** User types or picks a slash command → `sendMessage({ sessionId, content, pathname })`
(existing server action) → agent routes to a specialist → streams a reply → if a 🔒 action is
implied, emits an **approval gate** instead of acting.

**Components.** `AIChatPane` (input footer + message log), `cmdk` slash popover (`ui/command.tsx`),
`AIMessageBubble` + `AIMarkdown` (reply rendering), `AIThinkingIndicator` (typing), pinned-context
chip (new, small).

**Persistence.** Each turn writes an `AiMessage` (user, then assistant) via `aiMessagesDb.create`;
first user message names the session (`generateSessionTitle`). History caps at the last 20 messages
fed to the model (existing behavior). *Why this matters:* persistence means a manager can close the
overlay mid-task and the conversation — and any pending approval — is still there on reopen.

**Edge cases.** (a) Empty/whitespace send → disabled send button. (b) Slash command with missing
slot (e.g. no client chosen) → agent asks a clarifying question rather than guessing (P2). (c) Sending
into an `archived` session → blocked (`sendMessage` asserts `status === "active"`); UI offers
"Start a new chat." (d) Free-text that matches no specialist → generalist fallback with suggested
slash chips (mirrors `ai-replies.ts` final fallback).

### 5.2 Agent Observability (in property terms)

The right pane is **Agent Activity**, three collapsible sections. Everything is phrased in *property
domain* terms — never raw tokens.

- **Reasoning trace** — a short, readable narration of *what the agent decided and why*: which
  specialist it routed to and the entities in scope. Example line:
  *"Routed to Rent & Leases · scope: Client Sok (12 leases, 9 properties)."*
- **Tool-call log** — one row per data/action call, in plain language with **entity counts and
  client/property names**:
  - "read 12 leases for **Client Sok**" → `getRentPageData` / `leasesDb.list`
  - "recomputed occupancy → **92%**" → `rental.computeOccupancyRate`
  - "computed collection rate → **88%** ($4,200 outstanding)" → `rental.computeCollectionRate`
  - "proposed: mark RENT paid for **Unit 4B**" → `markRentPaid` *(pending until approved)*
- **Token / cost** — **secondary by design.** A single muted line at the bottom of the trace
  ("model: gpt-5-mini · ~1.2k tokens") collapsed by default. We design it but minimize it because the
  manager cares about *which records moved*, not token economics.

> **Why this matters.** A "tool call" is just the agent invoking one of our real functions
> (a query, a derivation, or a server action). Logging them in property terms is the core of P3:
> the manager can audit *exactly* which records were read and which numbers were computed, building
> trust that the answer isn't hallucinated. The vocabulary mirrors the `CopilotEvent`
> `tool_start`/`tool_result` events scaffolded in `convex/copilot/agent.ts`.

**Edge cases.** (a) A read-only question still produces a trace (transparency isn't only for
actions). (b) If a derivation returns an empty set ("0 overdue"), the row says so explicitly rather
than vanishing — silent omission reads as "didn't check." (c) Failed tool → red row naming the
entity it failed on, with the generic error (never `err.message`, per the security rules).

### 5.3 Human-in-the-Loop (the critical layer)

**Which actions gate (P2).** Any action that **alters owner-facing records, schedules paid work,
modifies a valuation, or sends a notice**. Mapped to the real action surface in
`app/(pro)/pro/actions.ts`:

| Gate? | Action | Why it gates |
|---|---|---|
| 🔒 High | `logRentPayment`, `markRentPaid`, `renewLease` | Alters owner-facing financial/lease records |
| 🔒 High | `createWorkOrder`/`updateWorkOrder` **when `cost` is set or a vendor is assigned** | Schedules paid maintenance |
| 🔒 High | `onboardClient`, `assignProperties` | Changes portfolio structure / who owns what |
| 🔒 High | *Modify a valuation* (`propertyValuationsDb` — no Pro action yet) | Modifies a valuation |
| 🔒 High | *Send owner statement / notice* (no send action yet) | Sends an owner-facing notice |
| 🔒 Medium | `resolveSafetyRisk` | Alters a compliance record (lower blast radius) |
| ✅ None | All queries + derivations, owner-statement **preview** | Read-only |

**Capabilities the gate must support:**

- **Pause / resume.** The agent **pauses at the gate** and writes the proposed action as a pending
  state; the input footer shows "Agent paused." Approve → resume and commit; the conversation
  continues. *Backend reality:* the action does not run until Approve is clicked — the gate sits
  *between* the agent's proposal and the call to `app/(pro)/pro/actions.ts`. **Why this matters:**
  nothing touches the database on a "maybe."
- **Override / redirect without restart.** The gate card has an **"Edit & approve"** affordance:
  the manager can change a field (e.g. payment amount, vendor) inline and approve the *corrected*
  action — no need to retype the whole request. This reuses the relevant `ProModal` form
  (`LogPaymentModal`, `AssignVendorModal`, etc.) pre-filled with the agent's proposal.
- **Rollback of a completed action.** After commit, the success bubble shows **"Undo"** for a bounded
  window. Because each action is a discrete DB mutation, rollback is the **inverse mutation**:
  - `markRentPaid` / `logRentPayment` → set the payment back to `Pending`/`Overdue` (or `remove` a
    just-created payment) via `paymentsDb.update`/`remove`.
  - `resolveSafetyRisk` → set `status` back to `"Open"`, clear `resolvedAt`.
  - `assignProperties` → restore the prior `clientId`.
  - `renewLease` → restore prior `endDate`/`renewalStatus`.
  > **Why this matters & a flagged gap:** there is **no rollback action in the codebase today**. v1
  > must add small inverse actions (or capture the pre-image and re-apply it). For irreversible
  > actions (a *sent* notice), there is no undo — the gate copy must say "this can't be undone"
  > and rely on pre-send approval instead. (§11 decision.)

**Edge cases.** (a) Manager closes the overlay with a gate pending → on reopen the gate is still
there (persisted intent). (b) Two gates queued → resolve in order, one visible at a time. (c) Reject
→ agent acknowledges and offers an alternative; nothing commits.

### 5.4 Agent Roster

A compact roster surfaced from the **Sessions pane header** (a "Specialists" disclosure) — *read-only
in v1*, purely to make routing legible (P3). Lists the five specialists from §2.2 with a one-line
scope each and a live count where cheap (e.g. "Compliance & Safety — *N* open risks"). The user does
**not** select a specialist; the roster is an explanation, not a control. *Why:* exposing the roster
as a picker would contradict the "one front door" model and add a decision the manager shouldn't have
to make.

---

## 6. Trust & Safety UX

### 6.1 The approval-gate pattern (the canonical component)

Inline card in the chat stream, amber accent (distinct from success green / error red):

```
┌─ ⏸ Approval needed ─────────────────────────────────────────┐
│  Mark RENT paid — Unit 4B · Client Sok                        │
│  Amount $1,400  ·  Lease LEASE-0007  ·  Method ABA Bank       │
│  This updates an owner-facing payment record.                 │   ← plain-language consequence
│                                                               │
│  [ Review details ▸ ]        [ Reject ]   [ Approve & run ]   │
└───────────────────────────────────────────────────────────────┘
```

- **Title** = the action in human terms. **Body** = the exact fields that will be written (the real
  payload to `app/(pro)/pro/actions.ts`), so there are no surprises.
- **Consequence line** = one sentence on blast radius (P2).
- **"Review details"** expands into the matching `ProModal` form for **Edit & approve** (§5.3).
- **Severity color**: High 🔒 = amber + "owner-facing"/"sends a notice" label; Medium = softer.

### 6.2 The reasoning / tool-call trace

Defined in §5.2. For trust specifically: the trace is **append-only within a turn** and **persists
with the session** so an action can always be explained after the fact ("why did the agent mark this
paid?" → the trace shows it read the lease, saw the matching pending payment, and you approved it).

### 6.3 Audit trail

Every committed action already flows through `app/(pro)/pro/actions.ts` (Zod-validated, logged
internally, `revalidatePro()`). For the agent, the **audit trail = the persisted `AiMessage` stream +
the tool-call log**: the user message (intent), the approval (who clicked Approve, when — captured in
the assistant message metadata), and the action result. *Why this matters:* because actions persist as
messages, the audit trail is a free byproduct of the chat — no separate audit store needed for v1.
*(Gap: `AiMessage` has no structured `action`/`approvedAt` field; v1 can encode the approval as a
typed assistant message; a first-class field is a v1.x schema decision — §11.)*

### 6.4 The trust ramp (P4 — design for evolution)

Per-capability, three rungs the manager climbs as trust grows:

1. **Full oversight (default).** Every 🔒 action gates; full reasoning trace expanded.
2. **Light confirmation.** A single inline confirm ("Approve & run") with the trace collapsed —
   reached after the manager has approved that capability N times without edits.
3. **Auto-run with notice (opt-in, per capability).** The action runs and posts a *reversible*
   success bubble with **Undo**; only offered for **reversible** actions (never "send notice").

The ramp is **per capability** (e.g. you may auto-run `markRentPaid` but still gate `assignProperties`)
and always **downgradable** in one click. *Why this matters:* trust is earned narrowly — a manager who
trusts the agent with rent receipts may not trust it with reassigning a client's whole portfolio.

---

## 7. Component Inventory

Map to **existing** repo components where possible; flag genuinely new ones. *(Reality check: the repo
has a deliberately small `components/ui/` set — `button`, `command`, `dialog`, `sheet`,
`dropdown-menu`, `form`, `input`, `label`, `spinner`, `EmptyState`, `stacked-card-table`,
`table-scroll`, `draggable-sheet`, `phone-sheet`. No `badge`/`card`/`table`/`tabs`/`tooltip` wrappers —
the Pro pages build those with raw Tailwind. The agent UI should match that convention.)*

| UI piece | Existing component to reuse | New? |
|---|---|---|
| Overlay shell (3-pane glass) | `components/layout/AIOverlay.tsx` | reuse + mount in Pro |
| Sessions list | `components/layout/ai-overlay/AISessionSidebar.tsx` | reuse |
| Chat pane / message log | `AIChatPane.tsx`, `AIMessageBubble.tsx`, `AIMarkdown.tsx` | reuse |
| Typing / thinking indicator | `AIThinkingIndicator` (in `AIMessageBubble.tsx`) | reuse |
| Right pane → **Agent Activity** | `AIWorkspaceAssets.tsx` (repurpose) | **modify** |
| Command-bar slash menu | `components/ui/command.tsx` (`cmdk`) | reuse (new usage) |
| Pinned-context chip | raw Tailwind (match Pro chips) | **new (small)** |
| **Approval Gate card** | composed from `ui/dialog.tsx` review + raw-Tailwind inline card; **Edit & approve** reuses `ProModal`/`ProField` (`pro-modal.tsx`) and the concrete modals (`LogPaymentModal`, `AssignVendorModal`, `RenewLeaseModal`, `NewWorkOrderModal`, `OnboardClientModal`) | **new card + reuse modals** |
| Reasoning trace / tool-call log rows | raw Tailwind list + `motion/react` `EnterLi` stagger (`_components/motion-primitives.tsx`) | **new** |
| Artifact cards | existing artifact rendering in `AIMessageBubble` + `AIDocumentModal.tsx` / `PDFViewer.tsx` | reuse |
| Toasts (success/undo) | `sonner` `<Toaster>` (already in `ManagerProShell.tsx`) | reuse |
| Trigger (open agent) | `ProAppHeader.tsx` ⌘K button + `MobileAIFab.tsx` | reuse |
| Empty state | `components/ui/EmptyState.tsx` | reuse |

---

## 8. Data & Action Wiring (beginner-friendly)

For each capability: the real entities, derivations, and server actions — and the
**read vs mutate** distinction in plain language.

> **Read vs mutate — the one concept to hold onto.**
> A **read** (a "query" / a "derivation") *looks at* data and computes a number. It changes nothing,
> so it never needs approval. A **mutate** (a "server action" / a "mutation") *writes* to the data
> store — it changes a record an owner can see. **Why this matters:** the entire trust model is
> "reads are free, mutates are gated." If you can tell which is which, you can tell which agent steps
> need an approval card.

**Read path (no gate).**
- *Functions:* the `getProDashboardData` / `getRentPageData` / `getWorkOrdersPageData` /
  `getCompliancePageData` / `getClientPortfolioData` queries in `app/(pro)/pro/queries.ts`, plus the
  pure derivations in `lib/data/derivations/*`. **Why this matters:** these all run under
  `getCurrentUserId()` and only *read* the local-db (`public/data/users/demo-user/...`); a thousand of
  them in a row still can't break anything.

**Mutate path (gated, P2).**
- *Functions:* the eight actions in `app/(pro)/pro/actions.ts` — `logRentPayment`, `markRentPaid`,
  `renewLease`, `createWorkOrder`, `updateWorkOrder`, `onboardClient`, `resolveSafetyRisk`,
  `assignProperties`. Each is `"use server"`, Zod-validates its input, returns
  `ProActionResult` (`{ok:true} | {ok:false; error}`), logs internally, and calls
  `revalidatePro()` so the cockpit re-renders with fresh data. **Why this matters:** the agent must
  call *these exact functions* — not invent its own DB writes — so that validation, authorization, and
  cache-busting all happen exactly as they do when a human clicks the button.

**Agent ↔ data flow (plain language).**
```
user message → sendMessage() → agent routes to specialist
   → specialist runs READS (queries/derivations) to gather facts  [logged in tool-call log]
   → if the answer requires a WRITE → emit Approval Gate (PAUSE)   [no DB write yet]
        → Approve → call the matching app/(pro)/pro/actions.ts action → revalidatePro()
        → assistant message records the result; success/undo shown
   → else → stream a read-only answer
```

**Flagged wiring gaps (must be decided/built — see §11):**
- **Streaming.** `ai-overlay.actions.ts` uses `generateText` (request/response). True token streaming
  needs `streamText` (Vercel AI SDK) or wiring the Convex `copilot/agent.ts` `token`/`final` events.
  *Why this matters:* without it, "streaming" is a UI illusion (the typing-reveal animates an
  already-complete reply) — acceptable for v1, but say so.
- **Tool-calling.** Today the model returns prose; routing is a keyword waterfall (`ai-replies.ts`).
  For the agent to *take actions*, the model needs structured **tool calls** mapping to the eight
  actions. The `CopilotEvent` `tool_start`/`tool_result` scaffold in `convex/copilot/agent.ts` is the
  intended home for this.
- **Missing actions.** Update-valuation and send-owner-statement have **no server action** yet.
- **Rollback actions.** No inverse mutations exist (§5.3).

---

## 9. Motion & Micro-interaction Notes

Use the repo's animation stack: **`motion@12.23.24`** (`motion/react`) and the Pro
`_components/motion-primitives.tsx` helpers (`SectionEnter`, `EnterTr`, `EnterLi`, `DrawInBar`,
`CountUpText`), all of which already honor `useReducedMotion`. **All motion must respect
`prefers-reduced-motion`** (existing convention).

- **Streaming.** `AIThinkingIndicator` ("Valgate Agent is working…") → typing-reveal in
  `AIMessageBubble` (exists). Tool-call rows append with `EnterLi` stagger (~40ms) so the manager
  *sees* the agent working through records, not a sudden dump (P3).
- **State transitions.** Empty→loading→streaming use `SectionEnter` fade-up; numbers in the trace
  (occupancy %, $ collected) use `CountUpText` for the final computed value.
- **Approval moment (the most important).** The gate card **springs in** and an **amber dot pulses**
  to mark the pause — a deliberate, slightly heavier motion than normal bubbles so the consequence
  *feels* like a stop, not a step (P2). On Approve: the card collapses, a `ProModalSuccess`-style
  spring check plays, and a `sonner` toast confirms. On Reject: a quiet fade, no celebration.
- **Degraded/error.** A single shake-once on the failed row; never a looping or alarming animation.

---

## 10. Phased Build Plan

**v1 must-haves (sequenced):**
1. **Mount + Pro-aware context.** Render `AIOverlay` in `ManagerProShell`; add a `/pro/*` +
   `clientId` branch to `buildAiOverlayContext` and a Pro `promptContext` section. *(Unblocks
   everything; pure wiring.)*
2. **Command bar.** Slash menu (`cmdk`) + pinned-context chip + the v1 slash set (§4.3).
3. **Observability pane.** Repurpose `AIWorkspaceAssets` → Agent Activity (reasoning trace +
   tool-call log + artifacts), in property terms.
4. **Tool-calling + the read specialists.** Give the model structured tool calls for the **read**
   queries/derivations first (no risk), emitting `tool_start`/`tool_result` to the trace.
5. **Human-in-the-loop gates.** Approval Gate card + pause/resume + Edit-&-approve (reuse `ProModal`s),
   wired to the eight `app/(pro)/pro/actions.ts` actions.
6. **Rollback + trust ramp.** Inverse mutations for reversible actions; per-capability ramp (§6.4).
7. **Streaming (optional within v1).** Swap `generateText` → `streamText` (or Convex `token` events).
   If deferred, ship the typing-reveal illusion and label it.

**Deferred to 🔵 v1.x (named only, not designed here):**
- 🔵 **Scheduled property actions** — rent reminders, certification-expiry nudges (recurring agent runs).
- 🔵 **Memory / RAG document grounding** — the `ragSearch` + `copilot_index` path stubbed in
  `convex/copilot/agent.ts`, so the agent can cite specific `Document`s.

### Design-craft loop (Mobbin references + `/impeccable`)

Each phase that ships UI runs the same two-step craft loop *before* it's considered done:

1. **Reference (Mobbin MCP).** Pull real shipped patterns for the surface in play (see §12) so
   the design starts from proven anatomy, not a blank page. Search per-surface, not generically.
2. **Polish (`/impeccable`).** Run the fitting skill, then fix what it finds:
   - `/impeccable shape` — *before* building a new surface (Phases 3, 5), to settle UX/states first.
   - `/impeccable polish` + `/impeccable layout` + `/impeccable typeset` — after each UI phase,
     for spacing/alignment/type micro-craft toward the glass design system.
   - `/impeccable animate` — for the streaming, approval, and trace motion (Phase 5–7).
   - `/impeccable harden` — for empty/loading/error/awaiting-approval states (§4.4) before ship.
   - `/impeccable critique` — as the design gate at the end of each phase (scored review).

> This is a *process* note, not new scope: it formalizes how we hit the quality bar, and is why
> the Phase 1 refresh (header trigger + proactive chips) already went through `/impeccable polish`.

---

## 11. Open Questions & Decisions Needed

Each has a recommended answer + one-line rationale (override freely).

1. **Model choice for the agent.** Code uses `openai("gpt-5-mini")`. **Recommend** evaluating a
   **Claude model with native tool-use** (e.g. Sonnet 4.6 for cost/latency, Opus for hard routing) for
   the action-taking agent. *Why:* the agent's core need is reliable structured tool-calling and
   refusal-on-uncertainty, which Claude tool-use handles cleanly; keep the deterministic fallback.
   *(Per the project's "default to latest Claude models" guidance — confirm before changing the
   provider.)*
2. **Streaming in v1 or v1.x?** **Recommend** ship the typing-reveal illusion in v1, do real
   `streamText` in step 7 only if time allows. *Why:* token streaming is polish; tool-calling +
   approval gates are the trust-critical work.
3. **Client pin has no schema field.** `AiSession` has `contextPropertyId` but no `contextClientId`.
   **Recommend** encode the client in `contextRoute` for v1; add `contextClientId` in v1.x. *Why:*
   avoids a schema migration for a v1 that's mostly UI.
4. **Rollback for irreversible actions.** **Recommend** no undo for "send notice"; rely on pre-send
   approval copy ("this can't be undone"). *Why:* you can't unsend; pretending otherwise erodes trust.
5. **Missing actions (update-valuation, send-statement).** **Recommend** scope them as small new
   actions in `app/(pro)/pro/actions.ts` (mirroring the existing eight) rather than letting the agent
   write the DB directly. *Why:* keeps validation/auth/revalidation uniform with human-clicked paths.
6. **Audit fields on `AiMessage`.** **Recommend** v1 encodes approvals as typed assistant messages;
   add a structured `action`/`approvedAt` field in v1.x. *Why:* ships the audit trail now without a
   schema change.
7. **Roster as picker?** **Recommend** keep the roster read-only (explanation, not control). *Why:*
   preserves the single-front-door model; specialist selection is the agent's job, not the manager's.

---

## 12. Design references (Mobbin)

Real shipped patterns that ground each surface. Pulled via the Mobbin MCP (web platform);
open any link to study the actual screen. Each row notes what the reference validates or sharpens.

### Conversational command bar (§5.1)
| Reference | What it informs |
|---|---|
| [Google AI Studio — slash menu](https://mobbin.com/screens/d3212a1c-a0f1-49fb-835c-737c0117c3bd) | Confirms our slash-row anatomy: **command · title · one-line description**, with a `/` hint inside the composer. |
| [WRITER — assistant home](https://mobbin.com/screens/9652aa1a-2aeb-469c-8a84-12d4d01c788c) · [Apollo — presets](https://mobbin.com/screens/d365d8bf-344d-482d-88fa-d14564386be8) · [Sana AI](https://mobbin.com/screens/eb1a7750-d1c0-4b4c-8fc0-2ec45ef08cfa) | **Suggested-prompt chips / presets under the composer** → the per-route opening prompts (§3.2), shipped in the Phase 1 refresh. |
| [Replit — ⌘K palette](https://mobbin.com/screens/fe8a0440-f708-4c0b-a760-7ad95ee493a7) · [Zoho "Ask Zia" — action pill](https://mobbin.com/screens/e35d3450-b33e-4a26-8274-d859854688f3) | Command-palette and in-composer **action-mode** affordances (cmdk stays the ⌘K palette; the slash menu is inline). |

### Docked copilot beside the cockpit (§3.1)
| Reference | What it informs |
|---|---|
| [Linear — docked explain panel](https://mobbin.com/screens/51c2bd60-f22d-4879-8c28-c5800ac1f4b6) | Right-docked answer panel with a **"Skills" selector** ≈ our invisible specialist routing. |
| [WRITER — 3-pane (sessions · chat · Computer/Deliverables)](https://mobbin.com/screens/87f84b1b-d3cc-49d0-9d9e-4c546573fc56) | Near-exact match for our 3-pane overlay + the repurposed **Agent Activity** pane. |
| [Clay — "In Scope" settings](https://mobbin.com/screens/69acadc0-387a-48dc-ac38-cfa61624a9a0) · [Rows — "Context switched to…"](https://mobbin.com/screens/dd5651b0-9740-4616-9f31-e6f0e24c14d4) | The **pinned-context / scope** signal (shipped as the Phase 2 chip) and a clarifying-questions toggle (supports P2). |

### Approval gate (§5.3, §6.1)
| Reference | What it informs |
|---|---|
| [Navan — "Review budget details"](https://mobbin.com/screens/fcd83dba-b995-477e-99c5-a18fa02a0d5b) | The canonical **label → value review list** of the exact payload before commit — adopt for the gate body. |
| [Perplexity — "Confirm Details"](https://mobbin.com/screens/0b0c113b-0bc4-4d1d-b23c-0d5601223dd8) | **Edit pencils** on each field → our "Edit & approve" / redirect-without-restart. |
| [Glide — "Review and Confirm" (Applying…)](https://mobbin.com/screens/d0be3c93-4c13-4580-a18c-98422f1bcfd5) | The **loading state on the confirm button** after Approve (pause → committing). |

### Agent activity / reasoning trace (§5.2)
| Reference | What it informs |
|---|---|
| [WRITER — Blueprints execution log](https://mobbin.com/screens/b4919719-e44c-4874-bcb8-69ce472d6c58) | Per-step rows (state · result · duration) each with an expandable **Trace** → our tool-call log in property terms. |
| [WRITER — Computer/Deliverables status](https://mobbin.com/screens/87f84b1b-d3cc-49d0-9d9e-4c546573fc56) | Live tool/provider **status rows** → "read 12 leases", "recomputed occupancy". |
| [Braintrust — trace + metrics](https://mobbin.com/screens/eeca0b54-0262-4eef-8a76-f548fe84a384) | **Tokens/cost as a secondary, collapsed metric** — confirms keeping cost minimized (§5.2). |

---

## Out of scope (v1) — with reasons

- **Drag-and-drop visual workflow builder.** *Managers triage and act; they don't program flows — it
  would add a builder no one asked for and contradict the "ask in English" model.*
- **Integration hub / OAuth connectors.** *v1 grounds entirely in the local-db / Pro query layer; no
  third-party data sources are in scope.*
- **Multi-agent orchestration canvas.** *The generalist→specialist routing is invisible by design
  (§2.1); a canvas would expose plumbing the manager shouldn't manage.*
- **Separate analytics dashboard.** *The cockpit (`/pro/dashboard`, `/pro/rent`, etc.) already is the
  dashboard; the agent interrogates it, it doesn't duplicate it.*

---

### Appendix — files this spec is grounded in
Types `lib/data/types/*.ts` · DB `lib/data/db/*.ts` · Derivations `lib/data/derivations/*.ts`
(incl. `progress.ts`, `analytics.ts`, `property-financials.ts`, `rental.ts`, `portfolio.ts`,
`portfolio-snapshot.ts`, `property-safety.ts`, `property-comparables.ts`) · AI plumbing
`lib/data/derivations/ai-context.ts`, `ai-replies.ts`, `lib/actions/ai-overlay.actions.ts`,
`convex/copilot/agent.ts` · Overlay UI `components/layout/AIOverlay.tsx` + `ai-overlay/*` +
`ShellLayout.tsx` + `MobileAIFab.tsx` · Pro cockpit `app/(pro)/pro/**` (`queries.ts`, `actions.ts`,
`_components/*`, route `_components/*`) · Design system `components/ui/*`, `motion@12.23.24`, `sonner`.
