# Valgate for iPhone — Build Plan

> **Written:** 2026-08-11 · **Status:** proposal, not started
> **Prerequisite:** the web app is live in production — see `docs/plans/PUBLIC-LAUNCH-PLAN.md`
>
> A native iPhone app in Swift, in a **new repository**, talking to the existing Valgate backend.
>
> **Backend and iOS-platform steps are written for a beginner** — each explains what a thing is
> and why it exists before telling you to do it. UI and interaction steps assume your existing
> design expertise and stay out of your way.

---

## Table of contents

- [1. The one decision that shapes everything](#1-the-one-decision-that-shapes-everything)
- [2. Target architecture](#2-target-architecture)
- [3. What to build, in order](#3-what-to-build-in-order)
  - [Phase A — Build the API the phone will talk to](#phase-a--build-the-api-the-phone-will-talk-to)
  - [Phase B — iOS project skeleton and sign-in](#phase-b--ios-project-skeleton-and-sign-in)
  - [Phase C — Read-only app](#phase-c--read-only-app)
  - [Phase D — Writing data, and the reason the app exists](#phase-d--writing-data-and-the-reason-the-app-exists)
  - [Phase E — Make it feel native](#phase-e--make-it-feel-native)
  - [Phase F — Ship to the App Store](#phase-f--ship-to-the-app-store)
- [4. Effort and sequencing](#4-effort-and-sequencing)
- [Appendix A — App Store requirements that catch people out](#appendix-a--app-store-requirements-that-catch-people-out)
- [Appendix B — Repository layout](#appendix-b--repository-layout)
- [Appendix C — Decisions you need to make](#appendix-c--decisions-you-need-to-make)

---

## 1. The one decision that shapes everything

### The problem: there is no API to call

This is the single most important fact in this document, and it is not obvious.

The Valgate web app does not have a REST API. It reads data by calling
`lib/services/*` directly inside React Server Components, and it writes data through **Server
Actions** — the 28 files in `app/actions/`.

A Server Action looks like a normal function you call from a React component, but it is not one.
Next.js compiles it into an HTTP endpoint with a generated, encrypted action ID, and the request
and response use a React-internal wire format that changes between framework versions. It is an
implementation detail of Next.js, not a contract.

**Swift cannot call a Server Action.** Not "it would be awkward" — there is no supported way to do
it, and any hack you built would break on your next `next` upgrade.

The only JSON-over-HTTP endpoints that exist today are:

| Route | Purpose | Usable by an iPhone app? |
|---|---|---|
| `/api/add-property/scan` | AI document scan | Partially — it is a single feature endpoint |
| `/api/documents/[id]/summarize` | AI summary | Partially — same |
| `/api/cron/cleanup-drafts` | Nightly job | No |
| `/api/webhooks/clerk`, `/api/webhooks/resend` | Inbound webhooks | No |
| `/mcp` | 16 tools for AI clients | **Technically yes, but don't** — see below |

So **an API has to be built.** That work is Phase A, it happens in the *existing* Next.js repo,
and it is the bulk of the backend effort in this plan.

### Why not just point the iPhone app at `/mcp`?

It is tempting. `/mcp` already speaks JSON over HTTP, already authenticates with Clerk, already
has 16 working tools covering properties, leases, tenants and payments, and already enforces
org-scoping and roles.

Don't. MCP is JSON-RPC designed for *language models* calling tools:

- **Wrong granularity.** `search_properties` returns whatever an LLM finds useful to read. A
  portfolio list screen needs specific fields, sorted, paginated, and small enough for a phone
  on cellular data.
- **No pagination.** Fine for an AI summarising ten properties. Not fine for scrolling.
- **Schemas tuned for AI.** Verbose descriptions, loose types, prose error messages.
- **Coupled roadmap.** Every change you make for the phone would change what Claude sees, and
  vice versa. Two consumers, one schema, constant friction.

Use it as a *proof* instead: `/mcp` demonstrates that the service layer works over HTTP with Clerk
tokens and no web session. Phase A reuses that proof, not that endpoint.

### Why not rebuild the backend in Swift?

Because `lib/services/*` — roughly 70 modules — already contains every business rule, validation,
org-scoping check and role gate in Valgate. Rewriting that in Swift/Vapor means maintaining two
implementations of the same rules forever, and the day they diverge is the day the phone lets
someone do something the web forbids.

**One backend, two clients.** That is the whole architecture.

---

## 2. Target architecture

```
┌──────────────────────────┐         ┌──────────────────────────┐
│   iPhone app (Swift)     │         │   Web app (Next.js)      │
│   NEW REPO               │         │   EXISTING REPO          │
│   SwiftUI + Clerk iOS    │         │   React + Server Actions │
└───────────┬──────────────┘         └────────────┬─────────────┘
            │ HTTPS + Bearer JWT                  │ in-process
            ▼                                     │
┌──────────────────────────┐                      │
│  NEW: /api/v1/*          │                      │
│  JSON REST, in the       │                      │
│  existing Next.js repo   │                      │
└───────────┬──────────────┘                      │
            │                                     │
            ▼                                     ▼
    ┌──────────────────────────────────────────────────┐
    │  lib/services/*  — transport-pure, takes a Ctx   │
    │  ALL business rules live here. Unchanged.        │
    └───────────────────────┬──────────────────────────┘
                            ▼
                    Neon Postgres · S3
```

### The seam that makes this cheap

Two properties of the existing codebase make Phase A far smaller than it looks:

**1. The service layer is already transport-pure.** `CLAUDE.md` rule C2 says every service module
takes a `Ctx` and never imports Clerk or Next.js. It does not know or care whether the caller is a
web page, an AI client, or an iPhone.

**2. The auth seam already exists and is proven.** `mcp-server/ctxFor.ts` has
`ctxFromMcpAuth(clerkUserId)`, which turns a Clerk user id into a full `Ctx` —
`{ userId, orgId, orgRole }` — with **no web session involved**. It resolves the user's org
memberships, picks one deterministically, and bootstraps a brand-new user who has never opened the
website (`provisionMcpUser`). It even handles the multi-org case properly: reads fall back to a
stable primary org, writes refuse to guess and throw `org_required`.

That function is exactly what the mobile API needs. Phase A largely wires it to a new transport.

### How authentication will work

The Clerk iOS SDK (`clerk-ios`, official, SwiftUI-native) handles sign-in on the device and exposes
a JWT:

```swift
// Sign in natively — no web view
let signIn = try await clerk.auth.signIn("user@example.com")
let result = try await signIn.authenticateWithPassword(password)

// Get the token for our own API. The SDK refreshes this automatically in the background.
if let token = Clerk.shared.session?.lastActiveToken?.jwt {
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
}
```

Server side, `/api/v1/*` verifies that token with Clerk, extracts the Clerk user id, and calls
`ctxFromMcpAuth(clerkUserId)` to get a `Ctx`. From there, every service call is org-scoped and
role-checked automatically — **the same guarantees the website has, for free.**

This is the key reason the plan is as short as it is.

---

## 3. What to build, in order

### Phase A — Build the API the phone will talk to

**Where:** the existing Next.js repo. **Not** the new Swift one.
**Why first:** you cannot build a client for an API that does not exist. Also, this phase is
testable on its own with `curl` — no Xcode, no device, no App Store account.

---

#### A.1 — The authentication middleware

Create `lib/api/auth.ts`: a helper that takes a request, reads the `Authorization: Bearer …`
header, verifies the token with Clerk, and returns a `Ctx`.

Model it directly on `app/mcp/route.ts`, which already does this. The difference is the token
type: `/mcp` validates OAuth *machine tokens* (`verifyClerkToken` from `@clerk/mcp-tools`), while
the iOS SDK issues standard *session tokens*. Clerk's backend SDK verifies both, but through
different calls — check Clerk's current docs for the session-token path rather than copying the
MCP one verbatim.

Then reuse `ctxFromMcpAuth()` unchanged. Consider renaming it to `ctxFromClerkUserId()` in the same
commit, since it will no longer be MCP-specific — a mechanical rename with two call sites.

Error handling: return `401` with a generic body for every auth failure. Never tell the client
*which* check failed — unknown user, no membership, wrong org all look identical from outside, and
the specific reason is logged server-side. `ctxFromMcpAuth` already follows this convention.

#### A.2 — Decide the API shape

Suggested surface for v1, deliberately small:

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/v1/me` | current user, org, role |
| `GET` | `/api/v1/workspaces` | orgs the user belongs to (`listWorkspacesForUser` already exists) |
| `GET` | `/api/v1/properties` | paginated list for the portfolio screen |
| `GET` | `/api/v1/properties/:id` | one property, full detail |
| `POST` | `/api/v1/properties` | create |
| `PATCH` | `/api/v1/properties/:id` | update |
| `DELETE` | `/api/v1/properties/:id` | delete |
| `GET` | `/api/v1/properties/:id/documents` | document list |
| `POST` | `/api/v1/properties/:id/documents` | presigned upload, mirroring the web path |
| `GET` | `/api/v1/properties/:id/rental` | leases, tenants, payments |
| `POST` | `/api/v1/scan` | AI document scan — wrap the existing `/api/add-property/scan` |

Three rules to hold to:

- **Version it.** `/api/v1/` from day one. Old app versions live on people's phones for months
  after you ship a new one; you cannot deploy a breaking change to the client the way you can on
  the web. This one prefix is what lets you evolve without stranding users.
- **Return exactly what the UI renders.** `CLAUDE.md` already forbids sending full DB objects to
  clients. On mobile it is also a performance rule — cellular data, small screens.
- **Paginate every list.** Cursor-based, not offset. A user with 400 properties should not receive
  400 rows.

#### A.3 — Validation and errors

Every request body goes through Zod before touching the database, exactly as the Server Actions do.
Treat the iPhone as hostile input — it is a client you do not control, and a modified build can
send anything.

Define one error envelope and use it everywhere, so the Swift client writes one decoder:

```json
{ "error": { "code": "not_found", "message": "Property not found" } }
```

`code` is a stable machine string the app can branch on. `message` is human-readable and safe to
show. **Never** put `err.message` from a caught exception in there — log internally, return
generic. This is an existing rule in `CLAUDE.md`; it matters more here because mobile crash logs
end up in third-party dashboards.

#### A.4 — Rate limiting

Apply the existing `lib/ratelimit.ts` per user. A buggy app version stuck in a retry loop on a
thousand phones is a self-inflicted denial of service, and unlike a web bug you cannot hotfix it —
users have to update.

⚠️ This makes the Upstash configuration from the web launch plan (Step 3.4) genuinely load-bearing
rather than nice-to-have. The in-memory fallback does not work across serverless instances.

#### A.5 — Test it before writing any Swift

Write integration tests hitting the routes with a real token, following the pattern in
`tests/authz/`. At minimum:

- A user cannot read another org's property (IDOR)
- A `viewer` cannot write
- A malformed body returns `400` with the error envelope, not a `500`
- An expired token returns `401`

Then exercise it by hand with `curl`. **Do not open Xcode until this phase is green.** Debugging a
new API through a new client in an unfamiliar language is three unknowns at once.

---

### Phase B — iOS project skeleton and sign-in

**Where:** the new Swift repository.

#### B.1 — Prerequisites

- **A Mac.** Non-negotiable; Xcode is macOS-only.
- **Xcode**, from the Mac App Store.
- **Apple Developer Program — $99/year.** Required to test on a physical device and to ship.
  Enrolment can take a few days if Apple verifies your identity, so **start this early**, in
  parallel with Phase A.

#### B.2 — Project setup

- **SwiftUI**, not UIKit. Declarative, closest to the React model you already think in.
- **Minimum iOS 17.** The Clerk SDK's `@Observable` state model wants it, and iOS 17+ covers the
  overwhelming majority of active iPhones. Going lower costs you modern SwiftUI for little reach.
- **Swift Package Manager** for dependencies — built into Xcode, no CocoaPods.
- Add `clerk-ios` as the first and, ideally, only dependency for a long while.

#### B.3 — Sign-in

Configure Clerk at launch with your **production** publishable key:

```swift
let clerk = Clerk.configure(publishableKey: "pk_live_…")
```

Build sign-in, sign-up and sign-out against the SDK's native methods. The SDK exposes an
`@Observable` `Clerk.shared`, so SwiftUI views react to auth state automatically — no manual
listener wiring.

⚠️ **Sign in with Apple is effectively mandatory.** If the app offers any third-party login (Google
etc.), App Store review requires an equivalent privacy-preserving option, and Sign in with Apple is
the one that qualifies. Clerk supports it — enable it in the Clerk dashboard and add it here, not
later. Retrofitting an auth method after users exist is painful. See Appendix A.

#### B.4 — The API client

One small networking layer: a struct that holds the base URL, attaches the Bearer token to every
request, decodes the success payload or the error envelope from A.3, and surfaces typed errors.

Skip the third-party networking library. `URLSession` with `async/await` covers all of this in
well under a hundred lines, and it is one fewer thing to keep current.

**Milestone for this phase:** the app signs in and successfully calls `GET /api/v1/me`, displaying
the user's name. Nothing else. That single round trip proves the entire chain — Clerk on device →
token → verification → `ctxFromClerkUserId` → service layer → JSON → Swift decode. Everything after
it is comparatively routine.

---

### Phase C — Read-only app

A useful app that cannot yet change anything. Shipping read-only to TestFlight first is a
deliberate de-risking move: bugs are embarrassing, not destructive.

Screens, in build order:

1. **Portfolio list** — the home screen. Property cards, pull-to-refresh, infinite scroll on the
   cursor pagination from A.2.
2. **Property detail** — mirroring the web tabs: overview, location, documents, ownership, rental,
   valuation.
3. **Map view** — properties as pins. Use **MapKit**, not Mapbox: it is built into iOS, free, has
   no token to manage, and feels native. The web app's Mapbox usage does not need to be mirrored.
4. **Document viewer** — `QuickLook`, Apple's built-in previewer. Handles PDF, images and Office
   formats with no code and no dependency.
5. **Settings / profile** — read-only for now, plus sign-out.

This is your domain. Two notes worth having anyway:

- **Build for the phone, not the desktop.** The web portfolio table has no business being a table
  on a 6-inch screen. Rethink the layout rather than porting it.
- **Every screen has four states** — loading, empty, error, loaded. On a phone, network failure is
  normal, not exceptional. Design the error state properly; users will see it in a lift.

---

### Phase D — Writing data, and the reason the app exists

This is where a native app stops being a worse version of the website and starts being better.
Everything here is something the web genuinely cannot do well.

**In priority order:**

#### D.1 — Capture a document with the camera 🔑

The killer feature. Someone is standing in a property holding a title deed. They photograph it,
`VisionKit`'s `DataScannerViewController` gives them automatic edge detection and perspective
correction — the same scanner as the Notes app, essentially free to adopt — and it uploads straight
into the property.

Wire it to the existing AI scan pipeline via `/api/v1/scan`. That pipeline is already tuned for
handwritten Khmer with self-consistency sampling. On the web the user has to find a scanner, make a
PDF, and upload it. On the phone it is three taps in the room where the document is.

**Build this first, and build it well.** It is the entire argument for the app existing.

#### D.2 — Add a property, on location

Same wizard as the web, but shorter, and with two things the browser cannot match: `CoreLocation`
pre-fills the address from where the user is standing, and the camera captures the photos directly
rather than requiring a transfer.

#### D.3 — Edit property details

The straightforward `PATCH` cases. Nothing clever.

#### D.4 — Log a rental payment

Small, frequent, and exactly the kind of task that suits a phone. Two taps from launch.

⚠️ **Write operations need care that reads do not.** A phone loses signal mid-request routinely.
Every write must be idempotent or safely retryable — otherwise a user in a lift with one bar
creates the same property three times. The usual approach is a client-generated request id the
server deduplicates on. Decide this before writing D.1, not after a support ticket.

---

### Phase E — Make it feel native

Optional individually, collectively the difference between "a website in an app icon" and
something people keep.

| Feature | Why | Effort |
|---|---|---|
| **Offline reading** | Cache the portfolio locally with SwiftData so the app opens instantly and works in a basement. The single biggest perceived-quality win. | Medium |
| **Push notifications** | Lease expiring, payment overdue, document processed. Needs APNs setup and a server-side sender. | Medium |
| **Face ID / Touch ID lock** | Financial and property data on a phone that gets handed around. `LocalAuthentication`, small. | Small |
| **Home screen widget** | Portfolio value or upcoming payments at a glance. `WidgetKit`. | Small |
| **Share sheet** | Share a PDF into Valgate from Files or Mail. Real workflow value. | Medium |
| **Siri / App Intents** | "Hey Siri, add a property to Valgate." Nice, rarely load-bearing. | Medium |

**Recommended for v1: offline reading and Face ID.** Both are quiet, both are felt immediately.
Defer the rest until you have users telling you what they miss.

---

### Phase F — Ship to the App Store

#### F.1 — TestFlight

Apple's beta distribution. Upload a build, invite testers by email, they install through the
TestFlight app. Internal testing (up to 100 people on your team) needs no review; external testing
needs a lightweight review, usually a day or two.

Use it properly — at least two weeks with real people on real phones on real networks. Simulator
testing hides everything that actually breaks: slow networks, low storage, backgrounding mid-upload,
older devices.

#### F.2 — App Store submission

You will need, and should prepare before you start the form:

- **App icon**, 1024×1024
- **Screenshots** for each required device size
- **Description, keywords, support URL, marketing URL**
- **Privacy policy URL** — from the web launch plan, Phase 2. Mandatory.
- **Privacy nutrition labels** — a detailed declaration of every category of data you collect and
  what you do with it. Budget real time; it is more granular than people expect and Apple checks it
  against observed behaviour.
- **A demo account** for the reviewer, with data in it. An app that shows an empty state to the
  reviewer gets rejected as "incomplete."
- **Age rating questionnaire**

Review typically takes 24–48 hours. **Expect at least one rejection.** It is normal, not a
judgement. Read the exact guideline cited, fix precisely that, resubmit. Appendix A lists the ones
most likely to catch this app.

---

## 4. Effort and sequencing

Honest estimates for one person who is expert in frontend and learning backend and Swift
simultaneously. Swift and SwiftUI are genuinely new languages and frameworks — the React
intuition transfers, the syntax and platform do not.

| Phase | Work | Where | Estimate |
|---|---|---|---|
| **A** | REST API, auth middleware, validation, tests | Existing Next.js repo | **2–3 weeks** |
| **B** | Xcode project, Clerk sign-in, API client | New Swift repo | **1–2 weeks** |
| **C** | Read-only screens | New Swift repo | **3–4 weeks** |
| **D** | Camera capture, add property, edits | New Swift repo | **3–4 weeks** |
| **E** | Offline, Face ID | New Swift repo | **1–2 weeks** |
| **F** | TestFlight, submission, review | Both | **2–3 weeks** |

**Total: roughly 3–4 months** at a steady pace. Faster if you narrow Phase C, slower if Swift is
brand new — the first two weeks in a new language are always the slowest.

**Start immediately, in parallel with everything else:** Apple Developer Program enrolment. It is
the only item with an external clock you do not control, and every device test and every submission
is blocked behind it.

**Sequencing against the web launch:** do not start Phase A until the web app is live and stable.
Building an API for a product still changing shape means building it twice.

---

## Appendix A — App Store requirements that catch people out

These reject apps routinely. Verify the current wording in Apple's guidelines before submitting —
they change, and this list was written on 2026-08-11.

| Guideline | Requirement | What it means here |
|---|---|---|
| **5.1.1(v)** | Apps supporting account **creation** must support account **deletion** — in the app, not via email | You must build a "Delete my account" flow that actually deletes. This has backend consequences: cascading deletes across properties, documents and **S3 objects**. Ties directly to the `s3:DeleteObject` permission in the web launch plan. **Plan for this in Phase A**, not the week before submission. |
| **4.8** | Offering third-party login requires offering an equivalent privacy-preserving option | Sign in with Apple, enabled in Clerk. Build it in Phase B. |
| **5.1.1** | Privacy policy required, and accurate | From the web plan, Phase 2. Must disclose the OpenAI sub-processor — you send user document contents to it. |
| **2.1** | Reviewer must be able to fully evaluate the app | Provide a demo account **with realistic data**. Empty states get rejected. |
| **Privacy labels** | Declare every data type collected | Must match actual behaviour. Over-declaring is safe; under-declaring is a rejection or worse. |
| **3.1.1** | Digital goods must use in-app purchase | Only relevant if Valgate ever charges a subscription. If so, Apple takes 15–30% and you must use IAP for in-app upgrades. Worth knowing before you design pricing. |

**Account deletion is the one to internalise.** It is a genuine backend feature, it is mandatory,
and it is discovered late by almost everyone.

---

## Appendix B — Repository layout

**New repo — suggested name `valgate-ios`.** Separate from the web app because it has a different
language, toolchain, CI, and release cadence — App Store releases are gated on review; web deploys
are not.

```
valgate-ios/
├── Valgate.xcodeproj
├── Valgate/
│   ├── App/                 # entry point, Clerk configuration
│   ├── Auth/                # sign-in, sign-up, session state
│   ├── Networking/          # API client, error envelope, models
│   ├── Features/
│   │   ├── Portfolio/
│   │   ├── PropertyDetail/
│   │   ├── AddProperty/
│   │   ├── DocumentScanner/
│   │   └── Settings/
│   ├── DesignSystem/        # colours, type, spacing, shared components
│   └── Resources/
├── ValgateTests/
└── README.md
```

**Keep the API contract in the web repo**, next to the routes that implement it. One source of
truth. If drift becomes a problem later, generate Swift models from an OpenAPI spec — but do not
build that machinery before you have felt the pain.

---

## Appendix C — Decisions you need to make

| # | Decision | Recommendation |
|---|---|---|
| 1 | **REST API in the Next.js repo, or a separate backend service?** | In the Next.js repo. It reuses `lib/services/*` in-process with zero duplication, deploys with everything else, and needs no new infrastructure. Split it out only if the web app and API ever need to scale differently — they won't for a long time. |
| 2 | **iPad support?** | Not in v1. SwiftUI makes it *possible* to support both, but "possible" is not "good" — a proper iPad layout is real design work. Ship iPhone, learn, then decide. |
| 3 | **Minimum iOS version?** | iOS 17. Modern SwiftUI, `@Observable` for the Clerk SDK, and near-total device coverage. |
| 4 | **MapKit or Mapbox?** | MapKit. Native, free, no token, better on-device performance. The web app's Mapbox choice does not need mirroring. |
| 5 | **Offline support in v1?** | Read-only caching yes; offline *writes* no. Offline writes mean conflict resolution, which is a genuinely hard problem and not worth it until users ask. |
| 6 | **Does the web app get the new API too?** | Eventually, but not as part of this. The Server Actions work fine. Migrating the web to the REST API is a large refactor with no user-visible benefit — do not bundle it into this project. |
| 7 | **Android after this?** | Decide only after iOS ships. If it becomes likely, the Phase A API serves it unchanged — which is another argument for building the API properly rather than tailoring it to Swift. |

---

## Summary

The work splits cleanly in two, and the split is not where people expect.

**The backend half (Phase A, 2–3 weeks)** is building a REST API that does not exist yet. It is
smaller than it sounds, because `lib/services/*` is already transport-pure and
`mcp-server/ctxFor.ts` already proves a non-web client can authenticate and get a properly scoped
`Ctx`. You are adding a transport, not a system.

**The iOS half (Phases B–F, ~3 months)** is a genuinely new codebase in a new language on a
platform with its own rules, review process and $99 gate.

The thing that makes the app *worth building* is Phase D.1 — camera document capture feeding the
existing AI scan pipeline. Someone standing in a property, photographing a deed, watching the
fields fill themselves in. Every other screen is a convenience; that one is a capability the web
cannot have.

Two things to start early because they are blocked on other people: **Apple Developer Program
enrolment**, and **account deletion** in the API design.
