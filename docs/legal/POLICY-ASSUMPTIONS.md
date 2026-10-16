# Privacy policy — what the page asserts, and what needs ratifying

The published page is `app/(marketing)/privacy/page.tsx`. It contains **no placeholders**: every
bracket in `PRIVACY-POLICY-draft.md` has either been filled from something verified in the source
trees, or written as a commitment. This file exists so those commitments are visible as *claims
someone has to stand behind*, rather than being silently absorbed into production copy.

Read this before merging. Everything below is a statement about Valgate's practices that cannot be
derived from code — the code says what it does, not what we promise.

## 1. The one thing not filled, and why

**Legal entity name and registered address.** The page says "Valgate" and gives
`feedback@valgate.co`. It does not name a registered company or a postal address, because inventing
either would be a false statement in a legal document.

GDPR Article 13(1)(a) expects the controller's identity and contact details; a trading name plus a
working contact address is the honest floor, and a registered name and address is the norm. **If
Valgate is a registered entity, add it here** — one sentence, and this becomes complete. If it is
not, the current text is defensible and should stay as it is.

`feedback@valgate.co` is used throughout rather than a `privacy@` address because that is the only
one that exists in the codebase. If you want `privacy@valgate.co`, create the mailbox first and tell
me — do not publish an address that will bounce, because a rights request that disappears is worse
than no policy.

## 2. Commitments that are now made on Valgate's behalf

Each of these is written as a promise in the page. Confirm the number or the stance:

| Claim in the page | Where | Ratify? |
|---|---|---|
| Workspace records are kept for as long as the workspace exists, **and up to 12 months after it is closed**, except for legal/tax/accounting obligations | §5 | The 12 months is my proposal. Any other figure is fine; it must be one you would honour. |
| **Security and operational logs are kept up to 12 months** | §5 | Same — a proposal. |
| Backup copies are overwritten as the backup cycle completes | §5 | True of any managed database, but confirm it matches how you would describe it. |
| **The account under 16** is the age floor | §8 | GDPR allows 13–16 depending on member state; US law points at 13. 16 is the conservative choice for a service with no age-gating. |
| We are **not established in the EU/UK and do not direct services there**, and would appoint a representative if we ever did | §"Who we are" | This is a statement about intent, not code. It becomes false the moment EU/UK customers are actively sought. |
| **No Data Protection Officer** is appointed because none is required | §"Who we are" | Confirm nothing about Valgate's activity brings a DPO into scope. |
| Web analytics runs **only with consent** in the UK/EEA, and is off until you accept | §7 | Matches the intent in the tracking plan. It requires PostHog's cookie/storage use to be genuinely gated behind consent before it goes live — **not yet implemented anywhere**. |
| Mapbox's telemetry is described as the SDK's own purpose, turn-off-able from the map's attribution menu | §1 Maps, §3 | Accurate to the SDK's source. It is also the reason the App Store label must declare Precise Location. |
| We **do not sell personal information and do not share it for cross-context behavioural advertising** | §6 | Must stay true — this is a CCPA-facing statement. |

## 3. What was deliberately kept out of the page

The annotated draft (`PRIVACY-POLICY-draft.md`) carried working notes to the reader — `[CONFIRM: …]`,
`[MISSING — …]`, references to which provider's answer was unverifiable. Those are scaffolding for
this file and for the cross-check transcripts beside it. **None of it belongs in published copy**,
so none of it is in the page. The draft stays as the annotated working document.

## 4. What the page does not claim

- It does not claim Mapbox telemetry is off. It cannot: `mapbox-common-ios` ships no telemetry
  source, so the default is unreadable, and the app never configures it. Treat collection as
  happening and declare it — in the policy, and on the App Store label.
- It does not claim session replay is anonymised. Masking covers text and element attributes only;
  images, canvas and map tiles are not covered, which is why replay is tied to consent.
- It does not claim uploaded documents are deleted with an account. They are not, and the page says
  so plainly in §5.
- It does not claim a breach notification timeline beyond what the law requires (72 hours to a
  supervisory authority where required, without undue delay to you if high risk).
