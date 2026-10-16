# Legal documents — decisions of record, and what is still open

The published pages are `app/(marketing)/privacy/page.tsx` and `app/(marketing)/terms/page.tsx`.
Both contain **no placeholders** and no internal reviewer notes. This file records the commitments
they make, so those aren't silently absorbed into production copy — and names the two things that
cannot be decided, only discovered.

## 1. Decisions of record (adopted 2026-10-16)

These were proposals in the drafts. They are now the published position, adopted at the owner's
direction. Each is one sentence in one file, so changing any of them is a one-line edit.

| Decision | Value in force | Where |
|---|---|---|
| Retention of workspace records after the workspace closes | **12 months**, except where a legal, tax or accounting obligation requires longer | policy §5 |
| Retention of security and operational logs | **12 months** | policy §5 |
| Minimum age for an account | **16** | policy §8, terms §1 |
| EU/UK posture | Not established there, does not target those markets; rights honoured on request; a representative will be appointed if that changes | policy §"Who we are" |
| Data Protection Officer | None appointed, because none is required | policy §"Who we are" |
| Liability cap | **The greater of 12 months' fees or USD 100**, subject to non-limitable liability | terms §9 |
| Fees | Charged only after the price is shown and accepted — true whether Valgate is free or paid | terms §6 |
| Cookies | Clerk strictly-necessary only; any PostHog storage is consent-gated in the UK/EEA | policy §7 |
| Sale of personal information | Never; and no sharing for cross-context behavioural advertising | policy §6, terms §2 |

Two of these carry an implementation obligation, not just a wording one:

- **Consent-gated analytics.** The policy states that PostHog storage is off until accepted in the
  UK/EEA. Nothing in the codebase implements that yet, and PostHog is not live. Whoever turns it on
  owns making that sentence true first.
- **12-month retention.** Nothing currently deletes workspace records or logs on a schedule. The
  policy now promises a period; either a job enforces it, or the period has to move to something
  already true.

## 2. Open — facts, not decisions

Neither of these can be ratified, because they are not choices. They are things only the owner
knows, and inventing either would put a false statement in a legal document.

1. **The registered entity name and postal address.** The pages say "Valgate" and give
   `feedback@valgate.co`. GDPR Article 13(1)(a) expects the controller's identity and contact
   details; a trading name plus a working contact address is the honest floor, a registered name and
   address is the norm. If Valgate is a registered entity, this sentence is where it goes — in both
   documents.
2. **The governing law and forum.** Terms §11 says "the laws of the country in which Valgate is
   established". Name it when you name the entity; they are the same edit.

A third, adjacent: `feedback@valgate.co` is used as the privacy contact because it is the only
address that exists in the codebase. A rights request that bounces is worse than no published
policy, so if `privacy@valgate.co` is preferred, create the mailbox before changing the page.

## 3. What was kept out of the pages

The annotated draft (`PRIVACY-POLICY-draft.md`) carried working notes to the reader — `[CONFIRM: …]`,
`[MISSING — …]`, references to which provider's answer was unverifiable. Those are scaffolding for
this file and for the cross-check transcripts beside it. **None of it belongs in published copy**, so
none of it is in the pages.

## 4. What the pages do not claim

- That Mapbox telemetry is off. It cannot: `mapbox-common-ios` ships no telemetry source, so the
  default is unreadable, and the app never configures it. Treat collection as happening and declare
  it — in the policy, and on the App Store label.
- That session replay is anonymised. Masking covers text and element attributes only; images,
  canvas and map tiles are not covered, which is why replay is tied to consent.
- That uploaded documents are deleted with an account. They are not, and the policy says so plainly
  in §5.
- Any breach-notification timeline beyond what the law requires.
