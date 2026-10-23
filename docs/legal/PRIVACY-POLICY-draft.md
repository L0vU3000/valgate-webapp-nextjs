# Valgate Privacy Policy

**DRAFT v2 — not legal advice. Needs review by a qualified lawyer before publication.**
Placeholders are marked `[LIKE THIS]`. Facts in this draft were verified against the
Valgate codebases on 2026-10-16; the ones that could not be verified are marked
`[CONFIRM]` rather than asserted.

**Effective date:** `[EFFECTIVE DATE]`
**Last updated:** `[DATE]`

## Who we are

Valgate is operated by `[LEGAL ENTITY NAME]`, `[REGISTERED ADDRESS]` ("Valgate", "we",
"us"). For privacy questions, or to exercise any right described below, contact
`[privacy@valgate.co]` — `[CONFIRM: this mailbox does not exist yet; only
feedback@valgate.co exists today]`.

We are the **controller** of account data. For records about your properties we are also a
controller; where those records describe other people (tenants, co-owners) who are not
Valgate users, `[CONFIRM: state the controller role and how those people exercise rights]`.

This policy covers two products that share one account and one set of records:

- the **Valgate web app** at `https://www.valgate.co`, and
- the **Valgate iPhone app** (the "app").

Where the two differ, this policy says so explicitly. The differences that matter:

- the web app uses product analytics; the app does not.
- the app renders maps with an SDK that sends telemetry by default (see "Maps").
- the app stores sessions in the iOS keychain; the web app uses cookies.

## What we collect, why, and where it goes

### 1. Account and identity

| Data | Purpose | Processed by |
|---|---|---|
| Email address, display name, profile photo URL, user ID | Sign-in, account management, showing you who you are | Clerk (identity provider) |
| Workspace (organisation) name, your role in it (owner / admin / member / viewer) | Deciding what you may see and change | Clerk; our database |

We do not ask for your phone number, date of birth, government identifiers, or payment
details, and we do not store your password — authentication is handled by Clerk.
`[CONFIRM: which fields Clerk is configured to request at sign-in]`

We also receive your email address **indirectly** when someone in a workspace invites you
before you have an account with us. `[CONFIRM: add the required source disclosure]`

### 2. Records you enter about your properties

Property names, addresses and map coordinates, type and status, floor area, bedroom and
bathroom counts, year built, valuations, ownership records, and tenancy and lease records.
Held in our database (Neon, PostgreSQL). `[CONFIRM: whether ownership, tenancy and tenant
details are in scope as entered, and whether any are optional]`

Some of this describes **other people who are not Valgate users** — tenant names and
contact details, co-owners. `[CONFIRM: add the required disclosure for third-party
personal data and who is responsible for it]`

### 3. Files you upload

Documents and photographs you attach to a property. Records the product supports include
leases, tenants, payments, expenses and inspections — `[CONFIRM: the file types actually
accepted at upload]`. Uploads go **directly from your device to object storage** (Amazon
Web Services S3) using a short-lived, single-purpose ticket issued by our API; the file
itself does not pass through our application servers. Files are retrieved through
short-lived signed URLs (download links expire after 5 minutes; `[CONFIRM the upload
ticket's expiry]`).

### 4. Security and service operation

Session tokens (stored in the iOS **keychain**, not in ordinary app storage), request
timestamps, IP address, and rate-limiting counters. We keep these to keep sessions valid,
prevent abuse, and diagnose faults. Rate limiting is applied per IP address and per
authenticated caller on the API. `[CONFIRM: where server logs are retained and for how
long]`

### 5. Maps

Maps are rendered with Mapbox. The Mapbox SDK's own published privacy manifest declares
that it may collect a **user ID and precise location**, for **app functionality and
analytics**, and that this data is **not used to track you across other companies' apps or
websites**.

**The app itself never asks for your device location.** There is no location permission
request in the app, and no `CLLocationManager` use in our code; the maps are centred on the
properties you have entered. Location is therefore collected by the Mapbox SDK, not
requested by us — and this is why the app's App Store privacy label declares **Precise
Location** even though you will never see a location prompt. `[CONFIRM: Mapbox telemetry
is on by default in the SDK; state whether it has been disabled and how]`

Address search and geocoding are performed **server-side** by our API, not on your device.
`[CONFIRM: the search provider in use — the code calls AWS Location/GrabMaps in
ap-southeast-1 for address search, with Mapbox geocoding also present server-side. This is
the point at which property addresses leave our systems.]`

### 6. Web analytics — web app only, not yet live

The **web app** includes PostHog for product analytics and session replay, so that we can
see which parts of the product work and where people get stuck. **This is not yet live: it
is uncommitted work on a preview branch and sends nothing from production.**
`[CONFIRM: whether to describe it as planned, or omit this section until it ships]` When it
does go live:

- Session replay is configured to **mask all on-screen text and all element attributes**,
  so property addresses, tenant names and lease figures are not captured in replays.
  `[CONFIRM: masking covers text and attributes only — it does not address images, canvas
  or map tiles]`
- `person_profiles: "identified_only"` means anonymous visitors are not given a person
  profile — but their events and replays are still captured. `[CONFIRM: state this
  accurately; "not identified" is not "not collected"]`
- Signed-in users are identified to the analytics system, so events and replays are linked
  to the account. `[CONFIRM: the purpose for identifying users]`
- Region: the code selects an EU or US PostHog host by configuration. `[CONFIRM which]`
- This happens on the **web app only**. The app contains no analytics SDK, no
  crash-reporting SDK and no advertising SDK, and nothing you do in the app is sent to
  PostHog.

### 7. What we do not do

- We do not show advertising, and we have no advertising or data-broker SDK in either
  product.
- We do not sell your personal information.
- We do not track you across other companies' apps or websites, and we do not use your
  data to build advertising profiles. Because nothing we control tracks you, the app does
  not ask for App Tracking Transparency permission. (The Mapbox SDK declares that its own
  collection is not tracking — see "Maps".)

## Who else processes your data

| Provider | What it does | Notes |
|---|---|---|
| Clerk | Sign-in, sessions, workspace membership | Identity provider of record |
| Mapbox | Map rendering (and geocoding server-side) | SDK may collect a user ID and precise location for app functionality **and its own analytics** |
| AWS Location / GrabMaps | Address search and geocoding (server-side) | `ap-southeast-1`; receives the addresses searched |
| PostHog | Product analytics and session replay | **Web app only, not yet live**; text masked; `[CONFIRM region]` |
| Neon | Managed PostgreSQL | Stores your records; `[CONFIRM region]` |
| Amazon Web Services | Object storage for your uploads | Verified `ap-southeast-2` (Sydney) |
| Vercel | Application hosting and delivery | Serves the web app and the API; `[CONFIRM region]` |
| Resend | Transactional email (workspace invitations, bounces) | Verified in use; `[CONFIRM: any sign-in/verification email provider]` |

Most of these process data only on our instructions. **Mapbox is different**: its manifest
declares an Analytics purpose, so at least part of its processing is for its own ends, not
ours. `[CONFIRM: name Mapbox as an independent controller, or as a processor with an
independent analytics purpose, and offer a way to turn its telemetry off]`

Data is processed outside your country, at minimum in Australia (`ap-southeast-2`) and
Singapore (`ap-southeast-1`). `[CONFIRM remaining destinations, then name the transfer
mechanism — EU SCCs, the UK IDTA/Addendum, or the EU-US Data Privacy Framework as
applicable]`

## How long we keep it

- **Your account** is kept while it exists. Deleting it from the app removes your account
  and ends your access. `[CONFIRM: deletion is built but not deployed yet — PR #113 — and
  cleanup runs asynchronously, so "immediate" must not be claimed]`
- **Workspace records are retained after your account is deleted.** Properties, valuations,
  ownership records, tenancy records and uploaded documents belong to the *workspace*, not
  to an individual account. If you delete your account, you lose your access to them; you do
  not delete the workspace's records, and they are not removed from storage.
  `[CONFIRM: choose and state the lawful basis and a retention period — "deliberate" is not
  a basis under GDPR Art. 17(3), and "indefinitely" should be said out loud if true]`
- **On account deletion**, we delete your account in Clerk, remove your workspace
  memberships, and remove the personal data held about you (your email address, display
  name and profile photo) from our own records. The user identifier that other records
  point to is **retained in pseudonymised form** — it is still personal data, and it remains
  linkable to those records.
- **Uploaded files** are not automatically purged when an account is deleted.
  `[CONFIRM the retention period for objects in storage]`
- **Security and operational logs** are kept for `[CONFIRM PERIOD]`.
- `[CONFIRM: Neon backups / point-in-time recovery; Clerk's own retention after deletion;
  PostHog event and replay retention]`

If you want a workspace's *business records* deleted, that is a separate request — write to
`[privacy@valgate.co]` and we will tell you what can be removed and what must be kept
`[CONFIRM ANY LEGAL RETENTION REQUIREMENTS, e.g. tenancy or tax record-keeping]`.

## Your choices and rights

- **Delete your account:** in the app, go to **Account → Delete Account**. This does not
  require asking us. `[CONFIRM: the feature is built but not deployed; do not describe it as
  working until it is]` In the web app: `[CONFIRM LOCATION OR ADD]`.
- **Access, correction, erasure, portability, objection, restriction, withdrawal of
  consent:** write to `[privacy@valgate.co]`. We respond within `[CONFIRM: one month under
  GDPR (extendable by two); 45 days under CCPA — a single fixed number risks being wrong]`.
  `[CONFIRM: identity verification, and that requests are free of charge]`
- **Complaints:** you may complain to your local data protection authority. `[CONFIRM: not
  a single authority — EEA residents complain to the authority in their own member state;
  name yours only as where we are established]`
- **California and similar US state laws:** `[CONFIRM APPLICABILITY — this depends on
  thresholds we have not assessed; if it applies, add the categories collected, sources,
  purposes, recipient categories, sensitive personal information (precise geolocation
  qualifies), retention, a "no sale/share" statement, and the authorised-agent and
  non-discrimination rights]`
- **Cookies:** `[MISSING — add: Clerk session cookies on the web app, and PostHog's
  cookie/localStorage use when it ships. Non-essential cookies and session replay need
  prior consent in the UK/EEA, not an opt-out by email. No consent mechanism exists today.]`

## Children

Valgate is a property-management tool for property owners and is not directed at children.
We do not knowingly collect personal information from anyone under `[CONFIRM AGE — 13 or
16 depending on jurisdiction]`. If you believe a child has provided us with personal
information, contact us and we will delete it.

## How we protect it

All traffic between the app, the web app and our API uses HTTPS. Uploads are made directly
to storage with short-lived, single-purpose tickets and retrieved through short-lived
signed URLs. Session tokens are kept in the iOS keychain. Authentication and organisation
boundaries are enforced by the API on every request, not by the app. Access to production
data is restricted to `[CONFIRM: describe access controls]`.

## Breach notification

`[MISSING — add: our internal procedure, and commitment to notify the supervisory
authority within 72 hours of becoming aware of a breach, and affected individuals without
undue delay where the breach is high risk]`

## Sections a lawyer must supply

Not drafted here because each is a legal determination, not a fact we can look up:

1. **Lawful basis, per purpose** — contract (account, records), legitimate interests
   (security, Mapbox telemetry), consent (analytics and replay, once live).
2. **Controller/processor roles**, including for third-party tenant and owner data.
3. **International transfer mechanism**, named per provider.
4. **DPO** — whether one must be appointed, and the contact if so.
5. **EU and UK representatives** (GDPR Art. 27), if we have no establishment there.
6. **Retention schedule** for every category above.
7. **CCPA/CPRA notice and applicability.**
8. **Automated decision-making / profiling** statement (Art. 13(2)(f)) — we believe none
   occurs, but that must be stated rather than omitted.
9. **Whether providing the data is a contractual requirement** (Art. 13(2)(e)).

## Changes to this policy

If we make a material change, we will update the "Last updated" date above and, where the
change is significant, tell you in the product or by email before it takes effect.
`[CONFIRM: an email notice requires a verified transactional email provider and a defined
notice period]`
